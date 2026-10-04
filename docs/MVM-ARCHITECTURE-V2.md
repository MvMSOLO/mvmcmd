# MVMCMD — Target Architecture v2

Introduced by Phase 1.

## Product model

MVMCMD is a device-first command/action layer. The user expresses a goal naturally; MVMCMD determines supported capabilities, creates a plan, executes supported actions and verifies the result.

Target flow:

INPUT -> UNDERSTAND -> INTENT/GOAL -> CONTEXT -> TASK PLAN -> CAPABILITY CHECK -> ACTION -> VERIFICATION -> RECOVERY/FALLBACK -> RESULT

## Layers

### Entry layer
Main shell, quick actions, share sheet, widget, Quick Settings, voice, assistant role, notifications and shortcuts all feed the same command/intent core.

### Intelligence layer
Normalize natural language, detect intent, extract entities, resolve ambiguity, use context, map requests to skills and build plans. This layer never bypasses Android permission or platform rules.

### Skill registry
A skill contract contains skill id, display name, aliases, platform support, requirements, risk, handler, verification and fallbacks.

Examples: camera.capture, qr.scan, app.launch, app.share, sms.compose, storage.analyze, gaming.prepare, device.thermal.read.

### Capability core
Each capability exposes declaration, current access state, readiness, request flow, execution support and verification support.

Suggested states: UNKNOWN, READY, DENIED, RESTRICTED, UNAVAILABLE, EXPIRED, ERROR.

### Task planner
Converts one request into one or more actions. Gaming is an example: inspect device -> inspect thermal -> inspect power state -> inspect display capability -> identify game -> apply only supported optimizations -> launch -> monitor -> verify.

### Action engine
Every action eventually follows REQUESTED -> STARTED -> RUNNING -> COMPLETED -> VERIFIED, with FAILED or CANCELLED terminal states.

UI should display SUCCESS only after an appropriate verified terminal state.

### Verification engine
Examples: app launch requires a valid target launch result, photo capture requires a readable output file, QR scan requires a decoded payload, wallpaper requires accepted system flow, storage cleanup requires measurable resulting space, gaming reports measured device state and supported mode state.

### Recovery
Every action declares preferred route and safe fallbacks. Unsupported actions are reported, not simulated.

### Observability
Tasks expose compact progress: current phase, current action, elapsed time where useful, final outcome and failure reason.

## Architecture constraints

- Do not duplicate app catalog data for every feature.
- Do not make AI responsible for device permissions.
- Do not let UI components call raw Android functions directly.
- Do not let browser fallbacks claim native success.
- Do not turn AccessibilityService into a universal automation bypass.
- Do not report unverified performance improvements.
- Do not block unrelated functionality when one optional capability is skipped.

## Migration rule

Existing camera, QR, wallpaper, notification, English and media-processing modules remain in place. New core layers wrap and normalize them; rewrites happen only when a later phase requires them.