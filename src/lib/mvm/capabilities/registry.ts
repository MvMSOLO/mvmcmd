import type { CapabilityDefinition, CapabilityId } from "./types";

const definitions: CapabilityDefinition[] = [
  { id: "camera", label: "Camera", platform: "android" },
  { id: "microphone", label: "Microphone", platform: "android", optional: true },
  { id: "notifications", label: "Notifications", platform: "android", optional: true },
  { id: "notification_listener", label: "Notification access", platform: "android", optional: true },
  { id: "contacts", label: "Contacts", platform: "android", optional: true },
  { id: "overlay", label: "Display over other apps", platform: "android", optional: true },
  { id: "usage_access", label: "Usage access", platform: "android", optional: true },
];

export function getCapabilityDefinitions(): CapabilityDefinition[] { return [...definitions]; }
export function getCapabilityDefinition(id: CapabilityId): CapabilityDefinition | undefined {
  return definitions.find((item) => item.id === id);
}
