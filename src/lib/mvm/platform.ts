import type { PlatformKind } from "./types";

export interface RuntimeInfo {
  platform: PlatformKind;
  standalone: boolean;
  ua: string;
  language: string;
  online: boolean;
  touch: boolean;
}

export function detectRuntime(): RuntimeInfo {
  if (typeof navigator === "undefined") {
    return {
      platform: "desktop",
      standalone: false,
      ua: "",
      language: "en",
      online: true,
      touch: false,
    };
  }

  const ua = navigator.userAgent || "";
  const android = /android/i.test(ua);
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  let platform: PlatformKind = "desktop";
  if (android) platform = "android";
  else if (ios) platform = "ios";

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

  return {
    platform,
    standalone,
    ua,
    language: navigator.language || "en",
    online: navigator.onLine,
    touch: navigator.maxTouchPoints > 0 || "ontouchstart" in window,
  };
}

export function playStoreUrl(androidPackage: string): string {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(androidPackage)}`;
}

export function appStoreSearch(name: string): string {
  return `https://apps.apple.com/search?term=${encodeURIComponent(name)}`;
}
