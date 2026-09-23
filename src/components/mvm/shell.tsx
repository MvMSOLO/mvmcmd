import { useEffect, useMemo, useRef, useState } from "react";
import { CATALOG, CATALOG_BY_ID, CATEGORIES } from "@/lib/mvm/catalog";
import { lookupCommand, parseLine } from "@/lib/mvm/commands";
import { t } from "@/lib/mvm/copy";
import { execute, makeLine, runInstall, runPermRequest } from "@/lib/mvm/executor";
import { rankApps, resolveAliasTarget } from "@/lib/mvm/fuzzy";
import { listenInstallPrompt } from "@/lib/mvm/permissions";
import { EMPTY, loadState, saveState } from "@/lib/mvm/persist";
import { detectRuntime } from "@/lib/mvm/platform";
import type { CatalogApp, LogLine, MatchHit, PersistedState, PlatformKind } from "@/lib/mvm/types";
import { cn } from "@/lib/utils";
import { ProCameraStudio } from "./camera";
import { PermissionGate } from "./gate";

const BOOT_LINES = [
  "kernel     vector ready",
  `index      ${CATALOG.length} surfaces`,
  "matcher    prefix · alias · token · subseq",
  "launch     intent / scheme / web",
  "hint       ef → eFootball",
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--kb", `${kb}px`);
    };
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    sync();
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);
}

