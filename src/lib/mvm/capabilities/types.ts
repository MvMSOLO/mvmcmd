export type CapabilityState = "unknown" | "ready" | "denied" | "restricted" | "unavailable" | "error";

export type CapabilityId = string;

export interface CapabilitySnapshot {
  id: CapabilityId;
  state: CapabilityState;
  checkedAt: number;
  detail?: string;
}

export interface CapabilityDefinition {
  id: CapabilityId;
  label: string;
  optional?: boolean;
  platform: "android" | "web" | "windows";
}

export interface CapabilityAdapter {
  check(): Promise<CapabilitySnapshot>;
  request(): Promise<CapabilitySnapshot>;
}
