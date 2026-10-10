# MVMCMD — Known Limitations for the Internal Candidate

- The Android CI package is a debug APK; production signing is implemented as a separate manual workflow but has **not** been run. The first signed release requires reviewed code merged to `main` and four repository Actions secrets.
- Windows CI packages a portable x64 EXE and checks that it starts and remains alive during a short smoke window. That is not a substitute for end-to-end acceptance on a range of Windows installations.
- Android CI instrumentation runs on a hosted emulator. Physical tests on Samsung/One UI, Xiaomi/Redmi/POCO/HyperOS or MIUI, and Pixel/AOSP devices remain open.
- Manufacturer-specific restricted-setting prompts, background process termination, camera behavior, and notification access require direct device verification.
- The real screenshot set and vertical product demonstration have not yet been recorded from a physical device. CI/emulator captures, mockups, and generated media must not be labelled as physical-device evidence.
- Battery and thermal measurements have not been recorded. Do not advertise a battery, heat, speed, RAM, FPS, or “booster” improvement without repeatable measurements.
- `npm audit` in both candidate platform workflows reported seven moderate package nodes caused by the same `sprintf-js` advisory in the optional Electron build-tool chain. No patched upstream release was available at the 2026-10-10 review. This is documented in [the dependency advisory review](DEPENDENCY-ADVISORY-REVIEW.md). A production-only audit gate is being added; this does not erase the build-tool findings.
- The privacy review is source-based and remains a draft. Notification history can store up to 120 entries including detected codes; actual public-build network destinations, retention and data-controller details need sign-off. See [Privacy and Permissions](PRIVACY-AND-PERMISSIONS.md).
- An external application opening or a system Intent being requested is normally only a `STARTED` result until the application can observe evidence of completion.

See [the Phase 19 device validation plan](../updatephase20/PHASE-19-DEVICE-VALIDATION.md) and [the Phase 20 release checklist](../updatephase20/PHASE-20.md).
