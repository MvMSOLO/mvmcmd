import { MVM_3D_ASSETS, type Mvm3DAsset } from "@/lib/mvm/3d-assets";

type Props = {
  asset: Mvm3DAsset;
  size?: "xs" | "sm" | "md" | "lg";
  interactive?: boolean;
  label?: boolean;
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
    return <div className="mvm3d-status" style={{ borderColor: accent }}><span /></div>;
  }
  if (variant === "engine") {
    return <div className="mvm3d-engine"><span /><span /><span /></div>;
  }
  if (variant === "pulse") {
    return <div className="mvm3d-pulse"><i /><i /><i /><i /></div>;
  }
  if (variant === "card") {
    return <div className="mvm3d-card"><span /></div>;
  }
  if (variant === "core") {
    return <div data-motion="03-core-breathe" className="mvm3d-core mvm-motion-core-breathe"><span /><i /></div>;
  }
  return <div className="mvm3d-cube"><span /><i /><b /></div>;
}

export function Mvm3D({ asset, size = "sm", interactive = true, label = false }: Props) {
  const content = (
    <div className={`mvm3d-wrap mvm3d-${size}`} aria-label={asset.name}>
      <div className="mvm3d-stage"><Cube variant={asset.variant} /></div>
      {label && <span className="mvm3d-label"><b>{asset.name}</b><small>{asset.purpose}</small></span>}
    </div>
  );
  if (!interactive) return content;
  return (
    <button type="button" className="mvm3d-button" title={`Open ${asset.name} in KernelCAD Studio`} onClick={() => window.open(asset.kernelCadUrl, "_blank", "noopener,noreferrer")}>
      {content}
    </button>
  );
}

export const MVM_3D = Object.fromEntries(MVM_3D_ASSETS.map((asset) => [asset.id, asset])) as Record<string, Mvm3DAsset>;
