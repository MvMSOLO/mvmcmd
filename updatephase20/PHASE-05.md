# Phase 05 — MVM Skill Registry

## Status
COMPLETED.

## Goal
Make every supported command a discoverable, metadata-driven skill.

## Skill contract
Each skill defines id, name, aliases, category, supported platforms, required capabilities, risk, handler, verification, optional fallback and enabled state.

## Initial skills
open-app, device-snapshot, permission-status, camera, QR, wallpaper, notification-center and English Lab.

## Why this matters
The registry prevents command logic from becoming a collection of unrelated UI handlers. Future phases can inspect requirements before execution and can expose capabilities consistently.

## Acceptance
- Every supported command maps to one canonical skill.
- Required capabilities are queryable before execution.
- Disabled/unsupported skills are not silently executed.
- Skill lookup remains deterministic.
- APK and EXE CI succeed.

## Dependencies
Phase 4 intelligence.
