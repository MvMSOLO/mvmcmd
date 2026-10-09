# Phase 19 — Hardening, Security, Performance & Massive Testing

## Status

**AUTOMATED RELEASE-HARDENING SCOPE: COMPLETED. PHYSICAL-DEVICE SIGN-OFF: OPEN.**

Phase 19 is not represented as fully field-validated until OEM permission/background behavior and battery/thermal measurements are actually recorded. The reproducible device checklist is [PHASE-19-DEVICE-VALIDATION.md](PHASE-19-DEVICE-VALIDATION.md).

## Goal

Make the feature-complete application verifiable and release-ready without inventing successful outcomes, device measurements, FPS, memory usage, or battery data.

## Implemented automated coverage

- Command parser alias, malformed-input, multilingual-input, and deterministic stress regression tests.
- Action lifecycle, goal/task planning, app bridge, session privacy, permission/capability state, URI allowlisting, ZIP/path validation, IPC sender trust and performance-budget contract tests.
- Android instrumentation tests that exercise main launch, camera controls, QR scanner UI/image fallback, native wallpaper actions, English adaptive XP, English Studio grammar correction, notification demo/clear, and activity launch.
- Android APK assembly, APK integrity verification, exact 17-wallpaper payload SHA-256 checks, emulator install/launch and isolated UI instrumentation.
- Windows portable EXE build, package verification, launch smoke, final success gate and artifact upload.
- Dependency-audit gate blocks critical advisories; code remains transparent about moderate advisories.
- Emulator KVM setup and bounded per-test instrumentation were added to reduce emulator start-up, animation and timeout instability.

## Validated release-candidate evidence

Validated application source revision: [6254c764a29d230d05b011434b1aae9c59e35697](https://github.com/MvMSOLO/mvmcmd/commit/6254c764a29d230d05b011434b1aae9c59e35697) on `updatephase20`. PR [#15](https://github.com/MvMSOLO/mvmcmd/pull/15) merged the Phase 19 hardening branch into this roadmap branch. This does not imply that the open PR #14 has been merged into `main`.

- **Android APK — SUCCESS:** [GitHub Actions run 37958296878](https://github.com/MvMSOLO/mvmcmd/actions/runs/37958296878). The job completed successfully on the validated source revision. The Node regression suite reported 99 passed, 0 failed. Typecheck, security/compatibility contract checks, web bundle, Android Gradle build, APK verification, exact 17-wallpaper payload SHA-256 checks, emulator install/launch smoke, isolated instrumentation flows, final success gate and artifact upload all completed successfully. Artifact: [mvmcmd-debug-apk-713](https://github.com/MvMSOLO/mvmcmd/actions/runs/37958296878/artifacts/11630851672), archive size 22,291,889 bytes, SHA-256 `323c13a5339c83d9c9d76ba58f9b2d10fd4d32895a15e17b06975db267f5faa4`.
- **Windows EXE — SUCCESS:** [GitHub Actions run 37958296868](https://github.com/MvMSOLO/mvmcmd/actions/runs/37958296868). The job completed successfully on the same source revision. The Node regression suite reported 99 passed, 0 failed. Typecheck, security/compatibility contract checks, web bundle, portable EXE package verification, packaged launch smoke, final success gate and artifact upload all completed successfully. Artifact: [mvmcmd-windows-exe-431](https://github.com/MvMSOLO/mvmcmd/actions/runs/37958296868/artifacts/11630571462), archive size 133,929,261 bytes, SHA-256 `dc18fb6b0e6829a06ea86dfea9858320dd3da1f1a92b8428e91e0ef49a46497d`.
- The isolated Android instrumentation suite covers focused MVMCMD UI flows plus application package ID. It passed in the GitHub-hosted emulator. This is not a substitute for OEM hardware tests.
- The Android emulator log contained transient ADB/GPU-context warnings, but the workflow recovered, all required instrumentation/build steps succeeded, and the overall job ended in `success`. These logs do not establish a physical-device pass.

## Dependency audit result and limitation

On the validated revision, `npm audit` reported **0 low, 7 moderate, 0 high and 0 critical** advisories. The remaining advisories are in the Electron Builder/build-tool dependency chain (including `@electron/get`, `app-builder-lib`, `dmg-builder`, `global-agent`, `roarr`, and `sprintf-js`). The [CVE-2026-97058 advisory for sprintf-js](https://github.com/advisories/ghsa-hp3w-g68c-fv3c) currently lists no patched version. Downgrading Electron Builder to 26.5.0 caused the audit to report a critical `tar` advisory, so that downgrade was rejected and the compatible 26.17.0 line was restored. The build gate passes because no critical or high advisories were reported, **not because the dependency tree is vulnerability-free**. Revisit the residual moderate build-tool advisories as upstream patches become available.

## Performance facts

The code records real renderer-mount time, sampled frame delivery where available, heap usage when the runtime exposes it, and command-parse/routing duration. Unit tests cover performance budget contracts. CI does **not** claim that those contracts constitute a measured real-device battery, thermal, memory, or sustained 3D-performance benchmark.

## Acceptance ledger

| Requirement | Result |
|---|---|
| 99-test Node regression suite | PASS, 99/99 on Android and Windows |
| Focused Android instrumentation flows | PASS in CI emulator |
| APK generation and verification | PASS |
| 17 original wallpaper payload hashes | PASS |
| Android emulator install/launch smoke | PASS |
| Windows EXE packaging and launch smoke | PASS |
| Final success gates and artifact uploads | PASS |
| Critical/high dependency advisories on validated run | 0 critical / 0 high; 7 moderate remain |
| Samsung / Xiaomi / Redmi / POCO / Pixel physical-device matrix | OPEN — no physical-device session available in CI |
| Battery-drain and thermal measurement | OPEN — not measured; no values are inferred |
| OEM restricted-permission/background-kill behavior | OPEN — requires real-device validation |

## Remaining Phase 19 work

Use [PHASE-19-DEVICE-VALIDATION.md](PHASE-19-DEVICE-VALIDATION.md) to record actual device/firmware evidence and repeatable baseline-versus-app battery measurements. Do not advance Phase 20 or mark overall field validation complete until that checklist is run on devices. The CI automation work itself is completed on the commit and Actions runs linked above.
