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
import { PermissionGate } from "./gate";
import { MvmWordmark } from "./wordmark";
import { MvmGenerativeField } from "./generative-field";
import { Mvm3D } from "./mvm-3d";
import { MVM_3D } from "@/lib/mvm/3d-assets";
import { MOTION_COUNTS } from "@/lib/mvm/motion-system";
import { useMvmPerformanceGovernor } from "@/lib/mvm/performance-governor";
import { emitMvmSignal } from "@/lib/mvm/signal-system";
import { installMvmInteractionLayer } from "@/lib/mvm/interaction-system";

const BOOT_LINES = [
  "kernel     vector ready",
  `index      ${CATALOG.length} surfaces`,
  "matcher    prefix · alias · token · subseq",
  "launch     intent / scheme / web",
  `motion     ${MOTION_COUNTS.total} recipes · ${MOTION_COUNTS.custom} custom · ${MOTION_COUNTS.handcrafted} hand · ${MOTION_COUNTS.trending} trend`,
  "hint       ef → eFootball",
];

function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return <span className="mvm-live-clock tabular-nums text-fg">{formatClock(now)}</span>;
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

type QuickAction = {
  command: string;
  uz: string;
  en: string;
};

const QUICK_ACTIONS: Record<PlatformKind, QuickAction[]> = {
  android: [
    { command: "camera", uz: "Kamera", en: "Camera" },
    { command: "qr", uz: "QR", en: "Scan QR" },
    { command: "wallpaper", uz: "Devor qog‘ozi", en: "Wallpaper" },
    { command: "english", uz: "English", en: "English" },
    { command: "notification", uz: "Xabarlar", en: "Notifications" },
  ],
  ios: [
    { command: "help", uz: "Yordam", en: "Help" },
    { command: "recents", uz: "Yaqinda", en: "Recents" },
    { command: "sys", uz: "Tizim", en: "System" },
  ],
  desktop: [
    { command: "help", uz: "Yordam", en: "Help" },
    { command: "recents", uz: "Yaqinda", en: "Recents" },
    { command: "sys", uz: "Tizim", en: "System" },
  ],
};

