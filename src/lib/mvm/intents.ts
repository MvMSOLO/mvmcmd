import { appStoreSearch, playStoreUrl } from "./platform";
import {
  canUseNativeAndroidLauncher,
  nativeOpenPackage,
  nativeOpenStore,
  nativeOpenUrl,
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

function nativeAndroidPackageLaunch(app: CatalogApp): void {
  if (!app.androidPackage) return;

  void nativeOpenPackage(app.androidPackage, app.androidAction, app.androidData, app.webUrl).then((result) => {
    if (result.launched) return;

    // The native plugin already attempted the real store/web fallback.
    // Keep a final web escape hatch for devices with unusual package-manager behavior.
    if (result.fallbackOpened) return;

    if (!result.installed) {
      void nativeOpenStore(app.androidPackage!, app.webUrl);
      return;
    }

    if (app.webUrl) void nativeOpenUrl(app.webUrl);
  }).catch(() => {
    if (app.webUrl) void nativeOpenUrl(app.webUrl);
  });
}

export function launchApp(
  app: CatalogApp,
  platform: PlatformKind,
): LaunchResult {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(16);
    } catch {
      /* ignore */
    }
  }

  if (platform === "android") {
    // Capacitor Android must use the native PackageManager path. Navigating
    // intent:// from inside Android WebView is unreliable and can leave the
    // user on the same page while the UI falsely reports a launch.
    if (canUseNativeAndroidLauncher() && app.androidPackage) {
      nativeAndroidPackageLaunch(app);
      return {
        ok: true,
        method: "intent",
        url: app.androidPackage,
        app,
        note: "NATIVE ANDROID INTENT",
      };
    }

    const intent = androidLaunchUrl(app);
    if (intent) {
      fireNavigate(intent);
      return {
        ok: true,
        method: "intent",
        url: intent,
        app,
        note: "ANDROID INTENT",
      };
    }

    const web = webLaunchUrl(app);
    if (web) {
      fireTab(web);
      return { ok: true, method: "web", url: web, app, note: "WEB SURFACE" };
    }
  }

  if (platform === "ios") {
    const scheme = iosLaunchUrl(app);
    if (scheme) {
      fireNavigate(scheme);
      return {
        ok: true,
        method: "scheme",
        url: scheme,
        app,
        note: "IOS SCHEME",
      };
    }
    const web = webLaunchUrl(app);
    if (web) {
      fireTab(web);
      return { ok: true, method: "web", url: web, app, note: "WEB SURFACE" };
    }
  }

  const web = webLaunchUrl(app);
  if (web) {
    if (/^(tel:|sms:|mailto:)/i.test(web)) {
      fireNavigate(web);
      return { ok: true, method: "protocol", url: web, app, note: "PROTOCOL" };
    }
    const opened = fireTab(web);
    if (!opened) fireNavigate(web);
    return { ok: true, method: "web", url: web, app, note: "WEB SURFACE" };
  }

  const store = storeUrl(app, platform);
  if (store) {
    fireTab(store);
    return { ok: true, method: "store", url: store, app, note: "STORE" };
  }

  return {
    ok: false,
    method: "web",
    url: "",
    app,
    note: "NO TARGET",
  };
}

export function launchStore(app: CatalogApp, platform: PlatformKind): LaunchResult {
  const url = storeUrl(app, platform);
  if (!url) {
    return { ok: false, method: "store", url: "", app, note: "NO STORE" };
  }

  if (platform === "android" && canUseNativeAndroidLauncher() && app.androidPackage) {
    void nativeOpenStore(app.androidPackage, app.webUrl);
    return { ok: true, method: "store", url, app, note: "NATIVE STORE" };
  }

  fireTab(url);
  return { ok: true, method: "store", url, app, note: "STORE" };
}

export function launchPackage(pkg: string): LaunchResult {
  const stub: CatalogApp = {
    id: pkg,
    name: pkg,
    aliases: [],
    androidPackage: pkg,
    category: "tool",
    weight: 1,
  };

  if (canUseNativeAndroidLauncher()) {
    void nativeOpenPackage(pkg);
    return {
      ok: true,
      method: "intent",
      url: pkg,
      app: stub,
      note: "NATIVE RAW PACKAGE",
    };
  }

  const url = androidLaunchUrl(stub)!;
  fireNavigate(url);
  return { ok: true, method: "intent", url, app: stub, note: "RAW PACKAGE" };
}

export function launchRawUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url) && !/^(tel:|sms:|mailto:)/i.test(url)) {
    return false;
  }
  if (/^(tel:|sms:|mailto:)/i.test(url)) fireNavigate(url);
  else fireTab(url);
  return true;
}
