# Phase 10 — MVM Goal Engine

## Status
IMPLEMENTED — Goal schema, deterministic planning, dependent execution, partial/complete status, cancellation, explicit verification, and sequential state propagation are wired into the existing task/action layers. Final implementation fixes are committed.

## Goal
Move from “execute this command” to “achieve this user goal” while preserving the existing action and verification layers.

## Example model
GOAL → required outcome → candidate skills → capability requirements → task plan → execution → verification → recovery.

## Delivered
- `src/lib/mvm/goal-engine.ts` with goal/outcome schema, risk classification, step dependencies, execution, partial completion, cancellation, and truth-preserving status.
- `src/lib/mvm/goal-engine.test.ts` covering achieved, partial, failed dependency, and cancelled goals.
- Explicit goal-language routing in `executor.ts`; existing commands remain the execution boundary.

## Scope
- Goal schema.
- Outcome definitions.
- Skill selection.
- Multi-step plan generation.
- Preconditions and constraints.
- User confirmation for consequential actions.
- Partial completion reporting.
- Goal cancellation.
- Retry/recovery integration.

## Rules
The goal engine must not bypass the action engine. It may plan, but only registered skills may execute. A goal is complete only when its defined outcome is verified.

## Acceptance
- Goals can contain multiple dependent skills.
- Partial success is distinguishable from complete success.
- Unsafe/ambiguous goals request clarification or confirmation.
- Recovery remains owned by the existing Phase 8 action layer; goal status never upgrades a STARTED/RECOVERED step to VERIFIED.
- APK and EXE CI succeed.

## Dependencies
Phases 4–9.
