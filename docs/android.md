# Android

## Toolchain

Target configuration:

- Node 22
- Java 21
- compileSdk 36
- targetSdk 36
- minSdk 24
- Capacitor 8.x

The workflow runs `npm ci`, typecheck/tests/lint, builds the web bundle, runs Capacitor sync, cleans Gradle, builds the debug APK, verifies the APK with `apksigner` and `aapt2`, and uploads a manifest.

## Native launcher

`MvmLauncherPlugin` exposes:

- `openCamera`
- `inspectPackage`
- `openPackage`
- `openUrl`
- `openStore`

Package operations validate Android package identifiers and use Android PackageManager. Store fallback reports whether the fallback actually opened.

## Package visibility

Binding an explicitly named package uses PackageManager lookup for that package. The project does not require `QUERY_ALL_PACKAGES` just to bind a known package.
