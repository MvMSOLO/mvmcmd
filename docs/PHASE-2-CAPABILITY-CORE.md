# MVMCMD — Phase 2 Capability Core

Branch: `phase/02-capability-core`

## Goal

Turn Android permissions/access into one truthful capability lifecycle that future actions can consume without hidden requests or fake success.

## Final lifecycle

```
Capability Registry
      ↓
Android Permission Adapter
      ↓
Runtime permission check
      ↓
Special Access check
      ↓
Request UI
      ↓
Persisted decision/state
      ↓
Re-check on resume / focus
      ↓
Real capability readiness
      ↓
Action guard
      ↓
Execute only when READY
```

## Implemented

- Canonical capability definitions and states.
- Native Android capability adapter through the Capacitor MvmLauncher plugin.
- Runtime permission checks for camera, microphone, contacts and notifications.
- Special-access checks for notification listener, overlay and usage access.
- Explicit Allow / Skip onboarding.
- One capability at a time during Android first-run setup.
- Native SharedPreferences persistence for access decisions and checked state.
- JS persistence/cache for capability snapshots.
- Automatic re-check when the app becomes visible/focused again after Android Settings.
- `perm` command now reports real native capability states on Android.
- `perm <capabilityId>` performs an explicit request only after the user issues the command.
- Camera, QR and Notification commands are blocked until their required capability is actually READY.
- Settings-required capabilities stop the action instead of reporting false success.
- Existing camera and QR activities remain compatible with the central gate as a final platform-level safety check.
- Notification Center no longer silently requests POST_NOTIFICATIONS when it opens.
- Web/PWA permission behavior remains separate from native Android capability readiness.

## Action requirements

| Action | Required capability |
| --- | --- |
| CAMERA | camera |
| QR | camera |
| NOTIFICATION | notification_listener |

The capability manager is intentionally reusable for later phases so the Action Engine and Skill Registry do not need to implement permission logic themselves.

## Integrity rules

1. No background or silent permission requests.
2. Skip is valid for optional first-run capabilities.
3. Granted access is not equivalent to READY until Android is checked again.
4. A denied/restricted capability never produces a successful action result.
5. Returning from system Settings triggers a fresh capability check.
6. Existing real features are preserved; Phase 2 wraps them instead of rewriting them.
7. Browser/PWA permission state never masquerades as native Android readiness.

## Regression acceptance

- TypeScript typecheck passes.
- Android web build passes.
- Native launcher source verification passes.
- Capacitor Android sync passes.
- Gradle debug APK compilation passes.
- APK payload verification passes.
- Windows portable EXE build passes.
- Existing wallpaper asset verification remains intact.

## Final status

Phase 2 implementation is complete when the latest Android APK and Windows EXE workflows both finish successfully on the final Phase 2 commit.
