import { useEffect, useState } from "react";

export type MvmPerformanceTier = "high" | "balanced" | "low";

export type MvmPerformanceSnapshot = {
  tier: MvmPerformanceTier;
  fps: number;
  deviceScore: number;
  renderScale: number;
  motionScale: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getDeviceScore(): number {
  if (typeof navigator === "undefined") return 55;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const touchPenalty = nav.maxTouchPoints > 0 ? 3 : 0;

  const coreScore = clamp((cores / 12) * 45, 15, 45);
  const memoryScore = clamp((memory / 12) * 35, 12, 35);
  const densityScore = dpr >= 3 ? 7 : dpr >= 2 ? 14 : 20;

  return Math.round(clamp(coreScore + memoryScore + densityScore - touchPenalty, 30, 100));
}

function tierFromMetrics(fps: number, deviceScore: number): MvmPerformanceTier {
  if (deviceScore < 48 || fps < 34) return "low";
  if (deviceScore < 72 || fps < 49) return "balanced";
  return "high";
}

function snapshot(fps: number, deviceScore: number): MvmPerformanceSnapshot {
  const tier = tierFromMetrics(fps, deviceScore);
  return {
    tier,
    fps: Math.round(fps),
    deviceScore,
    renderScale: tier === "high" ? 1 : tier === "balanced" ? 0.86 : 0.68,
    motionScale: tier === "high" ? 1 : tier === "balanced" ? 0.78 : 0.5,
  };
}

export function useMvmPerformanceGovernor(): MvmPerformanceSnapshot {
  const [state, setState] = useState<MvmPerformanceSnapshot>(() =>
    snapshot(60, getDeviceScore()),
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const deviceScore = getDeviceScore();
    let raf = 0;
    let frames = 0;
    let windowStart = performance.now();
    let lastSample = performance.now();
    let active = true;

    const sample = (now: number) => {
      if (!active) return;

      const delta = now - lastSample;
      lastSample = now;
      if (delta > 0 && delta < 250) frames += 1;

      if (now - windowStart >= 1200) {
        const elapsed = now - windowStart;
        const fps = (frames * 1000) / elapsed;
        setState((current) => {
          const next = snapshot(fps, deviceScore);
          return current.tier === next.tier && current.fps === next.fps ? current : next;
        });
        frames = 0;
        windowStart = now;
      }

      raf = window.requestAnimationFrame(sample);
    };

    const onVisibility = () => {
      if (document.hidden) return;
      frames = 0;
      windowStart = performance.now();
      lastSample = windowStart;
    };

    document.addEventListener("visibilitychange", onVisibility);
    raf = window.requestAnimationFrame(sample);

    return () => {
      active = false;
      window.cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return state;
}
