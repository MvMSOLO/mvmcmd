export type MvmSignalKind = "intent" | "success" | "warn" | "neutral";

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) audioContext = new AudioCtor();
  return audioContext;
}

function tone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  startAt: number,
  gainValue: number,
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.015);
}

export function emitMvmSignal(kind: MvmSignalKind): void {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem("mvmcmd.signal-audio") === "off") return;

  try {
    const vibration = kind === "warn" ? [16, 22, 16] : kind === "success" ? [8, 18, 8] : [6];
    navigator.vibrate?.(vibration);
  } catch {
    // Haptics are optional.
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    void ctx.resume();

    const now = ctx.currentTime + 0.01;
    if (kind === "success") {
      tone(ctx, 740, 0.055, now, 0.018);
      tone(ctx, 1040, 0.07, now + 0.065, 0.014);
    } else if (kind === "warn") {
      tone(ctx, 240, 0.075, now, 0.02);
    } else if (kind === "intent") {
      tone(ctx, 520, 0.035, now, 0.012);
    } else {
      tone(ctx, 410, 0.028, now, 0.009);
    }
  } catch {
    // Audio is an enhancement, never a requirement for command execution.
  }
}
