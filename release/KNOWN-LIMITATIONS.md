# MVMCMD — Known Limitations for the Internal Candidate

- The Android CI package is a debug APK; no production signing/store-release configuration is present in the current workflow.
- Windows CI packages a portable x64 EXE and checks that it starts and remains alive during a short smoke window. That is not a substitute for an end-to-end user-acceptance session on a range of Windows installations.
- Android CI instrumentation runs on a hosted emulator. Physical tests on Samsung/One UI, Xiaomi/Redmi/POCO/HyperOS or MIUI, and Pixel/AOSP devices remain open.
- Manufacturer-specific restricted-setting prompts, background process termination, camera behavior, and notification access require direct device verification.
- Battery and thermal measurements have not been recorded. Do not advertise a battery, heat, speed, RAM, FPS, or “booster” improvement without repeatable measurements.
- Dependency auditing on the last documented Phase 19 candidate reported seven moderate advisories and no high/critical advisories. Re-check the live audit before public distribution; moderate advisories remain a known issue.
- The real screenshot set and vertical product demonstration have not yet been recorded. Marketing drafts are not launch-ready media.
- An external application opening or a system Intent being requested is normally only a STARTED result until the application can observe evidence of completion.

See [the Phase 19 device validation plan](../updatephase20/PHASE-19-DEVICE-VALIDATION.md) and [the Phase 20 release checklist](../updatephase20/PHASE-20.md).
