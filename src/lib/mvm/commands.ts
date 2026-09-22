import type { CommandSpec } from "./types";

export const COMMANDS: CommandSpec[] = [
  {
    name: "camera",
    aliases: [],
    usage: "CAMERA",
    summaryEn: "Open the native MVMCMD camera.",
    summaryUz: "MVMCMD native kamerasini ochadi.",
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
    summaryEn: "Launch a raw Android package.",
    summaryUz: "Android package nomini to‘g‘ridan-to‘g‘ri ochadi.",
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
    map[c.name] = c;
    for (const a of c.aliases) map[a] = c;
  }
  return map;
})();

export function lookupCommand(token: string): CommandSpec | undefined {
  return INDEX[token.toLowerCase()];
}

const EMPTY_OK = new Set([
  "ls",
  "hist",
  "recents",
  "clear",
  "perm",
  "install",
  "sys",
  "about",
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
  const head = (parts[0] ?? "").toLowerCase();
  const spec = lookupCommand(head);
  if (!spec) return { args: parts, raw };
  const canonical = spec.name === head;
  const hasArgs = parts.length > 1;
  if (canonical || hasArgs || EMPTY_OK.has(spec.name)) {
    return { cmd: spec, args: parts.slice(1), raw };
  }
  return { args: parts, raw };
}
