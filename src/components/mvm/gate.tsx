import { useState } from "react";
import { Bell, HardDrive, PlusSquare } from "lucide-react";
import { t } from "@/lib/mvm/copy";
import {
  hasInstallPrompt,
  promptInstall,
  requestNotify,
  requestPersistentStorage,
} from "@/lib/mvm/permissions";
import { detectRuntime } from "@/lib/mvm/platform";
import type { Lang } from "@/lib/mvm/types";
import { cn } from "@/lib/utils";

interface GateProps {
  lang: Lang;
  onDone: (result: { storage: boolean; notify: boolean }) => void;
}

export function PermissionGate({ lang, onDone }: GateProps) {
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
      <header className="enter-down d1 mx-auto w-full max-w-5xl">
        <p className="font-mono text-micro tracking-mark text-muted">{t(lang, "grantTitle")}</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-fg sm:text-5xl">
          MVMCMD
        </h1>
        <p className="mt-3 max-w-xl text-pretty font-mono text-sm leading-relaxed text-muted">
          {t(lang, "grantLead")}
        </p>
      </header>

      <div className="mx-auto mt-10 grid w-full max-w-5xl gap-3 sm:grid-cols-3">
        {cards.map((card) => {
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
                "mvm-frame flex min-h-44 flex-col items-start rounded-lg bg-surface p-5 text-left",
                "transition-[box-shadow,transform] duration-150 ease-out active:scale-[0.96]",
                "hover:shadow-[var(--shadow-border-hover)]",
                granted && "mvm-ok-ring",
              )}
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
