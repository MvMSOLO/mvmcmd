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

Validated commit: [86df9129d0c981a48dc70834b6977ea7a99b020b](https://github.com/MvMSOLO/mvmcmd/commit/86df9129d0c981a48dc70834b6977ea7a99b020b).

- **Android APK — SUCCESS:** [GitHub Actions run 37948025991](https://github.com/MvMSOLO/mvmcmd/actions/runs/37948025991). The Node test suite reported 99 passed, 0 failed. Isolated Android instrumentation flows, APK verification, 17-wallpaper integrity verification, emulator install/launch smoke, final success gate and upload completed successfully. Artifact: [mvmcmd-debug-apk-706](https://api.github.com/repos/MvMSOLO/mvmcmd/actions/artifacts/11624923137/zip), archive size 22,291,886 bytes.
- **Windows EXE — SUCCESS:** [GitHub Actions run 37948026013](https://github.com/MvMSOLO/mvmcmd/actions/runs/37948026013). The Node test suite reported 99 passed, 0 failed. EXE verification, packaged launch smoke, final success gate and artifact upload completed successfully. Artifact: [mvmcmd-windows-exe-424](https://api.github.com/repos/MvMSOLO/mvmcmd/actions/artifacts/11624922817/zip), archive size 133,930,272 bytes.
- The added Android instrumentation suite contains 10 focused MVMCMD UI-flow tests plus the application package-ID check. These tests pass in the isolated emulator workflow; this is stronger than only checking that an Activity starts, but it is not a substitute for real hardware coverage.

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
