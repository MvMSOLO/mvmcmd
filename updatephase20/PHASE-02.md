# Phase 02 — MVM Capability & Permission Core

## Status
COMPLETED.

## Goal
Centralize capability discovery and permission handling so every skill can ask the same system whether access is available.

## Capability model
Each capability can be UNKNOWN, READY, DENIED, RESTRICTED, UNAVAILABLE or ERROR. The model must distinguish ordinary runtime permissions from special Android access, roles and settings-based access.

## Delivered
- Central capability registry.
- Native adapter.
- Sequential first-run setup.
- Allow/Skip behavior.
- Android Settings return and re-check.
- Permission commands such as `perm`, `perm camera`, and `perm notification_listener`.
- Camera, microphone, notifications, notification listener, contacts, overlay and usage-access capability definitions.

## Safety and UX
No hidden permission request is allowed. Optional capabilities can be skipped. A capability is not considered READY until the platform reports it as available.

## Acceptance
- One canonical capability state per capability.
- No duplicate permission logic in individual screens.
- Settings changes are re-read when the user returns.
- Denied/restricted states remain truthful.
- APK and EXE CI succeed.

## Dependencies
Phase 1.
