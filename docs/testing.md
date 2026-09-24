# Testing

## CI

The cross-platform GitHub Actions workflow runs:

1. `npm ci`
2. dependency audit
3. `npm run build:web` without deployment-time database migration
4. TypeScript typecheck
5. ESLint
6. automated unit/contract tests
7. Capacitor sync
8. Gradle clean + Android debug APK build
9. APK signature/package/version/SDK/permission verification
10. Go module tests
11. real Windows x64 EXE build
12. Windows MZ/PE and embedded-bundle verification
13. final artifact download and cross-platform verification

The workflow is failed unless the web, Android and Windows jobs all succeed.

## Automated coverage

Current tests cover command parsing, aliases, catalog identifiers, Android package-name handling, persistence/migration behavior and unsafe URL rejection. The project test suite also covers auth gate/session contracts and app-data behavior.

## Android

CI can prove compilation, packaging, APK integrity and manifest metadata. A GitHub-hosted runner cannot provide a physical camera or sensor.

Manual/device validation is still required for real sensor resolution modes, 4K availability, 60 FPS support, autofocus, flash, stabilization, encoder profiles, thermal behavior, low-storage handling and lifecycle interruption.

## WebRTC

CI validates signaling and client state/validation code. Real NAT traversal, TURN relay selection, Wi-Fi/mobile handoff and two-device recovery require deployed network/device testing.

## Manual matrix

Exercise `open`, `find`, `ls`, `bind`, `unbind`, `pack`, `store`, camera/photo/video, permission flows, resolution/FPS fallback, persistence restart and WebRTC reconnect on low-end, mid-range and flagship Android devices where available.
