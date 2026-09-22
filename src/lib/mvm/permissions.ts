export interface PermSnapshot {
  storage: boolean;
  notify: NotificationPermission | "unsupported";
  persisted: boolean;
}

export async function snapshotPerms(): Promise<PermSnapshot> {
  const notify =
    typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission;

  let persisted = false;
  try {
    persisted = (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    persisted = false;
  }

  return {
    storage: persisted,
    notify,
    persisted,
  };
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function requestNotify(): Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function notifyLaunch(title: string, body: string): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;
  try {
    new Notification(title, { body, silent: true });
  } catch {
    /* ignore */
  }
}

type BeforeInstall = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferredInstall: BeforeInstall | null = null;

export function captureInstallPrompt(ev: Event): void {
  ev.preventDefault();
  deferredInstall = ev as BeforeInstall;
}

export function hasInstallPrompt(): boolean {
  return deferredInstall !== null;
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredInstall) return "unavailable";
  try {
    await deferredInstall.prompt();
    const choice = await deferredInstall.userChoice;
    deferredInstall = null;
    return choice.outcome === "accepted" ? "accepted" : "dismissed";
  } catch {
    return "unavailable";
  }
}

export function listenInstallPrompt(): () => void {
  const onPrompt = (ev: Event) => captureInstallPrompt(ev);
  window.addEventListener("beforeinstallprompt", onPrompt);
  return () => window.removeEventListener("beforeinstallprompt", onPrompt);
}
