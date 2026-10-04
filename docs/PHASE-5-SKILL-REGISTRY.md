# Phase 5 — MVM Skill Registry

## Goal
Create one canonical registry describing what an MVM skill is, what platforms it supports, which capabilities it needs, how it executes, and how its result is verified.

## Contract
INPUT → INTENT → SKILL LOOKUP → CAPABILITY REQUIREMENTS → HANDLER → VERIFICATION → RESULT

## Rules
- Registry metadata does not execute actions.
- Registry metadata never implies success.
- Disabled/unsupported skills remain truthful.
- Platform support is explicit.
- Risk is explicit for future confirmation policy.
- Existing catalog remains the app-discovery data source; this registry is the action/skill contract and does not duplicate the catalog.

## Initial registered skills
- open-app
- device-snapshot
- permission-status
- camera
- qr
- wallpaper
- notification-center
- english-lab

## Phase 5 acceptance
- [x] Canonical skill schema
- [x] Platform metadata
- [x] Capability requirements
- [x] Risk metadata
- [x] Handler identifiers
- [x] Verification contract
- [x] Fallback metadata
- [x] Existing catalog preserved
- [ ] APK CI success
- [ ] Windows EXE CI success