function suggestQuery(input: string): string {
  const parsed = parseLine(input);
  if (parsed.cmd && ["open", "find", "store", "pin", "unpin"].includes(parsed.cmd.name)) {
    return parsed.args.join(" ");
  }
  if (parsed.cmd) return "";
  return input.trim();
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

function Mark({ name }: { name: string }) {
  const letters = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "·";
  return (
    <span
      aria-hidden
      className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-raised font-display text-micro font-bold tracking-wide text-accent"
    >
      {letters}
    </span>
  );
}

export function MvmShell() {
  const [state, setState] = useState<PersistedState>(EMPTY);
  const [phase, setPhase] = useState<"gate" | "boot" | "live">("gate");
  const [lines, setLines] = useState<LogLine[]>([]);
  const [input, setInput] = useState("");
  const [sel, setSel] = useState(0);
  const [histIdx, setHistIdx] = useState(-1);
  const [platform, setPlatform] = useState<PlatformKind>("desktop");
  const [standalone, setStandalone] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clock = useClock();
  useKeyboardInset();

  useEffect(() => {
    const runtime = detectRuntime();
    setPlatform(runtime.platform);
    setStandalone(runtime.standalone);
    const persisted = loadState();
    setState((current) => (current.gateSeen ? current : persisted));
    setPhase((current) => {
      if (current !== "gate") return current;
      return persisted.gateSeen ? "boot" : "gate";
    });
    const stop = listenInstallPrompt();
    return stop;
  }, []);

  useEffect(() => {
    if (phase !== "boot") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sessionKey = "mvmcmd.booted";
    const already = sessionStorage.getItem(sessionKey) === "1";
    const rows = BOOT_LINES.map((text) => makeLine("sys", text));
    if (reduced || already) {
      setLines(rows);
      setPhase("live");
      sessionStorage.setItem(sessionKey, "1");
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setLines(rows.slice(0, i));
      if (i >= rows.length) {
        window.clearInterval(id);
        sessionStorage.setItem(sessionKey, "1");
        window.setTimeout(() => setPhase("live"), 180);
      }
    }, 140);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  useEffect(() => {
    if (phase === "live") inputRef.current?.focus();
  }, [phase]);

  const q = suggestQuery(input);
  const hits = useMemo<MatchHit[]>(() => {
    if (!q) return [];
    const aliased = resolveAliasTarget(q, state.aliases);
    return rankApps(aliased ?? q, CATALOG, state.usage, 4);
  }, [q, state.aliases, state.usage]);

  useEffect(() => {
    setSel(0);
  }, [q]);

  const lang = state.lang;
  const selected = hits[sel] ?? hits[0];

  function append(next: LogLine[], clear?: boolean) {
    setLines((prev) => (clear ? next : [...prev, ...next]).slice(-240));
  }

  function commit(raw: string, pick?: CatalogApp) {
    const text = pick ? `open ${pick.name}` : raw;
    if (!text.trim()) return;
    const parsed = parseLine(text);

    if (parsed.cmd?.name === "perm") {
      append([makeLine("in", text)]);
      void runPermRequest({ state, lang }).then((res) => {
        setState(res.state);
        append(res.lines);
      });
      setInput("");
      setHistIdx(-1);
      return;
    }
    if (parsed.cmd?.name === "install") {
      append([makeLine("in", text)]);
      void runInstall({ state, lang }).then((ls) => append(ls));
      setInput("");
      setHistIdx(-1);
      return;
    }

    const result = execute(text, { state, lang });
    setState(result.state);
    append([makeLine("in", text), ...result.lines], result.clearLog);
    if (result.openCamera) {
      setCameraOpen(true);
    }
    setInput("");
    setHistIdx(-1);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (selected && q && !lookupCommand(input.trim().split(/\s+/)[0] ?? "")) {
        commit(input, selected.app);
        return;
      }
      commit(input);
      return;
    }
    if (e.key === "Tab" && hits.length) {
      e.preventDefault();
      setSel((s) => (s + (e.shiftKey ? -1 : 1) + hits.length) % hits.length);
      return;
    }
    if (e.key === "ArrowDown" && hits.length) {
      e.preventDefault();
      setSel((s) => (s + 1) % hits.length);
      return;
    }
    if (e.key === "ArrowUp" && hits.length && input.trim()) {
      e.preventDefault();
      setSel((s) => (s - 1 + hits.length) % hits.length);
      return;
    }
    if (e.key === "ArrowUp" && !input.trim() && state.history.length) {
      e.preventDefault();
      const next = Math.min(histIdx + 1, state.history.length - 1);
      setHistIdx(next);
      setInput(state.history[next] ?? "");
      return;
    }
    if (e.key === "ArrowDown" && histIdx >= 0) {
      e.preventDefault();
      const next = histIdx - 1;
      setHistIdx(next);
      setInput(next < 0 ? "" : (state.history[next] ?? ""));
      return;
    }
    if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
    if (e.key === "Escape") {
      setInput("");
      setSel(0);
    }
  }

  if (phase === "gate") {
    return (
      <PermissionGate
        lang={lang}
        onDone={({ storage, notify }) => {
          const next = { ...state, storageGranted: storage, notifyGranted: notify, gateSeen: true };
          saveState(next);
          setState(next);
          setPhase("boot");
        }}
      />
    );
  }

  const pins = state.pins.map((id) => CATALOG_BY_ID[id]).filter((a): a is CatalogApp => Boolean(a));
  const recents = state.recents
    .map((id) => CATALOG_BY_ID[id])
    .filter((a): a is CatalogApp => Boolean(a))
    .slice(0, 8);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="enter-down d1 flex items-end justify-between gap-4 border-b border-line px-4 py-3 sm:px-6">
        <div>
          <p className="font-mono text-micro tracking-mark text-muted">MACHINE VECTOR MODULE</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">MVMCMD</h1>
        </div>
        <div className="text-right font-mono text-label leading-relaxed text-muted">
          <p className="tabular-nums text-fg">{formatClock(clock)}</p>
          <p className="uppercase tracking-mark">
            {platform}
            {standalone ? " · PWA" : ""}
          </p>
          <div className="mt-1 flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="rounded bg-accent/15 px-1.5 py-0.5 text-micro font-bold text-accent hover:bg-accent/25 border border-accent/30"
            >
              📷 4K Camera
            </button>
            <button
              type="button"
              onClick={() => commit("birthday")}
              className="rounded bg-amber-500/10 px-1.5 py-0.5 text-micro font-bold text-amber-400 hover:bg-amber-500/20"
            >
              🎂 Birthday Mode
            </button>
          </div>
        </div>
      </header>

      <div className="mvm-cols mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-1">
        <aside className="enter-left d2 hidden border-r border-line p-4 lg:block">
          <p className="font-mono text-micro tracking-mark text-faint">{t(lang, "pinned")}</p>
          <ul className="mt-3 space-y-1">
            {pins.length === 0 ? (
              <li className="font-mono text-xs text-faint">{lang === "uz" ? "pin <nom>" : "pin <name>"}</li>
            ) : (
              pins.map((app) => (
                <li key={app.id}>
                  <button
                    type="button"
                    onClick={() => commit(`open ${app.name}`)}
                    className="flex w-full items-center gap-2 rounded-sm px-1 py-2 text-left hover:bg-raised"
                  >
                    <Mark name={app.name} />
                    <span className="truncate font-mono text-xs">{app.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <p className="mt-8 font-mono text-micro tracking-mark text-faint">{t(lang, "recents")}</p>
          <ul className="mt-3 space-y-1">
            {recents.map((app, i) => (
              <li key={app.id}>
                <button
                  type="button"
                  onClick={() => commit(`open ${app.name}`)}
                  className="flex w-full items-center gap-2 rounded-sm px-1 py-2 text-left hover:bg-raised"
                >
                  <span className="w-5 font-mono text-micro tabular-nums text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate font-mono text-xs">{app.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="enter-fade d3 flex min-h-0 flex-col">
          <div
            ref={logRef}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-4 font-mono text-sm leading-relaxed sm:px-6"
          >
            {lines.map((row) => (
              <LogRow key={row.id} row={row} onOpen={(id) => {
                const app = CATALOG_BY_ID[id];
                if (app) commit(`open ${app.name}`);
              }} />
            ))}
            {phase === "boot" && (
              <p className="text-muted">
                <span className="mvm-block inline-block h-4 w-2 bg-fg align-middle" />
              </p>
            )}
          </div>
        </section>

        <aside className="enter-right d4 hidden border-l border-line p-4 lg:block">
          <p className="font-mono text-micro tracking-mark text-faint">{t(lang, "catalog")}</p>
          <ul className="mt-3 space-y-0.5">
            {CATEGORIES.map((cat) => (
              <li key={cat}>
                <button
                  type="button"
                  onClick={() => commit(`ls ${cat}`)}
                  className="w-full rounded-sm px-1 py-2 text-left font-mono text-xs capitalize text-muted hover:bg-raised hover:text-fg"
                >
                  {cat}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-8 font-mono text-micro tracking-mark text-faint">{t(lang, "ready")}</p>
          <p className="mt-2 font-mono text-xs tabular-nums text-muted">{CATALOG.length}</p>
          <p className="mt-6 font-mono text-micro leading-relaxed text-faint">
            help · ls · bind · pack · install
          </p>
        </aside>
      </div>

      <div
        className="enter-up d5 border-t border-line bg-bg"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))", marginBottom: "var(--kb, 0px)" }}
      >
        {recents.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pt-3 lg:hidden">
            {recents.slice(0, 6).map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => commit(`open ${app.name}`)}
                className="flex shrink-0 items-center gap-2 rounded-sm bg-surface px-3 py-2 mvm-frame"
              >
                <Mark name={app.name} />
                <span className="font-mono text-xs">{app.name}</span>
              </button>
            ))}
          </div>
        )}

        {hits.length > 0 && (
          <ul className="mx-auto flex max-w-6xl flex-col gap-0 px-4 pt-3 sm:px-6">
            {hits.map((hit, i) => (
              <li key={hit.app.id}>
                <button
                  type="button"
                  onClick={() => commit(input, hit.app)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left",
                    i === sel ? "bg-raised" : "hover:bg-surface",
                  )}
                >
                  <span className="w-6 font-mono text-micro tabular-nums text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Mark name={hit.app.name} />
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">{hit.app.name}</span>
                  <span className="hidden font-mono text-micro uppercase tracking-wider text-faint sm:block">
                    {hit.reason}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (selected && q && !lookupCommand(input.trim().split(/\s+/)[0] ?? "")) {
              commit(input, selected.app);
            } else {
              commit(input);
            }
          }}
        >
          <span className="font-display text-lg text-accent" aria-hidden>
            ▸
          </span>
          <label className="sr-only" htmlFor="mvm-prompt">
            {t(lang, "prompt")}
          </label>
          <input
            id="mvm-prompt"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={t(lang, "prompt")}
            className="mvm-caret min-h-11 min-w-0 flex-1 bg-transparent font-mono text-base text-fg outline-none placeholder:text-faint"
          />
          <button
            type="submit"
            className="hidden rounded-sm bg-accent px-4 py-2.5 font-display text-xs font-semibold tracking-wide text-accent-fg transition-transform duration-150 ease-out active:scale-[0.96] sm:inline-flex"
          >
            {t(lang, "launch")}
          </button>
        </form>
      </div>

      {cameraOpen && <ProCameraStudio onClose={() => setCameraOpen(false)} />}
    </div>
  );
}

function LogRow({ row, onOpen }: { row: LogLine; onOpen: (id: string) => void }) {
  const color =
    row.kind === "ok"
      ? "text-ok"
      : row.kind === "warn"
        ? "text-warn"
        : row.kind === "in"
          ? "text-fg"
          : row.kind === "sys"
            ? "text-accent"
            : "text-muted";

  const body = (
    <>
      {row.kind === "in" && <span className="mr-2 text-accent">▸</span>}
      <span>{row.text}</span>
      {row.meta ? <span className="ml-3 text-faint">{row.meta}</span> : null}
    </>
  );

  if (row.appId && (row.kind === "match" || row.kind === "out")) {
    return (
      <button type="button" onClick={() => onOpen(row.appId!)} className={cn("block w-full text-left", color)}>
        {body}
      </button>
    );
  }

  return <p className={color}>{body}</p>;
}
