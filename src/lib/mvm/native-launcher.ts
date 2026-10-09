import { Capacitor, registerPlugin } from "@capacitor/core";

export interface NativeLaunchResult {
  launched: boolean;
  installed: boolean;
  error?: string;
}

export type CapabilityDecision = "unset" | "allow" | "skip";
export type CapabilityState = "unknown" | "ready" | "denied" | "restricted" | "unavailable" | "error";

export interface NativeCapabilitySnapshot {
  id: string;
  state: CapabilityState;
  decision: CapabilityDecision;
  checkedAt: number;
  detail?: string;
  needsSettings?: boolean;
}

interface MvmFileToolsPlugin {
  getStorageOverview(): Promise<{ totalBytes: number; availableBytes: number; usedBytes: number; source: string }>;
  chooseFolder(): Promise<{ granted: boolean; uri?: string; name?: string; cancelled?: boolean }>;
  listFolder(options: { uri: string; query?: string; minBytes?: number; limit?: number }): Promise<{ items: Array<{ id: string; name: string; uri: string; mimeType: string; sizeBytes?: number; modifiedAt?: number; isDirectory: boolean }>; scanned: number; truncated: boolean }>;
  shareFile(options: { uri: string }): Promise<{ started: boolean; reason?: string }>;
  copyMoveFile(options: { sourceUri: string; destinationTreeUri: string; name: string; move: boolean }): Promise<{ status: string; uri?: string; message: string }>;
  deleteFile(options: { uri: string; confirmed: boolean }): Promise<{ deleted: boolean; message: string }>;
  createArchive(options: { treeUri: string; name: string; uris: string[] }): Promise<{ created: boolean; uri?: string; message: string }>;
}
const NativeFileTools = registerPlugin<MvmFileToolsPlugin>("MvmFileTools");
export async function nativeGetStorageOverview() { return NativeFileTools.getStorageOverview(); }
export async function nativeChooseFolder() { return NativeFileTools.chooseFolder(); }
export async function nativeListFolder(options: { uri: string; query?: string; minBytes?: number; limit?: number }) { return NativeFileTools.listFolder(options); }
export async function nativeShareFile(uri: string) { return NativeFileTools.shareFile({ uri }); }
export async function nativeCopyMoveFile(sourceUri: string, destinationTreeUri: string, name: string, move = false) { return NativeFileTools.copyMoveFile({ sourceUri, destinationTreeUri, name, move }); }
export async function nativeDeleteFile(uri: string, confirmed: boolean) { return NativeFileTools.deleteFile({ uri, confirmed }); }
export async function nativeCreateArchive(treeUri: string, name: string, uris: string[]) { return NativeFileTools.createArchive({ treeUri, name, uris }); }

interface MvmLauncherPlugin {
  openCamera(): Promise<{ opened: boolean }>;
  openQr(): Promise<{ opened: boolean }>;
  openWallpaper(): Promise<{ opened: boolean }>;
  openNotifications(): Promise<{ opened: boolean }>;
  openEnglish(): Promise<{ opened: boolean }>;
  openPackage(options: {
    packageName: string;
    action?: string;
    data?: string;
  }): Promise<NativeLaunchResult>;
  openUrl(options: { url: string }): Promise<{ opened: boolean }>;
  openStore(options: { packageName: string; webUrl?: string }): Promise<{ opened: boolean }>;
  checkCapabilities(options?: { capabilityId?: string }): Promise<{
    capabilities: NativeCapabilitySnapshot[];
    checkedAt: number;
  }>;
  requestCapability(options: {
    capabilityId: string;
    decision: "allow";
  }): Promise<NativeCapabilitySnapshot & { needsSettings?: boolean }>;
  share(options: { text?: string; mime?: string; chooser?: boolean; fileUri?: string }): Promise<{ started: boolean; method?: string; reason?: string }>;
  lookupContact(options: { query: string }): Promise<{ found: boolean; name?: string; phone?: string }>;
  openDialer(options: { phone: string }): Promise<{ opened: boolean }>;
  openSmsComposer(options: { phone: string; body: string }): Promise<{ opened: boolean }>;
  openEmailComposer(options: { email: string; subject?: string; body?: string }): Promise<{ opened: boolean }>;
  setCapabilityDecision(options: {
    capabilityId: string;
    decision: "skip" | "allow";
  }): Promise<NativeCapabilitySnapshot>;
}

const NativeLauncher = registerPlugin<MvmLauncherPlugin>("MvmLauncher");

export function canUseNativeAndroidLauncher(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function nativeOpenCamera(): Promise<{ opened: boolean }> {
  return NativeLauncher.openCamera();
}

export async function nativeOpenQr(): Promise<{ opened: boolean }> {
  return NativeLauncher.openQr();
}

export async function nativeOpenWallpaper(): Promise<{ opened: boolean }> {
  return NativeLauncher.openWallpaper();
}

export async function nativeOpenNotifications(): Promise<{ opened: boolean }> {
  return NativeLauncher.openNotifications();
}

export async function nativeOpenEnglish(): Promise<{ opened: boolean }> {
  return NativeLauncher.openEnglish();
}

export async function nativeOpenPackage(
  packageName: string,
  action?: string,
  data?: string,
): Promise<NativeLaunchResult> {
  return NativeLauncher.openPackage({
    packageName,
    ...(action ? { action } : {}),
    ...(data ? { data } : {}),
  });
}

export async function nativeOpenUrl(url: string): Promise<{ opened: boolean }> {
  return NativeLauncher.openUrl({ url });
}

export async function nativeOpenStore(
  packageName: string,
  webUrl?: string,
): Promise<{ opened: boolean }> {
  return NativeLauncher.openStore({
    packageName,
    ...(webUrl ? { webUrl } : {}),
  });
}

export async function nativeShare(options: { text?: string; mime?: string; chooser?: boolean; fileUri?: string }): Promise<{ started: boolean; method?: string; reason?: string }> {
  return NativeLauncher.share(options);
}

export async function nativeLookupContact(query: string): Promise<{ found: boolean; name?: string; phone?: string }> {
  return NativeLauncher.lookupContact({ query });
}

export async function nativeOpenDialer(phone: string): Promise<{ opened: boolean }> {
  return NativeLauncher.openDialer({ phone });
}

export async function nativeOpenSmsComposer(phone: string, body: string): Promise<{ opened: boolean }> {
  return NativeLauncher.openSmsComposer({ phone, body });
}

export async function nativeOpenEmailComposer(email: string, subject = "", body = ""): Promise<{ opened: boolean }> {
  return NativeLauncher.openEmailComposer({ email, subject, body });
}

export async function nativeCheckCapabilities(
  capabilityId?: string,
): Promise<NativeCapabilitySnapshot[]> {
  const result = await NativeLauncher.checkCapabilities(
    capabilityId ? { capabilityId } : undefined,
  );
  return result.capabilities;
}

export async function nativeRequestCapability(
  capabilityId: string,
): Promise<NativeCapabilitySnapshot & { needsSettings?: boolean }> {
  return NativeLauncher.requestCapability({
    capabilityId,
    decision: "allow",
  });
}

export async function nativeSkipCapability(capabilityId: string): Promise<NativeCapabilitySnapshot> {
  return NativeLauncher.setCapabilityDecision({
    capabilityId,
    decision: "skip",
  });
}

export async function nativeAllowCapability(capabilityId: string): Promise<NativeCapabilitySnapshot> {
  return NativeLauncher.setCapabilityDecision({
    capabilityId,
    decision: "allow",
  });
}
