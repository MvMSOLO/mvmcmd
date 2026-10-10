# Phase 20 — Release Candidate → Demo → Instagram Launch

## Status

**IN PROGRESS — the release candidate passes Android and Windows CI; public-release qualification remains open.**

The validated app-source candidate is `8218822ac033f6f05d5548b092f990431e28cae4`. Both platform workflows pass on that commit and produced downloadable artifacts. This report update is Markdown-only; the workflows deliberately ignore Markdown-only changes, and it does not alter the validated app source or artifacts.

The first Windows packaging attempt caught a bad icon payload (Electron Builder only detected a 48×48 image). The icon was replaced with a structurally verified 256×256 ICO; the latest Windows package, executable verification, packaged-launch smoke test, and artifact upload all passed.

This phase must not be marked complete merely because CI is green. Android artifacts are debug APKs, not signed production releases. Real product screenshots/video and physical-device qualification are still required before public launch claims.

## Release-candidate work

- [x] Align Android `versionName` with the desktop/package version (`1.0.0`).
- [x] Add a CI release metadata gate for semver/version consistency, Android IDs/labels/launcher/backup policy, desktop identity, Windows x64 target, required app entry points, and Windows icon configuration.
- [x] Create a dedicated 256×256 Windows `.ico` in the MVMCMD dark/teal/light brand palette and configure Electron Builder to use it instead of the generic default icon.
- [x] Prepare a root README, release notes, known limitations, privacy/permission explanation, a 60-second demo shot plan, a screenshot capture checklist, and draft Instagram launch copy.
- [x] Confirm both APK and EXE workflows pass on validated app-source commit `8218822`.
- [x] Preserve the Phase 19 boundary: software/CI acceptance is complete; OEM and physical-device qualification remains open.
- [ ] Complete a real-device permission/first-run and core-flow session.
- [ ] Capture authentic screenshots and a real vertical demo video from the installed build.
- [ ] Complete signing, privacy-policy review, and release approval before public distribution.

## Current candidate CI evidence

