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

The React shell owns presentation and input. Business rules stay in `src/lib/mvm`. Native Android behavior is isolated behind the Capacitor plugin. The Windows application host embeds the already-built web output instead of duplicating the web application.

Database access is server-only through `src/lib/db.ts`. Production uses Neon when `DATABASE_URL  exists; preview can use the PGLite fallback.

Build-time database migration is deliberately separated from the static web/Android build so an APK build cannot unexpectedly mutate a remote database.
