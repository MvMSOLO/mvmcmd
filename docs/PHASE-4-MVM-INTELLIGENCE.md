# MVMCMD — Phase 4 MVM Intelligence

## Goal

Turn natural-language user input into a stable, deterministic intent contract that the existing command/action layer can consume.

## Pipeline

INPUT → NORMALIZE → LANGUAGE → INTENT → ENTITIES → CONTEXT → REQUIRED CAPABILITIES → EXISTING COMMAND/ACTION

Phase 4 does not execute actions by itself. It improves understanding and keeps execution in the existing verified layer.

## Supported intents

- open_app — launch an app from a natural phrase
- device_snapshot — request the real native device snapshot
- permission_status — inspect/request permissions through the existing capability core
- find_app — ranked app search
- help — command help
- unknown — safely leave unsupported text untouched

## Examples

- “Telegramni och” → open_app + app_query=Telegram
- “please open ChatGPT” → open_app + app_query=ChatGPT
- “batareyani ko‘rsat” → device_snapshot + capability=device
- “show my RAM” → device_snapshot + capability=device
- “ruxsatlarni ko‘rsat” → permission_status
- “find Spotify” → find_app + app_query=Spotify

## Truth rules

1. Deterministic/local parser only; no claim of LLM understanding.
2. Intent confidence is metadata, not proof of successful execution.
3. Entity extraction never invents an app.
4. Required capabilities are declarations for later planning/guards.
5. Unsupported phrases remain unknown.
6. Existing native capability and action layers remain the source of execution truth.
7. Natural-language routing must not bypass permission gates.

## Acceptance

- [x] Intent/result types
- [x] Normalization + language detection
- [x] Intent classification
- [x] App/capability entity extraction
- [x] Required-capability declarations
- [x] Existing shell integration
- [x] Existing executor integration
- [x] tldraw architecture board
- [ ] Final APK CI success
- [ ] Final EXE CI success
