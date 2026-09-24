import { CATALOG, CATALOG_BY_ID, CATEGORIES, findByIdOrName } from "./catalog";
import { COMMANDS, parseLine } from "./commands";
import { pickLaunch, rankApps, resolveAliasTarget } from "./fuzzy";
import { compact } from "./normalize";
import { launchApp, launchPackage, launchRawUrl, launchStore } from "./intents";
import {
  canUseNativeAndroidLauncher,
  nativeInspectPackage,
  nativeListInstalledApps,
  nativeOpenCamera,
} from "./native-launcher";
import {
  dropAlias,
  pushHistory,
  recordUse,
  resetState,
  saveState,
  setLang,
  togglePin,
  upsertAlias,
  upsertBinding,
  dropBinding,
  replaceBindings,
} from "./persist";
import {
  hasInstallPrompt,
  promptInstall,
  requestNotify,
  requestPersistentStorage,
  snapshotPerms,
} from "./permissions";
import { detectRuntime } from "./platform";
import type { CatalogApp, Lang, LogLine, MatchHit, PackageBinding, PersistedState } from "./types";

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
}

function L(ctx: ExecContext, uz: string, en: string): string {
  return ctx.lang === "uz" ? uz : en;
}

function boundCatalog(state: PersistedState): CatalogApp[] {
  return state.bindings.map((binding) => ({
    id: binding.packageName,
    name: binding.label || binding.packageName,
    aliases: binding.alias ? [binding.alias] : [],
    androidPackage: binding.packageName,
    category: "tool",
    weight: 120,
  }));
}

let installedAppsCache: { at: number; apps: CatalogApp[] } | null = null;

function allApps(state: PersistedState, discovered: CatalogApp[] = []): CatalogApp[] {
  const out: CatalogApp[] = [];
  const seenIds = new Set<string>();
  const seenPackages = new Set<string>();
  for (const app of [...boundCatalog(state), ...CATALOG, ...discovered]) {
    const packageName = app.androidPackage?.trim();
    if (seenIds.has(app.id) || (packageName && seenPackages.has(packageName))) continue;
    seenIds.add(app.id);
    if (packageName) seenPackages.add(packageName);
    out.push(app);
  }
  return out;
}

async function discoverInstalledApps(): Promise<CatalogApp[]> {
  if (!canUseNativeAndroidLauncher()) return [];
  const now = Date.now();
  if (installedAppsCache && now - installedAppsCache.at < 5_000) return installedAppsCache.apps;
  try {
    const packages = await nativeListInstalledApps();
    const apps: CatalogApp[] = packages.filter((item) => item.packageName).map((item) => ({
      id: item.packageName,
      name: item.label || item.packageName,
      aliases: [],
      androidPackage: item.packageName,
      category: "tool",
      weight: 40,
    }));
    installedAppsCache = { at: now, apps };
    return apps;
  } catch {
    return installedAppsCache?.apps ?? [];
  }
}

