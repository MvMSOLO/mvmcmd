# Phase 14 — Context, Session Memory & Conversation

## Status
PLANNED.

## Goal
Allow MVM CMD to understand short conversational references without turning memory into uncontrolled data collection.

## Scope
- Session context.
- Last command/result state.
- References such as “again”, “that app”, “the previous file”.
- Task continuation.
- User-visible session history.
- Explicit memory boundaries.
- Clear/reset session state.
- Sensitive-data minimization.

## Rules
Short-term context is preferred over permanent storage. Sensitive information should not be retained unless necessary and explicitly supported. Context must never override a newer explicit command.

## Acceptance
- Follow-up commands resolve against current session state.
- Context can be cleared.
- Ambiguous references are surfaced instead of guessed.
- No hidden permanent memory of private data.
- APK and EXE CI succeed.

## Dependencies
Phases 4, 7, 8, 10 and 13.
