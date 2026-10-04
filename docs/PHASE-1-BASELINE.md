# MVMCMD — Phase 1 Baseline

Date: 2026-10-04
Baseline commit: f2cad4e29d25497cda0fa46c7454084424dad825
Baseline branch source: feat/design-10-14-performance-signal-physical
Phase branch: phase/01-foundation-baseline

## Phase 1 objective

Freeze the current product state, document the real architecture, identify real versus partial versus missing behavior, and establish the contract that Phase 2 must satisfy.

## Current product shape

MVMCMD is a Capacitor Android application with a React/TypeScript command-shell UI and a native Android launcher/plugin layer.

Web: React 19, TanStack Router/Start, TypeScript, Tailwind, command parser, fuzzy matching, app catalog, aliases/history, permission gate, premium shell and motion system.
Native Android: Capacitor 8, compile/target SDK 36, custom MvmLauncher plugin, native camera, QR/barcode scanner, wallpaper gallery/live wallpaper service, notification center/listener/copy flow, English/IELTS activities, photo/video post-processing, PackageManager launch/store/url actions.
Desktop: Electron portable Windows delivery exists.

## Capability inventory

| Capability | Current state | Classification |
| --- | --- | --- |
| App launch | Static catalog + fuzzy ranking + Android PackageManager bridge | Real, future orchestration needed |
| Camera | MvmCameraActivity + CameraX/Media3 processing | Real |
| QR/barcode | MvmQrActivity + ML Kit + Quick Settings tile | Real |
| Wallpaper | Gallery + renderer + live wallpaper service | Real |
| Notifications | Native notification center/listener/copy receiver | Real, access-sensitive |
| English Lab | Native English + English Studio activities | Real |
| Photo processing | Native PhotoProcessor | Real |
| Video processing | Native VideoPostProcessor | Real |
| 3D | MVM 3D asset integration | Real UI feature |
| Motion | 30 integrated motion recipes | Real UI feature |
| PWA/install | Install prompt/browser flow | Partial/platform-dependent |
| Device intelligence | Limited current runtime/system info | Incomplete |
| Gaming optimization | Game catalog exists | Missing as real engine |
| Natural-language intent planning | Fixed command parser + fuzzy launch | Missing |
| Multi-step task planning | No generic task graph | Missing |
| Generic action verification | No central verification engine | Missing |
| Capability manager | Only storage/notification state exists | Missing |
| Full permission onboarding | Current gate is storage/notification/install | Missing |
| Contextual conversation | History exists, conversational context does not | Missing |
| Voice/assistant entry | Not implemented | Missing |

## Important architecture findings

### Command layer

src/lib/mvm/commands.ts is a deterministic command parser. It supports commands such as camera, qr, wallpaper, open, find, perm and install. This is a good deterministic base, but it is not yet the planned MVM Intelligence layer.

### Permission layer

src/lib/mvm/permissions.ts currently handles browser notification permission and persistent browser storage. src/components/mvm/gate.tsx asks for storage, notifications and PWA installation.
The Android manifest declares native and special permissions, but there is no canonical capability registry/state machine tying access, readiness, handlers and verification together.

### Result truth

Native package launch can resolve a launch request before the underlying asynchronous PackageManager work has finished. The product therefore needs a future lifecycle that separates requested, started, completed and verified.

### Catalog

src/lib/mvm/catalog.ts already contains a broad app catalog across social/chat, media, games, Google, browsers, system, finance and shopping. Phase 9 should evolve this into a capability-aware registry instead of creating a second unrelated catalog.

### Motion

MOTION_INTEGRATION.md records 30 motion recipes wired to real surfaces with reduced-motion support. Phase 1 protects this system and future action/task states should reuse the same visual language.

## Android permission surface observed

Current manifest includes CAMERA, SET_WALLPAPER, RECORD_AUDIO, READ_CONTACTS, POST_NOTIFICATIONS, SYSTEM_ALERT_WINDOW, PACKAGE_USAGE_STATS, WRITE_EXTERNAL_STORAGE up to SDK 28 and INTERNET.

Declared permission is not the same as a ready capability. Future state must distinguish declared, granted, special-access-ready, unavailable, restricted and verified.

## Product integrity rules

1. No fake success.
2. No fake permission state.
3. No fabricated FPS gains or cleanup numbers.
4. No hidden permission acquisition.
5. User can skip optional onboarding capabilities.
6. Once a capability is granted, normal execution must not unnecessarily re-prompt.
7. Sensitive/destructive actions use the appropriate confirmation or platform-approved flow.
8. Unsupported Android operations return a truthful limitation and the safest supported fallback.
9. Long-running actions provide immediate feedback.
10. Motion communicates state/progress instead of adding artificial waiting.
11. Existing real features must remain functional during migration.
12. Platform differences are modeled as capabilities, not assumptions.

## Current CI baseline

The most recent successful Android and Windows workflow runs inspected for the current working line are Android run 37211763991 and Windows run 37211764012. Both are successful and were built from commit f2cad4e29d25497cda0fa46c7454084424dad825.

## Phase 1 exit condition

Phase 1 is complete when the current architecture is documented, capability gaps are explicit, future contracts are documented, no existing feature is removed, and the branch passes the regression gate.

## Phase 2 handoff

Phase 2 must implement a canonical MVM Capability Core. The current permissions.ts and PersistedState permission fields are legacy inputs to that migration, not the final architecture.