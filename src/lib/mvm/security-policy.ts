export type ExternalTargetKind = "url" | "deeplink";

const MAX_URI_LENGTH = 2048;
const MAX_SHARE_TEXT_LENGTH = 4000;
const EXTERNAL_SCHEMES = new Set(["http:", "https:", "tel:", "sms:", "mailto:", "geo:", "market:"]);
const ALLOWED_SHARE_MIME = new Set(["text/plain", "text/csv", "image/png", "image/jpeg", "application/pdf"]);

function hasControlCharacters(value: string): boolean { return /[\u0000-\u001f\u007f]/.test(value); }
function decodeUriPath(pathname: string): string | undefined {
  try { return decodeURIComponent(pathname); } catch { return undefined; }
}

export function validateExternalTarget(raw: string, kind: ExternalTargetKind): { ok: boolean; reason?: string } {
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, reason: "missing target" };
  const target = raw.trim();
  if (target.length > MAX_URI_LENGTH) return { ok: false, reason: "target exceeds the 2048 character limit" };
  if (hasControlCharacters(target) || /\s/.test(target)) return { ok: false, reason: "target contains whitespace or control characters" };
  let parsed: URL;
  try { parsed = new URL(target); }
  catch { return { ok: false, reason: "target is not a valid absolute URI" }; }
  if (!EXTERNAL_SCHEMES.has(parsed.protocol.toLowerCase())) return { ok: false, reason: "URI scheme is not allow-listed" };
  if (kind === "url" && parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "URL command accepts only HTTP or HTTPS" };
  }
  if (parsed.protocol === "http:" || parsed.protocol === "https:") {
    if (!parsed.hostname || parsed.username || parsed.password) return { ok: false, reason: "HTTP(S) targets need a host and must not embed credentials" };
    if (parsed.hostname.length > 253 || (parsed.port && (!/^\d+$/.test(parsed.port) || Number(parsed.port) > 65535))) {
      return { ok: false, reason: "invalid HTTP(S) host or port" };
    }
  }
  if (parsed.protocol === "mailto:") {
    const address = target.slice(target.indexOf(":") + 1).split("?")[0] ?? "";
    if (!address || /[\r\n]/.test(address) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) return { ok: false, reason: "mailto target is invalid" };
  }
  if (parsed.protocol === "tel:" || parsed.protocol === "sms:") {
    const number = target.slice(target.indexOf(":") + 1).split("?")[0] ?? "";
    if (!number || !/^[+0-9().;,#*\-]{1,64}$/.test(number)) return { ok: false, reason: "telephone target contains unsupported characters" };
  }
  return { ok: true };
}

export function isSafeScopedContentUri(raw: unknown): raw is string {
  if (typeof raw !== "string" || !raw.trim() || raw.length > MAX_URI_LENGTH || hasControlCharacters(raw)) return false;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "content:" || !parsed.hostname || parsed.username || parsed.password) return false;
    if (parsed.hostname.toLowerCase() === "mvmcmd.launcher.fileprovider") return false;
    const decoded = decodeUriPath(parsed.pathname);
    if (decoded === undefined || decoded.includes("\\") || decoded.split("/").some((part) => part === "." || part === "..")) return false;
    if (/\/(?:data|proc|sys)(?:\/|$)/i.test(decoded)) return false;
    if (/(?:^|\/)primary:Android\/(?:data|obb)(?:\/|$)/i.test(decoded)) return false;
    return true;
  } catch { return false; }
}

export function isSafeDesktopFileUrl(raw: unknown): raw is string {
  if (typeof raw !== "string" || !raw.trim() || raw.length > MAX_URI_LENGTH || hasControlCharacters(raw)) return false;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "file:" || parsed.host || parsed.username || parsed.password || parsed.search || parsed.hash) return false;
    const decoded = decodeUriPath(parsed.pathname);
    if (decoded === undefined || decoded.includes("\\") || decoded.split("/").some((part) => part === "." || part === "..")) return false;
    if (/\/(?:Windows\/(?:System32|SysWOW64)|ProgramData\/Microsoft\/Windows\/Start Menu)\/?/i.test(decoded)) return false;
    return true;
  } catch { return false; }
}

export function isAllowedShareMime(mime?: string): boolean {
  if (mime === undefined || mime === "") return true;
  return ALLOWED_SHARE_MIME.has(mime.trim().toLowerCase());
}
export function isSafeShareText(text: unknown): text is string {
  return typeof text === "string" && text.length > 0 && text.length <= MAX_SHARE_TEXT_LENGTH
    && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text);
}
export function isSafeFilename(raw: string): boolean {
  const name = raw.trim();
  if (!name || name.length > 180 || name === "." || name === "..") return false;
  if (/[\\/\u0000-\u001f\u007f<>:"|?*]/.test(name) || /[. ]$/.test(name)) return false;
  return !/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name);
}
export function sanitizeZipEntryName(raw: unknown, index: number): string {
  const fallback = "file-" + Math.max(0, Math.floor(Number.isFinite(index) ? index : 0));
  if (typeof raw !== "string") return fallback;
  let name = raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/[\\/]/g, "_").replace(/[:]/g, "_").trim();
  if (!name || name === "." || name === "..") name = fallback;
  name = name.slice(0, 180);
  if (/[. ]$/.test(name)) name = name.replace(/[. ]+$/g, "") || fallback;
  return name;
}

/** Redacts user data and local references before diagnostics cross the command/log boundary. */
export function sanitizeDiagnosticText(value: unknown, maxLength = 280): string {
  if (typeof value !== "string") return "details unavailable";
  const cap = Number.isFinite(maxLength) ? Math.max(32, Math.min(1000, Math.floor(maxLength))) : 280;
  let safe = value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\b(password|passwd|passcode|otp|token|secret|api[_-]?key|authorization|access[_-]?token|refresh[_-]?token|signature)\s*[:=]\s*[^\s&;,]+/gi, "$1=[redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/(?:https?|content|file):\/\/[^\s"'<>]+/gi, "[URI]")
    .replace(/\b[A-Za-z]:\\(?:[^\s\\]+\\)*[^\s\\]*/g, "[path]")
    .replace(/(?:^|\s)\/(?:data|storage|sdcard|home|Users)\/[^\s"'<>]*/gi, " [path]")
    .replace(/(?:^|\s)\+?\d[\d ().-]{7,}\d(?=$|\s)/g, " [number]")
    .replace(/\s+/g, " ")
    .trim();
  if (!safe) return "details unavailable";
  if (safe.length > cap) safe = safe.slice(0, cap - 1).trimEnd() + "…";
  return safe;
}
export function redactExternalTarget(value: string): string {
  const target = value.trim();
  try {
    const parsed = new URL(target);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.origin;
    if (parsed.protocol === "market:") return "market:[details hidden]";
    if (parsed.protocol === "mailto:") return "mailto:[address hidden]";
    if (parsed.protocol === "tel:" || parsed.protocol === "sms:") return parsed.protocol + "[number hidden]";
    if (parsed.protocol === "geo:") return "geo:[location hidden]";
    return parsed.protocol + "[details hidden]";
  } catch { return sanitizeDiagnosticText(target, 80); }
}
