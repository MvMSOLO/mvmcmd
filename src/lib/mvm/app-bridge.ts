import { runMvmAction, type MvmActionResult } from "./action-engine";
import { canUseNativeAndroidLauncher, nativeOpenUrl, nativeShare } from "./native-launcher";

export type BridgeMethod = "package" | "deeplink" | "url" | "share" | "chooser" | "desktop-fallback";
export type BridgeStatus = "started" | "failed";

export interface BridgeRequest {
  kind: "launch" | "deeplink" | "url" | "share";
  target: string;
  mime?: string;
  text?: string;
  fileUri?: string;
  chooser?: boolean;
  platform: string;
}

export interface BridgeResult {
  status: BridgeStatus;
  method: BridgeMethod;
  target: string;
  message: string;
  verified: false;
  grant?: "none" | "explicit-text";
}

const ALLOWED_SCHEMES = /^(https?:|tel:|sms:|mailto:|geo:|market:)/i;
const PRIVATE_FILE = /^(file:|content:\/\/com\.android\.externalstorage|\/data\/|\/storage\/emulated\/)/i;
const ALLOWED_MIME = /^(text\/plain|text\/csv|image\/png|image\/jpeg|application\/pdf)$/;

export function validateMime(mime?: string): { ok: boolean; reason?: string } {
  if (!mime) return { ok: true };
  return ALLOWED_MIME.test(mime) ? { ok: true } : { ok: false, reason: `unsupported mime: ${mime}` };
}

export function resolveBridge(request: BridgeRequest): { ok: boolean; method: BridgeMethod; reason?: string } {
  const target = request.target.trim();
  if (!target) return { ok: false, method: "url", reason: "missing target" };
  if (request.kind === "share") {
    if (request.fileUri && PRIVATE_FILE.test(request.fileUri)) {
      return { ok: false, method: "share", reason: "private file share requires an explicit scoped grant" };
    }
    const mime = validateMime(request.mime);
    if (!mime.ok) return { ok: false, method: "share", reason: mime.reason };
    if (!request.text && !request.fileUri) return { ok: false, method: "share", reason: "share needs text or an explicit file grant" };
    return { ok: true, method: request.chooser ? "chooser" : "share" };
  }
  if (request.kind === "launch") {
    if (!/^[a-zA-Z][\w]*(\.[\w]+)+$/.test(target)) return { ok: false, method: "package", reason: "invalid package name" };
    return { ok: true, method: request.platform === "android" ? "package" : "desktop-fallback" };
  }
  if (!ALLOWED_SCHEMES.test(target) && !/^[a-z][a-z0-9+.-]*:/i.test(target)) {
    return { ok: false, method: "deeplink", reason: "unsupported deep link" };
  }
  if (/^(javascript:|data:|file:)/i.test(target)) return { ok: false, method: "url", reason: "blocked scheme" };
  if (request.kind === "deeplink" && !ALLOWED_SCHEMES.test(target) && request.platform !== "android") {
    return { ok: false, method: "desktop-fallback", reason: "deep link has no desktop handler" };
  }
  return { ok: true, method: request.kind === "url" ? "url" : "deeplink" };
}

function dispatch(request: BridgeRequest, method: BridgeMethod): void {
  if (method === "share" || method === "chooser") {
    if (canUseNativeAndroidLauncher()) {
      void nativeShare({
        text: request.text,
        mime: request.mime,
        chooser: method === "chooser",
        fileUri: request.fileUri,
      }).catch(() => undefined);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.share && request.text) {
      void navigator.share({ text: request.text }).catch(() => undefined);
    }
    return;
  }
  if (method === "url" || method === "deeplink" || method === "desktop-fallback") {
    if (canUseNativeAndroidLauncher()) {
      void nativeOpenUrl(request.target).catch(() => undefined);
      return;
    }
    if (typeof window !== "undefined") {
      window.open(request.target, "_blank", "noopener,noreferrer");
    }
  }
}

/** Phase 9 bridge. External app completion is never inferred. */
export function runAppBridge(request: BridgeRequest): MvmActionResult<BridgeResult> {
  return runMvmAction<BridgeResult>({
    context: {
      skillId: "app-bridge",
      platform: request.platform,
      metadata: { kind: request.kind, target: request.target },
    },
    precondition: () => {
      const resolved = resolveBridge(request);
      return resolved.ok ? { ok: true } : { ok: false, reason: resolved.reason };
    },
    execute: () => {
      const resolved = resolveBridge(request);
      const result: BridgeResult = {
        status: "started",
        method: resolved.method,
        target: request.target,
        message: "Bridge request started. External completion is not observable.",
        verified: false,
        grant: request.kind === "share" && request.text ? "explicit-text" : "none",
      };
      if (resolved.method !== "package") {
        dispatch(request, resolved.method);
      }
      return result;
    },
    observe: (value) => ({ ok: value.status === "started", reason: value.message }),
    verify: () => ({ ok: false, reason: "external app completion is not observable" }),
    startedWhen: () => true,
  });
}
