import { runMvmAction, type MvmActionResult } from "./action-engine.ts";
import { canUseNativeAndroidLauncher, nativeOpenPackage, nativeOpenUrl, nativeShare } from "./native-launcher.ts";
import { isAllowedShareMime, isSafeScopedContentUri, isSafeShareText, redactExternalTarget, validateExternalTarget } from "./security-policy.ts";

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
  grant?: "none" | "explicit-text" | "explicit-content-uri";
}

export function validateMime(mime?: string): { ok: boolean; reason?: string } {
  return isAllowedShareMime(mime) ? { ok: true } : { ok: false, reason: "unsupported MIME type" };
}

export function resolveBridge(request: BridgeRequest): { ok: boolean; method: BridgeMethod; reason?: string } {
  const target = request.target.trim();
  if (!target || target.length > 2048 || /[\u0000-\u001f\u007f]/.test(target)) return { ok: false, method: "url", reason: "missing or invalid target" };
  if (request.kind === "share") {
    if (request.fileUri && !isSafeScopedContentUri(request.fileUri)) return { ok: false, method: "share", reason: "file sharing requires a validated scoped content URI" };
    const mime = validateMime(request.mime);
    if (!mime.ok) return { ok: false, method: "share", reason: mime.reason };
    if (request.text !== undefined && !isSafeShareText(request.text)) return { ok: false, method: "share", reason: "share text is empty, oversized, or contains control characters" };
    if (!request.text && !request.fileUri) return { ok: false, method: "share", reason: "share needs text or an explicit scoped file grant" };
    return { ok: true, method: request.chooser ? "chooser" : "share" };
  }
  if (request.kind === "launch") {
    if (target.length > 255 || !/^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(target)) return { ok: false, method: "package", reason: "invalid package name" };
    return { ok: true, method: request.platform === "android" ? "package" : "desktop-fallback" };
  }
  const validation = validateExternalTarget(target, request.kind);
  if (!validation.ok) return { ok: false, method: request.kind === "url" ? "url" : "deeplink", reason: validation.reason };
  return { ok: true, method: request.kind === "url" ? "url" : "deeplink" };
}

function dispatch(request: BridgeRequest, method: BridgeMethod): void {
  if (method === "package") {
    if (canUseNativeAndroidLauncher()) {
      void nativeOpenPackage(request.target).catch(() => undefined);
    }
    return;
  }
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
  if (method === "url" || method === "deeplink") {
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
      metadata: { kind: request.kind, target: request.kind === "launch" ? request.target : redactExternalTarget(request.target) },
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
        target: request.kind === "launch" ? request.target : redactExternalTarget(request.target),
        message: "Bridge request started. External completion is not observable.",
        verified: false,
        grant: request.kind === "share" && request.fileUri?.startsWith("content:")
          ? "explicit-content-uri"
          : request.kind === "share" && request.text
            ? "explicit-text"
            : "none",
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
