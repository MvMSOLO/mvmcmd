# MVMCMD

MVMCMD is a cross-platform command terminal for launching installed apps, Android packages, the native CameraX camera, and browser surfaces.

## Build

Requirements: Node 22, Java 21 for Android, Android SDK API 36, and Go 1.25 for the Windows launcher.

    npm ci
    npm run typecheck
    npm test
    npm run lint
    npm run build:web
    npx cap sync android
    cd android
    ./gradlew clean
    ./gradlew :app:assembleDebug

The web build is intentionally separate from database deployment migrations. Use `npm run build:production` only when a deployment is expected to apply DATABASE_URL migrations.

## GitHub Actions

The production workflow builds three jobs from one verified web bundle:

- Web bundle validation
- Android debug APK
- Windows x64 EXE

Android uses Capacitor + the existing native CameraX/Media3 implementation. The Windows artifact is a real Go executable that embeds the built web application, starts a localhost host, and opens the application in an isolated Edge app window when Edge is available. It is not a mock application.

Every platform artifact is checked for its native file format, embedded/built content, version metadata, and SHA-256 manifest before upload.

## Android

Package ID: `com.mvmcmd.launcher`.

The native launcher exposes camera and package operations through a Capacitor plugin. Arbitrary Android package binding uses Android PackageManager metadata rather than a fake catalog row.

## Camera

The camera implementation is native CameraX/Media3. Resolution and FPS are capability-driven; requested 4K/60 FPS can fall back to the highest supported device mode. Photo reconstruction must be described as reconstruction/upscaling where source detail is insufficient for genuine 4K detail.

## Commands

Use `help` in the app for the current command list. Important commands include `open`, `find`, `ls`, `bind`, `unbind`, `refresh`, `pack`, `store`, `camera`, `perm`, and `reset`.

## WebRTC

P2P signaling is provided by `/api/rtc` and persisted through the project SQL abstraction. The client authenticates its signaling session with a random per-room token, validates payload sizes, and reports connection state/RTT. TURN is supplied at runtime by server environment variables.

## Environment

Copy `.env.example` to the environment used by the deployment. Secrets are never committed.

See:

- [Architecture](docs/architecture.md)
- [Android](docs/android.md)
- [Camera](docs/camera.md)
- [Commands](docs/commands.md)
- [WebRTC](docs/webrtc.md)
- [Testing](docs/testing.md)
