# Phase 17 — Speed, Motion & Premium UX

## Status
IN PROGRESS — implementation committed; Android APK and Windows EXE CI verification pending.

## Goal
Turn the mature command engine into a premium 2026 product experience without sacrificing clarity or performance.

## Scope
- Premium dark/cyber visual system.
- Glass/liquid surfaces used selectively.
- Lightweight 3D accents.
- Command input focus choreography.
- State-driven micro-interactions.
- Loading, success, warning and error motion.
- Keyboard/gesture shortcuts.
- Responsive mobile/desktop layouts.
- Accessibility and reduced-motion behavior.
- Performance budgets.

## Existing assets to preserve
The planned 3D set includes command-input rotating core, boot MVM cube, card object, English Lab letters, wallpaper preview, settings status object, state symbols and desktop background objects. Decorative objects must remain non-interactive unless intentionally assigned an action.

## Rules
Animation communicates state. It must not add artificial waiting. Visual polish cannot conceal STARTED, RECOVERED or FAILED states.

## Acceptance
- No decorative 3D element accidentally opens external websites.
- Reduced-motion mode works.
- Main interaction remains fast on modest Android devices.
- 3D is lightweight and optional where necessary.
- APK and EXE CI succeed.

## Dependencies
All previous product phases, especially 8 and 16.


## Implementation delivered (CI pending)
- Added a persisted Motion control in the live command header. The default follows `prefers-reduced-motion`; users may explicitly enable reduced motion and return to system preference.
- Effective reduced motion now disables decorative and interaction animation, 3D tilt/parallax, pointer-driven physical movement, and micro-flash feedback; command scrolling and boot choreography avoid smooth/animated transitions while reduced motion is active.
- Added visible keyboard focus rings and retained the existing `Ctrl/⌘ K` and `/` command-focus shortcuts.
- Decorative 3D objects stop click propagation so clicking the object itself cannot activate a containing card; removed unused KernelCAD URLs from the local decorative asset registry.
- Performance telemetry suspends its animation-frame loop while the document is hidden, resets its sampling window on resume, and no longer claims an initial 60 FPS before measuring.
- Added focused tests for preference normalization, system/user preference resolution, state transitions, reduced-motion styling, keyboard focus, and inert/local 3D assets.
- Android and Windows workflows now run the focused motion contract tests and verify reduced-motion/3D safety invariants.

## Acceptance evidence
Pending. This phase is not marked complete until the code commit passes both platform workflows, including artifact verification and upload.
