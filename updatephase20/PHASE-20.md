# Phase 20 — Release Candidate → Demo → Instagram Launch

## Status

**IN PROGRESS — release metadata hardening and launch documentation are prepared; public release qualification is not complete.**

This phase must not be marked complete merely because CI is green. The current CI candidate is version `1.0.0`. Android artifacts produced by CI are debug APKs, not signed production releases. Real product screenshots/video and physical-device qualification are still required before public launch claims.

## Release-candidate work

- [x] Align Android `versionName` with the desktop/package version (`1.0.0`).
- [x] Add a CI release metadata gate checking version consistency, Android IDs/labels/launcher, desktop product/app ID, portable Windows x64 target, backup policy, branding icon, and required native entry points.
- [x] Document the product honestly in a root README and add candidate release notes, known limitations, privacy/permission explanation, demo shot plan, screenshot capture checklist, and draft Instagram copy.
- [x] Preserve the Phase 19 boundary: automated software/CI is complete, while OEM and physical-device qualification remains open.
- [ ] Verify the latest APK and EXE builds on the exact same release-candidate source commit.
- [ ] Review artifacts and confirm version/metadata in the generated output.
- [ ] Complete a real-device permission-first-run and core-flow session.
- [ ] Capture authentic screenshots and a real vertical demo video from the installed build.
- [ ] Complete signing, privacy-policy review, and release approval before public distribution.

## Current CI evidence

- **Release-candidate source:** [`f8be99acee8cb87c39fdff4c81241e75b7b99d91`](https://github.com/MvMSOLO/mvmcmd/commit/f8be99acee8cb87c39fdff4c81241e75b7b99d91)
- **Windows portable EXE — SUCCESS:** [workflow run 38029787174](https://github.com/MvMSOLO/mvmcmd/actions/runs/38029787174). Typecheck, release metadata validation, project regression tests, web bundle, portable EXE creation, EXE verification, packaged launch smoke, final success gate, and artifact upload passed.
- **Windows artifact:** [`mvmcmd-windows-exe-444`](https://github.com/MvMSOLO/mvmcmd/actions/runs/38029787174/artifacts/11661388533), 133,930,255 bytes. SHA-256 reported by GitHub artifact metadata: `0fff6cb5acd3131be29b55146daad8e616b0f6947ac921b600947ef032e2b19c`. This CI artifact expires 2026-10-24.
- **Android APK:** [workflow run 38029787175](https://github.com/MvMSOLO/mvmcmd/actions/runs/38029787175). Final result must be confirmed before this checkpoint is updated to PASS.
- **Dependency audit boundary:** Phase 19's latest documented audit showed 7 moderate, 0 high, and 0 critical advisories. A passed severity gate is not a vulnerability-free dependency tree; review current audit output again before distribution.

## Demo plan

The proposed 60-second demo sequence is in [`release/DEMO-SCRIPT-60S.md`](../release/DEMO-SCRIPT-60S.md): cold launch, command input, a verified app action, camera/QR, wallpaper preview, English tools, notification-permission guidance, a real fallback, and a truthful result state.

**The demo has not been recorded.** The shot plan is not evidence that the actions have been performed. Record directly from a running build, retain the unedited source, and show the result state exactly as the app reports it. Use synthetic notifications and do not expose personal content.

## Launch materials

- [Release notes](../release/RELEASE-NOTES-v1.0.0.md) — internal-candidate notes, not public-release approval.
- [Known limitations](../release/KNOWN-LIMITATIONS.md) — outstanding device validation, signing, and measurement boundaries.
- [Privacy and permissions explanation](../release/PRIVACY-AND-PERMISSIONS.md) — draft; requires release-specific privacy review.
- [Screenshot and video capture checklist](../release/SCREENSHOT-CAPTURE-CHECKLIST.md) — not yet signed off.
- [Instagram launch copy](../release/INSTAGRAM-LAUNCH-COPY.md) — draft; do not publish until real media and release qualification are complete.

## Explicit release blockers

1. **Physical-device qualification remains OPEN.** Test on actual Samsung/One UI, Xiaomi/Redmi/POCO/HyperOS or MIUI, and Pixel/AOSP hardware as available. The hosted emulator does not prove OEM restricted-setting, background-kill, camera, or notification behavior.
2. **Battery and thermal measurements remain OPEN.** No real measurements have been recorded. Do not claim battery savings, thermal improvements, RAM reductions, higher FPS, or “booster” results without repeatable device-level evidence.
3. **Real media is missing.** Product screenshots and a vertical recording must be captured from the running app, not invented or substituted with mockups.
4. **Production distribution is not configured.** The CI APK is a debug APK; production signing and store/distribution preparation still require deliberate setup and review.
5. **Privacy and dependency review remain.** Review current audit output, Android permissions, notification access, storage/network behavior, and a final privacy policy before external distribution.

## Acceptance ledger

| Requirement | State |
|---|---|
| Android/desktop version metadata aligned | PASS in source; current release gate verifies it |
| Automated release metadata gate | PASS on the latest Windows workflow; Android result still being confirmed |
| Windows EXE packaging and launch smoke | PASS on run 38029787174 |
| APK build and emulator core-flow validation | Await latest run result |
| Root README and release documentation | Prepared in this phase; verify commit on branch |
| Authentic screenshots and real demo video | OPEN |
| OEM physical-device matrix and restricted-access behavior | OPEN |
| Repeatable battery/thermal measurement | OPEN |
| Signed production APK and final distribution review | OPEN |

## Non-negotiable launch rules

- An animation, external-app launch, or requested Android Intent is not proof of completion.
- Preserve the difference between `STARTED`, `VERIFIED`, `RECOVERED`, and failure states.
- Do not imply unsupported OEM capabilities, measured FPS gains, or universal compatibility.
- Do not claim Phase 20 is closed until the outstanding acceptance items above have actual evidence.

## Dependencies

All previous phases. Phase 19 software/CI acceptance is complete; Phase 19 physical-device qualification remains a required follow-up.
