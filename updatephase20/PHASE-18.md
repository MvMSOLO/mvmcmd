# Phase 18 — Globalization + Android/OEM Compatibility

## Status
COMPLETED — implementation commit and Android APK / Windows EXE CI both succeeded.

## Goal
Make MVM CMD dependable across languages, Android versions and OEM-specific restrictions.

## Implemented
- Uzbek and English are first-class for compatibility and permission diagnostics, date and number formatting.
- Mixed-language and case-insensitive command heads normalize to canonical commands. Language names and localized capability identifiers also normalize without changing command semantics.
- The `compat` command reports the actual device API/Android release and manufacturer/model where the native Android engine can read them, then prints read-only native capability snapshots.
- Android API guidance distinguishes the Android 12L/API 32 and Android 13/API 33 notification-permission boundary, includes the API map through Android 17/API 37, and avoids guessing on unknown API levels.
- Capability explanations differentiate ready, denied, restricted, unavailable, error and unknown states; Restricted Settings advice is conditional on Android showing the option and emphasizes the sensitivity of notification access.
- OEM identification is a vendor/model hint only. Samsung and general Android background battery guidance is advisory; no OEM feature is assumed and no restriction is bypassed.
- Windows/web fallback reports that Android-only metadata is unavailable instead of inventing device details or requesting Android permissions.
- Phase 17’s reduced-motion behavior, keyboard focus styling and accessibility assertions continue to run through the shared platform workflows.

## Rules
OEM-specific features are capability-detected, never assumed. If an OEM blocks an operation, MVM CMD explains the limitation and the safest available path. Non-ready capability states are never represented as successful actions.

## Acceptance
- [x] Core language / command normalization and API matrix have focused regression tests.
- [x] Permission states provide localized explanation and a safe restricted-access fallback.
- [x] Language changes preserve canonical command semantics.
- [x] Platform-specific fallback behavior has tests and CI source guards.
- [x] Android APK and Windows EXE workflows passed for code commit [46049ce2403b612468606c6551a80056252bafa8](https://github.com/MvMSOLO/mvmcmd/commit/46049ce2403b612468606c6551a80056252bafa8).
- [x] 48 tests passed and 0 failed on both builds.
- [x] APK [run 37913498594](https://github.com/MvMSOLO/mvmcmd/actions/runs/37913498594) and EXE [run 37913498538](https://github.com/MvMSOLO/mvmcmd/actions/runs/37913498538) artifacts uploaded.

## Artifact evidence
- Android APK: [mvmcmd-debug-apk-657](https://api.github.com/repos/MvMSOLO/mvmcmd/actions/artifacts/11607671711) — 22,284,741 bytes; SHA-256 `33289601f6f5cb7102f1a21a1a04e3b8ff6e9020ef1dbdc59ced17dc1ee740c8`.
- Windows EXE: [mvmcmd-windows-exe-375](https://api.github.com/repos/MvMSOLO/mvmcmd/actions/artifacts/11608811059) — 133,926,156 bytes; SHA-256 `5e86bc6de9c79160425fd86d93eefc243de8a4358c32bec449c6c8be588eb626`.

## Manual validation still needed
CI validates source, tests, web bundles and artifact production. Real-device validation on Samsung, Xiaomi/Redmi/POCO and Pixel hardware, especially vendor battery/background restrictions and restricted notification access, is not claimed as complete.

## Dependencies
Phases 2–17.
