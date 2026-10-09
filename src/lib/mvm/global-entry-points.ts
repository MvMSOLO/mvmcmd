export type GlobalEntrySource = "android" | "desktop";
export type GlobalEntryKind = "command" | "share-text" | "share-file" | "open-file";
export interface GlobalEntryPayload {
  available: true; id: string; source: GlobalEntrySource; kind: GlobalEntryKind;
  action?: string; command?: string; text?: string; uri?: string; displayName?: string; mimeType?: string;
}
const COMMANDS: Record<string,string> = {
  camera:"camera", cam:"camera", kamera:"camera", qr:"qr", scan:"qr", qrcode:"qr",
  english:"english", en:"english", ielts:"english", wallpaper:"wallpaper", wall:"wallpaper",
  notification:"notification", notifications:"notification", notify:"notification",
  device:"device", sys:"sys", help:"help", files:"files", session:"session"
};
const MIME_RE = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+*-]+$/i;
function toRecord(v: unknown): Record<string,unknown> | undefined {
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string,unknown> : undefined;
}
function clean(v: unknown, max=4000): string | undefined {
  if (typeof v !== "string") return undefined;
  const s=v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").trim();
  return s ? s.slice(0,max) : undefined;
}
export function normalizeExternalCommand(v: unknown): string | undefined {
  const s=clean(v,80)?.replace(/^\/+|\/+$/g,"").toLowerCase();
  if (!s || /[\s?#&;]/.test(s)) return undefined;
  return COMMANDS[s];
}
function safeUri(v: unknown, source: GlobalEntrySource): string | undefined {
  const raw=clean(v,2048);
  if (!raw || /[\u0000-\u001f]/.test(raw)) return undefined;
  try {
    const u=new URL(raw);
    if (source === "android") {
      if (u.protocol !== "content:" || !u.hostname || u.hostname.toLowerCase().includes("mvmcmd.launcher.fileprovider") || /\/data\/|\/proc\/|\/sys\//i.test(raw)) return undefined;
      return raw;
    }
    if (u.protocol !== "file:" || u.host) return undefined;
    const p=decodeURIComponent(u.pathname);
    if (/\/(?:Windows\/System32|Windows\/SysWOW64)\//i.test(p)) return undefined;
    return u.href;
  } catch { return undefined; }
}
function safeMime(v: unknown): string | undefined {
  const s=clean(v,127)?.toLowerCase();
  return s && MIME_RE.test(s) ? s : undefined;
}
export function normalizeGlobalEntry(v: unknown): GlobalEntryPayload | undefined {
  const r=toRecord(v);
  if (!r || r.available === false) return undefined;
  const id=clean(r.id,128);
  const source=r.source === "android" || r.source === "desktop" ? r.source : undefined;
  const kind=r.kind === "command" || r.kind === "share-text" || r.kind === "share-file" || r.kind === "open-file" ? r.kind : undefined;
  if (!id || !source || !kind) return undefined;
  const base: GlobalEntryPayload={available:true,id,source,kind,...(clean(r.action,80)?{action:clean(r.action,80)}:{})};
  if (kind === "command") {
    const command=normalizeExternalCommand(r.command);
    return command ? {...base,command} : undefined;
  }
  if (kind === "share-text") {
    const text=clean(r.text);
    return text ? {...base,text,mimeType:safeMime(r.mimeType)||"text/plain"} : undefined;
  }
  const uri=safeUri(r.uri,source);
  if (!uri) return undefined;
  return {...base,uri,...(clean(r.displayName,180)?{displayName:clean(r.displayName,180)}:{}),...(safeMime(r.mimeType)?{mimeType:safeMime(r.mimeType)}:{}),...(kind==="share-file"&&clean(r.text)?{text:clean(r.text)}:{})};
}
/** Creates a draft only; a caller must not execute it just because the OS event arrived. */
export function draftFromGlobalEntry(e: GlobalEntryPayload): string {
  if (e.kind === "command") return e.command || "";
  if (e.kind === "share-text") return e.text || "";
  if ((e.kind === "share-file" || e.kind === "open-file") && e.uri) return "openfile " + e.uri;
  return "";
}
export function describeGlobalEntry(e: GlobalEntryPayload, lang: "uz"|"en"): string {
  const source=e.source.toUpperCase();
  const name=e.displayName || e.mimeType || (e.kind === "share-file" ? "shared file" : "file");
  if (lang === "uz") {
    if (e.kind === "command") return "TASHQI KIRISH · "+source+" · "+e.command+". Buyruq inputga joylandi; tekshirib Launch bosing.";
    if (e.kind === "share-text") return "MATN QABUL QILINDI · "+source+". Matn inputga joylandi; bajarilishidan oldin tekshiring.";
    return "FAYL QABUL QILINDI · "+source+" · "+name+". Faylni ochish inputga tayyorlandi; hali hech narsa bajarilmadi.";
  }
  if (e.kind === "command") return "GLOBAL ENTRY · "+source+" · "+e.command+". Draft staged; review it before pressing Launch.";
  if (e.kind === "share-text") return "SHARED TEXT · "+source+". Text staged for review; nothing has executed.";
  return "FILE RECEIVED · "+source+" · "+name+". Open request staged; nothing has executed.";
}
