import { CATALOG, CATALOG_BY_ID, CATEGORIES, findByIdOrName } from "./catalog";
import { COMMANDS, parseLine } from "./commands";
import { pickLaunch, rankApps, resolveAliasTarget } from "./fuzzy";
import { compact } from "./normalize";
import { understandCommand } from "./intelligence";
import { launchApp, launchRawUrl, launchStore } from "./intents";
import { canUseNativeAndroidLauncher, nativeOpenCamera, nativeOpenQr, nativeOpenWallpaper, nativeOpenEnglish, nativeOpenNotifications } from "./native-launcher";
import {
  dropAlias,
  pushHistory,
  recordUse,
  resetState,
  saveState,
  setLang,
  togglePin,
  upsertAlias,
} from "./persist";
import {
  hasInstallPrompt,
  promptInstall,
  requestNotify,
  requestPersistentStorage,
  snapshotPerms,
} from "./permissions";
import { detectRuntime } from "./platform";
import { nativeRequestCapability } from "./native-launcher";
import { refreshNativeCapabilities } from "./capabilities";
import { runMvmAction, actionStatusLine } from "./action-engine";
import { planMvmTask, runMvmTaskPlanSync } from "./task-planner";
import { runAppBridge } from "./app-bridge";
import { canUseNativeDeviceEngine, formatBytes, nativeGetDeviceSnapshot } from "./device";
import type { CatalogApp, Lang, LogLine, MatchHit, PersistedState } from "./types";

let seq = 0;
function line(kind: LogLine["kind"], text: string, extra?: Partial<LogLine>): LogLine {
  seq += 1;
  return { id: `l${seq.toString(36)}`, kind, text, ...extra };
}

export interface ExecContext {
  state: PersistedState;
  lang: Lang;
}

export interface ExecResult {
  state: PersistedState;
  lines: LogLine[];
  clearLog?: boolean;
  launch?: CatalogApp;
  hits?: MatchHit[];
  openVision?: boolean;
}

function L(ctx: ExecContext, uz: string, en: string): string {
  return ctx.lang === "uz" ? uz : en;
}

function resolveQuery(query: string, state: PersistedState): { hits: MatchHit[]; bound?: string } {
  const aliased = resolveAliasTarget(query, state.aliases);
  const q = aliased ?? query;
  const hits = rankApps(q, CATALOG, state.usage, 8);

  // A bind may intentionally target a raw Android package that is not in the
  // catalog. Treat that package as a first-class launch target instead of
  // reporting "not found" after the alias was successfully saved.
  if (hits.length === 0 && /^[a-zA-Z][a-zA-Z0-9_]*(?:\\.[a-zA-Z0-9_]+)+$/.test(q)) {
    const app: CatalogApp = {
      id: q,
      name: q,
      aliases: [],
      androidPackage: q,
      category: "tool",
      weight: 1,
    };
    return {
      hits: [{ app, score: 18_000, reason: "package" }],
      bound: aliased ?? undefined,
    };
  }

  return { hits, bound: aliased ?? undefined };
}

function launchHit(ctx: ExecContext, hit: MatchHit): ExecResult {
  const runtime = detectRuntime();
  const action = runMvmAction({
    context: {
      skillId: "open-app",
      platform: runtime.platform,
      requiredCapabilities: ["app_launch"],
      metadata: { appId: hit.app.id },
    },
    precondition: () => ({ ok: Boolean(hit.app.id), reason: "missing app id" }),
    execute: () => launchApp(hit.app, runtime.platform),
    observe: (result) => ({ ok: result.ok, reason: result.note }),
    verify: (result) =>
      result.method === "intent"
        ? { ok: false, reason: "platform intent completion is not observable here" }
        : { ok: result.ok, reason: result.note },
  });

  const state = recordUse(ctx.state, hit.app.id);
  saveState(state);
  const pkg = hit.app.androidPackage ? `  ${hit.app.androidPackage}` : "";
  const status = actionStatusLine(action);
  const lines: LogLine[] = [
    line(action.ok ? "ok" : "warn", `LAUNCH  ${hit.app.name}  ·  ${status}`, {
      meta: action.message,
      appId: hit.app.id,
    }),
    line("dim", `${action.status.toUpperCase()}  ATTEMPTS=${action.attempts}  ${action.trace.join(" → ")}`),
    line("dim", `${action.value?.method?.toUpperCase?.() ?? "LAUNCH"}${pkg}`),
  ];
  if (action.value?.method === "intent") {
    lines.push(
      line(
        "dim",
        L(
          ctx,
          "Intent yuborildi. Tizim ilovani ochishi mumkin; MVMCMD buni hozircha VERIFIED deb ko‘rsatmaydi.",
          "Intent requested. The system may open the app; MVMCMD does not label this VERIFIED yet.",
        ),
      ),
    );
  }
  return { state, lines, launch: hit.app, hits: [hit] };
}

