# Phase 20 — Release Candidate → Demo → Instagram Launch

## Status
PLANNED.

## Goal
Package the completed MVM CMD system into a stable release candidate, a truthful demonstration build and a launch-ready presentation.

## Release candidate
- Freeze feature scope.
- Verify version metadata.
- Verify APK and EXE artifacts.
- Confirm installation and first-run permission flow.
- Confirm camera, QR, wallpaper, notification, English Lab and core command flows.
- Confirm recovery/fallback behavior.
- Confirm no decorative 3D element has unintended click behavior.
- Confirm README and user documentation.

## Demo
Build a short, real demonstration around the product’s strongest differentiator: natural-language commands leading to actual device/app actions. Demonstrations must show real outcomes and explicitly distinguish STARTED from VERIFIED when needed.

Suggested sequence:
1. Boot.
2. Command input.
3. Permission-aware capability setup.
4. Open an app.
5. Device snapshot.
6. QR/camera workflow.
7. Multi-step task.
8. Recovery/fallback example.
9. English Lab.
10. Premium UI and 3D state language.

## Launch assets
- Product screenshots.
- Short vertical demo.
- Feature list.
- Privacy/permission explanation.
- GitHub release notes.
- APK and EXE links.
- Changelog.
- Known limitations.

## Instagram launch principle
Show what the product actually does, not simulated “AI magic”. The strongest message is reliable command execution with transparent device capabilities.

## Acceptance
- Release candidate passes Phase 19.
- APK and EXE are reproducible through CI.
- Core demo flows are real.
- Documentation matches shipped behavior.
- Known limitations are disclosed.
- Launch assets are generated without implying unsupported capabilities.

## Dependencies
All previous phases.
