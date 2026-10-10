# Phase 19 — Hardening, Security, Performance & Massive Testing

## Status

**PHASE 19 SOFTWARE / CI ACCEPTANCE: COMPLETED. PHYSICAL-DEVICE QUALIFICATION: OPEN.**

All remotely verifiable implementation, regression, Android APK, Windows EXE, emulator-smoke, artifact, and release-gate work for Phase 19 is complete. Device-specific OEM permission/background behavior and battery/thermal measurements remain an explicit manual release-qualification checklist in [PHASE-19-DEVICE-VALIDATION.md](PHASE-19-DEVICE-VALIDATION.md). They are not falsely counted as passed and must be completed before claiming field validation or making device-wide performance/battery claims.

## Goal

Make the feature-complete application verifiable and release-ready without inventing successful outcomes, device measurements, FPS, memory usage, or battery data.

## Implemented automated coverage

- Command parser alias, malformed-input, multilingual-input, and deterministic stress regression tests.
- Action lifecycle, goal/task planning, app bridge, session privacy, permission/capability state, URI allowlisting, ZIP/path validation, IPC sender trust and performance-budget contract tests.
- Android instrumentation tests that exercise main launch, camera controls, QR scanner UI/image fallback, native wallpaper actions, English adaptive XP, English Studio grammar correction, notification demo/clear, and activity launch.
- Android APK assembly, APK integrity verification, exact 17-wallpaper payload SHA-256 checks, emulator install/launch and isolated UI instrumentation.
- Windows portable EXE build, package verification, launch smoke, final success gate and artifact upload.
- Dependency-audit gate blocks high and critical advisories; code remains transparent about moderate advisories.
- Emulator KVM setup and bounded per-test instrumentation were added to reduce emulator start-up, animation and timeout instability.

## Validated release-candidate evidence

Latest validated source revision: [a032c0c562ec93b2c4d12293abe3210765914f84](https://github.com/MvMSOLO/mvmcmd/commit/a032c0c562ec93b2c4d12293abe3210765914f84) on `updatephase20`. This revision closes a missing `PY` heredoc terminator in the Android workflow's APK wallpaper-payload verification script; the script now completes without the earlier unterminated-heredoc warning. Both platform workflows ran against this exact commit and completed successfully.

- **Android APK — SUCCESS:** [GitHub Actions run 37963533516](https://github.com/MvMSOLO/mvmcmd/actions/runs/37963533516). All 32 workflow steps succeeded. The Node regression suite reported **99 passed, 0 failed**. Typecheck, release-hardening/compatibility contracts, web build, APK assembly and verification, exact 17-wallpaper payload SHA-256 checks, emulator installation/launch, isolated native-activity instrumentation, final success gate, and artifact upload all succeeded. Artifact: [mvmcmd-debug-apk-719](https://github.com/MvMSOLO/mvmcmd/actions/runs/37963533516/artifacts/11631564952), 22,291,897 bytes.
- **Windows EXE — SUCCESS:** [GitHub Actions run 37963533405](https://github.com/MvMSOLO/mvmcmd/actions/runs/37963533405). All 21 workflow steps succeeded. The Node regression suite reported **99 passed, 0 failed**. Typecheck, release-hardening/compatibility contracts, web build, portable EXE packaging, EXE verification, packaged launch smoke, final success gate, and artifact upload all succeeded. Artifact: [mvmcmd-windows-exe-437](https://github.com/MvMSOLO/mvmcmd/actions/runs/37963533405/artifacts/11632388086), 133,928,117 bytes.
- The Android emulator run successfully installed and launched the APK and passed the isolated instrumentation flows covering app context, main launch, camera controls, QR scanner/image fallback, native wallpaper actions, English practice/XP, grammar correction, notification history, English Activity, English Studio, and notification-center launch. Emulator evidence is not a substitute for OEM hardware testing.
- Phase 19 CI and build gates are verified on the same current commit, not inferred from older runs. PR [#15](https://github.com/MvMSOLO/mvmcmd/pull/15) delivered Phase 19 hardening into the roadmap branch. The separate PR [#14](https://github.com/MvMSOLO/mvmcmd/pull/14) targeting `main` remains open; neither this validation nor this document update claims it has been merged into `main`.

## Dependency audit result and limitation

On the latest validated revision `a032c0c562ec93b2c4d12293abe3210765914f84`, `npm audit` reported **0 low, 7 moderate, 0 high and 0 critical** advisories. The remaining advisories are in the Electron Builder/build-tool dependency chain (including `@electron/get`, `app-builder-lib`, `dmg-builder`, `global-agent`, `roarr`, and `sprintf-js`). The [CVE-2026-97058 advisory for sprintf-js](https://github.com/advisories/ghsa-hp3w-g68c-fv3c) currently lists no patched version. Downgrading Electron Builder to 26.5.0 caused the audit to report a critical `tar` advisory, so that downgrade was rejected and the compatible 26.17.0 line was restored. The current high/critical gate passes because no high or critical advisories were reported, **not because the dependency tree is vulnerability-free**. Revisit the residual moderate build-tool advisories as upstream patches become available.

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

## Post-phase release qualification — manual device evidence

**Phase 19 software / CI scope is closed.** The following field-qualification items are still open because no physical Android device or physical battery/thermal measurement was available to this workflow:

- Samsung / One UI, Xiaomi / Redmi / POCO / HyperOS or MIUI, and Google Pixel / AOSP device matrix.
- Manufacturer-specific restricted permission and background-process-kill behavior.
- Repeatable baseline-versus-app battery and thermal measurements.

Use [PHASE-19-DEVICE-VALIDATION.md](PHASE-19-DEVICE-VALIDATION.md) to record actual device, firmware, test conditions, logs, and results. Never mark these manual checks passed from GitHub-hosted emulator evidence alone. Phase 20 work may proceed, but release/field-validation claims must retain these as explicit qualification gates until evidence is recorded.
