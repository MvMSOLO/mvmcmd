# MVMCMD — Phase 2 Capability Core

Branch: phase/02-capability-core

## Objective
Create one canonical capability model so Android access, readiness and future actions no longer depend on scattered permission flags.

## First implementation
- CapabilityDefinition registry
- CapabilityState model
- CapabilitySnapshot store
- Android capability adapter contract
- Explicit distinction between access state and capability readiness

## Initial capability IDs
camera, microphone, notifications, contacts, overlay, usage_access, storage.

## Rules
- No permission is requested silently.
- Skip remains valid for optional capabilities.
- A granted permission is not automatically treated as ready until check() verifies the capability.
- Browser/PWA permission state cannot claim native Android capability readiness.
- Future handlers must consume capability IDs instead of hard-coded permission booleans.

## Next step
Wire the registry into the Android native bridge and first-run capability onboarding, then verify each state against the real platform APIs.
