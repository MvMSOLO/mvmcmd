import type { Lang } from "./types";

export const copy = {
  grantStorage: { uz: "Xotira", en: "Storage" },
  grantNotify: { uz: "Ogohlantirish", en: "Alerts" },
  grantInstall: { uz: "O‘rnatish", en: "Install" },
  grantSkip: { uz: "Davom etish", en: "Continue" },
  grantLead: {
    uz: "Ruxsatlar brauzer orqali haqiqiy so‘raladi. Saqlash — alias va tarix uchun. Ogohlantirish ixtiyoriy.",
    en: "Permissions are requested from the browser for real. Storage keeps aliases. Alerts are optional.",
  },
  grantTitle: { uz: "KIRISH RUXSATI", en: "ENTRY CLEARANCE" },
  prompt: { uz: "nom yozing", en: "type a name" },
  launch: { uz: "OCHISH", en: "LAUNCH" },
  emptyMatch: { uz: "Mos ilova yo‘q", en: "No match" },
  recents: { uz: "Yaqinda", en: "Recents" },
  pinned: { uz: "Qadalgan", en: "Pinned" },
  catalog: { uz: "Katalog", en: "Catalog" },
  ready: { uz: "TAYYOR", en: "READY" },
  miss: {
    uz: "Telefonda yo‘q bo‘lsa, store yozing.",
    en: "If it is not on this phone, type store.",
  },
} as const;

export function t(lang: Lang, key: keyof typeof copy): string {
  return copy[key][lang];
}
