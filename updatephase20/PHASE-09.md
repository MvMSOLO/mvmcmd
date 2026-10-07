# Phase 09 — App Bridge / Intent / Deep-Link / Share Engine

## Status
IMPLEMENTED — CI verification pending for the latest fix commit. The bridge now covers package launch, URL/deep-link routing, share/chooser, MIME validation, explicit `content:` URI grants, desktop fallback, and truthful STARTED state.

## Goal
Create a safe bridge between MVM CMD and other Android applications without pretending that an external app completed an operation.

## Scope
- Explicit Android Intent builders.
- App launch with package resolution.
- Deep-link resolution.
- URL opening.
- Share/send-to flows.
- Text/image/file handoff.
- MIME-type validation.
- Chooser support where multiple handlers exist.
- Return-to-MVM is treated as an external boundary; completion is not inferred. The command state remains available when MVM resumes.
- Desktop-safe fallback behavior.

## Architecture
INTENT REQUEST → RESOLVE TARGET → CAPABILITY/POLICY CHECK → LAUNCH → OBSERVE RETURN BOUNDARY → VERIFY WHEN EVIDENCE EXISTS → RESULT.

## Rules
Opening another app is normally STARTED unless MVM can observe completion. Unsupported deep links must fail safely. Share operations must never silently expose private files or data.

## Acceptance
- One reusable bridge replaces scattered Intent code.
- Every bridge operation reports target and method.
- Unsupported targets produce a truthful explanation.
- File sharing uses scoped, explicit grants.
- APK and EXE CI succeed on the final Phase 9 commit.

## Dependencies
Phases 2, 5, 6 and 8.