function resolveQuery(query: string, state: PersistedState, discovered: CatalogApp[] = []): { hits: MatchHit[]; bound?: string } {
  const aliased = resolveAliasTarget(query, state.aliases);
  const q = aliased ?? query;
  const hits = rankApps(q, allApps(state, discovered), state.usage, 8);

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

async function launchHit(ctx: ExecContext, hit: MatchHit): Promise<ExecResult> {
  const runtime = detectRuntime();
  const result = await launchApp(hit.app, runtime.platform);
  const state = recordUse(ctx.state, hit.app.id);
  saveState(state);
  const pkg = hit.app.androidPackage ? `  ${hit.app.androidPackage}` : "";
  const lines: LogLine[] = [
    line(result.ok ? "ok" : "warn", `${result.ok ? "LAUNCH" : "FAIL"}  ${hit.app.name}`, {
      meta: result.error ? `${result.note} · ${result.error}` : result.note,
      appId: hit.app.id,
    }),
    line("dim", `${result.method.toUpperCase()}${pkg}`),
  ];
  if (result.method === "intent") {
    lines.push(
      line(
        "dim",
        L(
          ctx,
          "Agar ilova shu telefonda bo‘lsa, tizim uni ochadi. Ochilmasa: store",
          "If the app is on this phone the system opens it. If not: store",
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

export async function execute(rawLine: string, ctx: ExecContext): Promise<ExecResult> {
  const trimmed = rawLine.trim();
  if (!trimmed) return { state: ctx.state, lines: [] };

  const state0 = pushHistory(ctx.state, trimmed);
  saveState(state0);
  const ctx2: ExecContext = { ...ctx, state: state0 };
  const parsed = parseLine(trimmed);
  const name = parsed.cmd?.name;

  if (!parsed.cmd) {
    if (/^https?:\/\//i.test(trimmed) || /^(tel:|sms:|mailto:)/i.test(trimmed)) {
      const ok = launchRawUrl(trimmed);
      return {
        state: state0,
        lines: [line(ok ? "ok" : "warn", ok ? `OPEN  ${trimmed}` : "URL rejected")],
      };
    }
    const discovered = await discoverInstalledApps();
    const { hits, bound } = resolveQuery(trimmed, state0, discovered);
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
    const launched = await launchHit(ctx2, top);
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
      try {
        const result = await nativeOpenCamera();
        return {
          state: state0,
          lines: [line(result.opened ? "ok" : "warn", result.opened ? "CAMERA  OPENED" : "CAMERA FAILED", { meta: result.opened ? "NATIVE CAMERA" : "NATIVE CAMERA ERROR" })],
        };
      } catch (error) {
        return { state: state0, lines: [line("warn", `CAMERA FAILED  ·  ${error instanceof Error ? error.message : "NATIVE_CAMERA_FAILED"}`)] };
      }
    }
    case "open": {
      const q = parsed.args.join(" ");
      if (!q) {
        return { state: state0, lines: [line("warn", parsed.cmd.usage)] };
      }
      const discovered = await discoverInstalledApps();
      const { hits, bound } = resolveQuery(q, state0, discovered);
      if (!hits[0]) {
        return {
          state: state0,
          lines: [line("warn", L(ctx2, `Topilmadi: ${q}`, `No match: ${q}`))],
          hits,
        };
      }
      const launched = await launchHit(ctx2, hits[0]);
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
      const hits = rankApps(q, allApps(state0, await discoverInstalledApps()), state0.usage, 10);
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
        ? allApps(state0, await discoverInstalledApps()).filter((a) => a.category === cat || a.category.startsWith(cat))
        : allApps(state0, await discoverInstalledApps());
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
      if (parsed.args.length === 0) {
        return { state: state0, lines: [line("warn", parsed.cmd.usage)] };
      }

      const packagePattern = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+$/;
      let alias = "";
      let target = "";

      if (packagePattern.test(parsed.args[0])) {
        target = parsed.args[0];
        alias = parsed.args[1] ?? target;
      } else {
        alias = parsed.args[0];
        target = parsed.args.slice(1).join(" ");
      }

      const known = findByIdOrName(target) ?? rankApps(target, allApps(state0), state0.usage, 1)[0]?.app;
      if (known) {
        const state = upsertAlias(state0, alias, known.id);
        saveState(state);
        return { state, lines: [line("ok", `BIND  ${compact(alias)}  →  ${known.id}`)] };
      }

      if (!packagePattern.test(target)) {
        return {
          state: state0,
          lines: [line("warn", L(ctx2, `Noma’lum nishon: ${target}`, `Unknown target: ${target}`))],
        };
      }

      if (!canUseNativeAndroidLauncher()) {
        return {
          state: state0,
          lines: [line("warn", L(ctx2, "Arbitrary package binding faqat Android native rejimida.", "Arbitrary package binding requires the native Android runtime."))],
        };
      }

      try {
        const inspected = await nativeInspectPackage(target);
        if (!inspected.found) {
          return { state: state0, lines: [line("warn", `BIND FAILED  ${target}  ·  NOT_INSTALLED`)] };
        }

        const binding: PackageBinding = {
          alias,
          packageName: inspected.packageName,
          label: inspected.label || inspected.packageName,
          versionName: inspected.versionName || undefined,
          versionCode: inspected.versionCode,
          enabled: inspected.enabled !== false,
          launcherAvailable: inspected.launcherAvailable === true,
        };
        const state = upsertBinding(state0, binding);
        saveState(state);
        return {
          state,
          lines: [
            line("ok", `BIND  ${compact(alias)} → ${binding.packageName}`),
            line("dim", `${binding.label} · launcher=${binding.launcherAvailable ? "yes" : "no"} · enabled=${binding.enabled ? "yes" : "no"}`),
          ],
        };
      } catch (error) {
        return {
          state: state0,
          lines: [line("warn", `BIND FAILED  ${target}  ·  ${error instanceof Error ? error.message : "NATIVE_INSPECT_FAILED"}` )],
        };
      }
    }
    case "unbind": {
      const alias = parsed.args[0];
      if (!alias) return { state: state0, lines: [line("warn", parsed.cmd.usage)] };
      const nextAliasState = dropAlias(state0, alias);
      const state = dropBinding(nextAliasState, alias);
      saveState(state);
      return { state, lines: [line("ok", `UNBIND  ${alias}`)] };
    }
    case "refresh": {
      if (!canUseNativeAndroidLauncher()) {
        return { state: state0, lines: [line("dim", L(ctx2, "Android native runtime yo‘q — bindinglar o‘zgarmadi.", "Native Android runtime unavailable; bindings unchanged."))] };
      }
      const valid: PackageBinding[] = [];
      const removed: string[] = [];
      for (const binding of state0.bindings) {
        try {
          const inspected = await nativeInspectPackage(binding.packageName);
          if (!inspected.found) {
            removed.push(binding.packageName);
            continue;
          }
          valid.push({
            ...binding,
            label: inspected.label || binding.label,
            versionName: inspected.versionName || binding.versionName,
            versionCode: inspected.versionCode ?? binding.versionCode,
            enabled: inspected.enabled !== false,
            launcherAvailable: inspected.launcherAvailable === true,
          });
        } catch {
          valid.push(binding);
        }
      }
      const state = replaceBindings(state0, valid);
      saveState(state);
      return {
        state,
        lines: [
          line("ok", `REFRESH  ${valid.length} valid binding(s)`),
          ...(removed.length ? [line("warn", `REMOVED  ${removed.join(", ")}`)] : []),
        ],
      };
    }
    case "pin":
    case "unpin": {
      const q = parsed.args.join(" ");
      const app = allApps(state0).find((a) => findByIdOrName(q)?.id === a.id) ?? rankApps(q, allApps(state0), state0.usage, 1)[0]?.app;
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
      const app = allApps(state0).find((a) => findByIdOrName(q)?.id === a.id) ?? rankApps(q, allApps(state0), state0.usage, 1)[0]?.app;
      if (!app) return { state: state0, lines: [line("warn", L(ctx2, "Ilova yo‘q", "No app"))] };
      const runtime = detectRuntime();
      const result = await launchStore(app, runtime.platform);
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
      if (runtime.platform !== "android") {
        return {
          state: state0,
          lines: [line("warn", L(ctx2, "Package faqat Androidda", "Raw package is Android-only"))],
        };
      }
      const result = await launchPackage(pkg);
      return { state: state0, lines: [line(result.ok ? "ok" : "warn", `${result.ok ? "PACK" : "PACK FAILED"}  ${pkg}`, { meta: result.error ? `${result.note} · ${result.error}` : result.note })] };
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

export async function runPermRequest(
  ctx: ExecContext,
): Promise<{ state: PersistedState; lines: LogLine[] }> {
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
