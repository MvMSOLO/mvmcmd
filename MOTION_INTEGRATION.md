# MVMCMD — Motion Integration Map

Branch: `main-5486363736373351464`
Latest integration commit: `9ba8c8452b3679ae1be45e931ee75775064ff552`

All 30 motion recipes are wired into real MVMCMD UI surfaces. The implementation uses CSS/DOM/SVG/native View Transition APIs; no animation is represented only as an unused registry entry.

| # | Motion | Family | Real host | File |
|---|---|---|---|---|
| 01 | Command Bloom | Custom | Global MVMCMD header entrance | `src/components/mvm/shell.tsx` |
| 02 | Vector Scan | Custom | Boot / MVM CORE INITIALIZING panel | `src/components/mvm/shell.tsx` |
| 03 | Core Breathe | Custom | Rotating command-core 3D asset | `src/components/mvm/mvm-3d.tsx` |
| 04 | Terminal Flicker | Custom | Command log viewport | `src/components/mvm/shell.tsx` |
| 05 | Log Cascade | Custom | Every log row, staggered by row index | `src/components/mvm/shell.tsx` |
| 06 | Rail Drift | Custom | Desktop pinned/recents left rail | `src/components/mvm/shell.tsx` |
| 07 | MVM Scanline | Custom | 8-asset 3D strip | `src/components/mvm/shell.tsx` |
| 08 | Status Bloom | Custom | Status Ring 3D asset | `src/components/mvm/mvm-3d.tsx` |
| 09 | Input Ignite | Custom | Main command input form | `src/components/mvm/shell.tsx` |
| 10 | Card Orbit | Custom | Mini app-card 3D object | `src/components/mvm/mvm-3d.tsx` |
| 11 | Spring Snap | Handcrafted | Permission request cards + launch control | `src/components/mvm/gate.tsx`, `shell.tsx` |
| 12 | Magnetic Pull | Handcrafted | Catalog category controls | `src/components/mvm/shell.tsx` |
| 13 | Ripple Press | Handcrafted | Permission card press state | `src/components/mvm/gate.tsx` |
| 14 | Tilt Parallax | Handcrafted | Permission cards | `src/components/mvm/gate.tsx` |
| 15 | Glass Sweep | Handcrafted | Permission-gate header + main shell header | `gate.tsx`, `shell.tsx` |
| 16 | Text Shimmer | Handcrafted | MVMCMD brand title | `src/components/mvm/shell.tsx` |
| 17 | Focus Pulse | Handcrafted | Selected autocomplete result | `src/components/mvm/shell.tsx` |
| 18 | 3D Hover | Handcrafted | Every interactive KernelCAD asset | `src/components/mvm/mvm-3d.tsx` |
| 19 | Ink Reveal | Handcrafted | Boot initialization title | `src/components/mvm/shell.tsx` |
| 20 | Beam Trace | Handcrafted | Right catalog rail | `src/components/mvm/shell.tsx` |
| 21 | Kinetic Type | Trending | Autocomplete app-name labels | `src/components/mvm/shell.tsx` |
| 22 | Scroll Reveal | Trending | Mobile recents rail | `src/components/mvm/shell.tsx` |
| 23 | Bento Stagger | Trending | Permission-card grid, indexed 90ms stagger | `src/components/mvm/gate.tsx`, `styles.css` |
| 24 | Liquid Glass | Trending | Right catalog surface | `src/components/mvm/shell.tsx`, `styles.css` |
| 25 | Selective 3D Depth | Trending | Every 3D asset viewport/stage | `src/components/mvm/mvm-3d.tsx` |
| 26 | Cursor Microinteraction | Trending | Autocomplete suggestion buttons | `src/components/mvm/shell.tsx` |
| 27 | SVG Draw | Trending | Header vector path between identity and metadata | `src/components/mvm/shell.tsx`, `styles.css` |
| 28 | Variable Type | Trending | MACHINE VECTOR MODULE eyebrow | `src/components/mvm/shell.tsx` |
| 29 | Scroll Parallax | Trending | Live command-log ambient layer, driven by log scrollTop | `src/components/mvm/shell.tsx`, `styles.css` |
| 30 | View Transition | Trending | Command commit / shell state transition | `src/components/mvm/shell.tsx`, `styles.css` |

## Verification notes

- Motion registry: `src/lib/mvm/motion-system.ts`
- All 30 animation classes are used by at least one real component file.
- Reduced-motion handling remains enabled globally.
- DevMotion research was used as the reference library for patterns such as spring pop, press ripple, tilt card, dynamic grid/scroll, particle/beam transitions and variable typography.
- Trending patterns were selected from current DevMotion catalog entries and translated into the MVMCMD visual language rather than embedding an unrelated demo scene.
- Build verification is running on the final commit via the repository's Android and Windows Actions.
