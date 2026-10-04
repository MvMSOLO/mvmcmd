import {
  canUseNativeAndroidLauncher,
  nativeCheckCapabilities,
  nativeRequestCapability,
  type NativeCapabilitySnapshot,
} from "../native-launcher";
import { setCapabilitySnapshot } from "./store";
import type { CapabilityId, CapabilitySnapshot } from "./types";

export type CapabilityAction = "camera" | "qr" | "notification";

export type CapabilityGuardResult =
  | { ok: true; snapshot: CapabilitySnapshot }
  | { ok: false; reason: "unavailable" | "denied" | "settings"; snapshot: CapabilitySnapshot; detail?: string };

const ACTION_REQUIREMENTS: Record<CapabilityAction, CapabilityId[]> = {
  camera: ["camera"],
  qr: ["camera"],
  notification: ["notification_listener"],
};

function map(snapshot: NativeCapabilitySnapshot): CapabilitySnapshot {
  return {
    id: snapshot.id,
    state: snapshot.state,
    decision: snapshot.decision,
    checkedAt: snapshot.checkedAt,
    ...(snapshot.detail ? { detail: snapshot.detail } : {}),
    ...(snapshot.needsSettings !== undefined ? { needsSettings: snapshot.needsSettings } : {}),
  };
}

export function snapshotToCore(snapshot: NativeCapabilitySnapshot): CapabilitySnapshot {
  const mapped = map(snapshot);
  setCapabilitySnapshot(mapped);
  return mapped;
}

export async function refreshNativeCapabilities(
  capabilityId?: CapabilityId,
): Promise<CapabilitySnapshot[]> {
  if (!canUseNativeAndroidLauncher()) return [];
  const snapshots = await nativeCheckCapabilities(capabilityId);
  return snapshots.map(snapshotToCore);
}

export function getRequiredCapabilities(action: CapabilityAction): CapabilityId[] {
  return [...ACTION_REQUIREMENTS[action]];
}

export async function ensureCapability(
  capabilityId: CapabilityId,
): Promise<CapabilityGuardResult> {
  if (!canUseNativeAndroidLauncher()) {
    return {
      ok: false,
      reason: "unavailable",
      snapshot: {
        id: capabilityId,
        state: "unavailable",
        decision: "unset",
        checkedAt: Date.now(),
        detail: "Native Android capability bridge is unavailable.",
      },
    };
  }

  const [checked] = await refreshNativeCapabilities(capabilityId);
  if (!checked) {
    return {
      ok: false,
      reason: "unavailable",
      snapshot: {
        id: capabilityId,
        state: "unavailable",
        decision: "unset",
        checkedAt: Date.now(),
        detail: "Android returned no capability snapshot.",
      },
    };
  }

  if (checked.state === "ready") return { ok: true, snapshot: checked };
  if (checked.state === "unavailable") {
    return { ok: false, reason: "unavailable", snapshot: checked, detail: checked.detail };
  }

  const requested = snapshotToCore(await nativeRequestCapability(capabilityId));

  if (requested.state === "ready") return { ok: true, snapshot: requested };

  if (requested.state === "restricted" && requested.needsSettings) {
    return { ok: false, reason: "settings", snapshot: requested, detail: requested.detail };
  }

  return { ok: false, reason: "denied", snapshot: requested, detail: requested.detail };
}

export async function ensureActionCapabilities(
  action: CapabilityAction,
): Promise<CapabilityGuardResult> {
  for (const capabilityId of ACTION_REQUIREMENTS[action]) {
    const result = await ensureCapability(capabilityId);
    if (!result.ok) return result;
  }

  const snapshots = await refreshNativeCapabilities(ACTION_REQUIREMENTS[action][0]);
  const ready = snapshots[0];
  if (!ready) {
    return {
      ok: false,
      reason: "unavailable",
      snapshot: {
        id: ACTION_REQUIREMENTS[action][0],
        state: "unavailable",
        decision: "unset",
        checkedAt: Date.now(),
      },
    };
  }
  return { ok: true, snapshot: ready };
}
