# MVMCMD — Dependency Advisory Review

**Reviewed:** 2026-10-10  
**Source commit assessed:** `c81e625c945f50e582ecbc7322060928333b3969`  
**Disposition:** Temporary, documented build-tool risk; no patched upstream release available for the root finding at review time. **Not a zero-vulnerability sign-off.**

## Finding

Both Android and Windows CI reported the same seven *moderate package nodes* from `npm audit`. They form one dependency chain / one upstream advisory, rather than seven independent CVEs:

| Package node | Resolved version | Dependency role / path |
|---|---:|---|
| `sprintf-js` | 1.1.3 | Root affected package; pulled by `roarr` |
| `roarr` | 2.15.4 | Optional dependency of `global-agent`; depends on `sprintf-js` |
| `global-agent` | 3.0.0 | Optional dependency of `@electron/get` |
| `@electron/get` | 3.1.0 | Electron download/build dependency |
| `app-builder-lib` | 26.17.0 | Build tool dependency; uses `@electron/get` |
| `dmg-builder` | 26.17.0 | Build tool dependency; depends on `app-builder-lib` |
| `electron-builder` | 26.17.0 | Direct `devDependency` which brings the chain into the install tree |

The root advisory is [GHSA-hp3w-g68c-fv3c / CVE-2026-97058](https://github.com/advisories/GHSA-hp3w-g68c-fv3c). The issue describes unbounded precision specifiers in `sprintf-js` 1.1.3 causing an uncaught `RangeError` for attacker-influenced format strings. At the review date, the GitHub Advisory Database reported **no patched versions**; npm still lists 1.1.3 as the current package version. See also the [upstream disclosure](https://github.com/alexei/sprintf.js/issues/237) and [npm package version history](https://www.npmjs.com/package/sprintf-js?activeTab=versions).

## Exposure assessment

- All seven flagged nodes are build/development dependencies in the current lockfile; `electron-builder` is a `devDependency`. The Windows packaging config includes `desktop/**/*` and static web resources, not the builder toolchain itself.
- `global-agent` is optional in the current `@electron/get` dependency. The advisory's impact is availability from malformed, untrusted format strings. No evidence has been found that MVMCMD passes user-controlled format strings to this build-only chain; that is a reviewed assumption, not a proof of exploitability.
- npm's suggested `electron-builder@26.5.0` remediation was not applied blindly. It is a downgrade below the documented `app-builder-lib >=26.15.0` patch threshold for a separate high-severity Linux AppImage search-path advisory ([GHSA-7g7r-gx96-252g](https://github.com/electron-userland/electron-builder/security/advisories/GHSA-7g7r-gx96-252g)). A security change that clears one finding while reintroducing a higher-severity issue is not acceptable without separate target and dependency analysis.
- No private fork, fabricated version, or audit suppression was introduced. The affected upstream release must be patched/released, or a maintained fix reviewed and tested, before claiming this finding is resolved.

## Controls applied

1. Keep the all-dependency CI audit and its **zero high / zero critical** policy gate. The build logs continue to show moderate advisories.
2. Add a separate `npm audit --omit=dev` gate to Android and Windows CI; any known advisory in the shipped production dependency tree fails that gate. **Verified clean in both candidate runs:** [Android run 38031931196](https://github.com/MvMSOLO/mvmcmd/actions/runs/38031931196) and [Windows run 38031931178](https://github.com/MvMSOLO/mvmcmd/actions/runs/38031931178) each report `info=0, low=0, moderate=0, high=0, critical=0, total=0` for production dependencies.
3. The signed-release workflow repeats the production dependency audit and refuses to sign if the runtime tree has known advisories. The workflow is prepared; it has not yet run because repository signing secrets and a reviewed `main` merge are not confirmed.
4. Re-check the root advisory and affected dependency chain before every public distribution. Do not describe this temporary disposition as “no vulnerabilities.”

## Open actions

- [ ] Re-run audit when upstream publishes a patched `sprintf-js` version and update the dependency chain through a lockfile-producing build.
- [ ] Review the changed lockfile and test the Windows portable EXE build/launch if the builder chain changes.
- [x] Confirm production-only audit reports zero known advisories in both candidate CI runs (links above).
- [ ] Re-run and review the production-only audit immediately before the first signed release.
- [ ] Obtain explicit release-owner sign-off on the temporary moderate build-tool risk, or wait for upstream remediation.

This review is a technical assessment, not an external penetration test or a legal/security certification.