- **Validated app-source commit:** [`8218822ac033f6f05d5548b092f990431e28cae4`](https://github.com/MvMSOLO/mvmcmd/commit/8218822ac033f6f05d5548b092f990431e28cae4).
- **Windows portable EXE — SUCCESS:** [run 38030893145](https://github.com/MvMSOLO/mvmcmd/actions/runs/38030893145). All 22 job steps passed. The metadata gate passed 15 checks, all 99 project tests passed (0 failures), the portable EXE was built and verified, and the packaged executable remained alive throughout the launch smoke test.
- **Windows candidate artifact:** [`mvmcmd-windows-exe-448`](https://github.com/MvMSOLO/mvmcmd/actions/runs/38030893145/artifacts/11661738939), 133,931,627 bytes. SHA-256 of the uploaded artifact archive: `fff94a28c4f6c9fec66c6d8b73f533d44d76692ddada58ed14fd67228e57bb2f`. Expires 2026-10-24 06:30:34 UTC.
- **Android debug APK — SUCCESS:** [run 38030893223](https://github.com/MvMSOLO/mvmcmd/actions/runs/38030893223). All 33 job steps passed. The metadata gate passed 15 checks, all 99 project tests passed (0 failures), APK integrity passed, the exact 17 wallpaper PNG payloads were verified, and emulator install/launch plus isolated core native-activity instrumentation passed.
- **Android candidate artifact:** [`mvmcmd-debug-apk-730`](https://github.com/MvMSOLO/mvmcmd/actions/runs/38030893223/artifacts/11662445312), 22,291,861 bytes. SHA-256 of the uploaded artifact archive: `f6280ce1e10b7e0e6610da8ce157cc2101d0f3a412142758171af66dd44d9afa`. Expires 2026-10-24 06:31:33 UTC.
- **Dependency audit on both candidate runs:** 7 moderate advisories, 0 high, and 0 critical. CI's stated policy gate passed; the dependency tree is not vulnerability-free, and moderate advisories still need review before distribution.
- **Evidence boundary:** these runs validate the app-source candidate `8218822`. They do not prove physical-device/OEM behavior, production signing, battery/thermal benefits, store readiness, or that demo media has been recorded.

## Verified baseline CI history

The earlier baseline commit [`f8be99acee8cb87c39fdff4c81241e75b7b99d91`](https://github.com/MvMSOLO/mvmcmd/commit/f8be99acee8cb87c39fdff4c81241e75b7b99d91) also passed both platform workflows before the custom Windows icon was wired into Electron Builder:
- **Windows baseline:** [run 38029787174](https://github.com/MvMSOLO/mvmcmd/actions/runs/38029787174), artifact [`mvmcmd-windows-exe-444`](https://github.com/MvMSOLO/mvmcmd/actions/runs/38029787174/artifacts/11661388533), 133,930,255 bytes; archive SHA-256 `0fff6cb5acd3131be29b55146daad8e616b0f6947ac921b600947ef032e2b19c`.
- **Android baseline:** [run 38029787175](https://github.com/MvMSOLO/mvmcmd/actions/runs/38029787175), artifact [`mvmcmd-debug-apk-726`](https://github.com/MvMSOLO/mvmcmd/actions/runs/38029787175/artifacts/11661084409), 22,291,868 bytes; archive SHA-256 `0d8135e15e63ab4d08df35ca1565a643e3157ddf74a46d40ee13f08577e0e9db`.
- The candidate runs above supersede the baseline as evidence for the custom-icon source candidate.

## Demo plan

The proposed 60-second sequence is in [`release/DEMO-SCRIPT-60S.md`](../release/DEMO-SCRIPT-60S.md): cold launch, command input, a verified app action, camera/QR, wallpaper preview, English tools, notification-permission guidance, a real fallback, and a truthful result state.

**The demo has not been recorded.** The shot plan is not evidence that actions have been performed. Record directly from a running build, retain the unedited source, and show the result state exactly as the app reports it. Use synthetic notifications and do not expose personal content.

## Launch materials

- [Release notes](../release/RELEASE-NOTES-v1.0.0.md) — internal candidate notes, not public-release approval.
- [Known limitations](../release/KNOWN-LIMITATIONS.md) — device validation, signing, and measurement boundaries.
- [Privacy and permissions explanation](../release/PRIVACY-AND-PERMISSIONS.md) — draft; requires release-specific privacy review.
- [Screenshot/video capture checklist](../release/SCREENSHOT-CAPTURE-CHECKLIST.md) — not yet signed off.
- [Instagram launch copy](../release/INSTAGRAM-LAUNCH-COPY.md) — draft; do not publish until real media and release qualification are complete.

## Explicit release blockers

1. **Physical-device qualification remains OPEN.** Test actual Samsung/One UI, Xiaomi/Redmi/POCO/HyperOS or MIUI, and Pixel/AOSP hardware as available. The hosted emulator does not prove OEM restricted-setting, background-kill, camera, or notification behavior.
2. **Battery and thermal measurements remain OPEN.** No physical measurements have been recorded. Do not claim battery savings, thermal improvement, RAM reduction, higher FPS, or “booster” results without repeatable device-level evidence.
3. **Real media is missing.** Product screenshots and vertical video must be captured from the running app, not invented or substituted with mockups.
4. **Production distribution is not configured.** CI produces a debug APK; production signing and store/distribution preparation require deliberate setup and review.
5. **Privacy and dependency review remain.** Review current audit output, Android permissions, notification access, storage/network behavior, and the final privacy policy before external distribution.

## Acceptance ledger

| Requirement | State |
|---|---|
| Android/desktop version metadata aligned | PASS in candidate CI gate |
| Windows app icon configured and packaged | PASS; 256×256 ICO; Windows package and launch smoke passed |
| Android and Windows candidate CI | PASS on `8218822`; 99 tests pass / 0 fail on each platform |
| APK and EXE artifacts uploaded | PASS; links and archive SHA-256 values recorded above |
| Dependency audit | No high/critical advisories; 7 moderate remain for review |
| Root README and release documentation | Prepared |
| Real Android/OEM physical-device matrix | OPEN |
| Repeatable battery/thermal measurement | OPEN |
| Authentic screenshots and vertical demo | OPEN |
| Signed production APK and final distribution review | OPEN |

## Non-negotiable launch rules

- An animation, external-app launch, or requested Android Intent is not proof of completion.
- Preserve the difference between `STARTED`, `VERIFIED`, `RECOVERED`, and failure states.
- Do not imply unsupported OEM capabilities, measured FPS gains, or universal compatibility.
- Do not claim Phase 20 is closed until the open acceptance items above have real evidence.

## Dependencies

All previous phases. Phase 19 software/CI acceptance is complete; Phase 19 physical-device qualification remains an explicit follow-up.
