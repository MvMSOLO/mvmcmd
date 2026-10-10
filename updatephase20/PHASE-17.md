# Phase 17 — Speed, Motion & Premium UX

## Status
COMPLETED — implementation committed; Android APK and Windows EXE code-build workflows succeeded.

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


## Implementation delivered
- Added a persisted Motion control in the live command header. The default follows `prefers-reduced-motion`; users may explicitly enable reduced motion and return to system preference.
- Effective reduced motion now disables decorative and interaction animation, 3D tilt/parallax, pointer-driven physical movement, and micro-flash feedback; command scrolling and boot choreography avoid smooth/animated transitions while reduced motion is active.
- Added visible keyboard focus rings and retained the existing `Ctrl/⌘ K` and `/` command-focus shortcuts.
- Decorative 3D objects stop click propagation so clicking the object itself cannot activate a containing card; removed unused KernelCAD URLs from the local decorative asset registry.
- Performance telemetry suspends its animation-frame loop while the document is hidden, resets its sampling window on resume, and no longer claims an initial 60 FPS before measuring.
- Added focused tests for preference normalization, system/user preference resolution, state transitions, reduced-motion styling, keyboard focus, and inert/local 3D assets.
- Android and Windows workflows now run the focused motion contract tests and verify reduced-motion/3D safety invariants.

## Acceptance evidence — verified on code commit `d03de2873fe0d906e4ed3a4bd75facbc8290c661`
- Android APK: [run 37907003082 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37907003082). Typecheck, motion/3D contract guard, focused tests (41 passed, 0 failed), web build, Gradle APK, APK verification, final success gate and artifact upload passed.
- Windows EXE: [run 37907002953 — SUCCESS](https://github.com/MvMSOLO/mvmcmd/actions/runs/37907002953). Typecheck, motion/3D contract guard, focused tests, web build/bundle verification, portable EXE build, EXE verification, final success gate and artifact upload passed.
- APK artifact `mvmcmd-debug-apk-651`, artifact ID `11604104867`, 22,279,768 bytes, SHA-256 `2c10c6925c57302ef975dab0e2120df20affe91821be2965234d67ec9bc89b8c`.
- Windows artifact `mvmcmd-windows-exe-369`, artifact ID `11604614979`, 133,922,068 bytes, SHA-256 `6fe9e24d77970c01a6d2d5ec57b3e0025cfff6773b0ee6f5e9fab67c6d64acd2`.
- Both artifact workflows passed on the exact implementation commit. Rebuilding after this documentation-only completion commit is an additional repository consistency check.
- CI covers automated build and focused contracts; real-device Android gesture/animation feel and interactive Windows EXE behavior still require hands-on runtime testing.
