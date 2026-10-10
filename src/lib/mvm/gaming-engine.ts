export type GamingThermal = "none" | "light" | "moderate" | "severe" | "critical" | "emergency" | "shutdown" | "unknown";
export type GamingRecommendationLevel = "good" | "caution" | "warning";
export type GamingMode = "performance" | "balanced" | "cool";

export interface GamingTelemetry {
  timestamp: number;
  cpuLoadPercent?: number;
  ramUsedBytes?: number;
  ramTotalBytes?: number;
  batteryPercent?: number;
  charging: boolean;
  batteryTemperatureC?: number;
  thermal: GamingThermal;
  refreshRateHz?: number;
  networkConnected: boolean;
  meteredNetwork?: boolean;
}

export interface GameProfile {
  name: string;
  packageName?: string;
  platform: "android" | "desktop" | "web";
  confidence: "explicit" | "catalog" | "unknown";
}

export interface GamingRecommendation {
  level: GamingRecommendationLevel;
  code: string;
  message: string;
}

export interface GamingAssessment {
  mode: GamingMode;
  telemetry: GamingTelemetry;
  game?: GameProfile;
  recommendations: GamingRecommendation[];
  fps: { measured: false; value?: number; reason: string };
}

export interface GamingSnapshotDelta {
  before: GamingTelemetry;
  after: GamingTelemetry;
  cpuDeltaPercent?: number;
  ramDeltaBytes?: number;
  batteryDeltaPercent?: number;
  temperatureDeltaC?: number;
}

const THERMAL_RANK: Record<GamingThermal, number> = { none: 0, light: 1, moderate: 2, severe: 3, critical: 4, emergency: 5, shutdown: 6, unknown: -1 };

export function assessGaming(telemetry: GamingTelemetry, game?: GameProfile): GamingAssessment {
  const recommendations: GamingRecommendation[] = [];
  const rank = THERMAL_RANK[telemetry.thermal];
  if (rank >= 3) recommendations.push({level:"warning",code:"thermal-high",message:"Thermal state is high; reduce sustained load and cool the device."});
  else if (rank === 2) recommendations.push({level:"caution",code:"thermal-moderate",message:"Thermal state is moderate; sustained performance may be limited."});
  else if (rank < 0) recommendations.push({level:"caution",code:"thermal-unknown",message:"Thermal telemetry is unavailable; no performance claim will be made."});
  if (telemetry.batteryPercent !== undefined && telemetry.batteryPercent <= 20 && !telemetry.charging) recommendations.push({level:"caution",code:"battery-low",message:"Battery is low; balanced/cool behavior is recommended."});
  if (telemetry.batteryTemperatureC !== undefined && telemetry.batteryTemperatureC >= 42) recommendations.push({level:"warning",code:"battery-hot",message:"Battery temperature is elevated; avoid adding sustained load."});
  if (telemetry.cpuLoadPercent !== undefined && telemetry.cpuLoadPercent >= 90) recommendations.push({level:"warning",code:"cpu-saturated",message:"CPU load is very high; use only supported user-approved actions."});
  if (telemetry.ramTotalBytes && telemetry.ramUsedBytes !== undefined) {
    const ratio = telemetry.ramUsedBytes / telemetry.ramTotalBytes;
    if (ratio >= 0.9) recommendations.push({level:"warning",code:"ram-pressure",message:"RAM usage is very high; free memory using supported actions."});
    else if (ratio >= 0.8) recommendations.push({level:"caution",code:"ram-elevated",message:"RAM usage is elevated."});
  }
  if (!telemetry.networkConnected) recommendations.push({level:"caution",code:"offline",message:"Network is offline; online game features may not work."});
  else if (telemetry.meteredNetwork) recommendations.push({level:"caution",code:"metered",message:"Network is metered; online play may consume mobile data."});
  if (telemetry.refreshRateHz !== undefined && telemetry.refreshRateHz < 90) recommendations.push({level:"caution",code:"refresh-rate",message:`Display reports ${telemetry.refreshRateHz.toFixed(0)}Hz; higher modes are unavailable unless Android exposes them.`});
  const mode: GamingMode = recommendations.some(r=>r.level==="warning") ? "cool" : recommendations.some(r=>r.level==="caution") ? "balanced" : "performance";
  return {mode, telemetry, game, recommendations, fps:{measured:false,reason:"MVMCMD has no verified in-game FPS telemetry at this boundary."}};
}

export function compareGamingSnapshots(before: GamingTelemetry, after: GamingTelemetry): GamingSnapshotDelta {
  return {
    before, after,
    cpuDeltaPercent: before.cpuLoadPercent !== undefined && after.cpuLoadPercent !== undefined ? after.cpuLoadPercent-before.cpuLoadPercent : undefined,
    ramDeltaBytes: before.ramUsedBytes !== undefined && after.ramUsedBytes !== undefined ? after.ramUsedBytes-before.ramUsedBytes : undefined,
    batteryDeltaPercent: before.batteryPercent !== undefined && after.batteryPercent !== undefined ? after.batteryPercent-before.batteryPercent : undefined,
    temperatureDeltaC: before.batteryTemperatureC !== undefined && after.batteryTemperatureC !== undefined ? after.batteryTemperatureC-before.batteryTemperatureC : undefined,
  };
}

export function formatGamingAssessment(a: GamingAssessment): string[] {
  return [
    `GAMING  ${a.mode.toUpperCase()}`,
    a.game ? `GAME     ${a.game.name}` : "GAME     not specified",
    `FPS      NOT VERIFIED · ${a.fps.reason}`,
    ...a.recommendations.map(r=>`${r.level.toUpperCase()}  ${r.code} · ${r.message}`),
    ...(a.recommendations.length===0 ? ["OK       telemetry within conservative thresholds"] : []),
  ];
}


export interface GamingSession { game?: GameProfile; before: GamingTelemetry; startedAt: number; }

export interface GamingSessionReport { session: GamingSession; after: GamingTelemetry; delta: GamingSnapshotDelta; durationMs: number; }

export function startGamingSession(before: GamingTelemetry, game?: GameProfile): GamingSession { return { game, before, startedAt: before.timestamp }; }

export function finishGamingSession(session: GamingSession, after: GamingTelemetry): GamingSessionReport { return { session, after, delta: compareGamingSnapshots(session.before, after), durationMs: Math.max(0, after.timestamp-session.startedAt) }; }

export function formatGamingSessionReport(report: GamingSessionReport): string[] {
 const d=report.delta;
 return [
  `SESSION  ${report.session.game?.name ?? "unspecified"}  ·  ${Math.round(report.durationMs/1000)}s`,
  `CPU Δ    ${d.cpuDeltaPercent === undefined ? "UNAVAILABLE" : (d.cpuDeltaPercent>=0?"+":"")+d.cpuDeltaPercent.toFixed(1)+"%" }`,
  `RAM Δ    ${d.ramDeltaBytes === undefined ? "UNAVAILABLE" : (d.ramDeltaBytes>=0?"+":"")+d.ramDeltaBytes+" bytes" }`,
  `BATTERY Δ ${d.batteryDeltaPercent === undefined ? "UNAVAILABLE" : (d.batteryDeltaPercent>=0?"+":"")+d.batteryDeltaPercent.toFixed(1)+"%" }`,
  `TEMP Δ   ${d.temperatureDeltaC === undefined ? "UNAVAILABLE" : (d.temperatureDeltaC>=0?"+":"")+d.temperatureDeltaC.toFixed(1)+"°C" }`,
  `FPS      NOT VERIFIED · in-game FPS telemetry is unavailable at this boundary`,
 ];
}
