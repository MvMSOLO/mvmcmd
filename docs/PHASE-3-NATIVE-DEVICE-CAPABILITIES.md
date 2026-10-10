# MVMCMD — Phase 3 Native Device Capabilities

## Goal

Expose a truthful, reusable Android device-intelligence snapshot for future MVM actions, without inventing telemetry or requiring unrelated permissions.

## Native engine

The `MvmDevice` Capacitor plugin reads:

- Device manufacturer/model/Android SDK/release/ABI
- CPU core count, architecture and best-effort current CPU load
- Total/available/used RAM
- Internal data storage total/available/used
- Battery percentage, charging state, health and battery-reported temperature
- Android thermal status
- Display resolution, density, refresh rate and reported GLES version
- Active network transport and metered/VPN state
- Bluetooth availability and current state; reports permission-required instead of guessing when Android restricts access
- Audio mode, music volume and ringer mode
- Available hardware sensors

## Public MVM surface

`device` command (aliases: `hardware`, `monitor`, `device-info`) reads the native snapshot asynchronously and renders the current values.

The command is Android-native only. Desktop/PWA does not pretend to have native telemetry.

## Truth rules

1. Missing Android data is represented as unknown/unavailable, never fabricated.
2. Battery temperature is explicitly battery temperature; it is not mislabeled as CPU temperature.
3. Android thermal status is reported separately from temperature.
4. CPU load is best-effort and omitted if the platform cannot provide a valid sample.
5. Bluetooth reports `permission_required` when Android requires a runtime access that MVMCMD has not been granted.
6. No background telemetry loop is introduced in Phase 3; `device` is an on-demand snapshot.
7. The engine does not silently request new permissions.

## Architecture

```
MVM command
   ↓
runDeviceRequest()
   ↓
MvmDevice Capacitor bridge
   ↓
Android system APIs
   ↓
typed DeviceSnapshot
   ↓
UI / future Device Intelligence consumers
```

## Phase 3 acceptance

- [x] Native device plugin exists and is registered.
- [x] Typed JS snapshot API exists.
- [x] Device identity and ABI data.
- [x] CPU/core/load data.
- [x] RAM data.
- [x] Storage data.
- [x] Battery + battery temperature.
- [x] Thermal status.
- [x] Display + refresh rate + GLES version.
- [x] Network state.
- [x] Bluetooth state.
- [x] Audio state.
- [x] Sensor inventory.
- [x] `device` command integration.
- [x] No silent permission request.
- [x] Final APK CI success on the verified Phase 3 implementation commit.
- [x] Final EXE CI success on the verified Phase 3 implementation commit.

## Future consumers

Phase 4+ can consume this snapshot for intent understanding, capability-aware planning, verification, adaptive gaming, battery-aware actions and thermal-safe workflows.
