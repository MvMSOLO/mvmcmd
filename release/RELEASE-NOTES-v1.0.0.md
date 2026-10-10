# MVMCMD 1.0.0 — Internal Release Candidate Notes

**Distribution status:** internal CI candidate only. This is not a signed, public production release.

## What is included

- A command-driven MVMCMD app shell with explicit action-state reporting.
- Native Android camera and QR entry points, including the QR image-selection fallback.
- Wallpaper browsing and native wallpaper hand-off.
- English Lab and English Studio entry points.
- Notification-center entry points and user-controlled notification-listener access.
- App/deep-link/share bridge and Android global-entry integrations.
- Security, compatibility, command-regression, and performance-contract test coverage.

## Verification boundary

The CI workflows build the Android APK and Windows portable EXE, run automated tests, and perform platform-specific launch smoke checks. Android instrumentation is emulator evidence, not proof of behavior on every OEM phone.

MVMCMD must distinguish an action that has **STARTED** from one that has been **VERIFIED**. Do not interpret a UI animation, external app launch, or requested Android Intent as proof that the final operation succeeded.

## Release blockers and known limits

- The Android CI artifact is a debug APK; CI does not configure a production signing key or store-release process.
- Samsung/One UI, Xiaomi/Redmi/POCO/HyperOS/MIUI, and Pixel/AOSP physical-device validation remains open.
- OEM permission restrictions, background process behavior, battery drain, and thermal impact have not been measured on physical devices.
- The latest Phase 19 dependency audit recorded seven moderate advisories and zero high or critical advisories. This is not a vulnerability-free dependency tree; inspect current CI audit output before distributing.
- The real product screenshots and a real vertical demo video still need to be captured from a running build. Do not substitute mockups or fabricated results.

## CI artifacts

Use the APK and EXE artifacts attached to the matching successful GitHub Actions runs on the release-candidate commit. Workflow artifacts expire according to the workflow retention policy (14 days), so they are not permanent download links. Do not publish the release until signing, physical-device qualification, media capture, and final review are complete.

Repository: https://github.com/MvMSOLO/mvmcmd
