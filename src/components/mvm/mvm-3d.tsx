import { cn } from "@/lib/utils";

export type Mvm3DVariant =
  | "core"
  | "cube"
  | "object"
  | "letters"
  | "preview"
  | "status"
  | "symbol"
  | "backdrop";

export type Mvm3DStatus = "loading" | "success" | "error" | "idle";

interface Mvm3DProps {
  variant: Mvm3DVariant;
  status?: Mvm3DStatus;
  label?: string;
  className?: string;
  decorative?: boolean;
}

function Cube({ className }: { className?: string }) {
  return (
    <span className={cn("mvm-3d-cube", className)} aria-hidden="true">
      <span className="mvm-3d-face mvm-3d-face-front" />
      <span className="mvm-3d-face mvm-3d-face-back" />
      <span className="mvm-3d-face mvm-3d-face-right" />
      <span className="mvm-3d-face mvm-3d-face-left" />
      <span className="mvm-3d-face mvm-3d-face-top" />
      <span className="mvm-3d-face mvm-3d-face-bottom" />
    </span>
  );
}

export function Mvm3D({
  variant,
  status = "idle",
  label,
  className,
  decorative = true,
}: Mvm3DProps) {
  const ariaLabel = label ?? "MVMCMD 3D detail";

  return (
    <span
      className={cn(
        "mvm-3d",
        `mvm-3d-${variant}`,
        status !== "idle" && `mvm-3d-status-${status}`,
        className,
      )}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : ariaLabel}
      aria-hidden={decorative ? true : undefined}
    >
      {variant === "core" && (
        <>
          <span className="mvm-3d-orbit mvm-3d-orbit-a" />
          <span className="mvm-3d-orbit mvm-3d-orbit-b" />
          <Cube />
          <span className="mvm-3d-hub" />
        </>
      )}

      {variant === "cube" && <Cube />}

      {variant === "object" && (
        <span className="mvm-3d-object">
          <span className="mvm-3d-object-body" />
          <span className="mvm-3d-object-ring" />
          <span className="mvm-3d-object-dot" />
        </span>
      )}

      {variant === "letters" && (
        <span className="mvm-3d-letters">
          <span>M</span>
          <span>V</span>
          <span>M</span>
        </span>
      )}

      {variant === "preview" && (
        <span className="mvm-3d-preview">
          <span className="mvm-3d-preview-plane" />
          <span className="mvm-3d-preview-cube" />
          <span className="mvm-3d-preview-line" />
        </span>
      )}

      {variant === "status" && <span className="mvm-3d-status-orb" />}

      {variant === "symbol" && (
        <span className="mvm-3d-symbol">
          <span className="mvm-3d-symbol-mark" />
        </span>
      )}

      {variant === "backdrop" && (
        <>
          <span className="mvm-3d-backdrop-shape mvm-3d-backdrop-one" />
          <span className="mvm-3d-backdrop-shape mvm-3d-backdrop-two" />
          <span className="mvm-3d-backdrop-shape mvm-3d-backdrop-three" />
        </>
      )}
    </span>
  );
}
