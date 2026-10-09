import type { CommandSpec } from "./types";
import { normalizeCommandHead } from "./compatibility.ts";

export const COMMANDS: CommandSpec[] = [
  {
    name: "gaming",
    aliases: ["game", "game-mode", "game-booster", "gaming-mode", "oyin", "o'yin"],
    usage: "gaming [game|before <game>|after <game>|launch <game>]",
    summaryEn: "Assess real telemetry, launch a game, or compare before/after gaming state.",
    summaryUz: "Gaming telemetrysini baholaydi, o‘yinni ochadi yoki oldin/keyin holatni solishtiradi.",
  },  {
    name: "english",
    aliases: ["en", "english-learning", "ielts"],
    hidden: true,
    usage: "ENGLISH",
    summaryEn: "Open the MVMCMD English Learning + IELTS Lab.",
    summaryUz: "MVMCMD English Learning va IELTS Labini ochadi.",
  },  {
    name: "notification",
    aliases: ["notifications", "notify"],
    hidden: true,
    usage: "NOTIFICATION",
    summaryEn: "Open the native MVMCMD notification center.",
    summaryUz: "Native MVMCMD notification markazini ochadi.",
  },  {
    name: "camera",
    aliases: [],
    hidden: true,
    usage: "CAMERA",
    summaryEn: "Open the native MVMCMD camera.",
    summaryUz: "MVMCMD native kamerasini ochadi.",
  },
  {
    name: "qr",
    aliases: [],
    hidden: true,
    usage: "QR",
    summaryEn: "Open the native MVMCMD QR/barcode scanner.",
    summaryUz: "MVMCMD native QR/barcode skanerini ochadi.",
  },
  {
    name: "wallpaper",
    aliases: ["wall", "wp"],
    usage: "WALLPAPER",
    summaryEn: "Open the native 3D wallpaper gallery.",
    summaryUz: "Native 3D wallpaper galereyasini ochadi.",
  },
  {
    name: "open",
    aliases: ["o", "go", "run", "start", "launch"],
    usage: "open <name>",
    summaryEn: "Launch the closest installed/known app.",
    summaryUz: "Eng yaqin ilovani ochadi.",
  },
  {
    name: "ls",
    aliases: ["list", "apps"],
    usage: "ls [category]",
    summaryEn: "List catalog, optional category filter.",
    summaryUz: "Katalogni chiqaradi, kategoriya bo‘yicha.",
  },
  {
    name: "find",
    aliases: ["search", "q"],
    usage: "find <text>",
    summaryEn: "Ranked search without launching.",
    summaryUz: "Ochmasdan qidiruv natijalari.",
  },
  {
    name: "bind",
    aliases: ["alias"],
    usage: "bind <short> <app>",
    summaryEn: "Bind a personal shortcut to an app.",
    summaryUz: "Shaxsiy qisqa nom bog‘laydi.",
  },
  {
    name: "unbind",
    aliases: ["unalias"],
    usage: "unbind <short>",
    summaryEn: "Remove a personal shortcut.",
    summaryUz: "Qisqa nomni olib tashlaydi.",
  },
  {
    name: "pin",
    aliases: [],
    usage: "pin <app>",
    summaryEn: "Pin an app to the rail.",
    summaryUz: "Ilovani chap panelga qadadi.",
  },
  {
    name: "unpin",
    aliases: [],
    usage: "unpin <app>",
    summaryEn: "Remove a pin.",
    summaryUz: "Qadalgan ilovani yechadi.",
  },
  {
    name: "session",
    aliases: ["context", "memory"],
    usage: "session [show|clear]",
    summaryEn: "Inspect or clear volatile session context and command history.",
    summaryUz: "Joriy vaqtinchalik sessiya konteksti va buyruqlar tarixini ko‘rsatadi yoki tozalaydi.",
  },
  {
    name: "hist",
    aliases: ["history"],
    usage: "hist",
    summaryEn: "Show recent commands.",
    summaryUz: "Oxirgi buyruqlar.",
  },
  {
    name: "recents",
    aliases: ["recent"],
    usage: "recents",
    summaryEn: "Recently launched apps.",
    summaryUz: "Yaqinda ochilgan ilovalar.",
  },
  {
    name: "clear",
    aliases: ["cls"],
    usage: "clear",
    summaryEn: "Clear the log.",
    summaryUz: "Ekranni tozalaydi.",
  },
  {
    name: "perm",
    aliases: ["perms", "permissions"],
    usage: "perm",
    summaryEn: "Show / re-request device permissions.",
    summaryUz: "Ruxsatlarni ko‘rsatadi yoki so‘raydi.",
  },
  {
    name: "install",
    aliases: ["pwa"],
    usage: "install",
    summaryEn: "Install MVMCMD on this phone.",
    summaryUz: "MVMCMD ni telefonga o‘rnatadi.",
  },
  {
    name: "store",
    aliases: ["market"],
    usage: "store <app>",
    summaryEn: "Open the store page for an app.",
    summaryUz: "Do‘kon sahifasini ochadi.",
  },
  {
    name: "pack",
    aliases: ["package", "apk"],
    usage: "pack <package.name>",
    summaryEn: "Launch a raw Android package through the Phase 9 app bridge.",
    summaryUz: "Phase 9 app bridge orqali Android package nomini ochadi.",
  },
  {
    name: "contact",
    aliases: ["contacts"],
    usage: "contact <name|number>",
    summaryEn: "Look up an explicitly requested contact.",
    summaryUz: "Aniq so‘ralgan kontaktni qidiradi.",
  },
  {
    name: "dial",
    aliases: ["call"],
    usage: "dial <phone>",
    summaryEn: "Open the phone dialer without placing a call.",
    summaryUz: "Qo‘ng‘iroq qilmasdan telefon terish oynasini ochadi.",
  },
  {
    name: "sms",
    aliases: ["text"],
    usage: "sms <phone> <message>",
    summaryEn: "Open the SMS composer; delivery is never inferred.",
    summaryUz: "SMS yozish oynasini ochadi; yuborilgani tasdiqlanmaydi.",
  },
  {
    name: "email",
    aliases: ["mail"],
    usage: "email <address> [subject] [body]",
    summaryEn: "Open an email composer; delivery is never inferred.",
    summaryUz: "Email yozish oynasini ochadi; yuborilgani tasdiqlanmaydi.",
  },
  {
    name: "copy",
    aliases: [],
    usage: "copy <text>",
    summaryEn: "Copy explicit text to the clipboard.",
    summaryUz: "Aniq matnni clipboardga nusxalaydi.",
  },
  {
    name: "paste",
    aliases: ["clipboard"],
    usage: "paste",
    summaryEn: "Read the clipboard only after an explicit command.",
    summaryUz: "Faqat aniq buyruq berilganda clipboardni o‘qiydi.",
  },
  {
    name: "share",
    aliases: ["send"],
    usage: "share <text>",
    summaryEn: "Share explicit text. Private files are not granted silently.",
    summaryUz: "Aniq matnni ulashadi. Yashirin fayl jim berilmaydi.",
  },
  {
    name: "link",
    aliases: ["url", "deeplink"],
    usage: "link <url>",
    summaryEn: "Open a validated URL or deep link. Completion stays STARTED.",
    summaryUz: "Tekshirilgan URL yoki deep linkni ochadi. Natija STARTED.",
  },
  {
    name: "openfile",
    aliases: ["open-file"],
    hidden: true,
    usage: "openfile <incoming-file-uri>",
    summaryEn: "Hand a reviewed incoming file to the system handler.",
    summaryUz: "Tekshirilgan kiruvchi faylni tizimdagi mos dasturga uzatadi.",
  },
  {
    name: "files",
    aliases: ["file", "storage", "large-files", "file-search"],
    usage: "files [storage|choose|list|find <text>|large <MB>|recent|media [type]|duplicates|downloads|documents|cleanup|share <uri>|copy <uri> <name>|move <uri> <name> confirm|delete <uri> confirm|zip <name.zip> <uri...>]",
    summaryEn: "Inspect storage and search files only inside a folder explicitly selected through Android scoped access.",
    summaryUz: "Xotira va fayllarni faqat Android ruxsat bergan tanlangan papka ichida tekshiradi.",
  },
  {
    name: "device",
    aliases: ["hardware", "monitor", "device-info"],
    usage: "device",
    summaryEn: "Read real Android device, battery, memory, thermal, display, network and sensor data.",
    summaryUz: "Android qurilma, batareya, RAM, temperatura, ekran, tarmoq va sensorlarni real o‘qiydi.",
  },
  {
    name: "sys",
    aliases: ["info", "status"],
    usage: "sys",
    summaryEn: "Runtime, platform, catalog size.",
    summaryUz: "Tizim holati.",
  },
  {
    name: "about",
    aliases: [],
    usage: "about",
    summaryEn: "What MVMCMD is.",
    summaryUz: "MVMCMD nima.",
  },
  {
    name: "lang",
    aliases: ["language"],
    usage: "lang uz|en",
    summaryEn: "Switch UI language.",
    summaryUz: "Tilni almashtiradi.",
  },
  {
    name: "compat",
    aliases: ["compatibility", "oem", "device-compatibility", "moslik", "mosliklar"],
    usage: "compat",
    summaryEn: "Inspect real Android API level, OEM hints, permission gates and safe fallbacks.",
    summaryUz: "Android API darajasi, OEM ishoralari, ruxsatlar va xavfsiz fallbacklarni tekshiradi.",
  },
  {
    name: "help",
    aliases: ["?", "man"],
    usage: "help [cmd]",
    summaryEn: "Command list or one command.",
    summaryUz: "Buyruqlar ro‘yxati.",
  },
  {
    name: "date",
    aliases: ["time"],
    usage: "date",
    summaryEn: "Local date and time.",
    summaryUz: "Sana va vaqt.",
  },
  {
    name: "whoami",
    aliases: [],
    usage: "whoami",
    summaryEn: "This device, briefly.",
    summaryUz: "Ushbu qurilma.",
  },
  {
    name: "birthday",
    aliases: ["bday", "tavallud", "sogbol"],
    usage: "birthday",
    summaryEn: "Birthday celebration mode!",
    summaryUz: "Tug‘ilgan kun bayram rejimi!",
  },
  {
    name: "reset",
    aliases: [],
    usage: "reset",
    summaryEn: "Wipe local aliases, pins, history.",
    summaryUz: "Mahalliy ma’lumotni o‘chiradi.",
  },
];