function formatHit(hit: MatchHit, index: number): LogLine {
  const n = String(index + 1).padStart(2, "0");
  const pkg = hit.app.androidPackage ?? hit.app.webUrl ?? "";
  return line("match", `${n}  ${hit.app.name}`, {
    meta: `${hit.reason}  ${pkg}`,
    appId: hit.app.id,
  });
}

export function execute(rawLine: string, ctx: ExecContext): ExecResult {
  const trimmed = rawLine.trim();
  if (!trimmed) return { state: ctx.state, lines: [] };

  const taskPlan = planMvmTask(trimmed);
  if (taskPlan) {
    const taskRun = runMvmTaskPlanSync(
      taskPlan,
      (step) => execute(step.input, ctx),
      (result) => {
        const failed = result.lines.some((item) => item.kind === "warn");
        const verified = !failed && result.lines.some((item) => /·\\s*VERIFIED\\b/.test(item.text));
        return {
          ok: !failed,
          verified,
          reason: failed ? "step returned a warning" : verified ? undefined : "step completed without completion proof",
        };
      },
    );
    const last = taskRun.steps[taskRun.steps.length - 1]?.value;
    const taskState = last?.state ?? ctx.state;
    const taskStatus = taskRun.ok ? (taskRun.verified ? "VERIFIED" : "STARTED") : "FAILED";
    const taskLines: LogLine[] = [
      line("sys", `TASK  ${taskRun.plan.steps.length} steps  ·  ${taskStatus}`),
      ...taskRun.steps.flatMap((step) => [
        line(
          step.status === "failed" || step.status === "skipped" ? "warn" : "out",
          `${step.stepId.toUpperCase()}  ${step.status.toUpperCase()}  ·  ${step.input}`,
          { meta: step.reason },
        ),
      ]),
    ];
    return { state: taskState, lines: taskLines };
  }

  const state0 = pushHistory(ctx.state, trimmed);
  saveState(state0);
  const ctx2: ExecContext = { ...ctx, state: state0 };
  const understood = understandCommand(trimmed);
  const capability = understood.entities.find((e) => e.type === "capability")?.value;
  const interpreted = understood.intent === "open_app" ? `open ${understood.entities.find((e) => e.type === "app_query")?.value ?? ""}`.trim() : understood.intent === "find_app" ? `find ${understood.entities.find((e) => e.type === "app_query")?.value ?? ""}`.trim() : understood.intent === "device_snapshot" ? "device" : understood.intent === "permission_status" ? `perm ${capability ?? ""}`.trim() : understood.intent === "help" ? "help" : trimmed;
  const parsed = parseLine(interpreted);
  const name = parsed.cmd?.name;

  if (!parsed.cmd) {
    if (/^https?:\/\//i.test(trimmed) || /^(tel:|sms:|mailto:)/i.test(trimmed)) {
      const ok = launchRawUrl(trimmed);
      return {
        state: state0,
        lines: [line(ok ? "ok" : "warn", ok ? `OPEN  ${trimmed}` : "URL rejected")],
      };
    }
    const { hits, bound } = resolveQuery(trimmed, state0);
    if (hits.length === 0) {
      return {
        state: state0,
        lines: [
          line("warn", L(ctx2, `Topilmadi: ${trimmed}`, `No match: ${trimmed}`)),
          line(
            "dim",
            L(
              ctx2,
              "bind <nom> <ilova>  ·  pack <package>  ·  find <matn>",
              "bind <name> <app>  ·  pack <package>  ·  find <text>",
            ),
          ),
        ],
        hits,
      };
    }
    const top = pickLaunch(hits)!;
    const extra =
      bound || hits.length === 1
        ? []
        : hits.slice(1, 4).map((h, i) => formatHit(h, i + 1));
    const launched = launchHit(ctx2, top);
    return {
      ...launched,
      lines: [
        ...(bound ? [line("dim", `alias  ${trimmed} → ${bound}`)] : []),
        ...launched.lines,
        ...extra,
      ],
      hits,
    };
  }

  switch (name) {
    case "english": {
      const runtime = detectRuntime();
      if (runtime.platform !== "android" || !canUseNativeAndroidLauncher()) {
        return { state: state0, lines: [line("warn", L(ctx2, "ENGLISH LAB hozir native Android APKda ishlaydi.", "ENGLISH LAB currently runs in the native Android APK."))] };
      }
      void nativeOpenEnglish().catch(() => undefined);
      return { state: state0, lines: [line("ok", "ENGLISH LAB", { meta: "A1 → C2 · IELTS · TTS · SPEAKING" })] };
    }
    case "notification": {
      const runtime = detectRuntime();
      if (runtime.platform !== "android" || !canUseNativeAndroidLauncher()) {
        return { state: state0, lines: [line("warn", L(ctx2, "NOTIFICATION faqat native Android APKda ishlaydi.", "NOTIFICATION currently runs in the native Android APK."))] };
      }
      void nativeOpenNotifications().catch(() => undefined);
      return {
        state: state0,
        lines: [
          line("sys", "NOTIFICATION  STARTED", { meta: "center open requested; inbox contents not verified" }),
          line("dim", L(ctx2, "Markaz ochish so‘raldi. Xabarlar o‘qilgani tasdiqlanmagan.", "Center open requested. Message contents are not verified.")),
        ],
      };
    }
    case "camera": {
      const runtime = detectRuntime();
      if (runtime.platform !== "android" || !canUseNativeAndroidLauncher()) {
        return {
          state: state0,
          lines: [
            line(
              "warn",
              L(ctx2, "CAMERA hozir native Android APK ichida ishlaydi.", "CAMERA currently runs in the native Android APK."),
            ),
          ],
        };
      }
      void nativeOpenCamera().catch(() => undefined);
      return {
        state: state0,
        lines: [
          line("sys", "CAMERA  STARTED", { meta: "native open requested; capture is not verified" }),
          line("dim", L(ctx2, "Kamera ochish so‘raldi. Surat tasdiqlanmaguncha VERIFIED emas.", "Camera open requested. Not VERIFIED until a capture result exists.")),
        ],
      };
    }
    case "qr": {
      const runtime = detectRuntime();
      if (runtime.platform !== "android" || !canUseNativeAndroidLauncher()) {
        return {
          state: state0,
          lines: [
            line(
              "warn",
              L(ctx2, "QR hozir native Android APK ichida ishlaydi.", "QR currently runs in the native Android APK."),
            ),
          ],
        };
      }
      void nativeOpenQr().catch(() => undefined);
      return {
        state: state0,
        lines: [
          line("sys", "QR  STARTED", { meta: "scanner opened; decode is not verified" }),
          line("dim", L(ctx2, "Skaner ochildi. Kod o‘qilmaguncha VERIFIED emas.", "Scanner opened. Not VERIFIED until a code is decoded.")),
        ],
      };
    }
    case "wallpaper": {
      const runtime = detectRuntime();
      if (runtime.platform !== "android" || !canUseNativeAndroidLauncher()) {
        return {
          state: state0,
          lines: [line("warn", L(ctx2, "WALLPAPER hozir native Android APK ichida ishlaydi.", "WALLPAPER currently runs in the native Android APK."))],
        };
      }
      void nativeOpenWallpaper().catch(() => undefined);
      return {
        state: state0,
        lines: [
          line("ok", "WALLPAPER", { meta: "NATIVE 3D GALLERY" }),
          line("dim", L(ctx2, "17 ta 3D scene: HOME live + LOCK native clock bilan.", "17 custom 3D scenes: HOME live + LOCK with the native clock.")),
        ],
      };
    }
    case "open": {
      const q = parsed.args.join(" ");
      if (!q) {
        return { state: state0, lines: [line("warn", parsed.cmd.usage)] };
      }
      const { hits, bound } = resolveQuery(q, state0);
      if (!hits[0]) {
        return {
          state: state0,
          lines: [line("warn", L(ctx2, `Topilmadi: ${q}`, `No match: ${q}`))],
          hits,
        };
      }
      const launched = launchHit(ctx2, hits[0]);
      return {
        ...launched,
        lines: [
          ...(bound ? [line("dim", `alias  ${q} → ${bound}`)] : []),
          ...launched.lines,
        ],
        hits,
      };
    }
    case "find": {
      const q = parsed.args.join(" ");
      if (!q) return { state: state0, lines: [line("warn", parsed.cmd.usage)] };
      const hits = rankApps(q, CATALOG, state0.usage, 10);
      if (hits.length === 0) {
        return {
          state: state0,
          lines: [line("warn", L(ctx2, "Hech narsa yo‘q", "Nothing ranked"))],
          hits,
        };
      }
      return {
        state: state0,
        lines: [
          line("sys", `FIND  ${q}  ·  ${hits.length}`),
          ...hits.map((h, i) => formatHit(h, i)),
        ],
        hits,
      };
    }
    case "ls": {
      const cat = parsed.args[0]?.toLowerCase();
      const list = cat
        ? CATALOG.filter((a) => a.category === cat || a.category.startsWith(cat))
        : CATALOG;
      if (list.length === 0) {
        return {
          state: state0,
          lines: [
            line("warn", L(ctx2, `Kategoriya yo‘q: ${cat}`, `No category: ${cat}`)),
            line("dim", CATEGORIES.join("  ")),
          ],
        };
      }
      const shown = list.slice().sort((a, b) => b.weight - a.weight).slice(0, 24);
      return {
        state: state0,
        lines: [
          line("sys", `LS  ${cat ?? "all"}  ·  ${list.length}`),
          ...shown.map((a, i) =>
            line("out", `${String(i + 1).padStart(2, "0")}  ${a.name}`, {
              meta: `${a.category}${a.androidPackage ? "  " + a.androidPackage : ""}`,
              appId: a.id,
            }),
          ),
          ...(list.length > shown.length
            ? [line("dim", `+${list.length - shown.length}`)]
            : []),
        ],
      };
    }
    case "birthday": {
      return {
        state: state0,
        lines: [
          line("sys", "🎉 TUG‘ILGAN KUNINGIZ BILAN! / HAPPY BIRTHDAY! 🎉"),
          line("ok", L(ctx2, "Sizga baxt, omad, sihat-salomatlik va bitmas-tuganmas g‘ayrat tilaymiz!", "Wishing you happiness, health, success, and endless inspiration!")),
          line("out", L(ctx2, "MVMCMD loyihasi va Jules siz bilan birga nishonlaydi! 🎂🎈✨", "MVMCMD & Jules celebrate with you! 🎂🎈✨")),
        ],
      };
    }
    case "bind": {
      const alias = parsed.args[0];
      const target = parsed.args.slice(1).join(" ");
      if (!alias || !target) {
        return { state: state0, lines: [line("warn", parsed.cmd.usage)] };
      }
      const app = findByIdOrName(target) ?? rankApps(target, CATALOG, state0.usage, 1)[0]?.app;
      if (!app && !target.includes(".")) {
        return {
          state: state0,
          lines: [line("warn", L(ctx2, `Noma’lum nishon: ${target}`, `Unknown target: ${target}`))],
        };
      }
      const boundTo = app?.id ?? target;
      const state = upsertAlias(state0, alias, boundTo);
      saveState(state);
      return {
        state,
        lines: [line("ok", `BIND  ${compact(alias)}  →  ${boundTo}`)],
      };
    }
    case "unbind": {
      const alias = parsed.args[0];
      if (!alias) return { state: state0, lines: [line("warn", parsed.cmd.usage)] };
      const state = dropAlias(state0, alias);
      saveState(state);
      return { state, lines: [line("ok", `UNBIND  ${alias}`)] };
    }
    case "pin":
    case "unpin": {
      const q = parsed.args.join(" ");
      const app = findByIdOrName(q) ?? rankApps(q, CATALOG, state0.usage, 1)[0]?.app;
      if (!app) return { state: state0, lines: [line("warn", L(ctx2, "Ilova yo‘q", "No app"))] };
      const state = togglePin(state0, app.id, name === "pin");
      saveState(state);
      return { state, lines: [line("ok", `${name.toUpperCase()}  ${app.name}`)] };
    }
    case "hist": {
      const rows = state0.history.slice(0, 16);
      return {
        state: state0,
        lines:
          rows.length === 0
            ? [line("dim", L(ctx2, "Tarix bo‘sh", "History empty"))]
            : rows.map((h, i) => line("out", `${String(i + 1).padStart(2, "0")}  ${h}`)),
      };
    }
    case "recents": {
      const rows = state0.recents
        .map((id) => CATALOG_BY_ID[id])
        .filter((a): a is CatalogApp => Boolean(a));
      return {
        state: state0,
        lines:
          rows.length === 0
            ? [line("dim", L(ctx2, "Hali ochilmagan", "Nothing launched yet"))]
            : rows.map((a, i) =>
                line("out", `${String(i + 1).padStart(2, "0")}  ${a.name}`, { appId: a.id }),
              ),
      };
    }
    case "clear":
      return { state: state0, lines: [], clearLog: true };
    case "perm": {
      return {
        state: state0,
        lines: [line("sys", "PERM  requesting…")],
      };
    }
    case "install": {
      return {
        state: state0,
        lines: [line("sys", hasInstallPrompt() ? "INSTALL  prompt" : "INSTALL  manual")],
      };
    }
    case "store": {
      const q = parsed.args.join(" ") || state0.recents[0] || "";
      if (!q) return { state: state0, lines: [line("warn", parsed.cmd.usage)] };
      const app = findByIdOrName(q) ?? rankApps(q, CATALOG, state0.usage, 1)[0]?.app;
      if (!app) return { state: state0, lines: [line("warn", L(ctx2, "Ilova yo‘q", "No app"))] };
      const runtime = detectRuntime();
      const result = launchStore(app, runtime.platform);
      return {
        state: state0,
        lines: [line(result.ok ? "ok" : "warn", `STORE  ${app.name}`, { meta: result.url })],
      };
    }
    case "pack": {
      const pkg = parsed.args[0];
      if (!pkg || !pkg.includes(".")) {
        return { state: state0, lines: [line("warn", parsed.cmd.usage)] };
      }
      const runtime = detectRuntime();
      const action = runAppBridge({ kind: "launch", target: pkg, platform: runtime.platform });
      return {
        state: state0,
        lines: [
          line(
            action.ok ? "sys" : "warn",
            `PACK  ${action.status.toUpperCase()}  ${pkg}`,
            { meta: action.reason ?? action.message },
          ),
        ],
      };
    }
    case "share": {
      const text = parsed.args.join(" ").trim();
      const runtime = detectRuntime();
      const action = runAppBridge({ kind: "share", target: "chooser", text, platform: runtime.platform, chooser: true });
      return {
        state: state0,
        lines: [
          line(action.ok ? "sys" : "warn", `SHARE  ${action.status.toUpperCase()}  ${action.value?.method ?? "share"}`, { meta: action.reason ?? action.message }),
        ],
      };
    }
    case "link": {
      const target = parsed.args.join(" ").trim();
      const runtime = detectRuntime();
      const kind = /^https?:/i.test(target) ? "url" : "deeplink";
      const action = runAppBridge({ kind, target, platform: runtime.platform });
      return {
        state: state0,
        lines: [
          line(action.ok ? "sys" : "warn", `LINK  ${action.status.toUpperCase()}  ${action.value?.method ?? "url"}`, { meta: action.reason ?? action.value?.target }),
        ],
      };
    }
    case "sys": {
      const runtime = detectRuntime();
      return {
        state: state0,
        lines: [
          line("sys", `HOST     ${runtime.platform}${runtime.standalone ? "  standalone" : ""}`),
          line("sys", `CATALOG  ${CATALOG.length}`),
          line("sys", `ALIAS    ${state0.aliases.length}`),
          line("sys", `LANG     ${state0.lang}`),
          line("sys", `NET      ${runtime.online ? "online" : "offline"}`),
        ],
      };
    }
    case "about": {
      return {
        state: state0,
        lines: [
          line("sys", "MVMCMD  ·  Machine Vector Module"),
          line(
            "out",
            L(
              ctx2,
              "Hohlagan nomni yozing. Prefiks bo‘yicha eng yaqin ilova ochiladi. AI yo‘q — faqat indekslash.",
              "Type any name. The closest prefix match launches. No AI — a handcrafted index.",
            ),
          ),
          line(
            "dim",
            L(
              ctx2,
              "Android: tizim Intent. iOS: URL scheme. Desktop: rasmiy web.",
              "Android: system Intent. iOS: URL scheme. Desktop: official web.",
            ),
          ),
        ],
      };
    }
    case "lang": {
      const next = parsed.args[0]?.toLowerCase();
      if (next !== "uz" && next !== "en") {
        return { state: state0, lines: [line("warn", "lang uz | lang en")] };
      }
      const state = setLang(state0, next);
      saveState(state);
      return { state, lines: [line("ok", `LANG  ${next}`)] };
    }
    case "help": {
      const q = parsed.args[0];
      if (q) {
        const spec = COMMANDS.find((c) => c.name === q || c.aliases.includes(q));
        if (!spec) return { state: state0, lines: [line("warn", `help: ${q}`)] };
        return {
          state: state0,
          lines: [
            line("sys", spec.usage),
            line("out", ctx2.lang === "uz" ? spec.summaryUz : spec.summaryEn),
          ],
        };
      }
      return {
        state: state0,
        lines: [
          line("sys", "COMMANDS"),
          ...COMMANDS.filter((c) => !c.hidden).map((c) =>
            line("out", c.usage.padEnd(22, " "), {
              meta: ctx2.lang === "uz" ? c.summaryUz : c.summaryEn,
            }),
          ),
          line(
            "dim",
            L(
              ctx2,
              "Buyruqsiz yozilgan har qanday so‘z — ilova qidiruvi.",
              "Any bare word is an app query.",
            ),
          ),
        ],
      };
    }
    case "date": {
      const now = new Date();
      return {
        state: state0,
        lines: [
          line("out", now.toLocaleString(ctx2.lang === "uz" ? "uz-UZ" : "en-GB"), {
            meta: now.toISOString(),
          }),
        ],
      };
    }
    case "whoami": {
      const runtime = detectRuntime();
      return {
        state: state0,
        lines: [
          line("out", runtime.platform),
          line("dim", runtime.language),
          line("dim", runtime.standalone ? "standalone" : "browser"),
        ],
      };
    }
    case "reset": {
      const state = resetState();
      return {
        state,
        lines: [line("ok", L(ctx2, "Mahalliy holat tozalandi", "Local state wiped"))],
        clearLog: true,
      };
    }
    default:
      return { state: state0, lines: [line("warn", trimmed)] };
  }
}

