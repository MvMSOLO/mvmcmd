# Phase 20 — Release Candidate → Demo → Instagram Launch

## Status

**IN PROGRESS — Android and Windows CI pass, and release controls are prepared. Public-release qualification remains open.**

Validated app-source commit: `c81e625c945f50e582ecbc7322060928333b3969`. Both platform workflows passed on this exact code commit, including the new production-only dependency audit. This document update is documentation-only and does not alter that tested app source.

CI does not substitute for OEM phone tests, real media capture, secrets provisioned by the release owner, or public-release/privacy approval. The current Android artifact is a **debug APK**, not a signed production APK.

## Completed in this pass

- [x] Verified Windows portable EXE creation, integrity checks, launch smoke and artifact upload.
- [x] Verified Android debug APK creation/integrity, the exact 17 wallpaper payloads, emulator install/launch and isolated core native activity tests.
- [x] Passed 99 project tests on both platform jobs (99 passed / 0 failed).
- [x] Passed the release metadata gate on 15 checks for both platforms.
- [x] Added `npm audit --omit=dev` to Android and Windows CI. Both candidate runs reported 0 known production dependency advisories.
- [x] Added a manual, main-only signed Android APK workflow with keystore inputs sourced from repository Actions secrets.
- [x] Improved the signed workflow so it restores/verifies the 17 wallpaper assets, verifies the payload after packaging, verifies the APK signature, rejects a detected debug certificate and records the signing-certificate SHA-256 and APK SHA-256.
- [x] Reviewed the Android manifest, privacy-sensitive notification storage, network/auth integration surfaces and release disclosure; recorded open owner/legal review items.
- [x] Documented the seven moderate development/build-tool audit nodes and their upstream advisory rather than suppressing the audit or blindly downgrading the Electron builder chain.

## Current candidate CI evidence

- **Source commit:** [`c81e625c945f50e582ecbc7322060928333b3969`](https://github.com/MvMSOLO/mvmcmd/commit/c81e625c945f50e582ecbc7322060928333b3969).
- **Windows portable EXE — SUCCESS:** [run 38031931178](https://github.com/MvMSOLO/mvmcmd/actions/runs/38031931178). 22/22 job steps passed; release metadata gate 15/15; 99 tests passed / 0 failed; EXE packaging, executable verification, packaged-launch smoke and artifact upload passed.
- **Windows artifact:** [`mvmcmd-windows-exe-449`](https://github.com/MvMSOLO/mvmcmd/actions/runs/38031931178/artifacts/11662456587), 133,931,621 bytes. Archive SHA-256: `6398784acd38cdeb6aee5f8663d8ff119f756a3ce8689d591318cbc964496df7`. Expires 2026-10-24 06:48:50 UTC.
- **Android debug APK — SUCCESS:** [run 38031931196](https://github.com/MvMSOLO/mvmcmd/actions/runs/38031931196). 33/33 job steps passed; release metadata gate 15/15; 99 tests passed / 0 failed; APK integrity, exact 17-wallpaper payloads, emulator install/launch and isolated core native activity tests passed.
- **Android artifact:** [`mvmcmd-debug-apk-731`](https://github.com/MvMSOLO/mvmcmd/actions/runs/38031931196/artifacts/11662766161), 22,291,867 bytes. Archive SHA-256: `a2054d478c9ec8dc320f231acc8d71fd1d0cbd641bd01ad12ce5303577cc29d4`. Expires 2026-10-24 06:51:11 UTC.
- **Full dependency audit:** 7 moderate, 0 high, 0 critical. The seven nodes are one build-tool dependency chain rooted in [GHSA-hp3w-g68c-fv3c / CVE-2026-97058](https://github.com/advisories/ghsa-hp3w-g68c-fv3c), affecting `sprintf-js` through 1.1.3. At the 2026-10-10 review the advisory database showed no patched version; [upstream issue #237](https://github.com/alexei/sprintf.js/issues/237) remained open and [npm listed 1.1.3 as latest](https://www.npmjs.com/package/sprintf-js?activeTab=versions). The finding is documented and not suppressed.
- **Production-only dependency audit:** `npm audit --omit=dev` was `total=0` on both platform runs. This means npm reported no known advisories for that selected production dependency tree; it does not prove the application has no security defects.
- **Artifact limitation:** GitHub run artifacts have finite retention; archive SHA-256 values above provide integrity references but are not a permanent hosting plan.

## Signing readiness

The manual workflow is [`.github/workflows/android-production-release.yml`](../.github/workflows/android-production-release.yml); the step-by-step runbook is [`ANDROID-PRODUCTION-SIGNING.md`](../release/ANDROID-PRODUCTION-SIGNING.md).

To produce a signed APK, the release owner must create/protect a keystore, configure `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD` as GitHub Actions **secrets**, review and merge the candidate into `main`, then manually dispatch the workflow on `main`. Those secrets are not available to this session, so **no signed production APK has been produced or claimed**. The workflow has not yet run.

## Privacy review

The source-based review is in [`PRIVACY-AND-PERMISSIONS.md`](../release/PRIVACY-AND-PERMISSIONS.md). It records the current Android permission declarations, notification listener access and a local history bounded to 120 entries, as well as questions about FileProvider scope, active network integrations, retention, the data controller and legal basis.

**Privacy/legal approval remains open.** Do not claim the application is wholly local or “collects no data” until the exact distribution configuration and destinations have been audited and the owner supplies the missing policy/contact/jurisdiction decisions.

## Explicit remaining blockers

1. **Real phone/OEM tests — OPEN.** Samsung/One UI, Xiaomi/Redmi/POCO/HyperOS or MIUI, and Pixel/AOSP permission, background, camera, notification and wallpaper behavior require physical devices. Emulator evidence does not close this.
2. **Real screenshots and vertical demo — OPEN.** The checklist and 60-second script are ready, but capture must come from the installed app. No phone/camera feed was available to this session; no fabricated screenshot or generated promo has been presented as real product evidence. Use synthetic notification content.
3. **Signed production APK — OPEN.** Workflow is prepared; the release owner still needs to provision secrets and authorize a reviewed merge/dispatch.
4. **Development-tool advisory — OPEN.** Track upstream fix for `sprintf-js` and validate the updated lockfile/builder after it is available. Do not downgrade `electron-builder` blindly: its advisory chain includes a separate high-severity AppImage fix requiring `app-builder-lib >=26.15.0` ([GHSA-7g7r-gx96-252g](https://github.com/electron-userland/electron-builder/security/advisories/GHSA-7g7r-gx96-252g)).
5. **Privacy and release-owner sign-off — OPEN.** Final policy, real contact/controller details, retention, distribution-channel rules, final artifact review and marketing approval require owner decisions.

## Acceptance ledger

| Requirement | State |
|---|---|
| Android debug APK / Windows EXE candidate CI | PASS on `c81e625` |
| 99 tests on each platform | PASS, 0 failures per job |
| Production-only dependency audit | PASS, 0 known advisories reported on each platform |
| Seven moderate development/build-tool nodes reviewed | REVIEWED / TEMPORARY RISK OPEN |
| Signed-release workflow and guide | PREPARED; not run |
| Physical-device/OEM matrix | OPEN |
| Real screenshot/video capture | OPEN |
| Final privacy/legal and release-owner approval | OPEN |

## Non-negotiable launch rules

- A requested intent, app launch, or animation is not proof of completion.
- Preserve the difference between `STARTED`, `VERIFIED`, `RECOVERED`, and failure states.
- Do not claim improved battery, thermals, RAM or FPS without repeatable device measurements.
- Do not mark Phase 20 closed until the remaining evidence and approval above are recorded.