const INDEX: Record<string, CommandSpec> = (() => {
  const map: Record<string, CommandSpec> = {};
  for (const c of COMMANDS) {
    map[normalizeCommandHead(c.name)] = c;
    for (const a of c.aliases) map[normalizeCommandHead(a)] = c;
  }
  return map;
})();

export function lookupCommand(token: string): CommandSpec | undefined {
  return INDEX[normalizeCommandHead(token)];
}

const EMPTY_OK = new Set([
  "ls",
  "hist",
  "session",
  "recents",
  "clear",
  "perm",
  "install",
  "sys",
  "device",
  "about",
  "compat",
  "help",
  "date",
  "whoami",
  "birthday",
  "reset",
]);

export function parseLine(line: string): { cmd?: CommandSpec; args: string[]; raw: string } {
  const raw = line.trim();
  if (!raw) return { args: [], raw };
  const parts = raw.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((p) => p.replace(/^"|"$/g, "")) ?? [];
  const head = normalizeCommandHead(parts[0] ?? "");
  const spec = lookupCommand(head);
  if (!spec) return { args: parts, raw };
  const canonical = spec.name === head;
  const hasArgs = parts.length > 1;
  if (canonical || hasArgs || EMPTY_OK.has(spec.name)) {
    return { cmd: spec, args: parts.slice(1), raw };
  }
  return { args: parts, raw };
}
