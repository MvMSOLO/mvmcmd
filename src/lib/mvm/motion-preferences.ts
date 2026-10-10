export type MvmMotionMode = "system" | "reduced";

export const MVM_MOTION_STORAGE_KEY = "mvmcmd.motion-mode";

export function normalizeMotionMode(value: unknown): MvmMotionMode {
  return value === "reduced" ? "reduced" : "system";
}

export function isMotionReduced(mode: MvmMotionMode, systemPrefersReduced: boolean): boolean {
  return mode === "reduced" || systemPrefersReduced;
}

/** Two-state control: explicit reduced motion or defer to the OS preference. */
export function nextMotionMode(mode: MvmMotionMode): MvmMotionMode {
  return mode === "reduced" ? "system" : "reduced";
}

export function motionModeLabel(
  mode: MvmMotionMode,
  systemPrefersReduced: boolean,
  lang: "uz" | "en",
): string {
  if (mode === "reduced") return lang === "uz" ? "HARAKAT · KAM" : "MOTION · REDUCED";
  if (systemPrefersReduced) return lang === "uz" ? "HARAKAT · TIZIM" : "MOTION · SYSTEM";
  return lang === "uz" ? "HARAKAT · AUTO" : "MOTION · AUTO";
}

export function motionModeDescription(
  mode: MvmMotionMode,
  systemPrefersReduced: boolean,
  lang: "uz" | "en",
): string {
  if (mode === "reduced") {
    return lang === "uz"
      ? "Kamaytirilgan harakat yoqilgan. Tizim sozlamasiga qaytish uchun bosing."
      : "Reduced motion is enabled. Activate to follow the system preference.";
  }
  if (systemPrefersReduced) {
    return lang === "uz"
      ? "Ilova tizimning kamaytirilgan harakat sozlamasiga amal qilmoqda."
      : "Following the system's reduced-motion preference.";
  }
  return lang === "uz"
    ? "Harakat tizim sozlamasiga mos. Kamaytirilgan harakatni yoqish uchun bosing."
    : "Following the system motion preference. Activate to reduce motion.";
}
