# Phase 19 — Physical Device & Battery Validation

**Status: NOT RUN — requires physical Android devices and the owner's authorization to use them.**

The automated GitHub Actions environment cannot truthfully verify manufacturer-specific permission settings, background process killing, camera optics, thermal behavior, or real-world battery impact. These checks stay open until run on actual devices. Do not mark this checklist green from emulator evidence alone.

## Test record

For each test, record date/time, tester, phone model, Android/firmware build, app commit, APK artifact, battery health/charge, network state, and result. Attach screenshots or logs with secrets and personal information removed.

| Device family | Device / Android build | App commit / APK | Core flows | Background / permission checks | Battery test | Result |
|---|---|---|---|---|---|---|
| Samsung / One UI | Not provided | — | NOT RUN | NOT RUN | NOT RUN | BLOCKED: device required |
| Xiaomi / Redmi / POCO / HyperOS or MIUI | Not provided | — | NOT RUN | NOT RUN | NOT RUN | BLOCKED: device required |
| Google Pixel / AOSP | Not provided | — | NOT RUN | NOT RUN | NOT RUN | BLOCKED: device required |

## Core-flow checklist (run on every available device)

- [ ] Install the signed-off APK from the same commit being assessed; cold-launch, background/foreground, rotate if supported, and relaunch after process eviction.
- [ ] Camera: permission granted/denied, rear/front camera, photo capture, video start/stop, flash-unavailable path, gallery preview, save verification, and microphone denial for video audio.
- [ ] QR/barcode: live scan, invalid/unsupported code, permission denied, and scan-from-image fallback.
- [ ] Wallpaper: browse all 17 original scenes, preview, set home wallpaper, invoke the native lock-wallpaper flow, and verify persistence after reboot.
- [ ] English Lab / English Studio: adaptive practice, saved progress after relaunch, grammar checker, voice recognition unavailable/denied paths, text-to-speech, and timed IELTS screens.
- [ ] Notifications: demo timeline, code copy, clear history, live notification access granted/denied, restricted-settings guidance, and no exposure of notification text in diagnostic logs.
- [ ] Commands and entry points: app/open/share intents, invalid URI handling, QR shortcut/tile, and explicit confirmation before a side-effecting action.
- [ ] Reduced motion enabled/disabled; verify decorative 3D items do not trigger unintended actions.
- [ ] Exercise airplane/offline mode and restore connectivity; confirm truthful fallback states and no duplicate side effects.

## Battery and thermal protocol

1. Use the same device, firmware, screen brightness, refresh-rate setting, network state, volume, and starting charge for a baseline run and the MVMCMD run. Record these conditions; do not compare unlike sessions.
2. Let the device cool to a stable idle state. Record starting charge and device temperature from available Android diagnostics. Run a 30-minute idle baseline with the app closed.
3. Repeat for 30 minutes with MVMCMD open on its home screen, then a separate 30-minute run using the camera preview and a separate run with the 3D wallpaper preview. Do not leave camera capture or a permission prompt active unnecessarily.
4. Record ending charge, elapsed time, temperature, screen state, and any Android battery-statistics output. Repeat each scenario at least three times and report the median; label the result as a device-specific observation, not a universal battery claim.
5. Compare the app run with baseline and retain the raw logs. Do not infer mAh or percentage-per-hour from one short run, and do not claim a target was met without repeatable measurements.

## Sign-off

- Device matrix: **OPEN**
- Battery / thermal measurements: **OPEN — no physical measurements have been made**
- OEM restricted-permission and background-kill behavior: **OPEN**
- Automated APK/EXE CI: see [PHASE-19.md](PHASE-19.md); CI success does not close these device-only checks.
