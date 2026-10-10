import { useEffect, useMemo, useRef, useState } from "react";
import { CATALOG, CATALOG_BY_ID, CATEGORIES } from "@/lib/mvm/catalog";
import { lookupCommand, parseLine } from "@/lib/mvm/commands";
import { understandCommand } from "@/lib/mvm/intelligence";
import { t } from "@/lib/mvm/copy";
import { execute, makeLine, runCommunicationRequest, runCompatibilityRequest, runDeviceRequest, runFileRequest, runGamingRequest, runInstall, runPermRequest } from "@/lib/mvm/executor";
import { rankApps, resolveAliasTarget } from "@/lib/mvm/fuzzy";
import { listenInstallPrompt } from "@/lib/mvm/permissions";
import {
  canUseNativeAndroidLauncher,
} from "@/lib/mvm/native-launcher";
import {
  ensureActionCapabilities,
  refreshNativeCapabilities,
  type CapabilityAction,
} from "@/lib/mvm/capabilities";
import { EMPTY, loadState, pushHistory, saveState } from "@/lib/mvm/persist";
import { rememberActiveSessionResult, rememberActiveSessionTurn, resolveActiveSessionReference } from "@/lib/mvm/session-context";
import { detectRuntime } from "@/lib/mvm/platform";
import { acknowledgeGlobalEntry, subscribeGlobalEntryPoints } from "@/lib/mvm/global-entry-bridge";
import { describeGlobalEntry, draftFromGlobalEntry, normalizeGlobalEntry } from "@/lib/mvm/global-entry-points";
import type { CatalogApp, LogLine, MatchHit, PersistedState, PlatformKind } from "@/lib/mvm/types";
import { cn } from "@/lib/utils";
import { PermissionGate } from "./gate";
import { MvmWordmark } from "./wordmark";
import { MvmGenerativeField } from "./generative-field";
import { Mvm3D } from "./mvm-3d";
import { MVM_3D } from "@/lib/mvm/3d-assets";
import { MOTION_COUNTS } from "@/lib/mvm/motion-system";
import { Activity, Mic, MicOff } from "lucide-react";
import { isMotionReduced, motionModeDescription, motionModeLabel, nextMotionMode, normalizeMotionMode, MVM_MOTION_STORAGE_KEY, type MvmMotionMode } from "@/lib/mvm/motion-preferences";
import { cancelVoiceCapture, isVoiceCaptureSupported, speakVoiceInstruction, speakVoiceOutcome, startVoiceCapture, cancelVoiceSpeech } from "@/lib/mvm/voice-assistant";
import { useMvmPerformanceGovernor } from "@/lib/mvm/performance-governor";
import { emitMvmSignal } from "@/lib/mvm/signal-system";
import { installMvmInteractionLayer } from "@/lib/mvm/interaction-system";
import { MvmRainBackdrop } from "./rain-backdrop";
import { recordPerformanceMeasurement } from "@/lib/mvm/performance-budget";

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
  const [motionMode, setMotionMode] = useState<MvmMotionMode>("system");
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [phase, setPhase] = useState<"gate" | "boot" | "live">("gate");
  const [lines, setLines] = useState<LogLine[]>([]);
  const [input, setInput] = useState("");
  const [sel, setSel] = useState(0);
  const [histIdx, setHistIdx] = useState(-1);
  const [platform, setPlatform] = useState<PlatformKind>("desktop");
  const [standalone, setStandalone] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [juicePulse, setJuicePulse] = useState(0);
  const [rainVisible, setRainVisible] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const voicePendingRef = useRef(false);
  const voiceRequestRef = useRef(0);
  const [globalEntryNotice, setGlobalEntryNotice] = useState("");
  const seenGlobalEntriesRef = useRef<Set<string>>(new Set());
  useKeyboardInset();

  useEffect(() => {
    if (typeof performance !== "undefined") {
      recordPerformanceMeasurement("renderer-ready-ms", performance.now(), "navigation-relative renderer mount");
    }
  }, []);

  useEffect(() => {
    if (!performanceGovernor.measured) return;
    recordPerformanceMeasurement("frame-rate-fps", performanceGovernor.fps, "requestAnimationFrame sample");
    const memory = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory?.usedJSHeapSize;
    if (typeof memory === "number" && Number.isFinite(memory) && memory >= 0) {
      recordPerformanceMeasurement("heap-mb", memory / (1024 * 1024), "Chromium performance.memory");
    }
  }, [performanceGovernor.measured, performanceGovernor.fps]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncSystemPreference = () => setSystemReducedMotion(media.matches);
    syncSystemPreference();
    try {
      setMotionMode(normalizeMotionMode(window.localStorage.getItem(MVM_MOTION_STORAGE_KEY)));
    } catch {
      setMotionMode("system");
    }
    media.addEventListener("change", syncSystemPreference);
    return () => media.removeEventListener("change", syncSystemPreference);
  }, []);

  const reducedMotion = isMotionReduced(motionMode, systemReducedMotion);
  const motionLabel = motionModeLabel(motionMode, systemReducedMotion, state.lang);

  function toggleMotionMode() {
    const next = nextMotionMode(motionMode);
    setMotionMode(next);
    try {
      window.localStorage.setItem(MVM_MOTION_STORAGE_KEY, next);
    } catch {
      // Motion control must remain usable if storage is unavailable.
    }
  }

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
    let active = true;
    let unsubscribe: () => void = () => {};
    const onEntry = (value: unknown) => {
      if (!active) return;
      const entry = normalizeGlobalEntry(value);
      if (!entry || seenGlobalEntriesRef.current.has(entry.id)) return;
      seenGlobalEntriesRef.current.add(entry.id);
      const draft = draftFromGlobalEntry(entry);
      if (!draft) {
        setGlobalEntryNotice(lang === "uz" ? "Tashqi kirish turi qo‘llab-quvvatlanmaydi." : "This external entry type is not supported.");
        return;
      }
      setInput(draft);
      setSel(0);
      setHistIdx(-1);
      setGlobalEntryNotice(describeGlobalEntry(entry, lang));
      append([makeLine("sys", `ENTRY  STAGED  ${entry.kind.toUpperCase()}`, { meta: `${entry.source} · review required · not executed` })]);
      inputRef.current?.focus();
      void acknowledgeGlobalEntry(entry);
    };
    const focusCommand = () => inputRef.current?.focus();
    void subscribeGlobalEntryPoints(onEntry, focusCommand).then((dispose) => {
      if (active) unsubscribe = dispose;
      else dispose();
    }).catch((error: unknown) => {
      if (active) setGlobalEntryNotice(error instanceof Error ? error.message : "Global entry bridge unavailable.");
    });
    const onFileOpenResult = (event: Event) => {
      const detail = (event as CustomEvent<{ opened?: boolean; reason?: string }>).detail;
      if (!detail) return;
      append([makeLine(detail.opened ? "sys" : "warn", detail.opened ? "OPENFILE  HANDOFF ACCEPTED" : "OPENFILE  HANDOFF FAILED", {
        meta: detail.opened ? "System accepted the request; file handling is not verified." : detail.reason ?? "The system could not open this file.",
      })]);
    };
    window.addEventListener("mvm:entry-action-result", onFileOpenResult);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("mvm:entry-action-result", onFileOpenResult);
    };
  }, []);

  useEffect(() => {
    if (phase === "gate" || platform !== "android" || !canUseNativeAndroidLauncher()) return;

    const refresh = () => {
      if (document.visibilityState === "visible") void refreshNativeCapabilities();
    };

    void refreshNativeCapabilities();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [phase, platform]);

  useEffect(() => {
    if (phase !== "boot") return;
    const reduced = reducedMotion;
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
  }, [phase, reducedMotion]);

  useEffect(() => {
    const node = logRef.current;
    if (!node) return;

    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 96;
    if (!nearBottom) return;

    const reduced = reducedMotion;
    requestAnimationFrame(() => {
      node.scrollTo({
        top: node.scrollHeight,
        behavior: reduced ? "auto" : "smooth",
      });
    });
  }, [lines, reducedMotion]);

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

  function announceVoiceLines(items: LogLine[], fromVoice: boolean) {
    if (fromVoice) speakVoiceOutcome(items.map((item) => item.text), lang);
  }

  async function handleVoiceClick() {
    if (voiceListening) {
      // Invalidate pending async permission checks as well as an active recognizer.
      voiceRequestRef.current += 1;
      voicePendingRef.current = false;
      void cancelVoiceCapture();
      cancelVoiceSpeech();
      setVoiceListening(false);
      setVoiceStatus(lang === "uz" ? "Ovoz kiritish bekor qilindi." : "Voice input cancelled.");
      return;
    }
    const requestId = voiceRequestRef.current + 1;
    voiceRequestRef.current = requestId;
    setVoiceListening(true);
    setVoiceStatus(lang === "uz" ? "Mikrofon tayyorlanmoqda…" : "Preparing microphone…");
    try {
      const transcript = await startVoiceCapture(lang === "uz" ? "uz-UZ" : "en-US", () => requestId !== voiceRequestRef.current);
      if (requestId !== voiceRequestRef.current) return;
      if (!transcript) {
        setVoiceStatus(lang === "uz" ? "Nutq aniqlanmadi. Qayta urinib ko‘ring yoki yozing." : "No speech detected. Try again or type the command.");
        return;
      }
      voicePendingRef.current = true;
      setInput(transcript);
      setVoiceStatus(lang === "uz" ? "Buyruq tanildi. Tekshirib, Launch tugmasini bosing — hali bajarilmadi." : "Command recognized. Review it and press Launch — nothing has run yet.");
      inputRef.current?.focus();
      speakVoiceInstruction(lang);
    } catch (error) {
      if (requestId !== voiceRequestRef.current) return;
      const detail = error instanceof Error ? error.message : "Voice input is unavailable.";
      const message = "VOICE  " + detail;
      setVoiceStatus(message);
      append([makeLine("warn", message)]);
    } finally {
      if (requestId === voiceRequestRef.current) setVoiceListening(false);
    }
  }

  async function commit(raw: string, pick?: CatalogApp) {
    const displayText = pick ? `open ${pick.name}` : raw;
    if (!displayText.trim()) return;
    const voiceOrigin = voicePendingRef.current;
    voicePendingRef.current = false;
    setVoiceStatus("");
    const resolution = resolveActiveSessionReference(displayText);
    if (resolution.status === "ambiguous") {
      const next = pushHistory(state, displayText);
      saveState(next);
      setState(next);
      const turnId = rememberActiveSessionTurn(displayText, undefined);
      rememberActiveSessionResult(displayText, [resolution.message ?? "ambiguous"], turnId, "ambiguous");
      append([makeLine("in", displayText), makeLine("warn", resolution.message ?? "This reference is ambiguous; no action was executed."), makeLine("dim", "Name the app or file explicitly, or run session to inspect current context.")]);
      setInput("");
      setHistIdx(-1);
      emitMvmSignal("warn");
      if (voiceOrigin) speakVoiceOutcome([resolution.message ?? "AMBIGUOUS"], lang);
      return;
    }
    const text = resolution.command;
    const parseStartedAt = typeof performance !== "undefined" ? performance.now() : undefined;
    const understanding = understandCommand(text);
    const capability = understanding.entities.find((e) => e.type === "capability")?.value;
    const interpretedText = understanding.intent === "open_app" ? `open ${understanding.entities.find((e) => e.type === "app_query")?.value ?? ""}`.trim() : understanding.intent === "find_app" ? `find ${understanding.entities.find((e) => e.type === "app_query")?.value ?? ""}`.trim() : understanding.intent === "device_snapshot" ? "device" : understanding.intent === "permission_status" ? `perm ${capability ?? ""}`.trim() : understanding.intent === "help" ? "help" : text;
    const parsed = parseLine(interpretedText);
    if (parseStartedAt !== undefined && typeof performance !== "undefined") {
      recordPerformanceMeasurement("command-parse-ms", Math.max(0, performance.now() - parseStartedAt), "understanding + command parser");
    }

    if (parsed.cmd && ["contact", "dial", "sms", "email", "copy", "paste"].includes(parsed.cmd.name)) {
      const next = pushHistory(state, text); saveState(next); setState(next); const sessionTurnId = rememberActiveSessionTurn(text, text);
      append([makeLine("in", text), makeLine("sys", lang === "uz" ? "COMMUNICATION  tekshirilmoqda…" : "COMMUNICATION  checking…")]);
      emitMvmSignal("intent");
      void runCommunicationRequest({ state, lang }, parsed.cmd.name, parsed.args).then((ls) => {
        rememberActiveSessionResult(text, ls.map((item) => item.text), sessionTurnId);
        append(ls);
        announceVoiceLines(ls, voiceOrigin);
        emitMvmSignal(ls.some((line) => line.kind === "warn") ? "warn" : "success");
      });
      setInput("");
      setHistIdx(-1);
      return;
    }
    if (parsed.cmd?.name === "perm") {
      const next = pushHistory(state, text); saveState(next); setState(next); const sessionTurnId = rememberActiveSessionTurn(text, text);
      append([makeLine("in", text)]);
      emitMvmSignal("intent");
      void runPermRequest({ state, lang }, parsed.args[0]).then((res) => {
        rememberActiveSessionResult(text, res.lines.map((item) => item.text), sessionTurnId);
        setState(res.state);
        append(res.lines);
        announceVoiceLines(res.lines, voiceOrigin);
      });
      setInput("");
      setHistIdx(-1);
      return;
    }
    if (parsed.cmd?.name === "gaming") {
      const next = pushHistory(state, text); saveState(next); setState(next); const sessionTurnId = rememberActiveSessionTurn(text, text);
      append([makeLine("in", text), makeLine("sys", lang === "uz" ? "GAMING  real telemetry o‘qilmoqda…" : "GAMING  reading real telemetry…")]);
      emitMvmSignal("intent");
      void runGamingRequest({ state, lang }, parsed.args.join(" ") || undefined).then((ls) => {
        rememberActiveSessionResult(text, ls.map((item) => item.text), sessionTurnId);
        append(ls);
        announceVoiceLines(ls, voiceOrigin);
        emitMvmSignal(ls.some((line) => line.kind === "warn") ? "warn" : "success");
      });
      setInput("");
      setHistIdx(-1);
      return;
    }
    if (parsed.cmd?.name === "files") {
      const next = pushHistory(state, text); saveState(next); setState(next); const sessionTurnId = rememberActiveSessionTurn(text, text);
      append([makeLine("in", text), makeLine("sys", lang === "uz" ? "FILES  scoped fayl amali ishga tushmoqda…" : "FILES  running scoped file operation…")]);
      emitMvmSignal("intent");
      void runFileRequest(parsed.args, { state, lang }, sessionTurnId).then((ls) => {
        append(ls);
        announceVoiceLines(ls, voiceOrigin);
        emitMvmSignal(ls.some((line) => line.kind === "warn") ? "warn" : "success");
      });
      setInput("");
      setHistIdx(-1);
      return;
    }
    if (parsed.cmd?.name === "compat") {
      const next = pushHistory(state, text); saveState(next); setState(next); const sessionTurnId = rememberActiveSessionTurn(text, text);
      append([makeLine("in", text), makeLine("sys", lang === "uz" ? "COMPAT  Android API/OEM mosligi tekshirilmoqda…" : "COMPAT  checking Android API/OEM compatibility…")]);
      emitMvmSignal("intent");
      void runCompatibilityRequest({ state, lang }).then((ls) => {
        rememberActiveSessionResult(text, ls.map((item) => item.text), sessionTurnId);
        append(ls); announceVoiceLines(ls, voiceOrigin);
        emitMvmSignal(ls.some((item) => item.kind === "warn") ? "warn" : "success");
      });
      setInput(""); setHistIdx(-1); return;
    }
    if (parsed.cmd?.name === "device") {
      const next = pushHistory(state, text); saveState(next); setState(next); const sessionTurnId = rememberActiveSessionTurn(text, text);
      append([makeLine("in", text), makeLine("sys", lang === "uz" ? "DEVICE  native telemetry o‘qilmoqda…" : "DEVICE  reading native telemetry…")]);
      emitMvmSignal("intent");
      void runDeviceRequest({ state, lang }).then((ls) => {
        rememberActiveSessionResult(text, ls.map((item) => item.text), sessionTurnId);
        append(ls);
        announceVoiceLines(ls, voiceOrigin);
        emitMvmSignal(ls.some((line) => line.kind === "warn") ? "warn" : "success");
      });
      setInput("");
      setHistIdx(-1);
      return;
    }
    if (parsed.cmd?.name === "install") {
      const next = pushHistory(state, text); saveState(next); setState(next); const sessionTurnId = rememberActiveSessionTurn(text, text);
      append([makeLine("in", text)]);
      emitMvmSignal("intent");
      void runInstall({ state, lang }).then((ls) => { rememberActiveSessionResult(text, ls.map((item) => item.text), sessionTurnId); append(ls); announceVoiceLines(ls, voiceOrigin); });
      setInput("");
      setHistIdx(-1);
      return;
    }

    const capabilityAction: CapabilityAction | null =
      canUseNativeAndroidLauncher() &&
      (parsed.cmd?.name === "camera" ||
        parsed.cmd?.name === "qr" ||
        parsed.cmd?.name === "notification")
        ? parsed.cmd.name
        : null;

    if (capabilityAction) {
      const next = pushHistory(state, text); saveState(next); setState(next); const sessionTurnId = rememberActiveSessionTurn(text, text);
      append([
        makeLine("in", text),
        makeLine(
          "sys",
          lang === "uz"
            ? `CAPABILITY  ${capabilityAction.toUpperCase()}  tekshirilmoqda…`
            : `CAPABILITY  ${capabilityAction.toUpperCase()}  checking…`,
        ),
      ]);
      emitMvmSignal("intent");

      try {
        const guard = await ensureActionCapabilities(capabilityAction);
        if (!guard.ok) {
          const statusLine =
            guard.reason === "settings"
              ? lang === "uz"
                ? "Android Settings ochildi. Access’ni yoqing va MVMCMD’ga qayting."
                : "Android Settings opened. Enable the access and return to MVMCMD."
              : guard.reason === "denied"
                ? lang === "uz"
                  ? `${guard.snapshot.id.toUpperCase()} rad etildi. Buyruq bajarilmadi.`
                  : `${guard.snapshot.id.toUpperCase()} was denied. Command was not executed.`
                : lang === "uz"
                  ? `${guard.snapshot.id.toUpperCase()} bu qurilmada mavjud emas.`
                  : `${guard.snapshot.id.toUpperCase()} is unavailable on this device.`;

          rememberActiveSessionResult(text, ["FAILED " + statusLine], sessionTurnId);
          const failureLines = [
            makeLine("warn", `CAPABILITY  ${guard.snapshot.id.toUpperCase()}`, { meta: guard.snapshot.state }),
            makeLine("dim", statusLine),
          ];
          append(failureLines);
          announceVoiceLines(failureLines, voiceOrigin);
          setInput("");
          setHistIdx(-1);
          return;
        }

        rememberActiveSessionResult(text, ["CAPABILITY READY"], sessionTurnId);
        append([
          makeLine(
            "ok",
            `CAPABILITY  ${guard.snapshot.id.toUpperCase()} READY`,
          ),
        ]);
      } catch (error) {
        rememberActiveSessionResult(text, ["CAPABILITY FAILED"], sessionTurnId);
        const failureLines = [makeLine("warn", lang === "uz" ? "CAPABILITY tekshiruvi xatolik berdi." : "Capability check failed.", { meta: error instanceof Error ? error.message : "unknown error" })];
        append(failureLines);
        announceVoiceLines(failureLines, voiceOrigin);
        setInput("");
        setHistIdx(-1);
        return;
      }
    }

    const applyResult = (includeInput = true) => {
      if (parseStartedAt !== undefined && typeof performance !== "undefined") {
        recordPerformanceMeasurement("input-route-ms", Math.max(0, performance.now() - parseStartedAt), "intent resolved; execution dispatch reached; async native completion excluded");
      }
      const result = execute(text, { state, lang });
      const commandName = parsed.cmd?.name ?? text.trim().split(/\s+/)[0]?.toLowerCase();
      setRainVisible(commandName === "wallpaper");
      setJuicePulse((value) => value + 1);
      setState(result.state);
      append(
        includeInput ? [makeLine("in", displayText), ...result.lines] : result.lines,
        result.clearLog,
      );
      announceVoiceLines(result.lines, voiceOrigin);
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
    const transition = () => applyResult(Boolean(!capabilityAction));
    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(transition);
    } else {
      transition();
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
      if (voiceListening) {
        voiceRequestRef.current += 1;
        void cancelVoiceCapture();
        setVoiceListening(false);
      }
      voicePendingRef.current = false;
      setVoiceStatus("");
      cancelVoiceSpeech();
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
      inputRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
      return;
    }
    document.getElementById(zone === "rail" ? "mvm-space-left" : "mvm-space-right")?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
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
      data-mvm-performance-fps={performanceGovernor.measured ? performanceGovernor.fps : undefined}
      data-mvm-motion={reducedMotion ? "reduced" : "standard"}
      data-mvm-space-state={spatialState}
      data-mvm-juice={juicePulse}
      data-mvm-design-roles="bento-40 glass-20 neumorphic-20 skeuo-20"
      className={cn("mvm-trend-view relative isolate flex min-h-dvh flex-col bg-bg text-fg", reducedMotion && "mvm-motion-reduced")}
      style={{
        "--mvm-perf-render-scale": performanceGovernor.renderScale,
        "--mvm-perf-motion-scale": performanceGovernor.motionScale,
      } as React.CSSProperties}
    >
      <MvmRainBackdrop visible={rainVisible} />
      <div
        key={`juice-${juicePulse}`}
        aria-hidden
        className="mvm-juice-burst"
        data-signal={interfaceSignal}
      />
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
            <p className="mvm-runtime-chip mvm-performance-chip tabular-nums uppercase tracking-mark" title={performanceGovernor.measured ? `Measured ${performanceGovernor.fps} FPS` : (lang === "uz" ? "FPS o‘lchanmoqda" : "Measuring frame delivery")}>
              {performanceGovernor.measured ? `${performanceGovernor.tier} · ${performanceGovernor.fps}` : (lang === "uz" ? "o‘lchanmoqda" : "sampling")}
            </p>
            <button
              type="button"
              data-mvm-action="motion-toggle"
              aria-label={motionModeDescription(motionMode, systemReducedMotion, lang)}
              aria-pressed={motionMode === "reduced"}
              title={motionModeDescription(motionMode, systemReducedMotion, lang)}
              onClick={toggleMotionMode}
              className="mvm-motion-toggle inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-muted hover:border-line-strong hover:text-fg"
            >
              <Activity size={13} aria-hidden="true" />
              <span>{motionLabel}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mvm-cols mvm-dynamic-layout mvm-bento-canvas mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-1">
        <aside id="mvm-space-left" data-motion="06-rail-drift" className="mvm-secondary-rail mvm-bento-card mvm-glass-surface enter-left d2 mvm-motion-rail-drift mvm-trend-bento hidden border-r border-line p-4 lg:block">
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

        <section id="mvm-space-core" className="mvm-bento-core enter-fade d3 mvm-motion-terminal-flicker flex min-h-0 flex-col">
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
              <div data-motion="02-vector-scan" className="mvm-motion-vector-scan mvm-boot-identity mvm-bento-card mvm-glass-surface mb-4 border border-line px-3 py-3">
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

        <aside id="mvm-space-right" data-motion="24-liquid-glass" className="mvm-secondary-rail mvm-bento-card mvm-glass-surface enter-right d4 mvm-hand-beam mvm-trend-glass hidden border-l border-line p-4 lg:block">
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
        className="mvm-mobile-dock mvm-glass-surface enter-up d5 border-t border-line bg-bg"
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
                className="mvm-quick-action mvm-neumorphic-control shrink-0 rounded-full border border-line bg-surface/70 px-3 py-1.5 font-mono text-micro text-muted transition-colors hover:border-line-strong hover:bg-raised hover:text-fg"
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
          <ul id="mvm-query-results" data-motion="31-dynamic-query" className="mvm-query-results mx-auto flex max-w-6xl flex-col gap-1 px-4 pt-3 sm:px-6" aria-live="polite">
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

        {globalEntryNotice && (
          <div role="status" aria-live="polite" className="mvm-global-entry mx-auto flex w-full max-w-6xl items-start gap-3 border border-line bg-surface/80 px-4 py-3 font-mono text-xs text-muted sm:px-6">
            <span className="mt-0.5 text-accent" aria-hidden>↳</span>
            <p className="min-w-0 flex-1 leading-relaxed">{globalEntryNotice}</p>
            <button type="button" aria-label={lang === "uz" ? "Tashqi kirish xabarini yopish" : "Dismiss external entry notice"} className="shrink-0 rounded px-2 py-1 text-faint hover:bg-raised hover:text-fg" onClick={() => setGlobalEntryNotice("")}>×</button>
          </div>
        )}
        <form
          aria-label={lang === "uz" ? "MVMCMD buyruq satri" : "MVMCMD command line"}
          data-motion="09-input-ignite"
          data-mvm-action="command-surface"
          className="mvm-motion-input-ignite mvm-primary-command mvm-glass-surface mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6"
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
            onChange={(e) => { voicePendingRef.current = false; setVoiceStatus(""); setInput(e.target.value); }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={onKey}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            aria-autocomplete="list"
            aria-controls={hits.length ? "mvm-query-results" : undefined}
            aria-expanded={hits.length > 0 ? true : undefined}
            placeholder={t(lang, "prompt")}
            className="mvm-caret mvm-hand-shimmer min-h-11 min-w-0 flex-1 bg-transparent font-mono text-base text-fg outline-none placeholder:text-faint"
          />
          <button
            type="button"
            aria-label={voiceListening ? (lang === "uz" ? "Ovozni tugatish" : "Finish voice input") : (lang === "uz" ? "Ovoz bilan buyruq kiritish" : "Enter command by voice")}
            aria-pressed={voiceListening}
            title={voiceListening ? (lang === "uz" ? "Ovoz kiritishni bekor qilish" : "Cancel voice input") : (lang === "uz" ? "Push-to-talk" : "Push to talk")}
            disabled={!isVoiceCaptureSupported()}
            onClick={() => void handleVoiceClick()}
            className={cn("mvm-neumorphic-control inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-line px-3 py-2.5 font-mono text-[10px] tracking-wide transition-colors", voiceListening ? "border-accent bg-accent/10 text-accent" : "bg-surface text-muted hover:border-line-strong hover:text-fg", !isVoiceCaptureSupported() && "cursor-not-allowed opacity-40")}
          >
            {voiceListening ? <MicOff size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" /> }
            <span>{voiceListening ? "CANCEL" : "VOICE"}</span>
          </button>
          <button
            type="submit"
            className="mvm-hand-magnetic mvm-neumorphic-control mvm-hand-spring-snap inline-flex shrink-0 rounded-sm bg-accent px-3 py-2.5 font-display text-xs font-semibold tracking-wide text-accent-fg transition-transform duration-150 ease-out active:scale-[0.96] sm:px-4"
            data-mvm-action="launch-submit"
            data-mvm-physical
          >
            {t(lang, "launch")}
          </button>
        </form>
        {(voiceStatus || !isVoiceCaptureSupported()) && (
          <p role="status" aria-live="polite" className="mx-auto max-w-6xl px-4 pb-2 font-mono text-[10px] leading-relaxed text-muted sm:px-6">
            {voiceStatus || (lang === "uz" ? "Ovozli kiritish bu platformada yo‘q — buyruqni yozing." : "Voice input is unavailable on this platform — type your command.")}
          </p>
        )}
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
