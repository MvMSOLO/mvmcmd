# Phase 18 — Globalization + Android/OEM Compatibility

## Status
PLANNED.

## Goal
Make MVM CMD dependable across languages, Android versions and OEM-specific restrictions.

## Scope
- Uzbek and English as first-class languages.
- Mixed-language commands.
- Localized permission explanations.
- Android API-level matrix.
- Samsung/Redmi/Pixel-style behavior differences.
- Restricted Settings handling.
- OEM battery/background restrictions.
- Locale/date/number formatting.
- Accessibility checks.
- Device capability compatibility matrix.

## Rules
OEM-specific features are capability-detected, never assumed. If an OEM blocks an operation, MVM CMD explains the exact limitation and offers the safest available path.

## Acceptance
- Core commands work across the supported Android matrix.
- Permission states remain correct on restricted devices.
- Language changes do not alter command semantics.
- Platform-specific fallbacks are tested.
- APK and EXE CI succeed.

## Dependencies
Phases 2–17.
