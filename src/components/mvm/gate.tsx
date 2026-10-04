import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Bell,
  Check,
  Gauge,
  HardDrive,
  MessageSquareLock,
  Mic,
  PlusSquare,
  Shield,
  Users,
  Video,
} from "lucide-react";
import { t } from "@/lib/mvm/copy";
import {
  hasInstallPrompt,
  promptInstall,
  requestNotify,
  requestPersistentStorage,
} from "@/lib/mvm/permissions";
import { getCapabilityDefinitions } from "@/lib/mvm/capabilities";
import type { CapabilityDefinition } from "@/lib/mvm/capabilities";
import {
  nativeCheckCapabilities,
  nativeRequestCapability,
  nativeSkipCapability,
  type NativeCapabilitySnapshot,
} from "@/lib/mvm/native-launcher";
import { detectRuntime } from "@/lib/mvm/platform";
import type { Lang } from "@/lib/mvm/types";
import { cn } from "@/lib/utils";
import { MvmWordmark } from "./wordmark";

interface GateProps {
  lang: Lang;
  onDone: (result: { storage: boolean; notify: boolean }) => void;
}

const CAPABILITY_ORDER = [
  "camera",
  "microphone",
  "notifications",
  "notification_listener",
  "contacts",
  "overlay",
  "usage_access",
];

const CAPABILITY_COPY: Record<string, { uz: string; en: string; detailUz: string; detailEn: string }> = {
  camera: {
    uz: "Kamera",
    en: "Camera",
    detailUz: "Haqiqiy kamera buyruqlari va surat/video oqimi uchun.",
    detailEn: "Used by the real camera command and photo/video flow.",
  },
  microphone: {
    uz: "Mikrofon",
    en: "Microphone",
    detailUz: "Keyinchalik ovozli MVM buyruqlari uchun. Ixtiyoriy.",
    detailEn: "Reserved for the future voice assistant. Optional.",
  },
  notifications: {
    uz: "Bildirishnomalar",
    en: "Notifications",
    detailUz: "MVMCMD bildirishnoma yuborishi kerak bo‘lsa ishlatiladi. Ixtiyoriy.",
    detailEn: "Lets MVMCMD post notifications when needed. Optional.",
  },
  notification_listener: {
    uz: "Notification Access",
    en: "Notification access",
    detailUz: "Notification Center uchun tizim notificationlarini o‘qish imkonini beradi. Ixtiyoriy.",
    detailEn: "Lets Notification Center read system notifications. Optional.",
  },
  contacts: {
    uz: "Kontaktlar",
    en: "Contacts",
    detailUz: "Aloqa va keyingi communication engine uchun. Ixtiyoriy.",
    detailEn: "For contacts and the future communication engine. Optional.",
  },
  overlay: {
    uz: "Ustida ko‘rsatish",
    en: "Display over other apps",
    detailUz: "Kelajakdagi floating / assistant funksiyalari uchun. Ixtiyoriy.",
    detailEn: "For future floating assistant surfaces. Optional.",
  },
  usage_access: {
    uz: "Usage Access",
    en: "Usage access",
    detailUz: "Game/device context va adaptive optimization uchun. Ixtiyoriy.",
    detailEn: "For device context and adaptive optimization. Optional.",
  },
};

function capabilityIcon(id: string) {
  switch (id) {
    case "camera":
      return Video;
    case "microphone":
      return Mic;
    case "notifications":
      return Bell;
    case "notification_listener":
      return MessageSquareLock;
    case "contacts":
      return Users;
    case "overlay":
      return Shield;
    case "usage_access":
      return Gauge;
    default:
      return Shield;
  }
}

function isCompleted(snapshot: NativeCapabilitySnapshot | undefined): boolean {
  return Boolean(
    snapshot &&
      (snapshot.state === "ready" ||
        snapshot.state === "unavailable" ||
        snapshot.decision === "skip"),
  );
}

