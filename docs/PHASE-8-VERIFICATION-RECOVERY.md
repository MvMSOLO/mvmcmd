# Phase 8 — Verification + Recovery Engine

## Status

IMPLEMENTED — CI verification pending.

## Goal

Make action completion and failure handling explicit and deterministic:

`PRECONDITION → EXECUTE → OBSERVE → VERIFY → RECOVER/FALLBACK → RESULT`

Phase 8 hardens the Phase 6 Action Engine rather than creating a second execution path.

## Delivered

### Bounded verification

- Every action result carries an `attempts` count.
- `VERIFIED` requires explicit completion evidence from `verify()`.
- `STARTED` means execution/observation succeeded but completion proof is unavailable.
- `RECOVERED` means a declared fallback handled the problem; it is never marked verified.
- `FAILED` means the action could not be safely completed or recovered.

### Explicit recovery policy

Actions may opt into:

- `maxAttempts` — bounded retry budget.
- `retryOn` — explicit failure stages allowed to retry:
  - `precondition`
  - `execute`
  - `observe`
  - `verify`

Retries are **opt-in**. Existing actions therefore keep the safe one-attempt behavior by default.

### Safe fallback behavior

- A recovery callback may return a fallback value.
- A fallback produces `RECOVERED`, never `VERIFIED`.
- Recovery trace and reason are preserved for the UI/debug log.
- If no safe recovery exists, the engine returns the truthful original state.

### Side-effect safety

The engine does not automatically retry side-effecting actions.

For example, an Android Intent launch remains one attempt and remains `STARTED` when completion cannot be observed. The engine does not launch the same app repeatedly just to obtain a verification signal.

## Acceptance

- [x] Bounded retry policy.
- [x] Stage-specific retry control.
- [x] Verification remains evidence-gated.
- [x] Fallback cannot become VERIFIED.
- [x] Recovery reason and strategy are observable.
- [x] Existing action lifecycle remains the single execution path.
- [x] Unit coverage for verification, fallback, retry, and truth preservation.
- [ ] Android APK CI success.
- [ ] Windows EXE CI success.

## Truth model

| Result | Meaning | Verified |
| --- | --- | --- |
| `VERIFIED` | Explicit completion evidence exists | Yes |
| `STARTED` | Action started/was accepted, completion unproven | No |
| `RECOVERED` | Declared fallback handled a failure | No |
| `FAILED` | No safe completion or recovery | No |

No artificial delay, fake telemetry, or fabricated completion is introduced.
