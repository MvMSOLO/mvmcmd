import test from "node:test";
import assert from "node:assert/strict";
import { formatBytes, formatDeviceSnapshot, canUseNativeDeviceEngine, type DeviceSnapshot } from "./device.ts";

test("formatBytes reports unknown for missing values", () => {
  assert.equal(formatBytes(undefined), "unknown");
  assert.equal(formatBytes(Number.NaN), "unknown");
});

test("formatBytes uses progressive units", () => {
  assert.equal(formatBytes(512), "512 B");
  assert.match(formatBytes(1536), /KB/);
  assert.match(formatBytes(5 * 1024 * 1024), /MB/);
});

test("formatDeviceSnapshot never invents missing telemetry", () => {
  const snapshot: DeviceSnapshot = {
    schemaVersion: 1,
    timestamp: Date.now(),
    device: {
      manufacturer: "TestCo",
      model: "Unit",
      device: "unit",
      hardware: "hw",
      sdk: 35,
      release: "15",
      abis: ["arm64-v8a"],
    },
    cpu: { cores: 8, hardware: "hw", architecture: "aarch64" },
    memory: {},
    storage: { totalBytes: 64 * 1024 * 1024 * 1024, availableBytes: 32 * 1024 * 1024 * 1024, usedBytes: 32 * 1024 * 1024 * 1024 },
    battery: { charging: false, plugged: 0, health: 2 },
    thermal: { status: 0, statusName: "none" },
    display: {},
    network: { connected: false },
    bluetooth: { available: false, state: "unknown" },
    audio: {},
    sensors: [],
  };

  const lines = formatDeviceSnapshot(snapshot, false);
  assert.ok(lines.some((line) => line.includes("load unavailable")));
  assert.ok(lines.some((line) => line.includes("BATTERY") && line.includes("unknown")));
  assert.ok(lines.some((line) => line.includes("SENSORS") && line.endsWith("0")));
});

test("canUseNativeDeviceEngine is false outside Android native runtime", () => {
  // Node / web CI environment has no Capacitor native Android bridge.
  assert.equal(canUseNativeDeviceEngine(), false);
});