export async function runDeviceRequest(
  ctx: ExecContext,
): Promise<LogLine[]> {
  if (!canUseNativeDeviceEngine()) {
    return [line("warn", L(ctx, "DEVICE engine hozir native Android APKda ishlaydi.", "DEVICE engine currently runs in the native Android APK."))];
  }
  try {
    const s = await nativeGetDeviceSnapshot();
    return [
      line("sys", `DEVICE  ${s.device.manufacturer} ${s.device.model}`),
      line("out", `CPU      ${s.cpu.cores} cores · ${s.cpu.architecture}${s.cpu.loadPercent === undefined ? " · load unavailable" : ` · load ${s.cpu.loadPercent.toFixed(1)}% (best-effort)`}`),
      line("out", `RAM      ${formatBytes(s.memory.usedBytes)} / ${formatBytes(s.memory.totalBytes)} · free ${formatBytes(s.memory.availableBytes)}`),
      line("out", `STORAGE  ${formatBytes(s.storage.usedBytes)} / ${formatBytes(s.storage.totalBytes)} · free ${formatBytes(s.storage.availableBytes)}`),
      line("out", `BATTERY  ${s.battery.percent === undefined ? "unknown" : s.battery.percent + "%"} · ${s.battery.charging ? "charging" : "not charging"}${s.battery.temperatureC === undefined ? "" : ` · ${s.battery.temperatureC.toFixed(1)}°C`}`),
      line("out", `THERMAL  ${s.thermal.statusName.toUpperCase()}`),
      line("out", `DISPLAY  ${s.display.widthPx ?? "?"}×${s.display.heightPx ?? "?"} · ${s.display.refreshRateHz === undefined ? "?" : s.display.refreshRateHz.toFixed(1) + "Hz"}`),
      line("out", `NETWORK  ${s.network.connected ? "connected" : "offline"}`),
      line("out", `BLUETOOTH  ${s.bluetooth.state}`),
      line("out", `AUDIO    volume ${s.audio.musicVolume ?? "?"}/${s.audio.musicMaxVolume ?? "?"}`),
      line("out", `SENSORS  ${s.sensors.length}`),
      line("dim", `SCHEMA   ${s.schemaVersion} · ${new Date(s.timestamp).toISOString()}`),
    ];
  } catch (error) {
    return [line("warn", L(ctx, "DEVICE ma’lumotlarini o‘qib bo‘lmadi.", "Unable to read device data."), { meta: error instanceof Error ? error.message : "unknown error" })];
  }
}

