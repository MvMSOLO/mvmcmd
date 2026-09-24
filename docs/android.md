# Android

## Toolchain

Target configuration:

- Node 22
- Java 21
- compileSdk 36
- targetSdk 36
- minSdk 24
- Capacitor 8.x

The CI workflow installs locked dependencies, builds the web bundle, synchronizes Capacitor, cleans Gradle, builds the debug APK, verifies its signature and packaged metadata, then uploads the artifact.

## Native launcher

`MvmLauncherPlugin` exposes:

- `openCamera`
- `inspectPackage`
- `listInstalledApps`
- `openPackage`
- `openUrl`
- `openStore`

Package operations validate Android package identifiers and use PackageManager. Launch failures return explicit results and can fall back to Play Store/web when appropriate.

## Package visibility and discovery

Installed-app discovery uses `PackageManager.queryIntentActivities(ACTION_MAIN + CATEGORY_LAUNCHER)` and an explicit manifest `<queries>` entry for that launcher intent.

MVMCMD does not request `QUERY_ALL_PACKAGES`. The command engine briefly caches discovered launchable packages and merges them with the static catalog and persisted user bindings.

## Binding

`bind <package>` and `bind <package> <alias>` use real Android PackageManager inspection on Android. Bindings are persisted and can be revalidated with `refresh`.

## Camera

CameraX/Media3 remain the production native implementation. Capability-dependent 4K/60 FPS modes use actual device support and fallbacks rather than fixed claims.

## Device limitation

CI cannot verify physical camera sensors, real encoder combinations, flash/autofocus/stabilization, thermal limits, low-storage failures or interrupted lifecycle behavior. Those remain genuine physical-device tests.
