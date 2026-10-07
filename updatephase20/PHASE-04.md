# Phase 04 — MVM Intelligence / Command Engine

## Status
COMPLETED.

## Goal
Turn natural-language input into a deterministic internal command representation without mixing parsing and execution.

## Pipeline
Normalize → identify intent → extract entities → detect language → attach canonical skill ID.

## Initial intents
- open-app
- device-snapshot
- permission-status
- find-app
- help
- unknown

## Entity model
Supported entity categories include app query, capability and free text. Language detection supports Uzbek, English and mixed input.

## Delivered
- Deterministic local parser.
- Canonical intent representation.
- Skill resolution hook.
- Explicit handling for ambiguous language.
- No claim that the parser itself is an LLM.
- No direct execution from the parser.

## Acceptance
- Same input produces deterministic interpretation.
- Ambiguous input does not silently trigger a risky action.
- Unknown intent reaches a safe help/error state.
- Parser tests pass.
- APK and EXE CI succeed.

## Dependencies
Phases 1–3.
