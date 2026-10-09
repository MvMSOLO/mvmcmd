# Phase 14 — Context, Session Memory & Conversation

## Status
COMPLETED — implementation, focused tests, TypeScript validation, Android APK build and Windows EXE build succeeded on validated code commit `2763a04223415c6c786c6ad1f3252092dbb59ecd`.

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
- Follow-up resolution: “again” repeats only allow-listed safe commands; “that app” resolves only to one remembered app; previous-file operations require exactly one file from a read-only scoped query.
- Ambiguous app/file references stop without executing. `continue` / `resume` does not replay old actions; it asks for the next explicit step because no background task is kept as resumable work.
- Session context is volatile process memory. Sensitive commands, email/phone-like values, secret-bearing text, file/content URIs, and non-repeatable free text are not retained as last-command text. The summary stores a content-free result classification rather than raw command output.
- A result is not upgraded to `VERIFIED` by incidental prose such as “does not label this VERIFIED yet”; the success classifier requires an explicit status token.
- A monotonic in-memory turn ID ignores late asynchronous results from older commands, including after session clear.
- `session` / `context` displays the current safe context. `session clear` clears context and visible command log; `reset` clears the same context and local state.
- Visible command history remains session-local. Persistent browser state always writes `history: []`, and loading legacy state removes the older persisted history.
- Focused tests: 14 cases in `src/lib/mvm/session-context.test.ts`; session-context, Action Engine and File Intelligence test command succeeded in both workflows. TypeScript checks passed.
- Validated implementation commit: [`2763a04223415c6c786c6ad1f3252092dbb59ecd`](https://github.com/MvMSOLO/mvmcmd/commit/2763a04223415c6c786c6ad1f3252092dbb59ecd).
- Android APK workflow: [run 37896634065 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37896634065). The APK artifact was uploaded successfully.
- Windows EXE workflow: [run 37896634067 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37896634067). The portable EXE artifact was uploaded successfully.

## Test-suite scope note
The two build workflows run Phase 14's focused tests plus the Action Engine and File Intelligence tests, rather than the entire repository-wide `npm test` suite. The previously known eight unrelated Grok PWA/SEO metadata assertions remain outside Phase 14; they are not being represented as passing.
