# Phase 15 — Voice + Assistant Layer

## Status
COMPLETED — voice assistant implementation, focused tests, TypeScript validation, Android APK and Windows EXE builds all succeeded on validated code commit `7d6a80842797750cf41deecfa5503a8f9b1d4b1b`.

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

## Final acceptance and CI evidence

Validated implementation commit: [`7d6a80842797750cf41deecfa5503a8f9b1d4b1b`](https://github.com/MvMSOLO/mvmcmd/commit/7d6a80842797750cf41deecfa5503a8f9b1d4b1b).

- Android APK: [run 37900166326 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37900166326). Typecheck, voice-core and existing focused tests, native voice plugin source gate, web bundle, wallpaper payload verification, Gradle APK build, APK verification, final success gate, and artifact upload all passed.
- Windows EXE: [run 37900166264 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37900166264). Typecheck, voice-core and existing focused tests, web build, portable Electron EXE build, EXE verification, final success gate, and artifact upload all passed.
- APK artifact: `mvmcmd-debug-apk-626`, 22,273,735 bytes, artifact ID `11602211499`, SHA-256 `6705ae40ec6a0682eaa6ccde9df4cc1722f10f75531d83ca81bc9e761b52e5a1`.
- Windows artifact: `mvmcmd-windows-exe-344`, 133,917,290 bytes, artifact ID `11602172296`, SHA-256 `790cd7c82dc5edcb63e85a9991c60b66eff9c7c2a6dad6e57351e7b6bf63c7df`.
- The focused test set contains the new `voice-core.test.ts` plus the Action Engine, File Intelligence and Phase 14 session-context tests. It is not the whole repository-wide `npm test` suite.

All acceptance items for Phase 15 are met.
