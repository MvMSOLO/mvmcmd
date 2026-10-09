# Phase 14 — Context, Session Memory & Conversation

## Status
IN PROGRESS — result-classification false positives and continuation/privacy edge cases are being tightened; final APK/EXE CI validation pending.

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

## Implementation and validation
- A volatile in-memory session context resolves safe repeat requests, a uniquely remembered app reference, and a single file reference from the most recent read-only scoped file query.
- Ambiguous app/file references do not execute. File mutations and communication commands are never automatically replayed.
- The session / context command shows what is remembered; session clear erases the context and current-session command history.
- Command history remains visible through hist and arrow-key navigation during the current run, but saveState writes history: []; legacy persisted command history is ignored on load.
- Privacy-sensitive command text and scoped file URIs are not kept in durable storage or echoed by the session summary.
- Focused automated coverage is in src/lib/mvm/session-context.test.ts.

## Final acceptance and CI evidence
- Session commands support safe repeat requests and a uniquely remembered app reference. File references resolve only after a single URI is found by a read-only scoped file query; no destructive or communication command is automatically replayed.
- Each newer command advances an in-memory turn token. Late async results are ignored if they belong to an older turn, including after session clear.
- The session / context command shows the current command, a content-free result status, app/file reference availability and the repeat guard. Session clear also clears the visible command log.
- Private communication commands, email addresses, phone-like values, secret-bearing text, and file/content URIs are not retained as last-command text. Result summaries never store raw tool output.
- Persisted browser state always writes an empty command history; loading legacy state immediately rewrites it without the old history.
- Focused tests: 9 cases in src/lib/mvm/session-context.test.ts. Both CI workflows ran this test file together with the Action Engine and File Intelligence tests, and the TypeScript check passed.
- Validated code commit: 7805e34253af86be4a9e272cbdcbc5802b746f10.
- Android APK workflow: [run 37895857391 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37895857391).
- Windows EXE workflow: [run 37895857371 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37895857371).

## Additional safety checks (pending CI)
- Result summaries require an explicit state token; explanatory prose mentioning “not verified” cannot upgrade STARTED to VERIFIED.
- “Continue/resume” does not silently replay an old action; the user must state the next step. Only allow-listed repeatable command text is kept in volatile context.
- Automated tests cover explicit result-state classification, active session clear, safe continuation prompts, and non-repeatable text minimization.
