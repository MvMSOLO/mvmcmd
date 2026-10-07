# Phase 10 — MVM Goal Engine

## Status
PLANNED.

## Goal
Move from “execute this command” to “achieve this user goal” while preserving the existing action and verification layers.

## Example model
GOAL → required outcome → candidate skills → capability requirements → task plan → execution → verification → recovery.

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
- Recovery can replace a failed step without fabricating completion.
- APK and EXE CI succeed.

## Dependencies
Phases 4–9.
