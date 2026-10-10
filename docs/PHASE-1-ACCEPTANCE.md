# MVMCMD — Phase 1 Acceptance Contract

## Audit checklist

- What exists?
- What is real native functionality?
- What is browser/PWA only?
- What can fail asynchronously?
- Which permissions and special accesses are declared?
- Which actions can currently report success before verification?
- Which planned capabilities do not exist yet?

## Regression gates

- Typecheck must pass.
- Android build must pass.
- Windows build must pass.
- Existing motion integration remains present.
- Native launcher registration remains present.
- No current feature file is deleted as part of Phase 1.

## Truth rules

Capability truth: permission granted does not automatically mean capability ready.
Action truth: requested does not mean completed.
Performance truth: motion completed does not mean underlying work completed.
UX truth: no artificial full-screen waiting state when staged progress is available.

## Definition of done

- [x] Repo structure inspected.
- [x] Native Android surface inspected.
- [x] Command/intent/executor layer inspected.
- [x] Permission gate inspected.
- [x] Existing motion integration inspected.
- [x] Android and Windows workflow definitions inspected.
- [x] Latest successful baseline runs identified.
- [x] Real/partial/missing capability map documented.
- [x] Phase 2 architecture contract documented.
- [ ] CI regression run on the new Phase 1 branch.

The final unchecked item is the only remaining Phase 1 closure task.