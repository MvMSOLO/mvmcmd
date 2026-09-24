import { appStoreSearch, playStoreUrl } from "./platform";
import {
  canUseNativeAndroidLauncher,
  nativeOpenPackage,
  nativeOpenStore,
} from "./native-launcher";
import type { CatalogApp, LaunchResult, PlatformKind } from "./types";

function encodeIntent(parts: string[]): string {
  return `intent:#Intent;${parts.join(";")};end`;
}

export function androidLaunchUrl(app: CatalogApp): string | null {
  if (app.androidData && /^(tel:|sms:|mailto:)/i.test(app.androidData)) {
    return app.androidData;
  }
  if (app.androidAction && app.androidPackage) {
    return encodeIntent([
      `action=${app.androidAction}`,
      `package=${app.androidPackage}`,
      ...(app.androidData ? [`S.android.intent.extra.TEXT=${encodeURIComponent(app.androidData)}`] : []),
    ]);
  }
  if (app.androidAction && !app.androidPackage) {
    return encodeIntent([`action=${app.androidAction}`]);
  }
  if (app.androidPackage) {
    const fallback = app.webUrl
      ? `;S.browser_fallback_url=${encodeURIComponent(app.webUrl)}`
      : `;S.browser_fallback_url=${encodeURIComponent(playStoreUrl(app.androidPackage))}`;
    return `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${app.androidPackage}${fallback};end`;
  }
  return null;
}

export function iosLaunchUrl(app: CatalogApp): string | null {
  if (app.iosScheme) return app.iosScheme;
  return null;
}

export function webLaunchUrl(app: CatalogApp): string | null {
  return app.webUrl ?? null;
}

export function storeUrl(app: CatalogApp, platform: PlatformKind): string | null {
  if (platform === "android" && app.androidPackage) {
    return playStoreUrl(app.androidPackage);
  }
  if (platform === "ios") return appStoreSearch(app.name);
  if (app.androidPackage) return playStoreUrl(app.androidPackage);
  return app.webUrl ?? null;
}

function fireNavigate(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener noreferrer";
  const isProtocol =
    /^(intent:|android-app:|tel:|sms:|mailto:|tg:|whatsapp:|instagram:|youtube:|spotify:|fb:|twitter:|maps:)/i.test(
      url,
    );
  a.target = isProtocol ? "_top" : "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function fireTab(url: string): boolean {
  const w = window.open(url, "_blank", "noopener,noreferrer");
  return Boolean(w);
}

async function nativeAndroidPackageLaunch(app: CatalogApp): Promise<LaunchResult> {
  if (!app.androidPackage) {
    return { ok: false, method: "intent", url: "", app, note: "NO ANDROID PACKAGE", error: "NO_PACKAGE" };
  }

  try {
    const result = await nativeOpenPackage(
      app.androidPackage,
      app.androidAction,
      app.androidData,
      app.webUrl,
    );
    if (result.launched) {
      return {
        ok: true,
        method: "intent",
        url: app.androidPackage,
        app,
        note: "NATIVE ANDROID INTENT CONFIRMED",
      };
    }
    return {
      ok: false,
      method: result.fallbackOpened ? "store" : "intent",
      url: result.fallbackOpened ? (app.webUrl ?? playStoreUrl(app.androidPackage)) : app.androidPackage,
      app,
      note: result.fallbackOpened ? "STORE/WEB FALLBACK OPENED" : "NATIVE ANDROID LAUNCH FAILED",
      error: result.error ?? (result.installed ? "LAUNCH_FAILED" : "NOT_INSTALLED"),
    };
  } catch (error) {
    return {
      ok: false,
      method: "intent",
      url: app.androidPackage,
      app,
      note: "NATIVE ANDROID LAUNCH ERROR",
      error: error instanceof Error ? error.message : "NATIVE_CALL_FAILED",
    };
  }
}

