# Phase 2 Acceptance — MVMCMD Capability Core

## Functional acceptance

- [x] Canonical capability registry exists.
- [x] Capability state distinguishes ready, denied, restricted, unavailable and error.
- [x] Android native adapter checks runtime permissions.
- [x] Android native adapter checks special access.
- [x] First-run Android setup is sequential and user-controlled.
- [x] Optional capabilities can be skipped.
- [x] Access decisions persist.
- [x] Capability snapshots persist locally.
- [x] Returning from Android Settings triggers re-check.
- [x] `perm` reports native capability state.
- [x] `perm <capabilityId>` explicitly requests one capability.
- [x] CAMERA is guarded by the camera capability.
- [x] QR is guarded by the camera capability.
- [x] NOTIFICATION is guarded by notification-listener access.
- [x] Settings-required capabilities stop the action instead of faking success.
- [x] Notification Center no longer requests POST_NOTIFICATIONS implicitly on open.

## Build acceptance

- Android APK workflow: final Phase 2 commit must be SUCCESS.
- Windows EXE workflow: final Phase 2 commit must be SUCCESS.
- Typecheck must pass.
- Existing native launcher source checks must pass.
- Existing wallpaper payload checks must pass.
- APK and EXE artifacts must be uploaded successfully.

## Regression rule

No existing camera, QR, wallpaper, English, notification UI, media processing, 3D or motion modules may be removed by Phase 2.
