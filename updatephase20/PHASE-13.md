# Phase 13 — Device Utility & File Intelligence

## Status
COMPLETED — scoped file utilities implemented; Phase 13 targeted tests passed and APK/EXE CI succeeded on commit `6e7483f`. The full repository test suite has 8 unrelated Grok PWA/SEO metadata test failures; Phase 13 CI gates its focused file-intelligence and action-engine tests.

## Goal
Make MVM CMD useful for everyday device maintenance and file tasks while respecting Android storage boundaries.

## Scope
- Storage overview from Android shared-storage volume statistics, with consistency checks.
- Large-file discovery.
- File search with resource URIs.
- Safe copy/move/share through scoped content URIs; move requires explicit confirmation.
- Recent-file discovery.
- Media categorization.
- Duplicate candidate grouping by filename and size, clearly not presented as verified duplicates.
- Downloads/Documents folder-selection helpers.
- Inspectable cleanup plan (large, old, and duplicate candidates); no automatic deletion.
- ZIP creation from validated, readable, user-selected files.

## Rules
“Clean my phone” must first produce an inspectable plan. Destructive deletion requires explicit confirmation and must never target protected/system data.

## Acceptance
- Storage numbers come from the native device engine.
- File operations use scoped access.
- Every destructive action has explicit confirmation; file deletion is verified after the operation. Directory deletion is blocked.
- Search results identify the actual path/resource.
- APK and EXE CI succeed.

## Implemented command surface
- `files storage`, `files choose`, `files list`, `files find <text>`, `files large <MB>`, `files recent`, `files media [type]`, `files duplicates`, `files downloads`, `files documents`, `files cleanup`, `files share <content-uri>`, `files copy <content-uri> <name>`, `files move <content-uri> <name> confirm`, `files delete <content-uri> confirm`, `files zip <name.zip> <content-uri...>`.
- Storage access is limited to a folder explicitly selected through Android Storage Access Framework. No broad storage permission is requested.
- Duplicate output is candidate-only (filename + size), not a cryptographic content comparison.
- Cleanup is plan-only; the app does not silently remove files.

## Verification
- Focused tests: `src/lib/mvm/file-intelligence.test.ts` and `src/lib/mvm/action-engine.test.ts` — passed in CI.
- Android APK build, verification, final success gate, and artifact upload — passed.
- Windows EXE build, verification, final success gate, and artifact upload — passed.
- Destructive file deletion requires an explicit `confirm`, refuses directory deletion, and verifies absence after the delete operation.
- ZIP inputs are validated before archive creation; duplicate detection is explicitly candidate-only.
- The broad repository `npm test` run currently has 8 unrelated Grok PWA/SEO metadata assertions failing; these remain outside Phase 13 and are disclosed rather than represented as passing.

## Dependencies
Phases 2, 3, 6, 8 and 9.
