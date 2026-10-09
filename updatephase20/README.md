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
- Phase 17 — Speed, Motion & Premium UX: **COMPLETED**
- Phase 18 — Globalization + Android/OEM Compatibility: **COMPLETED**
- Phase 19 — Hardening, Security, Performance & Massive Testing: **COMPLETED (automated CI scope; physical-device follow-up tracked)**
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


## Phase 19 implementation checkpoint

Validated application source revision: [6254c764a29d230d05b011434b1aae9c59e35697](https://github.com/MvMSOLO/mvmcmd/commit/6254c764a29d230d05b011434b1aae9c59e35697) on `updatephase20`. Android APK [run 37958296878 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37958296878) and Windows EXE [run 37958296868 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37958296868) passed on this exact source revision. Both Node regression suites report 99 passed / 0 failed. Android APK verification, 17-wallpaper payload integrity, emulator install/launch smoke, isolated Android instrumentation, Windows EXE verification and packaged launch smoke, final gates and artifact uploads all passed.

Artifacts: [mvmcmd-debug-apk-713](https://github.com/MvMSOLO/mvmcmd/actions/runs/37958296878/artifacts/11630851672) (22,291,889-byte archive; SHA-256 `323c13a5339c83d9c9d76ba58f9b2d10fd4d32895a15e17b06975db267f5faa4`) and [mvmcmd-windows-exe-431](https://github.com/MvMSOLO/mvmcmd/actions/runs/37958296868/artifacts/11630571462) (133,929,261-byte archive; SHA-256 `dc18fb6b0e6829a06ea86dfea9858320dd3da1f1a92b8428e91e0ef49a46497d`).

**Release-gate policy update:** Android and Windows workflow checks now block both HIGH and CRITICAL dependency advisories. Moderate advisories remain visible and tracked; the checked release candidate had 7 moderate, 0 high and 0 critical advisories.

**Dependency note:** the validated audit reports 0 low, 7 moderate, 0 high and 0 critical advisories. The residual moderate advisories are in the Electron Builder/build-tool chain; CVE-2026-97058 for `sprintf-js` currently lists no patched version. Downgrading Electron Builder to 26.5.0 introduced a critical `tar` advisory, so that downgrade was rejected. CI passing means no high/critical advisories were reported, not that the dependency tree is free of vulnerabilities.

**Field-validation limitation:** actual Samsung/Xiaomi/Redmi/POCO/Pixel behavior, OEM restricted-permission/background-kill behavior, sustained thermal behavior, and battery drain have not been measured on physical hardware. These stay explicitly OPEN in [PHASE-19-DEVICE-VALIDATION.md](PHASE-19-DEVICE-VALIDATION.md); CI/emulator success does not close them. Phase 19 automated CI scope is complete. Overall physical-device sign-off stays open until device evidence is recorded, and Phase 20 remains PLANNED.

## Phase 18 implementation checkpoint

Phase 18 implementation is completed on code commit [46049ce2403b612468606c6551a80056252bafa8](https://github.com/MvMSOLO/mvmcmd/commit/46049ce2403b612468606c6551a80056252bafa8). Android APK [run 37913498594 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37913498594) and Windows EXE [run 37913498538 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37913498538) both passed the same code revision. Both CI runs report 48 tests passed and zero failures. The Android artifact is [mvmcmd-debug-apk-657](https://api.github.com/repos/MvMSOLO/mvmcmd/actions/artifacts/11607671711) (22,284,741 bytes; SHA-256 `33289601f6f5cb7102f1a21a1a04e3b8ff6e9020ef1dbdc59ced17dc1ee740c8`); the Windows artifact is [mvmcmd-windows-exe-375](https://api.github.com/repos/MvMSOLO/mvmcmd/actions/artifacts/11608811059) (133,926,156 bytes; SHA-256 `5e86bc6de9c79160425fd86d93eefc243de8a4358c32bec449c6c8be588eb626`).

The phase adds localized Android/OEM compatibility diagnostics via `compat`, real device API/release/manufacturer/model and native capability snapshots, safe guidance for denied/restricted notification access, OEM-specific battery guidance clearly labelled as a hint rather than a guarantee, Uzbek/English locale formatting, and canonicalized mixed-language command and permission names. Platform fallbacks explicitly avoid inventing device facts or bypassing Android restrictions. Phase 17’s reduced-motion and keyboard-focus accessibility contracts remain part of the shared CI gates. CI confirms typecheck, all 48 tests, web bundle validation and artifact production. Physical testing on real Samsung, Xiaomi/Redmi/POCO and Pixel devices, including OEM background-kill behavior, remains a manual device-validation item.

## Phase 17 implementation checkpoint

Phase 17 implementation is completed on code commit [d03de2873fe0d906e4ed3a4bd75facbc8290c661](https://github.com/MvMSOLO/mvmcmd/commit/d03de2873fe0d906e4ed3a4bd75facbc8290c661). Android APK [run 37907003082 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37907003082) and Windows EXE [run 37907002953 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37907002953) both passed. This pass adds a persisted, accessible reduced-motion control that follows the OS by default, disables motion-driven physical/parallax effects when reduced motion is active, makes command log scrolling and boot choreography respect the effective preference, gives keyboard focus a visible ring, prevents decorative 3D clicks from bubbling into surrounding action cards, removes stale KernelCAD external destinations from decorative assets, and suspends the performance sampling loop while the app is hidden. The FPS display now says “sampling” until a real frame sample has completed. Focused contract tests and both platform workflow gates cover these behaviors.

## Phase 16 implementation checkpoint
Phase 16 is completed on code commit [6f74881d8fb50d27fb31530f528feacaa612358a](https://github.com/MvMSOLO/mvmcmd/commit/6f74881d8fb50d27fb31530f528feacaa612358a). Android APK [run 37904252074](https://github.com/MvMSOLO/mvmcmd/actions/runs/37904252074) and Windows EXE [run 37904252142](https://github.com/MvMSOLO/mvmcmd/actions/runs/37904252142) both succeeded, including focused tests, platform artifact verification, final success gates and artifact uploads. Android shortcuts, deep links, share/open intent staging, QR Quick Settings routing, Windows protocol links, tray and global command hotkey now feed the existing command dock. Incoming commands are staged for user review and are not auto-executed. Full implementation, artifact and acceptance evidence is documented in [PHASE-16.md](PHASE-16.md).

## Phase 15 implementation checkpoint
Phase 15 is completed on validated code commit [7d6a80842797750cf41deecfa5503a8f9b1d4b1b](https://github.com/MvMSOLO/mvmcmd/commit/7d6a80842797750cf41deecfa5503a8f9b1d4b1b). Android APK [run 37900166326](https://github.com/MvMSOLO/mvmcmd/actions/runs/37900166326) and Windows EXE [run 37900166264](https://github.com/MvMSOLO/mvmcmd/actions/runs/37900166264) succeeded, including focused tests, platform artifact verification and upload. Voice input is staged for explicit review before Launch; spoken summaries respect the returned execution state. Full implementation and acceptance notes are in [PHASE-15.md](PHASE-15.md).

## Phase 14 implementation checkpoint
Phase 14 is completed on validated code commit `2763a04223415c6c786c6ad1f3252092dbb59ecd`. The safe session context, follow-up resolution, privacy boundaries, explicit result-state summary, clear/reset handling and 14 focused tests passed TypeScript and focused-test gates. Both artifacts built and uploaded successfully: [Android APK run 37896634065](https://github.com/MvMSOLO/mvmcmd/actions/runs/37896634065) and [Windows EXE run 37896634067](https://github.com/MvMSOLO/mvmcmd/actions/runs/37896634067). Full acceptance notes are in [PHASE-14.md](PHASE-14.md).
