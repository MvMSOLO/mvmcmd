import type { Category } from "./types";

export type SkillPlatform = "android" | "desktop" | "web";
export type SkillRisk = "low" | "medium" | "high";

export interface MvmSkill {
  id: string;
  name: string;
  aliases: string[];
  category: Category;
  platforms: SkillPlatform[];
  requiredCapabilities: string[];
  risk: SkillRisk;
  handler: string;
  verification: string;
  fallback?: string;
  enabled: boolean;
}

function defineSkill(data: Omit<MvmSkill, "enabled">): MvmSkill {
  return { ...data, enabled: true };
}

/** Canonical metadata contract between intent understanding and execution. */
export const MVM_SKILLS: readonly MvmSkill[] = [
  defineSkill({ id: "open-app", name: "Open application", aliases: ["open", "launch", "start", "run", "och"], category: "system", platforms: ["android", "desktop", "web"], requiredCapabilities: ["app_launch"], risk: "low", handler: "app.launch", verification: "platform launcher result when available", fallback: "supported web/store destination when native launch is unavailable" }),
  defineSkill({ id: "device-snapshot", name: "Device information", aliases: ["device", "hardware", "monitor", "device-info"], category: "system", platforms: ["android", "desktop", "web"], requiredCapabilities: ["device"], risk: "low", handler: "device.snapshot", verification: "timestamped real telemetry or truthful unavailable state", fallback: "show only capabilities available on the current platform" }),
  defineSkill({ id: "permission-status", name: "Permission status", aliases: ["perm", "permission", "permissions", "ruxsat"], category: "system", platforms: ["android", "desktop", "web"], requiredCapabilities: [], risk: "low", handler: "permission.status", verification: "read current capability state without requesting access", fallback: "show unsupported permissions as unavailable" }),
  defineSkill({ id: "camera", name: "Camera", aliases: ["camera", "kamera"], category: "tool", platforms: ["android"], requiredCapabilities: ["camera"], risk: "medium", handler: "camera.open", verification: "native camera result; never fake capture success", fallback: "show denied/unavailable state with Settings guidance" }),
  defineSkill({ id: "qr", name: "QR scanner", aliases: ["qr", "qrcode", "scan"], category: "tool", platforms: ["android"], requiredCapabilities: ["camera"], risk: "medium", handler: "qr.scan", verification: "decoded content or explicit no-result/cancelled state", fallback: "manual code entry" }),
  defineSkill({ id: "wallpaper", name: "Wallpaper", aliases: ["wallpaper", "background", "fon"], category: "tool", platforms: ["android", "desktop", "web"], requiredCapabilities: ["media"], risk: "medium", handler: "wallpaper.open", verification: "system/app action start result", fallback: "show preview without claiming the system wallpaper changed" }),
  defineSkill({ id: "notification-center", name: "Notification center", aliases: ["notification", "notifications", "bildirishnoma"], category: "system", platforms: ["android"], requiredCapabilities: ["notifications"], risk: "medium", handler: "notification.center", verification: "capability state checked before access", fallback: "show permission setup when access is unavailable" }),
  defineSkill({ id: "find-app", name: "Find application", aliases: ["find", "search", "qidir"], category: "system", platforms: ["android", "desktop", "web"], requiredCapabilities: [], risk: "low", handler: "app.find", verification: "ranked catalog matches, never a silent launch", fallback: "show no-match help" }),
  defineSkill({ id: "app-bridge", name: "App bridge", aliases: ["bridge", "share", "deeplink", "link"], category: "system", platforms: ["android", "desktop", "web"], requiredCapabilities: [], risk: "medium", handler: "bridge.run", verification: "target and method reported; external completion stays STARTED", fallback: "truthful unsupported-target explanation" }),
  defineSkill({ id: "adaptive-gaming", name: "Adaptive gaming", aliases: ["gaming", "game-mode", "game-booster", "oyin"], category: "tool", platforms: ["android", "desktop", "web"], requiredCapabilities: ["device"], risk: "medium", handler: "gaming.assess", verification: "real device telemetry and explicit action result", fallback: "report unsupported telemetry or OEM controls without inventing performance gains" }),
];

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ");
}

export function getMvmSkill(id: string): MvmSkill | undefined {
  return MVM_SKILLS.find((item) => item.id === id);
}

export function findMvmSkill(query: string): MvmSkill | undefined {
  const q = normalize(query);
  if (!q) return undefined;
  return MVM_SKILLS.find((item) => item.id === q || normalize(item.name) === q || item.aliases.some((alias) => normalize(alias) === q));
}

export function listMvmSkills(options?: { platform?: SkillPlatform; category?: Category; enabledOnly?: boolean }): MvmSkill[] {
  return MVM_SKILLS.filter((item) => {
    if (options?.enabledOnly !== false && !item.enabled) return false;
    if (options?.platform && !item.platforms.includes(options.platform)) return false;
    if (options?.category && item.category !== options.category) return false;
    return true;
  });
}

export function getSkillRequirements(id: string): string[] {
  return getMvmSkill(id)?.requiredCapabilities ?? [];
}

/** Maps only supported Phase 4 intents to canonical skill IDs. It never executes. */
export function skillForIntent(intent: string): MvmSkill | undefined {
  const map: Record<string, string> = {
    open_app: "open-app",
    find_app: "find-app",
    device_snapshot: "device-snapshot",
    permission_status: "permission-status",
  };
  const id = map[intent];
  return id ? getMvmSkill(id) : undefined;
}
