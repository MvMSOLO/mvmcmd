# MVMCMD — Command-Driven Android Utilities

MVMCMD is a command-driven Android app with a companion portable Windows build. It is designed to connect natural-language commands to real app/device actions while showing whether an action merely started or has actually been verified.

> **Current status: internal release candidate in progress.** CI builds and emulator checks are not a substitute for physical-device qualification. The Android CI artifact is a debug APK; do not treat it as a signed production release.

## Main areas

- **Command engine:** command parsing, action routing, task/goal planning, result states, and safe fallbacks.
- **Camera and QR:** native Android entry points, with QR image-selection fallback.
- **Wallpaper:** original wallpaper catalog and native Android wallpaper hand-off.
- **English tools:** English Lab and English Studio entry points.
- **Notifications:** demo/history views and optional Android notification-listener access.
- **Voice and global entry points:** capability-gated voice functionality, app shortcuts, share/intent bridges, and deep links.
- **Compatibility and security:** permission/capability checks, URL and file-hand-off validation, desktop IPC guardrails, reduced-motion support, and automated regression gates.

Actual availability depends on Android version, granted permissions, and manufacturer-specific restrictions. A declared permission does not prove that access is granted. MVMCMD must not report an external action as complete unless it has supporting evidence.

## Getting the current CI builds

Open the repository’s [Android APK workflow](https://github.com/MvMSOLO/mvmcmd/actions/workflows/android-build.yml) or [Windows EXE workflow](https://github.com/MvMSOLO/mvmcmd/actions/workflows/windows-build.yml), select a successful run on the release-candidate branch, and download that run’s artifact.

- Android CI outputs a **debug APK** for testing.
- Windows CI outputs a **portable x64 EXE** and performs a short launch smoke check.
- CI artifacts are temporary and expire according to workflow retention settings. They are not permanent release downloads.

Do not install artifacts from failed or cancelled runs. Before external distribution, a signed release package and release-specific review are required.

## Development and validation

The project uses Node.js, TypeScript/Vite, Capacitor Android, and Electron Builder.

    npm install --legacy-peer-deps
    npm run typecheck
    npm run build

The workflows contain additional phase-specific Node regression tests, native Android checks, Android emulator instrumentation, APK integrity checks, portable EXE packaging, launch smoke checks, and dependency-audit gates. Use GitHub Actions as the authoritative end-to-end build path.

## Permissions and privacy

Camera, microphone, contacts, Bluetooth, notification, usage-access, overlay, and other capabilities may require Android runtime permissions or separate special access, depending on the feature and OS version. Skip optional permissions that are not needed. Notification-listener access can expose notification content, so enable it only if you choose to use that feature. Review the [permission explanation](release/PRIVACY-AND-PERMISSIONS.md) before testing special access.

## Roadmap and release qualification

- [Master Phase 1–20 roadmap](updatephase20/README.md)
- [Phase 19 hardening and CI evidence](updatephase20/PHASE-19.md)
- [Physical-device qualification checklist](updatephase20/PHASE-19-DEVICE-VALIDATION.md)
- [Phase 20 release candidate, demo, and launch gates](updatephase20/PHASE-20.md)
- [Release notes](release/RELEASE-NOTES-v1.0.0.md)
- [Known limitations](release/KNOWN-LIMITATIONS.md)
- [60-second demo plan](release/DEMO-SCRIPT-60S.md)
- [Screenshot capture checklist](release/SCREENSHOT-CAPTURE-CHECKLIST.md)
- [Draft Instagram copy](release/INSTAGRAM-LAUNCH-COPY.md)

## Important release limitations

- Samsung/One UI, Xiaomi/Redmi/POCO/HyperOS or MIUI, and Pixel/AOSP physical-device validation remains open.
- Real battery and thermal measurements have not been taken; no universal battery, FPS, or thermal-improvement claim is supported.
- The latest documented dependency audit reported moderate advisories. Check the latest CI audit before distribution.
- Real product screenshots and vertical video must be recorded from a running build; marketing copy in the repository is draft material.

MVMCMD prioritizes truthful results over simulated “AI magic”.
