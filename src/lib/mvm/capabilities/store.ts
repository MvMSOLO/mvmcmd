import type { CapabilityId, CapabilitySnapshot, CapabilityState } from "./types";

const KEY = "mvmcmd.capabilities.v1";
const state = new Map<CapabilityId, CapabilitySnapshot>();

function persist(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...state.values()]));
  } catch {
    /* best effort */
  }
}

export function hydrateCapabilityState(): CapabilitySnapshot[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as CapabilitySnapshot[];
    if (!Array.isArray(parsed)) return [];
    parsed.forEach((snapshot) => {
      if (snapshot?.id && snapshot?.state && snapshot?.decision) state.set(snapshot.id, snapshot);
    });
    return [...state.values()];
  } catch {
    return [];
  }
}

export function getCapabilityState(id: CapabilityId): CapabilityState {
  return state.get(id)?.state ?? "unknown";
}

export function getCapabilitySnapshot(id: CapabilityId): CapabilitySnapshot | undefined {
  return state.get(id);
}

export function setCapabilitySnapshot(snapshot: CapabilitySnapshot): void {
  state.set(snapshot.id, snapshot);
  persist();
}

export function getCapabilitySnapshots(): CapabilitySnapshot[] {
  return [...state.values()];
}
