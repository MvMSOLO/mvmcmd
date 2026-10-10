# Phase 20 — Release Candidate → Demo → Instagram Launch

## Status

**IN PROGRESS — release preparation is implemented; public-release qualification remains open.**

The pre-icon code candidate at `f8be99acee8cb87c39fdff4c81241e75b7b99d91` passed both platform workflows. The next prepared commit adds a dedicated Windows icon, makes that icon part of the mandatory metadata gate, adds the root README/release documents, and avoids rebuilding the entire app for Markdown-only edits. **Those new commit changes must pass CI before being considered the validated candidate.**

This phase must not be marked complete merely because CI is green. Android artifacts are debug APKs, not signed production releases. Real product screenshots/video and physical-device qualification are still required before public launch claims.

## Release-candidate work

- [x] Align Android `versionName` with the desktop/package version (`1.0.0`).
- [x] Add a CI release metadata gate for semver/version consistency, Android IDs/labels/launcher/backup policy, desktop identity, Windows x64 target, required app entry points, and required icon configuration.
- [x] Derive a Windows `.ico` from the existing MVMCMD favicon artwork and configure Electron Builder to use it instead of the generic default icon.
- [x] Prepare a root README, release notes, known limitations, privacy/permission explanation, a 60-second demo shot plan, a screenshot capture checklist, and draft Instagram launch copy.
- [x] Preserve the Phase 19 boundary: software/CI acceptance is complete; OEM and physical-device qualification remains open.
- [ ] Confirm APK and EXE workflows pass on the descendant candidate commit that contains the Windows icon and release documentation.
- [ ] Complete a real-device permission/first-run and core-flow session.
- [ ] Capture authentic screenshots and a real vertical demo video from the installed build.
- [ ] Complete signing, privacy-policy review, and release approval before public distribution.

## Verified baseline CI evidence

- **Baseline source:** [`f8be99acee8cb87c39fdff4c81241e75b7b99d91`](https://github.com/MvMSOLO/mvmcmd/commit/f8be99acee8cb87c39fdff4c81241e75b7b99d91).
- **Windows portable EXE — SUCCESS:** [run 38029787174](https://github.com/MvMSOLO/mvmcmd/actions/runs/38029787174). All 22 job steps passed: typecheck, release metadata gate (14 checks), 99 project tests (99 pass / 0 fail), web bundle, portable EXE, EXE verification, packaged launch smoke, final gate, and artifact upload.
- **Windows baseline artifact:** [`mvmcmd-windows-exe-444`](https://github.com/MvMSOLO/mvmcmd/actions/runs/38029787174/artifacts/11661388533), 133,930,255 bytes. SHA-256 of the artifact archive: `0fff6cb5acd3131be29b55146daad8e616b0f6947ac921b600947ef032e2b19c`. Expires 2026-10-24.
- **Android debug APK — SUCCESS:** [run 38029787175](https://github.com/MvMSOLO/mvmcmd/actions/runs/38029787175). All 33 job steps passed: release metadata gate (14 checks), 99 project tests (99 pass / 0 fail), APK build/integrity, exact 17-wallpaper payload hashes, emulator install/launch, isolated core native-activity instrumentation, final gate, and artifact upload.
- **Android baseline artifact:** [`mvmcmd-debug-apk-726`](https://github.com/MvMSOLO/mvmcmd/actions/runs/38029787175/artifacts/11661084409), 22,291,868 bytes. SHA-256 of the artifact archive: `0d8135e15e63ab4d08df35ca1565a643e3157ddf74a46d40ee13f08577e0e9db`. Expires 2026-10-24.
- **Important evidence boundary:** these two runs verify the `f8be99a` baseline before the custom Windows icon was wired into Electron Builder. The icon/release-doc descendant requires its own green workflows; baseline success is not substituted for that check.
- **Dependency audit:** both baseline platform gates passed with no high or critical advisories. The last recorded audit showed 7 moderate advisories and 0 high/critical advisories. That does not mean the dependency tree is vulnerability-free; re-check audit output before distribution.

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
| Android/desktop version metadata aligned | PASS in baseline; enforced by CI gate |
| Android and Windows baseline CI | PASS on `f8be99a`; descendant candidate rerun required |
| Windows custom icon configured | Prepared; descendant CI result pending |
| Root README and release documentation | Prepared in the pending descendant commit |
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
