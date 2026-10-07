# Phase 15 — Voice + Assistant Layer

## Status
PLANNED.

## Goal
Add voice input/output as another entry point into the existing command pipeline, not as a separate intelligence system.

## Scope
- Push-to-talk.
- Speech-to-text.
- Voice command normalization.
- Spoken confirmation for consequential actions.
- Text-to-speech results.
- Offline/platform fallback where available.
- Microphone capability integration.
- Interrupt/cancel behavior.

## Rules
Voice input must resolve to the same intents, skills, plans and actions used by text. The assistant must not silently perform sensitive actions from ambiguous speech.

## Acceptance
- Voice and text produce equivalent canonical commands.
- Mic permission state is respected.
- Recognition failure has a visible fallback.
- Spoken results match actual execution state.
- APK and EXE CI succeed.

## Dependencies
Phases 2, 4, 10 and 14.
