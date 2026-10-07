# Phase 07 — Task Planner

## Status
COMPLETED.

## Goal
Turn explicitly chained natural-language commands into ordered executable plans.

## Delivered
- Task plan and step schemas.
- Explicit separators: “and then”, “then”, “va keyin”, “keyin”, “va”.
- Bounded plans from 2 to 8 steps.
- Dependency chain between steps.
- Sequential execution.
- Stop-on-failure policy.
- Step-level statuses: pending, running, verified, started, failed, skipped.
- Task-level result.
- Existing single-command path preserved.

## Truth model
A task is VERIFIED only when all required steps have verification evidence. A downstream step cannot be presented as successful when its dependency failed.

## Acceptance
- Step order is deterministic.
- Dependency failures prevent unsafe downstream execution.
- Step results remain inspectable.
- Single commands behave as before.
- APK and EXE CI succeed.

## Dependencies
Phase 6 action engine.
