import { Capacitor, registerPlugin } from "@capacitor/core";

export interface NativeLaunchResult {
  launched: boolean;
  installed: boolean;
  error?: string;
}

interface MvmLauncherPlugin {
  openCamera(): Promise<{ opened: boolean }>;
  openQr(): Promise<{ opened: boolean }>;
  openWallpaper(): Promise<{ opened: boolean }>;
  openTemperature(options?: { enableOverlay?: boolean }): Promise<{ opened: boolean; overlayPermission?: boolean }>;
  stopTemperatureOverlay(): Promise<{ stopped: boolean }>;
  shareTemperatureReport(): Promise<{ opened: boolean }>;
  openPackage(options: {
    packageName: string;
    action?: string;
    data?: string;
  }): Promise<NativeLaunchResult>;
  openUrl(options: { url: string }): Promise<{ opened: boolean }>;
  openStore(options: { packageName: string; webUrl?: string }): Promise<{ opened: boolean }>;
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

export async function nativeOpenTemperature(options?: { enableOverlay?: boolean }): Promise<{ opened: boolean; overlayPermission?: boolean }> { return NativeLauncher.openTemperature(options); }

export async function nativeStopTemperatureOverlay(): Promise<{ stopped: boolean }> { return NativeLauncher.stopTemperatureOverlay(); }

export async function nativeShareTemperatureReport(): Promise<{ opened: boolean }> { return NativeLauncher.shareTemperatureReport(); }

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