export async function launchApp(
  app: CatalogApp,
  platform: PlatformKind,
): Promise<LaunchResult> {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(16);
    } catch {
      /* ignore */
    }
  }

  if (platform === "android") {
    if (canUseNativeAndroidLauncher() && app.androidPackage) {
      return nativeAndroidPackageLaunch(app);
    }

    const intent = androidLaunchUrl(app);
    if (intent) {
      try {
        fireNavigate(intent);
        return { ok: true, method: "intent", url: intent, app, note: "ANDROID INTENT DISPATCHED" };
      } catch (error) {
        return {
          ok: false,
          method: "intent",
          url: intent,
          app,
          note: "ANDROID INTENT FAILED",
          error: error instanceof Error ? error.message : "NAVIGATION_FAILED",
        };
      }
    }
  }

  if (platform === "ios") {
    const scheme = iosLaunchUrl(app);
    if (scheme) {
      try {
        fireNavigate(scheme);
        return { ok: true, method: "scheme", url: scheme, app, note: "IOS SCHEME DISPATCHED" };
      } catch (error) {
        return {
          ok: false,
          method: "scheme",
          url: scheme,
          app,
          note: "IOS SCHEME FAILED",
          error: error instanceof Error ? error.message : "NAVIGATION_FAILED",
        };
      }
    }
  }

  const web = webLaunchUrl(app);
  if (web) {
    try {
      if (/^(tel:|sms:|mailto:)/i.test(web)) {
        fireNavigate(web);
        return { ok: true, method: "protocol", url: web, app, note: "PROTOCOL DISPATCHED" };
      }
      const opened = fireTab(web);
      if (!opened) {
        fireNavigate(web);
        return { ok: true, method: "web", url: web, app, note: "WEB NAVIGATION DISPATCHED" };
      }
      return { ok: true, method: "web", url: web, app, note: "WEB TAB OPENED" };
    } catch (error) {
      return {
        ok: false,
        method: "web",
        url: web,
        app,
        note: "WEB LAUNCH FAILED",
        error: error instanceof Error ? error.message : "NAVIGATION_FAILED",
      };
    }
  }

  const store = storeUrl(app, platform);
  if (store) {
    try {
      const opened = fireTab(store);
      if (!opened) return { ok: false, method: "store", url: store, app, note: "STORE BLOCKED", error: "POPUP_BLOCKED" };
      return { ok: true, method: "store", url: store, app, note: "STORE TAB OPENED" };
    } catch (error) {
      return {
        ok: false,
        method: "store",
        url: store,
        app,
        note: "STORE FAILED",
        error: error instanceof Error ? error.message : "STORE_FAILED",
      };
    }
  }

  return { ok: false, method: "web", url: "", app, note: "NO TARGET", error: "NO_TARGET" };
}

export async function launchStore(app: CatalogApp, platform: PlatformKind): Promise<LaunchResult> {
  const url = storeUrl(app, platform);
  if (!url) {
    return { ok: false, method: "store", url: "", app, note: "NO STORE", error: "NO_STORE" };
  }

  if (platform === "android" && canUseNativeAndroidLauncher() && app.androidPackage) {
    try {
      const result = await nativeOpenStore(app.androidPackage, app.webUrl);
      return {
        ok: result.opened,
        method: "store",
        url,
        app,
        note: result.opened ? "NATIVE STORE OPENED" : "NATIVE STORE FAILED",
        error: result.opened ? undefined : "STORE_FAILED",
      };
    } catch (error) {
      return {
        ok: false,
        method: "store",
        url,
        app,
        note: "NATIVE STORE ERROR",
        error: error instanceof Error ? error.message : "STORE_CALL_FAILED",
      };
    }
  }

  try {
    const opened = fireTab(url);
    return {
      ok: opened,
      method: "store",
      url,
      app,
      note: opened ? "STORE TAB OPENED" : "STORE BLOCKED",
      error: opened ? undefined : "POPUP_BLOCKED",
    };
  } catch (error) {
    return {
      ok: false,
      method: "store",
      url,
      app,
      note: "STORE FAILED",
      error: error instanceof Error ? error.message : "STORE_FAILED",
    };
  }
}

export async function launchPackage(pkg: string): Promise<LaunchResult> {
  const stub: CatalogApp = {
    id: pkg,
    name: pkg,
    aliases: [],
    androidPackage: pkg,
    category: "tool",
    weight: 1,
  };

  if (canUseNativeAndroidLauncher()) {
    try {
      const result = await nativeOpenPackage(pkg);
      return {
        ok: result.launched,
        method: result.launched ? "intent" : result.fallbackOpened ? "store" : "intent",
        url: result.fallbackOpened ? playStoreUrl(pkg) : pkg,
        app: stub,
        note: result.launched
          ? "NATIVE PACKAGE OPENED"
          : result.fallbackOpened
            ? "STORE/WEB FALLBACK OPENED"
            : "NATIVE PACKAGE FAILED",
        error: result.launched ? undefined : result.error ?? "PACKAGE_LAUNCH_FAILED",
      };
    } catch (error) {
      return {
        ok: false,
        method: "intent",
        url: pkg,
        app: stub,
        note: "NATIVE PACKAGE ERROR",
        error: error instanceof Error ? error.message : "NATIVE_CALL_FAILED",
      };
    }
  }

  const url = androidLaunchUrl(stub);
  if (!url) return { ok: false, method: "intent", url: pkg, app: stub, note: "NO PACKAGE TARGET", error: "NO_PACKAGE_TARGET" };
  try {
    fireNavigate(url);
    return { ok: true, method: "intent", url, app: stub, note: "RAW PACKAGE DISPATCHED" };
  } catch (error) {
    return { ok: false, method: "intent", url, app: stub, note: "RAW PACKAGE FAILED", error: error instanceof Error ? error.message : "NAVIGATION_FAILED" };
  }
}

export function launchRawUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url) && !/^(tel:|sms:|mailto:)/i.test(url)) {
    return false;
  }
  if (/^(tel:|sms:|mailto:)/i.test(url)) fireNavigate(url);
  else fireTab(url);
  return true;
}