function capabilityStateText(lang: Lang, snapshot?: NativeCapabilitySnapshot): string {
  if (!snapshot) return lang === "uz" ? "TEKSHIRILMOQDA" : "CHECKING";
  if (snapshot.state === "ready") return lang === "uz" ? "TAYYOR" : "READY";
  if (snapshot.state === "restricted") return lang === "uz" ? "SETTINGS KERAK" : "SETTINGS REQUIRED";
  if (snapshot.state === "denied") return lang === "uz" ? "RAD ETILDI" : "DENIED";
  if (snapshot.state === "unavailable") return lang === "uz" ? "MAVJUD EMAS" : "UNAVAILABLE";
  if (snapshot.state === "error") return lang === "uz" ? "XATOLIK" : "ERROR";
  return lang === "uz" ? "TEKSHIRILDI" : "CHECKED";
}

function NativeCapabilityGate({ lang, onDone }: GateProps) {
  const [snapshots, setSnapshots] = useState<NativeCapabilitySnapshot[]>([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState<"check" | "request" | "skip" | null>("check");
  const [needsSettings, setNeedsSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentId = CAPABILITY_ORDER[index];
  const current = snapshots.find((item) => item.id === currentId);
  const currentCopy =
    CAPABILITY_COPY[currentId] ??
    ({ uz: currentId, en: currentId, detailUz: "", detailEn: "" } as const);
  const Icon = capabilityIcon(currentId);

  const progress = useMemo(
    () => Math.round((Math.min(index + 1, CAPABILITY_ORDER.length) / CAPABILITY_ORDER.length) * 100),
    [index],
  );

  async function refresh() {
    setBusy("check");
    setError(null);
    try {
      const next = await nativeCheckCapabilities();
      setSnapshots(next);
      const firstOpen = CAPABILITY_ORDER.findIndex(
        (id) => !isCompleted(next.find((item) => item.id === id)),
      );
      if (firstOpen === -1) {
        onDone({ storage: false, notify: false });
        return;
      }
      setIndex(firstOpen);
      setNeedsSettings(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capability check failed");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function allow() {
    if (!currentId) return;
    setBusy("request");
    setError(null);
    try {
      const next = await nativeRequestCapability(currentId);
      setSnapshots((prev) => [...prev.filter((item) => item.id !== currentId), next]);
      if (next.state === "ready" || next.state === "unavailable") {
        setNeedsSettings(false);
        setIndex((value) => value + 1);
      } else if (next.needsSettings) {
        setNeedsSettings(true);
      } else {
        setNeedsSettings(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capability request failed");
    } finally {
      setBusy(null);
    }
  }

  async function skip() {
    if (!currentId) return;
    setBusy("skip");
    setError(null);
    try {
      const next = await nativeSkipCapability(currentId);
      setSnapshots((prev) => [...prev.filter((item) => item.id !== currentId), next]);
      setNeedsSettings(false);
      setIndex((value) => value + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capability skip failed");
    } finally {
      setBusy(null);
    }
  }

  async function continueAfterDenied() {
    await skip();
  }

  if (!currentId) {
    onDone({ storage: false, notify: false });
    return null;
  }

  const title = lang === "uz" ? currentCopy.uz : currentCopy.en;
  const detail = lang === "uz" ? currentCopy.detailUz : currentCopy.detailEn;
  const status = capabilityStateText(lang, current);

  return (
    <div className="flex min-h-dvh flex-col bg-bg px-4 py-8 text-fg sm:px-8">
      <header data-motion="15-glass-sweep" className="enter-down d1 mvm-hand-glass-sweep mx-auto w-full max-w-3xl">
        <p className="font-mono text-micro tracking-mark text-muted">
          {lang === "uz" ? "MVM CAPABILITY SETUP" : "MVM CAPABILITY SETUP"}
        </p>
        <div className="mt-3">
          <MvmWordmark mode="gate" />
        </div>
        <div className="mt-5 flex items-center justify-between gap-4 font-mono text-xs text-muted">
          <span>
            {lang === "uz"
              ? "Har bir access sizning nazoratingizda."
              : "Every access remains under your control."}
          </span>
          <span className="tabular-nums">{index + 1}/{CAPABILITY_ORDER.length}</span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto mt-10 w-full max-w-3xl">
        <section className="mvm-frame enter-up rounded-xl bg-surface p-6 sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div className="flex size-14 items-center justify-center rounded-xl bg-raised text-accent">
              <Icon className="size-7" strokeWidth={1.7} />
            </div>
            <span className="rounded-full bg-raised px-3 py-1 font-mono text-micro tracking-wide text-muted">
              {current?.decision === "skip"
                ? lang === "uz" ? "SKIPPED" : "SKIPPED"
                : status}
            </span>
          </div>

          <h1 className="mt-7 font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 max-w-2xl text-pretty font-mono text-sm leading-relaxed text-muted">{detail}</p>

          {current?.detail && (
            <div className="mt-5 rounded-lg border border-line bg-bg/60 p-4 font-mono text-xs leading-relaxed text-faint">
              {current.detail}
            </div>
          )}

          {needsSettings && (
            <div className="mt-5 rounded-lg border border-line bg-bg/60 p-4">
              <p className="font-mono text-xs leading-relaxed text-muted">
                {lang === "uz"
                  ? "Android Settings ochildi. Access’ni yoqing, MVMCMD’ga qayting va qayta tekshiring."
                  : "Android Settings opened. Enable access, return to MVMCMD, then re-check."}
              </p>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void refresh()}
                className="mt-4 inline-flex items-center gap-2 rounded-sm border border-line px-4 py-2 font-mono text-xs text-fg transition-transform active:scale-[0.97]"
              >
                <Check className="size-4" />
                {lang === "uz" ? "Qayta tekshir" : "Re-check"}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-lg border border-line bg-bg/60 p-4 font-mono text-xs text-muted">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {current?.state === "denied" ? (
              <button
                type="button"
                onClick={() => void continueAfterDenied()}
                disabled={busy !== null}
                className="flex-1 rounded-sm bg-accent px-5 py-3 font-display text-sm font-semibold tracking-wide text-accent-fg transition-transform active:scale-[0.97]"
              >
                {lang === "uz" ? "Davom etish" : "Continue"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void allow()}
                disabled={busy !== null || needsSettings}
                className="flex-1 rounded-sm bg-accent px-5 py-3 font-display text-sm font-semibold tracking-wide text-accent-fg transition-transform active:scale-[0.97]"
              >
                {busy === "request"
                  ? lang === "uz" ? "So‘ralmoqda..." : "Requesting..."
                  : lang === "uz" ? "Ruxsat berish" : "Allow"}
              </button>
            )}

            <button
              type="button"
              onClick={() => void skip()}
              disabled={busy !== null}
              className="rounded-sm border border-line px-5 py-3 font-mono text-xs text-muted transition-transform active:scale-[0.97]"
            >
              {lang === "uz" ? "Hozircha o‘tkazib yuborish" : "Skip for now"}
            </button>
          </div>
        </section>

        <p className="mt-5 text-center font-mono text-micro leading-relaxed text-faint">
          {lang === "uz"
            ? "MVMCMD hech qachon background’da permission so‘ramaydi."
            : "MVMCMD never requests permissions silently in the background."}
        </p>
      </main>
    </div>
  );
}

function WebPermissionGate({ lang, onDone }: GateProps) {
  const [storage, setStorage] = useState<"idle" | "ok" | "no">("idle");
  const [notify, setNotify] = useState<"idle" | "ok" | "no">("idle");
  const [install, setInstall] = useState<"idle" | "ok" | "no">("idle");
  const [busy, setBusy] = useState<string | null>(null);

  async function grantStorage() {
    setBusy("storage");
    const ok = await requestPersistentStorage();
    setStorage(ok ? "ok" : "no");
    setBusy(null);
  }

  async function grantNotify() {
    setBusy("notify");
    const perm = await requestNotify();
    setNotify(perm === "granted" ? "ok" : "no");
    setBusy(null);
  }

  async function grantInstall() {
    setBusy("install");
    const runtime = detectRuntime();
    if (runtime.standalone) {
      setInstall("ok");
      setBusy(null);
      return;
    }
    if (hasInstallPrompt()) {
      const outcome = await promptInstall();
      setInstall(outcome === "accepted" ? "ok" : "no");
      setBusy(null);
      return;
    }
    setInstall("no");
    setBusy(null);
  }

  const cards = [
    {
      key: "storage",
      icon: HardDrive,
      title: t(lang, "grantStorage"),
      body:
        lang === "uz"
          ? "Alias, pin va ochilganlar shu qurilmada qoladi."
          : "Aliases, pins and recents stay on this device.",
      state: storage,
      action: grantStorage,
      delay: "d2",
      enter: "enter-left",
    },
    {
      key: "notify",
      icon: Bell,
      title: t(lang, "grantNotify"),
      body:
        lang === "uz"
          ? "Fon rejimida ochilganini bildirish. Ixtiyoriy."
          : "Optional launch notice when the page is in the background.",
      state: notify,
      action: grantNotify,
      delay: "d3",
      enter: "enter-up",
    },
    {
      key: "install",
      icon: PlusSquare,
      title: t(lang, "grantInstall"),
      body:
        lang === "uz"
          ? "Bosh ekranga qo‘shish. Chrome o‘zi so‘raydi."
          : "Add to the home screen. Chrome asks for real.",
      state: install,
      action: grantInstall,
      delay: "d4",
      enter: "enter-right",
    },
  ] as const;

  return (
    <div className="flex min-h-dvh flex-col bg-bg px-4 py-8 text-fg sm:px-8">
      <header data-motion="15-glass-sweep" className="enter-down d1 mvm-hand-glass-sweep mx-auto w-full max-w-5xl">
        <p className="font-mono text-micro tracking-mark text-muted">{t(lang, "grantTitle")}</p>
        <div className="mt-3">
          <MvmWordmark mode="gate" />
        </div>
        <p className="mt-3 max-w-xl text-pretty font-mono text-sm leading-relaxed text-muted">
          {t(lang, "grantLead")}
        </p>
      </header>

      <div className="mx-auto mt-10 grid w-full max-w-5xl gap-3 sm:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const granted = card.state === "ok";
          const denied = card.state === "no";
          return (
            <button
              key={card.key}
              type="button"
              disabled={busy !== null}
              onClick={() => void card.action()}
              className={cn(
                card.enter,
                card.delay,
                "mvm-trend-bento mvm-hand-tilt mvm-hand-ripple mvm-hand-spring-snap mvm-frame flex min-h-44 flex-col items-start rounded-lg bg-surface p-5 text-left",
                "transition-[box-shadow,transform] duration-150 ease-out active:scale-[0.96]",
                "hover:shadow-[var(--shadow-border-hover)]",
                granted && "mvm-ok-ring",
              )}
              style={{ "--mvm-stagger": `${index * 90}ms` } as CSSProperties}
            >
              <Icon className="size-5 text-accent" strokeWidth={1.75} />
              <span className="mt-6 font-display text-lg font-semibold tracking-tight">
                {card.title}
              </span>
              <span className="mt-2 text-pretty font-mono text-xs leading-relaxed text-muted">
                {card.body}
              </span>
              <span className="mt-auto pt-6 font-mono text-micro tracking-mark text-faint">
                {granted ? "GRANTED" : denied ? "SKIPPED" : "REQUEST"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="enter-up d5 mx-auto mt-8 flex w-full max-w-5xl items-center justify-between gap-4">
        <p className="font-mono text-xs text-faint">
          {lang === "uz" ? "Ilovalar tizim Intent orqali ochiladi." : "Apps open through the system Intent."}
        </p>
        <button
          type="button"
          onClick={() =>
            onDone({
              storage: storage === "ok",
              notify: notify === "ok",
            })
          }
          className="rounded-sm bg-accent px-5 py-3 font-display text-sm font-semibold tracking-wide text-accent-fg transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          {t(lang, "grantSkip")}
        </button>
      </div>
    </div>
  );
}

export function PermissionGate({ lang, onDone }: GateProps) {
  return detectRuntime().platform === "android" ? (
    <NativeCapabilityGate lang={lang} onDone={onDone} />
  ) : (
    <WebPermissionGate lang={lang} onDone={onDone} />
  );
}
