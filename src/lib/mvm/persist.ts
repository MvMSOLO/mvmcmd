import type { Lang, PersistedState, UserAlias } from "./types";

const KEY = "mvmcmd.v1";

export const EMPTY: PersistedState = {
  v: 1,
  lang: "uz",
  aliases: [],
  pins: [],
  recents: [],
  usage: {},
  history: [],
  storageGranted: false,
  notifyGranted: false,
  gateSeen: false,
};

export function loadState(): PersistedState {
  if (typeof localStorage === "undefined") return { ...EMPTY, usage: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, usage: {}, aliases: [], pins: [], recents: [], history: [] };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      v: 1,
      lang: parsed.lang === "en" ? "en" : "uz",
      aliases: Array.isArray(parsed.aliases) ? parsed.aliases : [],
      pins: Array.isArray(parsed.pins) ? parsed.pins : [],
      recents: Array.isArray(parsed.recents) ? parsed.recents : [],
      usage: parsed.usage && typeof parsed.usage === "object" ? parsed.usage : {},
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 120) : [],
      storageGranted: Boolean(parsed.storageGranted),
      notifyGranted: Boolean(parsed.notifyGranted),
      gateSeen: Boolean(parsed.gateSeen),
    };
  } catch {
    return { ...EMPTY, usage: {} };
  }
}

export function saveState(state: PersistedState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function recordUse(state: PersistedState, appId: string): PersistedState {
  const usage = { ...state.usage, [appId]: (state.usage[appId] ?? 0) + 1 };
  const recents = [appId, ...state.recents.filter((id) => id !== appId)].slice(0, 24);
  return { ...state, usage, recents };
}

export function pushHistory(state: PersistedState, line: string): PersistedState {
  const trimmed = line.trim();
  if (!trimmed) return state;
  const history = [trimmed, ...state.history.filter((h) => h !== trimmed)].slice(0, 120);
  return { ...state, history };
}

export function upsertAlias(
  state: PersistedState,
  alias: string,
  target: string,
): PersistedState {
  const next: UserAlias = { alias: alias.trim().toLowerCase(), target: target.trim() };
  const aliases = [
    next,
    ...state.aliases.filter((a) => a.alias !== next.alias),
  ];
  return { ...state, aliases };
}

export function dropAlias(state: PersistedState, alias: string): PersistedState {
  const key = alias.trim().toLowerCase();
  return { ...state, aliases: state.aliases.filter((a) => a.alias !== key) };
}

export function togglePin(state: PersistedState, appId: string, on: boolean): PersistedState {
  const pins = on
    ? [appId, ...state.pins.filter((id) => id !== appId)].slice(0, 16)
    : state.pins.filter((id) => id !== appId);
  return { ...state, pins };
}

export function setLang(state: PersistedState, lang: Lang): PersistedState {
  return { ...state, lang };
}

export function resetState(): PersistedState {
  const fresh = {
    ...EMPTY,
    usage: {},
    aliases: [],
    pins: [],
    recents: [],
    history: [],
  };
  saveState(fresh);
  return fresh;
}
