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
- Phase 10 — MVM Goal Engine: **COMPLETED**
- Phase 11 — Adaptive Gaming Engine: **PLANNED**
- Phase 12 — Communication Engine: **PLANNED**
- Phase 13 — Device Utility & File Intelligence: **COMPLETED**
- Phase 14 — Context, Session Memory & Conversation: **COMPLETED**
- Phase 15 — Voice + Assistant Layer: **COMPLETED**
- Phase 16 — Global Entry Points: **COMPLETED**
- Phase 17 — Speed, Motion & Premium UX: **IN PROGRESS — CODE COMMITTED, CI PENDING**
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

## Phase 17 implementation checkpoint

The Phase 17 implementation is committed on the current branch; final status remains pending Android APK and Windows EXE CI verification. This pass adds a persisted, accessible reduced-motion control that follows the OS by default, disables motion-driven physical/parallax effects when reduced motion is active, makes command log scrolling and boot choreography respect the effective preference, gives keyboard focus a visible ring, prevents decorative 3D clicks from bubbling into surrounding action cards, removes stale KernelCAD external destinations from decorative assets, and suspends the performance sampling loop while the app is hidden. The FPS display now says “sampling” until a real frame sample has completed. Focused contract tests and both platform workflow gates cover these behaviors.

## Phase 16 implementation checkpoint
Phase 16 is completed on code commit [6f74881d8fb50d27fb31530f528feacaa612358a](https://github.com/MvMSOLO/mvmcmd/commit/6f74881d8fb50d27fb31530f528feacaa612358a). Android APK [run 37904252074](https://github.com/MvMSOLO/mvmcmd/actions/runs/37904252074) and Windows EXE [run 37904252142](https://github.com/MvMSOLO/mvmcmd/actions/runs/37904252142) both succeeded, including focused tests, platform artifact verification, final success gates and artifact uploads. Android shortcuts, deep links, share/open intent staging, QR Quick Settings routing, Windows protocol links, tray and global command hotkey now feed the existing command dock. Incoming commands are staged for user review and are not auto-executed. Full implementation, artifact and acceptance evidence is documented in [PHASE-16.md](PHASE-16.md).

## Phase 15 implementation checkpoint
Phase 15 is completed on validated code commit [7d6a80842797750cf41deecfa5503a8f9b1d4b1b](https://github.com/MvMSOLO/mvmcmd/commit/7d6a80842797750cf41deecfa5503a8f9b1d4b1b). Android APK [run 37900166326](https://github.com/MvMSOLO/mvmcmd/actions/runs/37900166326) and Windows EXE [run 37900166264](https://github.com/MvMSOLO/mvmcmd/actions/runs/37900166264) succeeded, including focused tests, platform artifact verification and upload. Voice input is staged for explicit review before Launch; spoken summaries respect the returned execution state. Full implementation and acceptance notes are in [PHASE-15.md](PHASE-15.md).

## Phase 14 implementation checkpoint
Phase 14 is completed on validated code commit `2763a04223415c6c786c6ad1f3252092dbb59ecd`. The safe session context, follow-up resolution, privacy boundaries, explicit result-state summary, clear/reset handling and 14 focused tests passed TypeScript and focused-test gates. Both artifacts built and uploaded successfully: [Android APK run 37896634065](https://github.com/MvMSOLO/mvmcmd/actions/runs/37896634065) and [Windows EXE run 37896634067](https://github.com/MvMSOLO/mvmcmd/actions/runs/37896634067). Full acceptance notes are in [PHASE-14.md](PHASE-14.md).
