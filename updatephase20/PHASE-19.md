# Phase 19 — Hardening, Security, Performance & Massive Testing

## Status
COMPLETED — automated CI/release-hardening scope. Physical-device and battery-impact follow-ups remain open and are not represented as passed.

## Goal
Turn the feature-complete product into a release-quality system.

## Security
- Minimize permissions.
- Validate all external inputs.
- Sanitize deep links and file paths.
- Scope file grants.
- Avoid accidental data disclosure in logs.
- Protect sensitive session state.
- Review exported Android components.
- Audit notification and overlay behavior.
- Verify third-party dependency health.

## Testing
- Unit tests.
- Parser/property tests.
- Action lifecycle tests.
- Task-plan tests.
- Native bridge tests.
- Android integration tests.
- Permission-state matrix.
- OEM/API compatibility matrix.
- Desktop smoke tests.
- Regression tests for camera, QR, wallpaper, notification and English Lab.
- APK install/launch smoke test.
- EXE launch smoke test.

## Performance
Define budgets for startup, command parsing, UI interaction, memory, battery impact and 3D rendering. Measure instead of guessing.

## Acceptance
- No known critical security defect.
- No known data-loss path.
- Core flows pass regression matrix.
- Performance budgets are measured.
- APK and EXE release candidates build successfully.

## Dependencies
All previous phases.

## Implementation checkpoint — 2026-10-09

Validated code/workflow revision: [4dd064d41f507f2bc3eb6d1d8cf945fc7f7e340d](https://github.com/MvMSOLO/mvmcmd/commit/4dd064d41f507f2bc3eb6d1d8cf945fc7f7e340d).

- Android APK workflow: [run 37931180964 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37931180964). The 99-test suite passed (0 failures), APK verification passed, all 17 packaged wallpaper PNGs passed integrity checks, and Android emulator install/launch smoke passed. Artifact: [mvmcmd-debug-apk-686](https://api.github.com/repos/MvMSOLO/mvmcmd/actions/artifacts/11616510918), 22,291,929 bytes.
- Windows EXE workflow: [run 37931180716 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37931180716). The 99-test suite passed (0 failures), EXE verification and packaged launch smoke passed, and the artifact uploaded. Artifact: [mvmcmd-windows-exe-404](https://api.github.com/repos/MvMSOLO/mvmcmd/actions/artifacts/11617130526), 133,933,294 bytes for the artifact archive.
- Parser regression coverage now includes deterministic stress cases; gaming-engine tests run in both CI workflows. The tests caught and corrected inconsistent bare command aliases, a Node 22 TypeScript import path, and a gaming-session duration fixture.
- Android CI explicitly configures KVM permissions and a longer emulator smoke window to keep install/launch validation reliable.
- Security gates passed for URI allowlisting, ZIP entry/path validation, trusted Electron IPC senders, disabled Android backup, scoped file grants, session privacy boundaries, and performance-budget contracts.

### Open limitations

The dependency audit reports 0 critical, 0 high, and 10 moderate advisories. CI intentionally blocks critical advisories, so “policy gate passed” does not mean “zero advisories.” Physical-device OEM testing and battery-drain measurement remain unperformed; the runtime does not invent battery-drain figures. Emulator launch smoke verifies app install/start, not every camera, QR, notification or English Lab workflow on physical hardware. Complete those device-level checks before treating the product as fully field-validated.
