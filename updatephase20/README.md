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
- Phase 11 — Adaptive Gaming Engine: **COMPLETED**
- Phase 12 — Communication Engine: **PLANNED**
- Phase 13 — Device Utility & File Intelligence: **COMPLETED**
- Phase 14 — Context, Session Memory & Conversation: **COMPLETED**
- Phase 15 — Voice + Assistant Layer: **COMPLETED**
- Phase 16 — Global Entry Points: **COMPLETED**
- Phase 17 — Speed, Motion & Premium UX: **COMPLETED**
- Phase 18 — Globalization + Android/OEM Compatibility: **COMPLETED**
- Phase 19 — Hardening, Security, Performance & Massive Testing: **COMPLETED (automated CI scope; physical-device follow-up tracked)**
- Phase 20 — Release Candidate → Demo → Instagram Launch: **IN PROGRESS (automated release gates added; launch qualification remains open)**

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

**Status: COMPLETED — software implementation and automated CI acceptance.** Physical-device qualification is separately tracked as a release gate; it is not reported as passed by emulator evidence.

Latest validated revision: [a032c0c562ec93b2c4d12293abe3210765914f84](https://github.com/MvMSOLO/mvmcmd/commit/a032c0c562ec93b2c4d12293abe3210765914f84) on `updatephase20`. This includes the fix for the missing `PY` terminator in the Android APK wallpaper verification script.

- Android APK: [run 37963533516 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37963533516), **32/32 steps successful**, **99 tests passed / 0 failed**. APK generation, verification, 17 original wallpaper payload integrity checks, emulator install/launch, isolated native activity instrumentation, final success gate and artifact upload passed.
- Windows EXE: [run 37963533405 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37963533405), **21/21 steps successful**, **99 tests passed / 0 failed**. Portable EXE packaging, verification, launch smoke, final success gate and artifact upload passed.
- Artifacts: [mvmcmd-debug-apk-719](https://github.com/MvMSOLO/mvmcmd/actions/runs/37963533516/artifacts/11631564952) (22,291,897 bytes) and [mvmcmd-windows-exe-437](https://github.com/MvMSOLO/mvmcmd/actions/runs/37963533405/artifacts/11632388086) (133,928,117 bytes).
- Both workflows now block HIGH and CRITICAL dependency advisories. The audit for the validated commit reported **0 low, 7 moderate, 0 high and 0 critical** advisories. Passing this gate does not mean the dependency tree is vulnerability-free; the remaining moderate build-tool advisories are documented in [PHASE-19.md](PHASE-19.md).
- Phase 19 implementation/CI scope is closed. Real Samsung, Xiaomi/Redmi/POCO and Pixel device tests, OEM permission/background behavior, and repeatable battery/thermal measurements remain **OPEN** in [PHASE-19-DEVICE-VALIDATION.md](PHASE-19-DEVICE-VALIDATION.md). Do not claim full field validation or production battery/compatibility guarantees until physical-device evidence is recorded.
- PR [#15](https://github.com/MvMSOLO/mvmcmd/pull/15) delivered the Phase 19 hardening work into this roadmap branch. PR [#14](https://github.com/MvMSOLO/mvmcmd/pull/14) targeting `main` remains open; this checkpoint does not claim that PR was merged.

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


## Phase 20 implementation checkpoint

**Validated app-source candidate:** [`c81e625c945f50e582ecbc7322060928333b3969`](https://github.com/MvMSOLO/mvmcmd/commit/c81e625c945f50e582ecbc7322060928333b3969).

- **Windows EXE: SUCCESS** — [run 38031931178](https://github.com/MvMSOLO/mvmcmd/actions/runs/38031931178), 22/22 steps, 99 tests passed / 0 failed, metadata gate 15/15, packaged-launch smoke and artifact upload passed. Artifact [`mvmcmd-windows-exe-449`](https://github.com/MvMSOLO/mvmcmd/actions/runs/38031931178/artifacts/11662456587), 133,931,621 bytes; archive SHA-256 `6398784acd38cdeb6aee5f8663d8ff119f756a3ce8689d591318cbc964496df7`.
- **Android debug APK: SUCCESS** — [run 38031931196](https://github.com/MvMSOLO/mvmcmd/actions/runs/38031931196), 33/33 steps, 99 tests passed / 0 failed, metadata gate 15/15, exact 17-wallpaper payloads, emulator install/launch and native-activity tests passed. Artifact [`mvmcmd-debug-apk-731`](https://github.com/MvMSOLO/mvmcmd/actions/runs/38031931196/artifacts/11662766161), 22,291,867 bytes; archive SHA-256 `a2054d478c9ec8dc320f231acc8d71fd1d0cbd641bd01ad12ce5303577cc29d4`.
- Both workflows report **0 known production dependency advisories** with `npm audit --omit=dev`. The full development/build-tool audit still has seven moderate nodes in the same optional Electron-builder chain, linked to [CVE-2026-97058](https://github.com/advisories/ghsa-hp3w-g68c-fv3c); no patched upstream version was available on 2026-10-10. See [the dependency review](../release/DEPENDENCY-ADVISORY-REVIEW.md).
- The manual [signed-release workflow](../.github/workflows/android-production-release.yml) and [runbook](../release/ANDROID-PRODUCTION-SIGNING.md) are prepared; no production-signed APK is claimed until required GitHub secrets are configured and the reviewed candidate is merged to `main`.
- The source-based [privacy review](../release/PRIVACY-AND-PERMISSIONS.md) is documented but awaits release-owner/legal sign-off. Physical-device/OEM testing and real screenshots/video remain open because they require a real phone and recorded evidence.

Phase 20 remains **IN PROGRESS**. CI success is not public-release approval. See [PHASE-20.md](PHASE-20.md), [dependency review](../release/DEPENDENCY-ADVISORY-REVIEW.md), [signing guide](../release/ANDROID-PRODUCTION-SIGNING.md), and [known limitations](../release/KNOWN-LIMITATIONS.md) for the current acceptance evidence and blockers.
