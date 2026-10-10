# Phase 16 — Global Entry Points

## Status
COMPLETED — implementation and focused test coverage are committed on code commit [6f74881d8fb50d27fb31530f528feacaa612358a](https://github.com/MvMSOLO/mvmcmd/commit/6f74881d8fb50d27fb31530f528feacaa612358a). Android APK and Windows portable EXE builds, verifications, final success gates, and artifact uploads succeeded.

## Goal
Make MVM CMD reachable from useful Android and desktop entry points without duplicating command logic.

## Scope
- App shortcut.
- Notification/quick action entry where appropriate.
- Share target.
- File open/share integration.
- Deep links.
- Android intent entry.
- Desktop launcher/tray or equivalent supported entry.
- Global command input where platform permissions permit.

## Rules
Every entry point funnels into the same command router. Registration must be explicit and revocable. Background behavior must obey platform restrictions.

## Acceptance
- Entry points resolve to canonical commands.
- No duplicated execution path.
- Permission requirements are visible.
- Android and Windows behavior remain platform-appropriate.
- APK and EXE CI succeed.

## Dependencies
Phases 5, 9, 14 and 15.


## Implementation delivered
- Android launcher shortcuts for QR, Camera, English Lab and Notification use the registered `mvmcmd://command/<allow-listed-command>` route.
- Android intent intake accepts supported command deep links, shared text/files, and supported file-open intents via the registered `MvmEntryPoint` Capacitor plugin. Incoming commands and shared content are staged in the existing command dock for the user to review; they are not auto-executed.
- Android file handoff requires a scoped external `content://` URI and read-only grant. Private app paths and the app's own FileProvider URI are rejected.
- The QR Quick Settings tile routes through the shared command dock instead of bypassing the canonical command router.
- Windows desktop uses the registered `mvmcmd` protocol, a single-instance handoff, safe file-argument staging, a tray menu, and `Ctrl/Command+Shift+M` to focus the command input.
- Desktop file handoff validates a local file URL, file existence/type and reports only system-handler acceptance; it does not claim external document handling was verified.
- The new global-entry normalizer and focused tests cover command allow-listing, review-before-Launch behavior, shared-text staging, Android scoped URIs, local desktop file URLs, and malformed entries.
- Both platform workflows now verify the desktop main/preload scripts and execute `global-entry-points.test.ts` alongside the existing focused MVM tests.

## Final CI acceptance evidence
- Android APK: [run 37904252074 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37904252074). Typecheck, global-entry source guard, focused MVM tests, web bundle, wallpaper checks, Gradle APK build, APK verification, final success gate, and artifact upload passed.
- Windows EXE: [run 37904252142 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37904252142). Typecheck, desktop bridge verification, focused MVM tests, web build and bundle verification, portable EXE creation, EXE verification, final success gate, and artifact upload passed.
- APK artifact: `mvmcmd-debug-apk-649`, 22,278,952 bytes, artifact ID `11604255010`, SHA-256 `d6b54905927582a3cb8d7be10c32dfd33a21597c30f249d636618f39778fd237`.
- Windows artifact: `mvmcmd-windows-exe-367`, 133,921,224 bytes, artifact ID `11604067694`, SHA-256 `007d1510c7ed8c60cadd89c16f3f25c83e0f54fd26ba337cf74f5060cc68f81b`.
- CI validates builds and focused automated coverage. It does not replace testing incoming Android intents on a physical device or testing the built portable EXE interactively on Windows.

All Phase 16 acceptance items are met for the committed implementation.
