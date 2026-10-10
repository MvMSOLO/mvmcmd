# MVMCMD — Privacy and Permission Review (Draft; approval still required)

**Reviewed from source:** 2026-10-10, candidate app source `8218822ac033f6f05d5548b092f990431e28cae4`.  
**Status: SOURCE-BASED REVIEW PREPARED; not an approved public privacy policy.** The actual deployed endpoints, data controller/contact, regional/legal basis, retention requirements, and final installed-build network behavior require owner confirmation.

## Permission surface found in the Android manifest

| Permission / access | Apparent feature purpose | Required release review |
|---|---|---|
| Camera | Camera and QR flows | Check whether frames/files ever leave the device; inspect every permission-denied path. |
| Record audio | Voice and video-audio workflows | Verify whether audio is stored, sent, or discarded after each flow. |
| Read contacts | Contact-aware call/notification display | Confirm the exact lookup scope, user explanation, and that contacts are not logged or uploaded. |
| Post notifications | App-generated notifications | Respect Android runtime permission state and document user control. |
| Notification listener special access | Read notifications from other apps | Must be explicitly enabled in Android Settings; disclose that granting it lets MVMCMD read notification content. |
| Bluetooth connect / scan (scan capped to API 30 in manifest) | Bluetooth actions | Verify requested runtime permissions against each supported Android API and actual feature use. |
| Overlay / usage access (special access) | Interface or app-context features | Explain why each special access is needed and confirm it is not requested silently. |
| Legacy external storage (write, capped to API 28) | Older Android file workflows | Review actual storage destinations and compatibility fallback. |
| Set wallpaper | Native wallpaper hand-off | Confirm exactly which wallpaper operations are performed and when user confirmation is required. |
| Internet | Network-backed app/auth/connectors where configured | Map destinations and payload types for the final distribution build; do not claim the app is fully offline. |

The manifest also sets `android:allowBackup="false"`. The FileProvider is non-exported and grants URI access, but its configuration currently includes an external path of `.`; review each granted URI and narrow the path if broader access is unnecessary.

## Sensitive data behavior visible in source

### Notifications

The native notification listener reads other apps' notification title/body, looks for short numeric codes, and classifies call notifications. `MvmNotificationStore` persists up to **120** entries in app-private `SharedPreferences`, with app label, title, body, detected code, timestamp, call flag, and source key. This can include one-time passcodes or other private message contents. The store has a clear method; verify the user-facing clear-history flow on a physical device before release. Do not enable notification access for a user without a clear explanation and explicit OS-settings consent.

### Authentication and network integrations

The repository contains Better Auth code at same-origin `/api/auth/*`, optional federated authentication configuration, and server-only connector calls that can target `connectors.grok.me` or `connectors.app-builder-testing.com` depending on host/environment configuration. The exact integrations enabled in a public standalone APK/EXE, the data sent to each destination, and their retention are not fully established by the manifest alone. Confirm the final release build's feature flags and inspect network traffic with synthetic accounts before making a public disclosure.

The client auth code uses `sessionStorage` for a live-preview bearer token path; do not treat preview behavior as proof of production authentication or storage behavior. No blanket claim that “all data stays on device,” “nothing is collected,” or “no data is sent” is approved by this review.

## Storage and retention checklist

- [x] Android manifest reviewed for declared permissions, backup flag, and FileProvider scope.
- [x] Native notification store inspected; bounded to 120 entries per its source constant.
- [ ] Confirm whether notification items are cleared on uninstall, app reset, sign-out, and user-requested clear; record verified behavior.
- [ ] Review every file/photo export path and temporary cache path, including URIs granted to other apps.
- [ ] Inspect the exact public APK/EXE for outbound destinations, analytics/diagnostics, authentication mode, and any optional connector features.
- [ ] Define data retention and deletion for notification history, settings, auth sessions, and server-held records.
- [ ] Name the data controller, add a real contact address, choose applicable jurisdiction/legal basis, and publish an accessible final privacy policy.
- [ ] Verify the final text with the exact manifest and installed production candidate; re-review whenever permissions/features change.

## User-facing principles for the release

1. Explain the feature before requesting a runtime permission or opening special-access Settings.
2. Make optional capabilities skippable; a skip or denial must not be shown as “ready.”
3. Re-check permissions when the feature is used; Android/OEM policy can change availability.
4. If Android shows a restricted-settings warning, give supported navigation and a fallback. Never claim MVMCMD bypassed Android's restriction.
5. Use synthetic notifications and accounts in demonstrations. Hide personal content from screenshots, crash logs, and CI artifacts.
6. Report an operation as `STARTED` until there is actual evidence that it completed.
7. Do not publish until the unresolved checklist items are signed off. This file is an engineering review, not legal advice or a final privacy-policy statement.
