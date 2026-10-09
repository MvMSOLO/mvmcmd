# Phase 13 — Device Utility & File Intelligence

## Status
IN_PROGRESS — native scoped-storage implementation and CI verification pending.

## Goal
Make MVM CMD useful for everyday device maintenance and file tasks while respecting Android storage boundaries.

## Scope
- Storage overview.
- Large-file discovery.
- File search.
- Safe copy/move/share.
- Recent-file discovery.
- Media categorization.
- Duplicate detection where technically safe.
- Download/document location helpers.
- Cleanup suggestions rather than destructive automatic deletion.
- ZIP/basic archive helpers where appropriate.

## Rules
“Clean my phone” must first produce an inspectable plan. Destructive deletion requires explicit confirmation and must never target protected/system data.

## Acceptance
- Storage numbers come from the native device engine.
- File operations use scoped access.
- Every destructive action has confirmation and verification.
- Search results identify the actual path/resource.
- APK and EXE CI succeed.

## Dependencies
Phases 2, 3, 6, 8 and 9.
