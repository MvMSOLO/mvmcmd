import type { PointerEvent as ReactPointerEvent } from "react";
import { MVM_3D_ASSETS, type Mvm3DAsset } from "@/lib/mvm/3d-assets";

type Mvm3DSignal = "idle" | "wake" | "active" | "success" | "warn";

type Props = {
  asset: Mvm3DAsset;
  size?: "xs" | "sm" | "md" | "lg";
  interactive?: boolean;
  label?: boolean;
  signal?: Mvm3DSignal;
};

function Cube({ variant }: { variant: Mvm3DAsset["variant"] }) {
  const accent = variant === "pulse" || variant === "status" ? "var(--color-warn)" : "var(--color-ok)";
  if (variant === "letters") {
    return <div className="mvm3d-letters"><i /><i /><b /></div>;
  }
  if (variant === "wallpaper") {
    return <div className="mvm3d-orb" style={{ borderColor: accent }}><span /></div>;
  }
  if (variant === "status") {
    return <div data-motion="08-status-bloom" className="mvm3d-status mvm-motion-status-bloom" style={{ borderColor: accent }}><span /></div>;
  }
  if (variant === "engine") {
    return <div className="mvm3d-engine"><span /><span /><span /></div>;
  }
  if (variant === "pulse") {
    return <div className="mvm3d-pulse"><i /><i /><i /><i /></div>;
  }
  if (variant === "card") {
    return <div data-motion="10-card-orbit" className="mvm3d-card mvm-motion-card-orbit"><span /></div>;
  }
  if (variant === "core") {
    return <div data-motion="03-core-breathe" className="mvm3d-core mvm-motion-core-breathe"><span /><i /></div>;
  }
  return <div className="mvm3d-cube"><span /><i /><b /></div>;
}

function clamp(value: number, min = -1, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function updatePointerMotion(event: ReactPointerEvent<HTMLDivElement>) {
  if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const x = clamp((event.clientX - rect.left) / rect.width * 2 - 1);
  const y = clamp((event.clientY - rect.top) / rect.height * 2 - 1);

  target.style.setProperty("--mvm-rotate-x", `${(-y * 6).toFixed(2)}deg`);
  target.style.setProperty("--mvm-rotate-y", `${(x * 8).toFixed(2)}deg`);
  target.style.setProperty("--mvm-shift-x", `${(x * 2).toFixed(2)}px`);
  target.style.setProperty("--mvm-shift-y", `${(y * 2).toFixed(2)}px`);
  target.style.setProperty("--mvm-glare-x", `${(50 + x * 28).toFixed(1)}%`);
  target.style.setProperty("--mvm-glare-y", `${(50 + y * 24).toFixed(1)}%`);
}

function resetPointerMotion(event: ReactPointerEvent<HTMLDivElement>) {
  const target = event.currentTarget;
  target.style.setProperty("--mvm-rotate-x", "0deg");
  target.style.setProperty("--mvm-rotate-y", "0deg");
  target.style.setProperty("--mvm-shift-x", "0px");
  target.style.setProperty("--mvm-shift-y", "0px");
  target.style.setProperty("--mvm-glare-x", "50%");
  target.style.setProperty("--mvm-glare-y", "50%");
}

export function Mvm3D({ asset, size = "sm", interactive = true, label = false, signal = "idle" }: Props) {
  const content = (
    <div
      className={`mvm3d-wrap mvm3d-${size}`}
      data-mvm-variant={asset.variant}
      data-mvm-interactive={interactive ? "true" : "false"}
      data-mvm-signal={signal}
      aria-label={asset.name}
      onPointerMove={interactive ? updatePointerMotion : undefined}
      onPointerLeave={interactive ? resetPointerMotion : undefined}
    >
      <div data-motion="25-3d-depth" className="mvm3d-stage mvm-trend-depth">
        <Cube variant={asset.variant} />
      </div>
      {label && <span className="mvm3d-label"><b>{asset.name}</b><small>{asset.purpose}</small></span>}
    </div>
  );
  // 3D assets are visual-only. Clicking/tapping them must not navigate anywhere.
  // Keep the prop for API compatibility with existing call sites.
  return <div data-motion={interactive ? "18-3d-hover" : undefined} onClick={(event) => event.stopPropagation()}>{content}</div>;
}

export const MVM_3D = Object.fromEntries(MVM_3D_ASSETS.map((asset) => [asset.id, asset])) as Record<string, Mvm3DAsset>;