export async function runPermRequest(
  ctx: ExecContext,
  requestedCapability?: string,
): Promise<{ state: PersistedState; lines: LogLine[] }> {
  const runtime = detectRuntime();

  if (runtime.platform === "android" && canUseNativeAndroidLauncher()) {
    if (requestedCapability) {
      try {
        const snapshot = await nativeRequestCapability(requestedCapability);
        const stateLabel = snapshot.state.toUpperCase();
        const detail = snapshot.detail ? `  ${snapshot.detail}` : "";
        return {
          state: ctx.state,
          lines: [
            line(
              snapshot.state === "ready" ? "ok" : "warn",
              `CAPABILITY  ${snapshot.id.toUpperCase()}  ${stateLabel}`,
              { meta: `${snapshot.decision}${detail}` },
            ),
          ],
        };
      } catch (error) {
        return {
          state: ctx.state,
          lines: [
            line(
              "warn",
              `CAPABILITY  ${requestedCapability.toUpperCase()}  ERROR`,
              { meta: error instanceof Error ? error.message : "request failed" },
            ),
          ],
        };
      }
    }

    try {
      const snapshots = await refreshNativeCapabilities();
      return {
        state: ctx.state,
        lines: [
          line("sys", `CAPABILITIES  ${snapshots.length}`),
          ...snapshots.map((snapshot) =>
            line(
              snapshot.state === "ready" ? "ok" : snapshot.state === "error" ? "warn" : "out",
              `${snapshot.id.toUpperCase().padEnd(22, " ")} ${snapshot.state.toUpperCase()}`,
              { meta: snapshot.decision },
            ),
          ),
          line(
            "dim",
            L(
              ctx,
              "Aniq request uchun: perm camera  ·  perm notification_listener",
              "Request one capability explicitly: perm camera · perm notification_listener",
            ),
          ),
        ],
      };
    } catch (error) {
      return {
        state: ctx.state,
        lines: [
          line(
            "warn",
            L(ctx, "Android capability tekshiruvi ishlamadi.", "Android capability check failed."),
            { meta: error instanceof Error ? error.message : "unknown error" },
          ),
        ],
      };
    }
  }

  const persist = await requestPersistentStorage();
  const notify = await requestNotify();
  const snap = await snapshotPerms();
  const state: PersistedState = {
    ...ctx.state,
    storageGranted: persist || snap.persisted,
    notifyGranted: notify === "granted",
    gateSeen: true,
  };
  saveState(state);
  return {
    state,
    lines: [
      line("ok", `STORAGE   ${state.storageGranted ? "persistent" : "session"}`),
      line("ok", `NOTIFY    ${notify}`),
    ],
  };
}

