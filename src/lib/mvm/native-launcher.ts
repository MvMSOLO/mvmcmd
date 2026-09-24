import { Capacitor, registerPlugin } from "@capacitor/core";

export interface NativeLaunchResult {
  launched: boolean;
  installed: boolean;
  error?: string;
  fallbackOpened?: boolean;
}

interface MvmLauncherPlugin {
  openCamera(): Promise<{ opened: boolean }>;
  inspectPackage(options: { packageName: string }): Promise<{
    found: boolean;
    packageName: string;
    label?: string;
    enabled?: boolean;
    launcherAvailable?: boolean;
    versionName?: string;
    versionCode?: number;
    error?: string;
  }>;
  openPackage(options: {
    packageName: string;
    action?: string;
    data?: string;
    fallbackUrl?: string;
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

export async function nativeOpenPackage(
  packageName: string,
  action?: string,
  data?: string,
  fallbackUrl?: string,
): Promise<NativeLaunchResult> {
  return NativeLauncher.openPackage({
    packageName,
    ...(action ? { action } : {}),
    ...(data ? { data } : {}),
    ...(fallbackUrl ? { fallbackUrl } : {}),
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

export async function nativeInspectPackage(packageName: string): Promise<{
  found: boolean;
  packageName: string;
  label?: string;
  enabled?: boolean;
  launcherAvailable?: boolean;
  versionName?: string;
  versionCode?: number;
  error?: string;
}> {
  return NativeLauncher.inspectPackage({ packageName });
}
