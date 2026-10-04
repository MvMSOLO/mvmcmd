export type CapabilityState = "unknown" | "ready" | "denied" | "restricted" | "unavailable" | "error";

export type CapabilityId = string;

export type CapabilityDecision = "unset" | "allow" | "skip";

export interface CapabilitySnapshot {
  id: CapabilityId;
  state: CapabilityState;
  decision: CapabilityDecision;
  checkedAt: number;
  detail?: string;
  needsSettings?: boolean;
}

export interface CapabilityDefinition {
  id: CapabilityId;
  label: string;
  optional?: boolean;
  platform: "android" | "web" | "windows";
}

export interface CapabilityAdapter {
  check(id: CapabilityId): Promise<CapabilitySnapshot>;
  request(id: CapabilityId): Promise<CapabilitySnapshot>;
}
