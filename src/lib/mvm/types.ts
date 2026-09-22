export type Category =
  | "system"
  | "chat"
  | "social"
  | "game"
  | "video"
  | "music"
  | "map"
  | "shop"
  | "money"
  | "tool"
  | "browser"
  | "google";

export type LineKind = "sys" | "in" | "out" | "ok" | "warn" | "dim" | "match";

export type Lang = "uz" | "en";

export type PlatformKind = "android" | "ios" | "desktop";

export interface CatalogApp {
  id: string;
  name: string;
  aliases: string[];
  androidPackage?: string;
  androidAction?: string;
  androidData?: string;
  iosScheme?: string;
  webUrl?: string;
  category: Category;
  weight: number;
}

export interface MatchHit {
  app: CatalogApp;
  score: number;
  reason: "alias" | "prefix" | "word" | "contains" | "subseq" | "package";
}

export interface LogLine {
  id: string;
  kind: LineKind;
  text: string;
  meta?: string;
  appId?: string;
}

export interface UserAlias {
  alias: string;
  target: string;
}

export interface PersistedState {
  v: 1;
  lang: Lang;
  aliases: UserAlias[];
  pins: string[];
  recents: string[];
  usage: Record<string, number>;
  history: string[];
  storageGranted: boolean;
  notifyGranted: boolean;
  gateSeen: boolean;
}

export interface LaunchResult {
  ok: boolean;
  method: "intent" | "scheme" | "web" | "protocol" | "store";
  url: string;
  app: CatalogApp;
  note: string;
}

export interface CommandSpec {
  name: string;
  aliases: string[];
  usage: string;
  summaryEn: string;
  summaryUz: string;
}
