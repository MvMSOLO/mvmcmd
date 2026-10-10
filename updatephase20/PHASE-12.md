# Phase 12 — Communication Engine

## Status
**COMPLETED** (code + tests).

Previously marked PLANNED; implementation already existed in `src/lib/mvm/communication.ts`
and native bridges (`MvmContactResolver`, dialer/SMS/email composers). Tests were missing.

## Goal
Unify communication-related commands under safe, explicit app and platform bridges.

## Scope
- Contacts lookup.
- Dialer handoff.
- SMS composer handoff where supported.
- Email/share composer handoff.
- Copy/paste utilities.
- Notification interaction where permissions and platform APIs allow.
- Verification of local preparation versus external delivery.

## Privacy
Contact and communication data must be requested only when required. MVM CMD must distinguish “composer opened” from “message delivered.” No message is silently sent when user confirmation is required.

## Acceptance
- Communication skills declare required capabilities.
- Sensitive data stays inside the minimum required scope.
- External delivery is never falsely marked VERIFIED.
- Failure states explain platform restrictions.
- APK and EXE CI succeed.

## Evidence (tests)
`src/lib/mvm/communication.test.ts` covers:
- `validatePhone` / `validateEmail` boundary values
- empty SMS body rejected
- empty copy text rejected
- dialer / SMS / email results **never** return `verified: true`
- native-unavailable path returns `status: "unavailable"` outside Android

## Dependencies
Phases 2, 5, 8 and 9.