export async function runInstall(ctx: ExecContext): Promise<LogLine[]> {
  const runtime = detectRuntime();
  if (runtime.standalone) {
    return [line("ok", ctx.lang === "uz" ? "Allaqachon o‘rnatilgan" : "Already installed")];
  }
  const outcome = await promptInstall();
  if (outcome === "accepted") {
    return [line("ok", ctx.lang === "uz" ? "O‘rnatish tasdiqlandi" : "Install accepted")];
  }
  if (outcome === "dismissed") {
    return [line("warn", ctx.lang === "uz" ? "O‘rnatish bekor" : "Install dismissed")];
  }
  if (runtime.platform === "ios") {
    return [
      line("sys", "iOS"),
      line(
        "out",
        ctx.lang === "uz"
          ? "Ulashish → Home Screen ga qo‘shish"
          : "Share → Add to Home Screen",
      ),
    ];
  }
  if (runtime.platform === "android") {
    return [
      line("sys", "ANDROID"),
      line(
        "out",
        ctx.lang === "uz"
          ? "Chrome menyu → Ilovani o‘rnatish / Bosh ekranga qo‘shish"
          : "Chrome menu → Install app / Add to Home screen",
      ),
    ];
  }
  return [
    line(
      "dim",
      ctx.lang === "uz"
        ? "Brauzer o‘rnatish oynasini hali bermadi. Telefonda Chrome orqali oching."
        : "No install prompt yet. Open this in Chrome on your phone.",
    ),
  ];
}

export { line as makeLine };
