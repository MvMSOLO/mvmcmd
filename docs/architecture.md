# Architecture

    UI
     ↓
    Command Engine
     ↓
    Platform / Native Adapter
     ↓
    Android APIs

    UI
     ↓
    WebRTC Manager
     ↓
    /api/rtc signaling
     ↓
    Direct WebRTC transport

The React shell owns presentation and input. Business rules stay in `src/lib/mvm`. Native Android behavior is isolated behind the Capacitor plugin. The Windows host embeds the already-built web output instead of maintaining a second application UI.

Database access is server-only through `src/lib/db.ts`. Production uses Neon when `DATABASE_URL` exists; preview can use the PGLite fallback.

Build-time database migration is deliberately separated from the static web/Android build so an APK build cannot unexpectedly mutate a remote database.

## Platform boundaries

Browser/desktop behavior is represented by runtime/platform adapters; Android-only operations are routed through the native launcher rather than being implemented as fake browser UI.

## Versioning

The package version is used as the application version source and is synchronized into Android `versionName`, an Android `versionCode` derived from the major version, and the Windows executable metadata.
