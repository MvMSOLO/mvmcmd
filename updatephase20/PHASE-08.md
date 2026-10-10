# Phase 08 — Verification + Recovery Engine

## Status
COMPLETED.

## Goal
Make completion evidence and recovery behavior explicit, bounded and safe.

## Delivered
- Attempt counting.
- Opt-in maxAttempts.
- Stage-specific retryOn for precondition, execute, observe and verify.
- Recovery reason and strategy.
- Safe fallback.
- Fallback never becomes VERIFIED.
- Side-effecting actions are not automatically retried merely because verification is unavailable.
- Action trace exposes attempt count.

## Truth states
VERIFIED = explicit completion evidence.
STARTED = accepted/started but completion unproven.
RECOVERED = declared fallback handled a failure.
FAILED = no safe completion or recovery.

## Acceptance
- Verification is evidence-gated.
- Retry is bounded and opt-in.
- Fallback remains distinguishable from success.
- Unit tests cover verification, retry and recovery.
- APK and EXE CI succeed.

## Dependencies
Phase 6 action engine and Phase 7 task planner.
