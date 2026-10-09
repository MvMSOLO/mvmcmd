# Phase 15 — Voice + Assistant Layer

## Status
IN PROGRESS — implementation is pushed for Android APK and Windows EXE validation; do not mark complete until both CI workflows succeed on the final commit.

## Goal
Add voice input/output as another entry point into the existing command pipeline, not as a separate intelligence system.

## Delivered implementation
- Push-to-talk control on the existing command dock with a visible listening, recognition and fallback state.
- Android native `SpeechRecognizer` and system `TextToSpeech` bridge through the registered `MvmVoice` Capacitor plugin.
- Browser/Windows Web Speech recognition and Speech Synthesis fallback when supported.
- Microphone preflight through the Phase 2 Android capability/permission engine; browser microphone permission is requested only after the user starts voice input.
- Deterministic transcript normalization (wake phrase, punctuation and spacing) followed by the same existing `commit`, `understandCommand` and `parseLine` command path used by typed input.
- Voice transcripts are staged in the command input and never executed automatically. The user must review and press Launch. Pressing Escape cancels active recognition and speech.
- Spoken outcome summaries are generated from real command result lines; warnings take precedence, and STARTED is never spoken as completed or verified. Command text, contact details and result payloads are not read aloud.
- Focused unit tests in `src/lib/mvm/voice-core.test.ts`; both platform workflows run them alongside Action Engine, File Intelligence and session-context tests.

## Acceptance
- Voice and typed input use the same canonical command pipeline.
- Microphone capability state is respected on Android; browser permission denial and unsupported speech APIs produce visible fallback messages.
- Consequential actions are not run from recognition alone; review/Launch remains required.
- Spoken summaries are based on actual returned status text and do not upgrade STARTED to VERIFIED.
- Recognition can be stopped, and Escape cancels it.
- Android APK and Windows EXE CI succeed; see final acceptance evidence below.

## Dependencies
Phases 2, 4, 10 and 14. Phase 10 implementation is present in `src/lib/mvm/goal-engine.ts`; the master-roadmap status has been aligned with the implemented Goal Engine.

## CI evidence
Pending. This section must be updated with the final code/documentation commit and both successful workflow URLs only after GitHub Actions confirms success.
