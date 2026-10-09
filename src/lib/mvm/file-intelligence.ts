import { Capacitor, registerPlugin } from "@capacitor/core";

export type FileUtilityStatus = "verified" | "started" | "unavailable" | "failed" | "needs_confirmation";
export interface FileEntry {
  id: string;
  name: string;
  uri: string;
  mimeType: string;
  sizeBytes?: number;
  modifiedAt?: number;
  isDirectory: boolean;
}
export interface FileUtilityResult {
  status: FileUtilityStatus;
  message: string;
  items?: FileEntry[];
  detail?: string;
  verified: boolean;
}
interface NativeFileToolsPlugin {
  getStorageOverview(): Promise<{ totalBytes: number; availableBytes: number; usedBytes: number; source: string }>;
  chooseFolder(): Promise<{ granted: boolean; uri?: string; name?: string; cancelled?: boolean }>;
  listFolder(options: { uri: string; query?: string; minBytes?: number; limit?: number }): Promise<{ items: FileEntry[]; scanned: number; truncated: boolean }>;
  shareFile(options: { uri: string }): Promise<{ started: boolean; reason?: string }>;
  copyMoveFile(options: { sourceUri: string; destinationTreeUri: string; name: string; move: boolean }): Promise<{ status: string; uri?: string; message: string }>;
  deleteFile(options: { uri: string; confirmed: boolean }): Promise<{ deleted: boolean; message: string }>;
  createArchive(options: { treeUri: string; name: string; uris: string[] }): Promise<{ created: boolean; uri?: string; message: string }>;
}
const NativeFiles = registerPlugin<NativeFileToolsPlugin>("MvmFileTools");
const nativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export function formatStorageOverview(totalBytes: number, availableBytes: number, usedBytes: number) {
  const valid = [totalBytes, availableBytes, usedBytes].every((n) => Number.isFinite(n) && n >= 0);
  if (!valid || totalBytes < availableBytes || Math.abs(totalBytes - availableBytes - usedBytes) > Math.max(1024 * 1024, totalBytes * 0.02)) {
    return { valid: false, totalBytes, availableBytes, usedBytes, percentUsed: null as number | null };
  }
  return { valid: true, totalBytes, availableBytes, usedBytes, percentUsed: totalBytes ? Math.min(100, Math.max(0, usedBytes / totalBytes * 100)) : 0 };
}
export function isSafeFileEntry(item: Pick<FileEntry, "uri" | "name" | "isDirectory">): boolean {
  const uri = item.uri.trim();
  const name = item.name.trim();
  if (!uri || !name || name === "." || name === "..") return false;
  if (/^(file:\/\/|content:\/\/com\.android\.externalstorage\.documents\/root\/primary%3AAndroid%2Fdata)/i.test(uri)) return false;
  if (/^(\/|[A-Za-z]:\\)/.test(name) || name.includes("\0") || name.includes("/") || name.includes("\\")) return false;
  return true;
}
export function classifyMedia(mimeType: string, name: string): "image" | "video" | "audio" | "document" | "archive" | "other" {
  const mime = mimeType.toLowerCase();
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["jpg","jpeg","png","webp","gif","heic","heif"].includes(ext)) return "image";
  if (mime.startsWith("video/") || ["mp4","mkv","mov","webm","3gp"].includes(ext)) return "video";
  if (mime.startsWith("audio/") || ["mp3","m4a","wav","ogg","flac","aac"].includes(ext)) return "audio";
  if (["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain"].includes(mime) || ["pdf","doc","docx","txt","rtf","odt"].includes(ext)) return "document";
  if (["zip","7z","rar","tar","gz"].includes(ext) || mime.includes("zip") || mime.includes("compressed")) return "archive";
  return "other";
}
export async function getStorageOverview(): Promise<FileUtilityResult & { storage?: ReturnType<typeof formatStorageOverview> }> {
  if (!nativeAndroid()) return { status: "unavailable", message: "Accurate storage overview requires the native Android device engine.", verified: false };
  try {
    const s = await NativeFiles.getStorageOverview();
    const storage = formatStorageOverview(s.totalBytes, s.availableBytes, s.usedBytes);
    return storage.valid
      ? { status: "verified", message: `Storage read from Android (${s.source}).`, verified: true, storage }
      : { status: "failed", message: "Android returned inconsistent storage numbers; no estimate substituted.", verified: false, storage };
  } catch (e) {
    return { status: "failed", message: "Could not read storage from Android.", verified: false, detail: e instanceof Error ? e.message : "unknown error" };
  }
}
export async function chooseFolder(): Promise<FileUtilityResult & { uri?: string }> {
  if (!nativeAndroid()) return { status: "unavailable", message: "Folder access requires Android's scoped Storage Access Framework.", verified: false };
  try {
    const r = await NativeFiles.chooseFolder();
    if (r.cancelled) return { status: "started", message: "Folder selection cancelled; no files were changed.", verified: true };
    if (!r.granted || !r.uri) return { status: "failed", message: "Folder access was not granted.", verified: false };
    return { status: "verified", message: `Scoped access granted for ${r.name ?? "selected folder"}.`, verified: true, uri: r.uri };
  } catch (e) {
    return { status: "failed", message: "Could not open Android folder picker.", verified: false, detail: e instanceof Error ? e.message : "unknown error" };
  }
}
export async function listFolder(uri: string, options: { query?: string; minBytes?: number; limit?: number } = {}): Promise<FileUtilityResult & { scanned?: number; truncated?: boolean }> {
  if (!nativeAndroid()) return { status: "unavailable", message: "File discovery is available only in the native Android app.", verified: false };
  if (!uri.trim() || !uri.startsWith("content://")) return { status: "failed", message: "Choose a folder using Android's folder picker first.", verified: false };
  if (options.minBytes !== undefined && (!Number.isFinite(options.minBytes) || options.minBytes < 0)) return { status: "failed", message: "Minimum file size must be a non-negative number.", verified: false };
  try {
    const r = await NativeFiles.listFolder({ uri, query: options.query?.trim(), minBytes: options.minBytes, limit: Math.min(1000, Math.max(1, options.limit ?? 200)) });
    const safe = r.items.filter(isSafeFileEntry);
    return { status: "verified", message: `Scanned ${r.scanned} scoped entries; ${safe.length} matched.${r.truncated ? " Results were capped." : ""}`, verified: true, items: safe, scanned: r.scanned, truncated: r.truncated };
  } catch (e) {
    return { status: "failed", message: "Scoped folder scan failed; no files were changed.", verified: false, detail: e instanceof Error ? e.message : "unknown error" };
  }
}
export async function copyMoveScopedFile(sourceUri: string, destinationTreeUri: string, name: string, move = false): Promise<FileUtilityResult> {
  if (!nativeAndroid()) return { status: "unavailable", message: "Scoped file copy/move requires Android.", verified: false };
  if (!sourceUri.startsWith("content://") || !destinationTreeUri.startsWith("content://") || !name.trim() || name.trim() === "." || name.trim() === ".." || name.trim().length > 180 || /[\\/\\0]/.test(name)) return { status: "failed", message: "Source, destination and a safe filename are required.", verified: false };
  try {
    const r = await NativeFiles.copyMoveFile({ sourceUri, destinationTreeUri, name: name.trim(), move });
    return r.status === "verified" ? { status: "verified", message: r.message, verified: true, items: r.uri ? [{id:r.uri,uri:r.uri,name:name.trim(),mimeType:"application/octet-stream",isDirectory:false}] : [] } : { status: "failed", message: r.message, verified: false };
  } catch (e) { return { status: "failed", message: "Copy/move failed.", verified: false, detail: e instanceof Error ? e.message : "unknown error" }; }
}
export async function deleteScopedFile(uri: string, confirmed: boolean): Promise<FileUtilityResult> {
  if (!nativeAndroid()) return { status: "unavailable", message: "Scoped deletion requires Android.", verified: false };
  if (!confirmed) return { status: "needs_confirmation", message: "Deletion requires explicit confirmation.", verified: false };
  if (!uri.startsWith("content://")) return { status: "failed", message: "Only a scoped content URI can be deleted.", verified: false };
  try { const r = await NativeFiles.deleteFile({ uri, confirmed }); return r.deleted ? { status: "verified", message: r.message, verified: true } : { status: "failed", message: r.message, verified: false }; }
  catch (e) { return { status: "failed", message: "Delete failed.", verified: false, detail: e instanceof Error ? e.message : "unknown error" }; }
}
export async function createScopedArchive(treeUri: string, name: string, uris: string[]): Promise<FileUtilityResult> {
  if (!nativeAndroid()) return { status: "unavailable", message: "ZIP creation requires Android.", verified: false };
  if (!treeUri.startsWith("content://") || !/^[a-zA-Z0-9 _.-]{1,76}\.zip$/i.test(name) || uris.length === 0 || uris.length > 500 || uris.some((uri) => !uri.startsWith("content://"))) return { status: "failed", message: "Choose a destination and at least one scoped file; use a safe .zip name.", verified: false };
  try { const r = await NativeFiles.createArchive({ treeUri, name, uris }); return r.created ? { status: "verified", message: r.message, verified: true, items: r.uri ? [{id:r.uri,uri:r.uri,name,mimeType:"application/zip",isDirectory:false}] : [] } : { status: "failed", message: r.message, verified: false }; }
  catch (e) { return { status: "failed", message: "ZIP creation failed.", verified: false, detail: e instanceof Error ? e.message : "unknown error" }; }
}
export async function shareScopedFile(uri: string): Promise<FileUtilityResult> {
  if (!nativeAndroid()) return { status: "unavailable", message: "Scoped file sharing requires Android.", verified: false };
  if (!uri.startsWith("content://")) return { status: "failed", message: "Only a scoped content URI can be shared.", verified: false };
  try {
    const r = await NativeFiles.shareFile({ uri });
    return r.started ? { status: "started", message: "Android share chooser opened; recipient delivery is not verified.", verified: false } : { status: "failed", message: r.reason ?? "Share chooser could not be opened.", verified: false };
  } catch (e) {
    return { status: "failed", message: "Could not share this scoped file.", verified: false, detail: e instanceof Error ? e.message : "unknown error" };
  }
}

