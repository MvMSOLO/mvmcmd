import type { CapabilityId, CapabilitySnapshot, CapabilityState } from "./types";

const state = new Map<CapabilityId, CapabilitySnapshot>();

export function getCapabilityState(id: CapabilityId): CapabilityState {
  return state.get(id)?.state ?? "unknown";
}
export function getCapabilitySnapshot(id: CapabilityId): CapabilitySnapshot | undefined { return state.get(id); }
export function setCapabilitySnapshot(snapshot: CapabilitySnapshot): void { state.set(snapshot.id, snapshot); }
export function getCapabilitySnapshots(): CapabilitySnapshot[] { return [...state.values()]; }
