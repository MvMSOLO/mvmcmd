export type Mvm3DAsset = {
  id: string;
  name: string;
  purpose: string;
  variant: "core" | "cube" | "card" | "letters" | "wallpaper" | "status" | "engine" | "pulse";
};

export const MVM_3D_ASSETS: Mvm3DAsset[] = [
  { id: "command-core", name: "Rotating Core", purpose: "Command input", variant: "core" },
  { id: "boot-cube", name: "MVM Cube", purpose: "Boot screen", variant: "cube" },
  { id: "app-card", name: "Mini Object", purpose: "App cards", variant: "card" },
  { id: "english-letters", name: "Floating Letters", purpose: "English Lab", variant: "letters" },
  { id: "wallpaper-preview", name: "Wallpaper Orb", purpose: "Wallpaper preview", variant: "wallpaper" },
  { id: "settings-status", name: "Status Ring", purpose: "Settings", variant: "status" },
  { id: "shared-engine", name: "3D Engine Core", purpose: "Shared renderer", variant: "engine" },
  { id: "performance-pulse", name: "Performance Pulse", purpose: "Lifecycle/performance", variant: "pulse" },
];

export const MVM_3D = Object.fromEntries(MVM_3D_ASSETS.map((asset) => [asset.id, asset])) as Record<string, Mvm3DAsset>;
