# MVM CMD — Phase 1–20 Master Roadmap

## Purpose
This folder is the canonical product roadmap for MVM CMD from the completed foundation work through the release candidate. It describes what is already implemented, what each future phase must deliver, how phases depend on each other, and what must be verified before a phase is considered complete.

## Product direction
MVM CMD is a real device-command and utility application. The core loop is:

`INPUT → UNDERSTAND → INTENT/GOAL → CONTEXT → PLAN → CAPABILITY CHECK → ACTION → OBSERVE → VERIFY → RECOVERY/FALLBACK → RESULT`

The product must prefer truthful execution over visual simulation. A UI animation, optimistic message, or requested Android Intent is never treated as proof that an operation completed.

## Phase status
- Phase 01 — Foundation & Baseline: **COMPLETED**
- Phase 02 — Capability & Permission Core: **COMPLETED**
- Phase 03 — Native Device Capability Engine: **COMPLETED**
- Phase 04 — MVM Intelligence / Command Engine: **COMPLETED**
- Phase 05 — MVM Skill Registry: **COMPLETED**
- Phase 06 — MVM Action Engine: **COMPLETED**
- Phase 07 — Task Planner: **COMPLETED**
- Phase 08 — Verification + Recovery Engine: **COMPLETED**
- Phase 09 — App Bridge / Intent / Deep-Link / Share Engine: **COMPLETED**
- Phase 10 — MVM Goal Engine: **PLANNED**
- Phase 11 — Adaptive Gaming Engine: **PLANNED**
- Phase 12 — Communication Engine: **PLANNED**
- Phase 13 — Device Utility & File Intelligence: **PLANNED**
- Phase 14 — Context, Session Memory & Conversation: **PLANNED**
- Phase 15 — Voice + Assistant Layer: **PLANNED**
- Phase 16 — Global Entry Points: **PLANNED**
- Phase 17 — Speed, Motion & Premium UX: **PLANNED**
- Phase 18 — Globalization + Android/OEM Compatibility: **PLANNED**
- Phase 19 — Hardening, Security, Performance & Massive Testing: **PLANNED**
- Phase 20 — Release Candidate → Demo → Instagram Launch: **PLANNED**

## Non-negotiable rules
1. No fake completion.
2. No fake FPS, battery, RAM, thermal, cleanup, or performance claims.
3. Permissions are explicit, understandable, and skippable when optional.
4. Runtime permissions and special Android access are represented separately.
5. Verification is evidence-based.
6. Retries are bounded and opt-in.
7. Side-effecting actions are never repeated merely because completion cannot be observed.
8. Existing features are preserved unless a replacement is demonstrably better and tested.
9. APK remains the primary mobile product; desktop is not a disconnected rewrite.
10. Every implementation phase ends with tests plus Android APK and Windows EXE CI verification.
11. UI polish must improve clarity and state communication, not hide limitations.
12. Security and privacy are part of the architecture, not a final cosmetic pass.

## Documentation map
See `PHASE-01.md` through `PHASE-20.md` for the full phase specifications. See `PHASE-01-08-CONSOLIDATED.md` for the implementation history of the completed first eight phases.
