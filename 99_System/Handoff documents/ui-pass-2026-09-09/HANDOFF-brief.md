# UI pass 2026-09-09 — coordinator handoff brief

Residue for the follow-up coordinator. The clipboard prompt carries the why, success criteria and principles; this file carries only what is already on disk and what is left.

## Working tree (uncommitted, 17 files)

Everything below is applied and self-verified by its unit agent; nothing has been committed or cross-reviewed.

| Unit | Report | Files | Status |
|---|---|---|---|
| InteractionA | `InteractionA.md` | `js/view-practice.js`, `js/view-exam.js`, `js/view-plan.js`, `js/view-dashboard.js`, `js/exam-engine.js`, `css/style.css` | complete |
| InteractionB | `InteractionB.md` | `js/view-mistakes.js`, `js/view-content.js`, `js/view-formulas.js`, `css/visualizer.css`, `css/style.css` | complete |
| Aesthetics | `Aesthetics.md` | deleted `css/ambient.css`, `js/ambient-fx.js`; `index.html`, `js/app.js`, `css/style.css` | complete |
| Performance | `Performance2.md` (`Performance.md` is the same agent's stop-order copy) | `index.html`, `js/app.js` boot guard, `tools/test-visualizer-aesthetics.js` | complete; lazy-loading `view-formulas.js` deliberately skipped, reasoning in report |
| LayoutShell | `LayoutShell.md` | `js/app.js`, `css/style.css` | partial: desktop footer overlap fixed; see below |

Unit reports live beside this file. Audit screenshots that grounded the units: `/tmp/pgre-audit/<route>-<1440|390>.png` (may not survive a reboot). Original prioritised findings: survey in `../improvement-survey/` and the audit digest in the parent session.

## Not yet done

1. **Mobile drawer** (<860px): sidebar still renders inline as a wrapped cloud of 23 links above the content. Design notes and constraints are in `LayoutShell.md`. Three attempts were killed for model-routing reasons, not for technical ones; no partial drawer code is in the tree.
2. **`#/study-time` at 390px**: `.stweek-x` nowrap labels make `scrollWidth` 397.
3. **Review phase**: orchestrate-v3 review-and-iterate has not run on any unit. `node tools/test-*.js` full pass has not been run after all units landed together (each unit ran only its own suites).
4. **`AGENTS.md` and `.agents/skills/handoff-prompt/evolution.md`** show pre-existing modifications not made by this session (a `$HOME` note; a dropped 2026-08-24 lesson). Left untouched.

## Leftover risk

- Five agents edited `css/style.css` concurrently in owned sections; no merge conflicts were reported but the file has not been read end to end since.
- `index.html` now uses `defer` on all 52 scripts with a single `?v=20260909a`; boot was changed to wait for `DOMContentLoaded`. Verified 17 routes error-free by the Performance agent only.
- Servers named `pgre-*` may still be registered in hub `ps`.