export function MvmShell() {
  const [state, setState] = useState<PersistedState>(EMPTY);
  const rootRef = useRef<HTMLDivElement>(null);
  const performanceGovernor = useMvmPerformanceGovernor();
  const [phase, setPhase] = useState<"gate" | "boot" | "live">("gate");
  const [lines, setLines] = useState<LogLine[]>([]);
  const [input, setInput] = useState("");
  const [sel, setSel] = useState(0);
  const [histIdx, setHistIdx] = useState(-1);
  const [platform, setPlatform] = useState<PlatformKind>("desktop");
  const [standalone, setStandalone] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useKeyboardInset();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || phase === "gate") return;
    return installMvmInteractionLayer(root);
  }, [phase]);

  useEffect(() => {
    const onGlobalKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }

      if (event.key === "/" && !editing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, []);

  function syncLogParallax() {
    const node = logRef.current;
    if (!node) return;
    const shift = Math.min(48, node.scrollTop * 0.08);
    node.style.setProperty("--mvm-parallax-y", `${-shift}px`);
  }

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
    const node = logRef.current;
    if (!node) return;

    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 96;
    if (!nearBottom) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      node.scrollTo({
        top: node.scrollHeight,
        behavior: reduced ? "auto" : "smooth",
      });
    });
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
  const lastLine = lines.at(-1);
  const interfaceSignal =
    phase === "boot"
      ? "wake"
      : inputFocused || q
        ? hits.length > 0
          ? "active"
          : q
            ? "warn"
            : "active"
        : lastLine?.kind === "ok"
          ? "success"
          : lastLine?.kind === "warn"
            ? "warn"
            : "idle";
  const scene =
    phase === "boot"
      ? "boot"
      : q && hits.length
        ? "search-results"
        : q
          ? "search-empty"
          : lastLine?.kind === "ok"
            ? "feedback-success"
            : lastLine?.kind === "warn"
              ? "feedback-warn"
              : "idle";
  const spatialState = q && hits.length ? "catalog" : q ? "field" : inputFocused ? "core" : "idle";

  function append(next: LogLine[], clear?: boolean) {
    setLines((prev) => (clear ? next : [...prev, ...next]).slice(-240));
  }

  function commit(raw: string, pick?: CatalogApp) {
    const text = pick ? `open ${pick.name}` : raw;
    if (!text.trim()) return;
    const parsed = parseLine(text);

    if (parsed.cmd?.name === "perm") {
      append([makeLine("in", text)]);
      emitMvmSignal("intent");
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
      emitMvmSignal("intent");
      void runInstall({ state, lang }).then((ls) => append(ls));
      setInput("");
      setHistIdx(-1);
      return;
    }

    const applyResult = () => {
      const result = execute(text, { state, lang });
      setState(result.state);
      append([makeLine("in", text), ...result.lines], result.clearLog);
      setInput("");
      setHistIdx(-1);
      const signal = result.lines.some((line) => line.kind === "warn")
        ? "warn"
        : result.lines.some((line) => line.kind === "ok")
          ? "success"
          : result.clearLog
            ? "neutral"
            : "intent";
      emitMvmSignal(signal);
    };
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    };
    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(applyResult);
    } else {
      applyResult();
    }
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

  const navigateSpace = (zone: "rail" | "core" | "catalog") => {
    if (zone === "core") {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    document.getElementById(zone === "rail" ? "mvm-space-left" : "mvm-space-right")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  };

  return (
    <div
      ref={rootRef}
      data-motion="30-view-transition"
      data-command-state={q ? "active" : "idle"}
      data-hit-count={hits.length}
      data-mvm-scene={scene}
      data-mvm-signal={interfaceSignal}
      data-mvm-performance={performanceGovernor.tier}
      data-mvm-performance-fps={performanceGovernor.fps}
      data-mvm-space-state={spatialState}
      className="mvm-trend-view flex min-h-dvh flex-col bg-bg text-fg"
      style={{
        "--mvm-perf-render-scale": performanceGovernor.renderScale,
        "--mvm-perf-motion-scale": performanceGovernor.motionScale,
      } as React.CSSProperties}
    >
      <header data-motion="01-command-bloom" className="enter-down d1 mvm-motion-command-bloom mvm-hand-glass-sweep flex items-end justify-between gap-4 border-b border-line px-4 py-3 sm:px-6">
        <div>
          <p data-motion="28-variable-type" className="mvm-trend-variable font-mono text-micro tracking-mark text-muted">MACHINE VECTOR MODULE</p>
          <MvmWordmark mode="live" />
        </div>
        <div className="flex items-end gap-4">
          <nav className="mvm-spatial-nav hidden items-center gap-1 sm:flex" aria-label="Spatial navigation">
            {(["rail", "core", "catalog"] as const).map((zone) => (
              <button
                key={zone}
                type="button"
                data-mvm-action="spatial-navigate"
                data-mvm-physical
                aria-current={
                  (zone === "core" && spatialState === "core") ||
                  (zone === "catalog" && (spatialState === "catalog" || spatialState === "field"))
                    ? "location"
                    : undefined
                }
                className="mvm-spatial-node rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-faint"
                onClick={() => navigateSpace(zone)}
              >
                {zone}
              </button>
            ))}
          </nav>
          <div className="mvm-header-status flex items-end gap-3 text-right font-mono text-label leading-relaxed text-muted">
            <LiveClock />
            <p className="mvm-runtime-chip uppercase tracking-mark">
              {platform}
              {standalone ? " · PWA" : ""}
            </p>
            <p className="mvm-runtime-chip mvm-performance-chip tabular-nums uppercase tracking-mark" title={`Measured ${performanceGovernor.fps} FPS`}>
              {performanceGovernor.tier} · {performanceGovernor.fps}
            </p>
          </div>
        </div>
      </header>

      <div className="mvm-cols mvm-dynamic-layout mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-1">
        <aside id="mvm-space-left" data-motion="06-rail-drift" className="mvm-secondary-rail enter-left d2 mvm-motion-rail-drift mvm-trend-bento hidden border-r border-line p-4 lg:block">
          <p className="font-mono text-micro tracking-mark text-faint">{t(lang, "pinned")}</p>
          <ul className="mt-3 space-y-1">
            {pins.length === 0 ? (
              <li className="font-mono text-xs text-faint">{lang === "uz" ? "pin <nom>" : "pin <name>"}</li>
            ) : (
              pins.map((app) => (
                <li key={app.id}>
                  <button
                    type="button"
                    data-mvm-action="rail-open"
                    data-mvm-physical
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
                  data-mvm-action="recent-open"
                  data-mvm-physical
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

        <section id="mvm-space-core" className="enter-fade d3 mvm-motion-terminal-flicker flex min-h-0 flex-col">
          <div data-motion="04-terminal-flicker"
            ref={logRef}
            onScroll={syncLogParallax}
            className="mvm-command-stream relative min-h-0 flex-1 overflow-y-auto px-4 py-4 font-mono text-sm leading-relaxed sm:px-6"
          >
            <div data-motion="29-scroll-parallax" aria-hidden className="mvm-trend-parallax pointer-events-none absolute inset-x-8 top-8 h-24 rounded-full opacity-20" style={{ background: "radial-gradient(ellipse at center, color-mix(in oklab, var(--color-ok) 28%, transparent), transparent 68%)" }} />
            <MvmGenerativeField
              seed={`${phase}|${q}|${hits.map((hit) => hit.app.id).join(",")}|${lines.length}|${selected?.app.id ?? "none"}`}
              energy={Math.min(1, 0.18 + q.length / 16 + hits.length / 10)}
              density={Math.min(1, 0.28 + hits.length / 8 + (phase === "boot" ? 0.12 : 0))}
            />
            {phase === "boot" && (
              <div data-motion="02-vector-scan" className="mvm-motion-vector-scan mvm-boot-identity mb-4 border border-line bg-surface px-3 py-3">
                <div className="mvm-boot-identity__wordmark">
                  <Mvm3D asset={MVM_3D["boot-cube"]} size="md" signal="wake" />
                  <MvmWordmark mode="boot" />
                </div>
                <div className="mvm-boot-identity__meta">
                  <p data-motion="19-ink-reveal" className="mvm-hand-ink font-display text-xs font-bold">MVM CORE INITIALIZING</p>
                  
                </div>
              </div>
            )}
            {lines.map((row, i) => (
              <LogRow key={row.id} index={i} row={row} onOpen={(id) => {
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

        <aside id="mvm-space-right" data-motion="24-liquid-glass" className="mvm-secondary-rail enter-right d4 mvm-hand-beam mvm-trend-glass hidden border-l border-line p-4 lg:block">
          <p className="font-mono text-micro tracking-mark text-faint">{t(lang, "catalog")}</p>
          <ul className="mt-3 space-y-0.5">
            {CATEGORIES.map((cat) => (
              <li key={cat}>
                <button
                  type="button"
                  data-mvm-action="catalog-navigate"
                  data-mvm-physical
                  onClick={() => commit(`ls ${cat}`)}
                  className="mvm-hand-magnetic w-full rounded-sm px-1 py-2 text-left font-mono text-xs capitalize text-muted hover:bg-raised hover:text-fg"
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
          <div className="mvm-trend-scroll flex gap-2 overflow-x-auto px-4 pt-3 lg:hidden">
            {recents.slice(0, 6).map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => commit(`open ${app.name}`)}
                className="flex shrink-0 items-center gap-2 rounded-sm bg-surface px-3 py-2 mvm-frame"
              >
                <Mvm3D asset={MVM_3D["app-card"]} size="xs" interactive={false} />
                <span className="font-mono text-xs">{app.name}</span>
              </button>
            ))}
          </div>
        )}

        {!input.trim() && (
          <div className="mvm-quick-actions mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 pt-3 sm:px-6">
            {QUICK_ACTIONS[platform].map((action) => (
              <button
                key={action.command}
                type="button"
                data-mvm-action="quick-action"
                data-mvm-physical
                onClick={() => commit(action.command)}
                className="mvm-quick-action shrink-0 rounded-full border border-line bg-surface/70 px-3 py-1.5 font-mono text-micro text-muted transition-colors hover:border-line-strong hover:bg-raised hover:text-fg"
              >
                {lang === "uz" ? action.uz : action.en}
              </button>
            ))}
            <span className="mvm-shortcut-hint ml-auto hidden shrink-0 font-mono text-micro text-faint lg:inline">
              Ctrl/⌘ K
            </span>
          </div>
        )}

        {q && hits.length === 0 && input.trim() && (
          <div className="mvm-no-match mx-auto max-w-6xl px-4 pt-3 sm:px-6" aria-live="polite">
            <span>{lang === "uz" ? "Mos ilova topilmadi." : "No matching app."}</span>
            <span className="text-faint">
              {lang === "uz" ? " find, store yoki to‘liq nomni sinab ko‘ring." : " Try find, store, or the full name."}
            </span>
          </div>
        )}

        {hits.length > 0 && (
          <ul data-motion="31-dynamic-query" className="mvm-query-results mx-auto flex max-w-6xl flex-col gap-1 px-4 pt-3 sm:px-6" aria-live="polite">
            {hits.map((hit, i) => (
              <li key={hit.app.id}>
                <button
                  type="button"
                  data-mvm-action="query-select"
                  data-mvm-physical
                  onClick={() => commit(input, hit.app)}
                  className={cn(
                    "mvm-query-item flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left",
                    i === sel ? "bg-raised mvm-hand-focus mvm-trend-cursor" : "mvm-trend-cursor hover:bg-surface",
                  )}
                >
                  <span className="w-6 font-mono text-micro tabular-nums text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Mvm3D asset={MVM_3D["app-card"]} size="xs" interactive={false} signal={i === sel ? "active" : "idle"} />
                  <span data-motion="21-kinetic-type" className="mvm-trend-kinetic min-w-0 flex-1 truncate font-mono text-sm">{hit.app.name}</span>
                  <span className="hidden font-mono text-micro uppercase tracking-wider text-faint sm:block">
                    {hit.reason}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <form data-motion="09-input-ignite" data-mvm-action="command-surface"
          className="mvm-motion-input-ignite mvm-primary-command mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (selected && q && !lookupCommand(input.trim().split(/\s+/)[0] ?? "")) {
              commit(input, selected.app);
            } else {
              commit(input);
            }
          }}
        >
          <Mvm3D asset={MVM_3D["command-core"]} size="xs" />
          <span className="font-display text-lg text-accent" aria-hidden>▸</span>
          <label className="sr-only" htmlFor="mvm-prompt">
            {t(lang, "prompt")}
          </label>
          {input && (
            <button
              type="button"
              aria-label={lang === "uz" ? "Tozalash" : "Clear"}
              className="mvm-command-clear order-3 rounded-full px-2 py-1 font-mono text-sm text-faint"
              data-mvm-action="clear-input"
              data-mvm-physical
              onClick={() => {
                setInput("");
                setSel(0);
                inputRef.current?.focus();
              }}
            >
              ×
            </button>
          )}
          <input
            id="mvm-prompt"
            aria-keyshortcuts="Control+K Meta+K"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={onKey}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={t(lang, "prompt")}
            className="mvm-caret mvm-hand-shimmer min-h-11 min-w-0 flex-1 bg-transparent font-mono text-base text-fg outline-none placeholder:text-faint"
          />
          <button
            type="submit"
            className="mvm-hand-magnetic mvm-hand-spring-snap hidden rounded-sm bg-accent px-4 py-2.5 font-display text-xs font-semibold tracking-wide text-accent-fg transition-transform duration-150 ease-out active:scale-[0.96] sm:inline-flex"
            data-mvm-action="launch-submit"
            data-mvm-physical
          >
            {t(lang, "launch")}
          </button>
        </form>
      </div>
    </div>
  );
}

function LogRow({ row, index, onOpen }: { row: LogLine; index: number; onOpen: (id: string) => void }) {
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
      <button type="button" onClick={() => onOpen(row.appId!)} className={cn("mvm-motion-log-cascade block w-full text-left", color)} style={{ animationDelay: `${Math.min(index, 20) * 35}ms` }}>
        {body}
      </button>
    );
  }

  return <p className={cn("mvm-motion-log-cascade", color)} style={{ animationDelay: `${Math.min(index, 20) * 35}ms` }}>{body}</p>;
}
