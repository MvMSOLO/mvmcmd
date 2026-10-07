# Phase 16 — Global Entry Points

## Status
PLANNED.

## Goal
Make MVM CMD reachable from useful Android and desktop entry points without duplicating command logic.

## Scope
- App shortcut.
- Notification/quick action entry where appropriate.
- Share target.
- File open/share integration.
- Deep links.
- Android intent entry.
- Desktop launcher/tray or equivalent supported entry.
- Global command input where platform permissions permit.

## Rules
Every entry point funnels into the same command router. Registration must be explicit and revocable. Background behavior must obey platform restrictions.

## Acceptance
- Entry points resolve to canonical commands.
- No duplicated execution path.
- Permission requirements are visible.
- Android and Windows behavior remain platform-appropriate.
- APK and EXE CI succeed.

## Dependencies
Phases 5, 9, 14 and 15.
