import assert from "node:assert/strict";
import { test } from "node:test";
import { assessGaming, compareGamingSnapshots, finishGamingSession, formatGamingSessionReport, startGamingSession } from "./gaming-engine.ts";

const base = {
  timestamp: 1, charging: false, thermal: "none" as const,
  networkConnected: true, cpuLoadPercent: 40, ramUsedBytes: 4, ramTotalBytes: 16,
  batteryPercent: 80, batteryTemperatureC: 32, refreshRateHz: 120,
};

test("selects performance mode only from healthy telemetry", () => {
    const a = assessGaming(base, {name:"Test Game", platform:"android", confidence:"explicit"});
    assert.equal(a.mode, "performance");
    assert.equal(a.fps.measured, false);
});
test("becomes conservative under thermal and resource pressure", () => {
    const a = assessGaming({...base, thermal:"severe", cpuLoadPercent:95, batteryTemperatureC:44, batteryPercent:15});
    assert.equal(a.mode, "cool");
    assert.deepEqual(a.recommendations.map(x=>x.code).filter(code => ["thermal-high","cpu-saturated","battery-hot","battery-low"].includes(code)).sort(), ["battery-hot","battery-low","cpu-saturated","thermal-high"].sort());
});
test("never invents FPS", () => {
    const a = assessGaming(base);
    assert.equal(a.fps.value, undefined);
    assert.match(a.fps.reason ?? "", /no verified/i);
});
test("computes measurable before/after deltas without fabricating values", () => {
    const d = compareGamingSnapshots(base, {...base, cpuLoadPercent:55, ramUsedBytes:6, batteryPercent:78, batteryTemperatureC:35});
    assert.equal(d.cpuDeltaPercent, 15);
    assert.equal(d.ramDeltaBytes, 2);
    assert.equal(d.batteryDeltaPercent, -2);
    assert.equal(d.temperatureDeltaC, 3);
});


test("gaming sessions preserve measured before/after telemetry",()=>{const before=base;const session=startGamingSession(before,{name:"Test Game",platform:"android",confidence:"explicit"});const report=finishGamingSession(session,{...base,timestamp:60001,cpuLoadPercent:55});assert.equal(report.durationMs,60000);assert.equal(report.delta.cpuDeltaPercent,15);assert.equal(report.session.game?.name,"Test Game");});

test("gaming session reports never invent FPS",()=>{const report=finishGamingSession(startGamingSession(base),{...base,timestamp:2});assert.match(formatGamingSessionReport(report).find(x=>x.startsWith("FPS"))??"",/NOT VERIFIED/);});