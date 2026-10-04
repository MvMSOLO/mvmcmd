import { Capacitor, registerPlugin } from "@capacitor/core";

export interface DeviceSnapshot {
  schemaVersion: number;
  timestamp: number;
  device: {
    manufacturer: string;
    model: string;
    device: string;
    hardware: string;
    sdk: number;
    release: string;
    abis: string[];
  };
  cpu: {
    cores: number;
    hardware: string;
    architecture: string;
    loadPercent?: number;
  };
  memory: {
    totalBytes?: number;
    availableBytes?: number;
    usedBytes?: number;
    lowMemory?: boolean;
  };
  storage: {
    totalBytes: number;
    availableBytes: number;
    usedBytes: number;
  };
  battery: {
    percent?: number;
    charging: boolean;
    plugged: number;
    temperatureC?: number;
    health: number;
  };
  thermal: {
    status: number;
    statusName: string;
  };
  display: {
    widthPx?: number;
    heightPx?: number;
    density?: number;
    refreshRateHz?: number;
    glEsVersion?: string;
  };
  network: {
    connected: boolean;
    wifi?: boolean;
    cellular?: boolean;
    ethernet?: boolean;
    vpn?: boolean;
    metered?: boolean;
  };
  bluetooth: {
    available: boolean;
    state: string;
  };
  audio: {
    mode?: number;
    musicVolume?: number;
    musicMaxVolume?: number;
    ringerMode?: number;
  };
  sensors: Array<{
    type: number;
    name: string;
    vendor: string;
    version: number;
    powerMah: number;
  }>;
}

interface MvmDevicePlugin {
  getDeviceSnapshot(): Promise<DeviceSnapshot>;
}

const NativeDevice = registerPlugin<MvmDevicePlugin>("MvmDevice");

export function canUseNativeDeviceEngine(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function nativeGetDeviceSnapshot(): Promise<DeviceSnapshot> {
  return NativeDevice.getDeviceSnapshot();
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || !Number.isFinite(bytes)) return "unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${units[index]}`;
}

export function formatDeviceSnapshot(s: DeviceSnapshot, uz = true): string[] {
  const lines = [
    `DEVICE   ${s.device.manufacturer} ${s.device.model}`,
    `CPU      ${s.cpu.cores} cores · ${s.cpu.architecture}${s.cpu.loadPercent === undefined ? "" : ` · ${s.cpu.loadPercent.toFixed(1)}%`}`,
    `RAM      ${formatBytes(s.memory.usedBytes)} / ${formatBytes(s.memory.totalBytes)} · free ${formatBytes(s.memory.availableBytes)}`,
    `STORAGE  ${formatBytes(s.storage.usedBytes)} / ${formatBytes(s.storage.totalBytes)} · free ${formatBytes(s.storage.availableBytes)}`,
    `BATTERY  ${s.battery.percent === undefined ? "unknown" : s.battery.percent + "%"} · ${s.battery.charging ? "charging" : "not charging"}${s.battery.temperatureC === undefined ? "" : ` · ${s.battery.temperatureC.toFixed(1)}°C`}`,
    `THERMAL  ${s.thermal.statusName.toUpperCase()}`,
    `DISPLAY  ${s.display.widthPx ?? "?"}×${s.display.heightPx ?? "?"} · ${s.display.refreshRateHz === undefined ? "?" : s.display.refreshRateHz.toFixed(1) + "Hz"} · GLES ${s.display.glEsVersion ?? "?"}`,
    `NETWORK  ${s.network.connected ? "connected" : "offline"}`,
    `BT       ${s.bluetooth.state}`,
    `SENSORS  ${s.sensors.length}`,
  ];
  if (!uz) return lines;
  return lines.map((line) => line);
}
