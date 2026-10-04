import {
  nativeCheckCapabilities,
  nativeRequestCapability,
  nativeSkipCapability,
  type NativeCapabilitySnapshot,
} from "../native-launcher";
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
  async check(id) {
    const snapshot = map((await nativeCheckCapabilities(id))[0]);
    if (!snapshot) throw new Error("Android capability check returned no result");
    setCapabilitySnapshot(snapshot);
    return snapshot;
  },
  async request(id) {
    const snapshot = map(await nativeRequestCapability(id));
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
