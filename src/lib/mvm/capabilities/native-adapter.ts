import {
  nativeCheckCapabilities,
  nativeRequestCapability,
  nativeSkipCapability,
  type NativeCapabilitySnapshot,
} from "../native-launcher";
import { getCapabilityDefinitions } from "./registry";
import { setCapabilitySnapshot } from "./store";
import type { CapabilityAdapter, CapabilityId, CapabilitySnapshot } from "./types";

function map(snapshot: NativeCapabilitySnapshot): CapabilitySnapshot {
  return {
    id: snapshot.id,
    state: snapshot.state,
    checkedAt: snapshot.checkedAt,
    decision: snapshot.decision,
    ...(snapshot.detail ? { detail: snapshot.detail } : {}),
  };
}

export async function checkNativeCapabilities(): Promise<CapabilitySnapshot[]> {
  const snapshots = await nativeCheckCapabilities();
  const mapped = snapshots.map(map);
  mapped.forEach(setCapabilitySnapshot);
  return mapped;
}

export const androidCapabilityAdapter: CapabilityAdapter = {
  async check() {
    const first = getCapabilityDefinitions()[0];
    if (!first) throw new Error("No capability definitions registered");
    const [snapshot] = await checkNativeCapabilities();
    if (!snapshot) throw new Error("Android capability check returned no result");
    return snapshot;
  },
  async request() {
    const first = getCapabilityDefinitions()[0];
    if (!first) throw new Error("No capability definitions registered");
    const snapshot = map(await nativeRequestCapability(first.id));
    setCapabilitySnapshot(snapshot);
    return snapshot;
  },
};

export async function requestNativeCapability(
  id: CapabilityId,
): Promise<CapabilitySnapshot> {
  const snapshot = map(await nativeRequestCapability(id));
  setCapabilitySnapshot(snapshot);
  return snapshot;
}

export async function skipNativeCapability(
  id: CapabilityId,
): Promise<CapabilitySnapshot> {
  const snapshot = map(await nativeSkipCapability(id));
  setCapabilitySnapshot(snapshot);
  return snapshot;
}
