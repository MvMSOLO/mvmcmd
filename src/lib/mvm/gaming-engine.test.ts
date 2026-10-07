import { describe, expect, it } from "vitest";
import { assessGaming, compareGamingSnapshots } from "./gaming-engine";

const base = {
  timestamp: 1, charging: false, thermal: "none" as const,
  networkConnected: true, cpuLoadPercent: 40, ramUsedBytes: 4, ramTotalBytes: 16,
  batteryPercent: 80, batteryTemperatureC: 32, refreshRateHz: 120,
};

describe("gaming engine", () => {
  it("selects performance mode only from healthy telemetry", () => {
    const a = assessGaming(base, {name:"Test Game", platform:"android", confidence:"explicit"});
    expect(a.mode).toBe("performance");
    expect(a.fps.measured).toBe(false);
  });
  it("becomes conservative under thermal and resource pressure", () => {
    const a = assessGaming({...base, thermal:"severe", cpuLoadPercent:95, batteryTemperatureC:44, batteryPercent:15});
    expect(a.mode).toBe("cool");
    expect(a.recommendations.map(x=>x.code)).toEqual(expect.arrayContaining(["thermal-high","cpu-saturated","battery-hot","battery-low"]));
  });
  it("never invents FPS", () => {
    const a = assessGaming(base);
    expect(a.fps.value).toBeUndefined();
    expect(a.fps.reason).toMatch(/no verified/i);
  });
  it("computes measurable before/after deltas without fabricating values", () => {
    const d = compareGamingSnapshots(base, {...base, cpuLoadPercent:55, ramUsedBytes:6, batteryPercent:78, batteryTemperatureC:35});
    expect(d.cpuDeltaPercent).toBe(15);
    expect(d.ramDeltaBytes).toBe(2);
    expect(d.batteryDeltaPercent).toBe(-2);
    expect(d.temperatureDeltaC).toBe(3);
  });
});