let selectedFolderUri: string | undefined;
let selectedFolderName: string | undefined;
export async function runFileCommand(args: string[]): Promise<string[]> {
  const operation = (args[0] ?? "storage").toLowerCase();
  if (operation === "storage") {
    const result = await getStorageOverview();
    if (!result.storage?.valid) return [`FILES  ${result.status.toUpperCase()}`, result.message];
    const s = result.storage;
    const fmt = (n: number) => {
      const units = ["B", "KB", "MB", "GB", "TB"]; let v = n, i = 0;
      while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
      return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
    };
    return [`STORAGE  VERIFIED · ${s.percentUsed?.toFixed(1)}% used`, `TOTAL ${fmt(s.totalBytes)} · USED ${fmt(s.usedBytes)} · FREE ${fmt(s.availableBytes)}`, result.message];
  }
  if (operation === "choose") {
    const result = await chooseFolder();
    if (result.uri) { selectedFolderUri = result.uri; selectedFolderName = result.message.replace(/^Scoped access granted for /, "").replace(/\.$/, ""); }
    return [`FOLDER  ${result.status.toUpperCase()}`, result.message, ...(result.uri ? ["Folder permission is scoped and saved for this session."] : [])];
  }
  if (operation === "share") {
    const result = await shareScopedFile(args[1] ?? "");
    return [`SHARE  ${result.status.toUpperCase()}`, result.message];
  }
  if (operation === "delete") {
    const uri = args[1] ?? "";
    const confirmed = (args[2] ?? "").toLowerCase() === "confirm";
    if (!confirmed) return ["FILES  NEEDS_CONFIRMATION", "Review the exact content URI, then run `files delete <content-uri> confirm`. This permanently deletes the selected item if Android permits it."];
    const result = await deleteScopedFile(uri, true);
    return [`DELETE  ${result.status.toUpperCase()}`, result.message];
  }
  if (!selectedFolderUri) return ["FILES  NEEDS_FOLDER", "Run `files choose` and select a folder in Android system picker first. No broad storage access is requested."];
  if (operation === "downloads" && !/download/i.test(selectedFolderName ?? "")) return ["FILES  NEEDS_FOLDER", "Run `files choose` and select Downloads, then run `files downloads`."];
  if (operation === "documents" && !/document/i.test(selectedFolderName ?? "")) return ["FILES  NEEDS_FOLDER", "Run `files choose` and select Documents, then run `files documents`."];
  if (operation === "copy" || operation === "move") {
    const sourceUri = args[1] ?? "";
    const name = args[2] ?? "";
    if (!sourceUri.startsWith("content://") || !name) return ["FILES  FAILED", "Usage: files copy <content-uri> <new-name> OR files move <content-uri> <new-name>. Destination is the selected folder."];
    if (operation === "move" && (args[3] ?? "").toLowerCase() !== "confirm") return ["FILES  NEEDS_CONFIRMATION", "Copy will be created first. Confirm the source removal with: files move <content-uri> <new-name> confirm"];
    const result = await copyMoveScopedFile(sourceUri, selectedFolderUri, name, operation === "move" && (args[3] ?? "").toLowerCase() === "confirm");
    return [`${operation.toUpperCase()}  ${result.status.toUpperCase()}`, result.message, ...(result.detail ? [result.detail] : [])];
  }
  if (operation === "zip") {
    const name = args[1] ?? "";
    const uris = args.slice(2).filter((v) => v.startsWith("content://"));
    const result = await createScopedArchive(selectedFolderUri, name, uris);
    return [`ZIP  ${result.status.toUpperCase()}`, result.message, ...(result.detail ? [result.detail] : [])];
  }
  let query = "";
  let minBytes = 0;
  if (operation === "find") query = args.slice(1).join(" ");
  if (operation === "media" && args[1] && !["image","video","audio","document","archive","other"].includes(args[1].toLowerCase())) return ["FILES  FAILED", "Use `files media image|video|audio|document|archive|other`."];
  if (operation === "large") {
    const mb = Number(args[1] ?? 50);
    if (!Number.isFinite(mb) || mb < 1 || mb > 102400) return ["FILES  FAILED", "Use a size threshold from 1 MB to 102400 MB."];
    minBytes = mb * 1024 * 1024;
  }
  const result = await listFolder(selectedFolderUri, { query, minBytes, limit: 200 });
  if (!result.items) return [`FILES  ${result.status.toUpperCase()}`, result.message, ...(result.detail ? [result.detail] : [])];
  let rows = result.items.slice().sort((a,b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0));
  if (operation === "media" && args[1]) rows = rows.filter((item) => classifyMedia(item.mimeType, item.name) === args[1].toLowerCase());
  if (operation === "documents") rows = rows.filter((item) => item.isDirectory || classifyMedia(item.mimeType, item.name) === "document");
  if (operation === "recent") rows.sort((a,b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
  if (operation === "cleanup") {
    const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
    const large = rows.filter((item) => !item.isDirectory && (item.sizeBytes ?? 0) >= 100 * 1024 * 1024).slice(0, 10);
    const old = rows.filter((item) => !item.isDirectory && (item.modifiedAt ?? 0) > 0 && (item.modifiedAt ?? 0) < cutoff).slice(0, 10);
    const byKey = new Map<string, FileEntry[]>();
    for (const item of rows.filter((entry) => !entry.isDirectory && entry.sizeBytes !== undefined)) {
      const key = `${item.sizeBytes}:${item.name.toLowerCase()}`;
      byKey.set(key, [...(byKey.get(key) ?? []), item]);
    }
    const candidates = [...byKey.values()].filter((group) => group.length > 1).flat().slice(0, 10);
    return ["CLEANUP  PLAN ONLY", "No files were deleted or changed. Review each item manually before a separate confirmed delete command.", `Large files (>=100 MB): ${large.length}${large.length ? " — " + large.map((item) => `${item.name} (${item.sizeBytes} bytes)`).join("; ") : ""}`, `Older than 180 days: ${old.length}${old.length ? " — " + old.map((item) => item.name).join("; ") : ""}`, `Possible duplicate candidates: ${candidates.length}${candidates.length ? " — " + candidates.map((item) => `${item.name} (${item.sizeBytes} bytes)`).join("; ") : ""}`, "Age and matching names are suggestions only; they do not prove a file is safe to remove."];
  }
  if (operation === "duplicates") {
    const groups = new Map<string, FileEntry[]>();
    for (const item of rows.filter((entry) => !entry.isDirectory && entry.sizeBytes !== undefined)) {
      const key = `${item.sizeBytes}:${item.name.toLowerCase()}`;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    const candidates = [...groups.values()].filter((group) => group.length > 1).flat();
    const lines = candidates.slice(0, 30).map((item) => `POSSIBLE DUPLICATE · ${item.name} · ${item.sizeBytes} bytes · ${item.uri}`);
    return ["DUPLICATES  CANDIDATES ONLY", "Grouped by matching filename and size; content hashes are not checked, so these are not verified duplicates.", ...lines];
  }
  const shown = rows.slice(0, 30).map((item) => `${item.isDirectory ? "[DIR]" : classifyMedia(item.mimeType, item.name).toUpperCase()} · ${item.name} · ${item.sizeBytes === undefined ? "folder" : item.sizeBytes + " bytes"} · ${item.uri}`);
  return [`FILES  VERIFIED · ${rows.length} result(s)`, result.message, ...shown, ...(rows.length > shown.length ? [`+ ${rows.length - shown.length} more omitted`] : [])];
}
