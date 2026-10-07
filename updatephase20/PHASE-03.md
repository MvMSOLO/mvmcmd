# Phase 03 — Native Device Capability Engine

## Status
COMPLETED.

## Goal
Expose real device information through a reusable native Android boundary.

## Delivered
- Device manufacturer/model/hardware.
- Android SDK/release and supported ABIs.
- CPU core count and best-effort CPU load.
- RAM total/available/used and low-memory state.
- Storage total/available/used.
- Battery percentage, charging/plugged state, temperature and health.
- Android thermal status.
- Display dimensions, density, refresh rate and GLES information.
- Network connectivity, Wi-Fi/cellular/ethernet/VPN and metered state.
- Bluetooth availability/state with Android permission requirements.
- Audio mode/volume/ringer information.
- Sensor availability.

## Truth model
“Best effort” data is labeled as such. Missing platform data is not converted into a guessed number.

## Acceptance
- Native data is exposed through a reusable bridge.
- Commands consume the bridge instead of duplicating native queries.
- Permission-gated values report their real access state.
- APK and EXE CI succeed.

## Dependencies
Phase 2 capability core.
