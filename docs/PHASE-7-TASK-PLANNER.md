# Phase 7 — Task Planner & Multi-Step Actions

## Goal

Turn explicit multi-step user commands into an ordered task plan without guessing hidden actions.

Architecture:

`INPUT → PLAN → STEP DEPENDENCIES → EXISTING ACTION/EXECUTOR → STEP RESULT → TASK RESULT`

## Delivered

- Deterministic `planMvmTask()` for explicit sequential language.
- Supports English and Uzbek separators: `then`, `and then`, `va`, `va keyin`, `keyin`.
- Maximum 8 steps by default.
- Each step has an explicit dependency on the previous step.
- Sequential runner executes one step at a time.
- Dependency failure prevents downstream steps from executing.
- `verified` remains separate from `started`; the planner never upgrades an unverified action.
- Existing single-command execution remains the default path.
- No LLM, no hidden action inference, no fabricated success.

## Truth rules

1. Only explicit separators create a task.
2. A failed prerequisite blocks dependent steps.
3. A started/unverified step is not treated as verified.
4. Unsupported platform actions retain the existing executor's truthful result.
5. No artificial waiting is added between steps.

## Acceptance

- [x] Task plan schema.
- [x] Deterministic sequential decomposition.
- [x] Dependency chain.
- [x] Fail-stop behavior.
- [x] Verification truth preserved.
- [x] Unit coverage.
- [x] Android APK CI verification.
- [x] Windows EXE CI verification.
