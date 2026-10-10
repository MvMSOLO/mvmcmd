# Phase 06 — MVM Action Engine

## Status
COMPLETED.

## Goal
Provide one execution lifecycle for real actions.

## Lifecycle
PRECONDITION → EXECUTE → OBSERVE → VERIFY → RECOVER → RESULT.

## Result states
READY, STARTED, VERIFIED, RECOVERED and FAILED.

## Key rule
STARTED is not VERIFIED. For example, an Android Intent can be accepted by the platform without giving MVM CMD evidence that the target application actually rendered or completed an operation.

## Delivered
- Typed action context.
- Typed action result.
- Stage trace.
- Precondition handling.
- Execute error handling.
- Observation stage.
- Verification stage.
- Recovery hook.
- Unit coverage.

## Acceptance
- Every new executable skill can use the same lifecycle.
- Verification is explicit.
- Platform boundaries cannot fabricate completion.
- Existing executor paths remain compatible.
- APK and EXE CI succeed.

## Dependencies
Phases 1–5.
