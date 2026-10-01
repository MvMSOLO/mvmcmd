export type Mvm3DAsset = {
  id: string;
  name: string;
  purpose: string;
  kernelCadUrl: string;
  variant: "core" | "cube" | "card" | "letters" | "wallpaper" | "status" | "engine" | "pulse";
};

export const MVM_3D_ASSETS: Mvm3DAsset[] = [
  { id: "command-core", name: "Rotating Core", purpose: "Command input", kernelCadUrl: "https://app.kernelcad.com/p/6BZWZuYj?version=3", variant: "core" },
  { id: "boot-cube", name: "MVM Cube", purpose: "Boot screen", kernelCadUrl: "https://app.kernelcad.com/p/M4Clyzjn?version=2", variant: "cube" },
  { id: "app-card", name: "Mini Object", purpose: "App cards", kernelCadUrl: "https://app.kernelcad.com/p/v_tNxWGe?version=1", variant: "card" },
  { id: "english-letters", name: "Floating Letters", purpose: "English Lab", kernelCadUrl: "https://app.kernelcad.com/p/q5d4NxAZ?version=1", variant: "letters" },
  { id: "wallpaper-preview", name: "Wallpaper Orb", purpose: "Wallpaper preview", kernelCadUrl: "https://app.kernelcad.com/p/RiSMaA0Z?version=1", variant: "wallpaper" },
  { id: "settings-status", name: "Status Ring", purpose: "Settings", kernelCadUrl: "https://app.kernelcad.com/p/RNt04kZZ?version=1", variant: "status" },
  { id: "shared-engine", name: "3D Engine Core", purpose: "Shared renderer", kernelCadUrl: "https://app.kernelcad.com/p/BV2ZwFBG?version=1", variant: "engine" },
  { id: "performance-pulse", name: "Performance Pulse", purpose: "Lifecycle/performance", kernelCadUrl: "https://app.kernelcad.com/p/lEmdsEKt?version=1", variant: "pulse" },
];
