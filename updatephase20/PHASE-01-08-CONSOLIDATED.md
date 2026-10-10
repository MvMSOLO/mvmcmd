# MVM CMD — Phase 1–8 Consolidated Implementation Record

## Phase 1 — Product Foundation & Baseline
Established the canonical architecture and baseline before adding more capabilities. The product flow became `INPUT → UNDERSTAND → INTENT/GOAL → CONTEXT → TASK PLAN → CAPABILITY CHECK → ACTION → VERIFICATION → RECOVERY/FALLBACK → RESULT`. Added architecture and acceptance documentation and validated both APK and EXE builds.

## Phase 2 — MVM Capability & Permission Core
Created a centralized capability/permission model instead of scattered permission checks. Capabilities include camera, microphone, notifications, notification listener, contacts, overlay, and usage access. States include READY, DENIED, RESTRICTED, UNAVAILABLE, ERROR and unknown/initial state. Added sequential first-run permission setup, skip behavior, explicit Android Settings return/re-check, and command forms such as `perm`, `perm camera`, and `perm notification_listener`. No silent permission acquisition.

## Phase 3 — Native Device Capability Engine
Added native Android device information behind a reusable bridge: device/manufacturer/model, Android SDK/release/ABIs, CPU core count and best-effort load, RAM, storage, battery and charging state, battery temperature/health, thermal status, display dimensions/density/refresh/GLES, network state, Bluetooth state, audio state and sensors. Bluetooth permission requirements are represented truthfully.

## Phase 4 — MVM Intelligence / Command Engine
Introduced deterministic local natural-language parsing. The parser normalizes input, identifies supported intent, extracts entities, and detects Uzbek/English/mixed language. Initial intents include open-app, device-snapshot, permission-status, find-app, help and unknown. The parser does not execute actions and does not claim to be an LLM. Ambiguous Uzbek wording such as `ochir` was deliberately removed from open-app cues.

## Phase 5 — MVM Skill Registry
Created a canonical skill registry with id, name, aliases, category, platforms, required capabilities, risk, handler, verification, fallback and enabled metadata. Initial skills cover open-app, device-snapshot, permission-status, camera, QR, wallpaper, notification-center and English Lab. Intelligence now resolves supported intents to canonical skill IDs.

## Phase 6 — MVM Action Engine
Introduced one action lifecycle shared by command execution: PRECONDITION → EXECUTE → OBSERVE → VERIFY → RECOVER. Results distinguish READY, STARTED, VERIFIED, RECOVERED and FAILED. A platform request can be STARTED without being VERIFIED when completion cannot be observed. Tests cover verified completion, unverified execution and precondition recovery.

## Phase 7 — Task Planner
Added explicit multi-step planning using separators such as `and then`, `then`, `va keyin`, `keyin` and `va`. Plans contain ordered steps and dependencies with a bounded maximum of eight steps. Execution is sequential; failed dependencies stop downstream steps when stop-on-failure is enabled. Existing single-command execution remains the default.

## Phase 8 — Verification + Recovery Engine
Hardened the Action Engine with bounded, opt-in retry policy and stage-specific retry control for precondition, execute, observe and verify. Every action result carries attempt count and recovery metadata. VERIFIED requires explicit evidence. RECOVERED means a declared fallback handled the problem and is never upgraded to VERIFIED. Unverified Android Intent launches remain STARTED and are not repeatedly launched just to obtain proof.

## Completed validation
The eight phases were implemented through sequential phase branches and merged through Phase 8. Final Phase 8 merge commit: `677290ebdf78de8cbed42a255535310542b99c56`. Final post-merge CI recorded successful Android APK and Windows EXE runs.

## Architectural result after Phase 8
MVM CMD now has a real foundation for capabilities, deterministic intent understanding, registered skills, action lifecycle, multi-step plans, evidence-gated verification, and safe recovery. Phases 9–20 build on these primitives rather than creating parallel execution systems.
