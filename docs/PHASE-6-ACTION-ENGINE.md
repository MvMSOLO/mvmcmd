# Phase 6 — MVM Action Engine

## Status
IN PROGRESS — implementation complete; CI verification pending.

## Goal
Move execution from direct command handlers into a canonical lifecycle:

`PRECONDITION → EXECUTE → OBSERVE → VERIFY → RECOVER/FALLBACK → RESULT`

The engine is deliberately truthful:
- VERIFIED means there is completion evidence.
- STARTED means the platform accepted/requested the action but completion cannot be observed at this boundary.
- FAILED means the action did not start or could not satisfy its preconditions.
- RECOVERED means a declared fallback handled the failure without pretending the original action succeeded.

## Implementation

### src/lib/mvm/action-engine.ts
Provides:
- MvmActionContext
- MvmActionDefinition
- MvmActionResult
- runMvmAction()
- actionStatusLine()

The lifecycle records a trace so the UI can explain what happened instead of returning a generic success.

### Executor integration
src/lib/mvm/executor.ts routes application launch through the action engine.

For Android Intent launches, the current launcher boundary can prove that an Intent request was issued, but not that the target app rendered successfully. Therefore the result is intentionally reported as STARTED, not VERIFIED.

### Tests
src/lib/mvm/action-engine.test.ts covers:
1. verified completion
2. unverified platform request → STARTED
3. precondition failure → RECOVERED

package.json includes the new test in the existing test command.

## Acceptance
- [x] Canonical action lifecycle
- [x] Preconditions
- [x] Execute stage
- [x] Observe stage
- [x] Verification gate
- [x] Recovery/fallback hook
- [x] Explicit STARTED vs VERIFIED truth state
- [x] Existing app-launch flow migrated
- [x] Unit coverage added
- [ ] APK CI success on Phase 6 head
- [ ] Windows EXE CI success on Phase 6 head

## Next
After CI is green, Phase 7 can consume the same action lifecycle for multi-step plans without duplicating execution logic.
