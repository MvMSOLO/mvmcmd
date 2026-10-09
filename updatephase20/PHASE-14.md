# Phase 14 — Context, Session Memory & Conversation

## Status
IN PROGRESS — implementation committed; APK and EXE validation pending.

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

## Implementation notes (validation pending)
- A volatile in-memory session context resolves safe repeat requests, a uniquely remembered app reference, and a single file reference from the most recent read-only scoped file query.
- Ambiguous app/file references do not execute. File mutations and communication commands are never automatically replayed.
- The session / context command shows what is remembered; session clear erases the context and current-session command history.
- Command history remains visible through hist and arrow-key navigation during the current run, but saveState writes history: []; legacy persisted command history is ignored on load.
- Privacy-sensitive command text and scoped file URIs are not kept in durable storage or echoed by the session summary.
- Focused automated coverage is in src/lib/mvm/session-context.test.ts.
