# Handoff: Formula Visualizer Aesthetics

## Role
You are the **orchestrator**, not the implementer. Load `.agents/skills/orchestrate-v3/SKILL.md` (and its `evolution.md`) and stay in that role for the whole session. Dispatch children for chrome, tests, and each of the 10 trio files; review-and-iterate; write `FINDINGS.md`. Do not restyle the 30 pictures or edit `js/visualizers/trio-g*.js` in the parent context. A 2026-08-24 goal-mode session started implementing; the user stopped it: "Wait, your role is the orchestrator, not the implementer."

## Why This Matters
The 30 formula visualizers sit inside a cream/coral study site but still look like a dark sci-fi lab: cramped, legends covering the motion, mixed palettes. They should feel native to the site and actually teach the formula.

## Current State
- `/Users/Reid Hu/Physics GRE` — chrome `js/visualizer-engine.js` + `css/visualizer.css`; 10 trios `js/visualizers/trio-g1.js` … `trio-g10.js`; Lab in `js/view-formulas.js` (`mode === 'visual'` on `#/formulas`); wired in `index.html` (`?v=20260824a`).
- Style reference (out of scope): `simulations/oscillator.html`.
- Visual QA: `.agents/skills/verify/SKILL.md` (never localhost:8000).
- Residue: `99_System/Handoff documents/formula-visualizer-aesthetics/formula-visualizer-aesthetics.md`

## Success Criteria
- Each of the 30, opened one by one in Visualizer Lab on desktop, is a cream/coral teaching picture: full-width drawing, controls underneath, legend in a reserved strip that never covers the animation, no colliding labels/arrows/plots.
- Same layout on formula-card backs. Same 30 formula IDs; none added or dropped.
- Shared chrome lives in CSS/engine; the 30 live in the 10 trio files; the parent has dispatched the restyle (not performed it), visually checked all 30, and written `FINDINGS.md`.

## Non-document facts
- User assigned this agent the orchestrator role (lean coordinator under orchestrate-v3), not implementer.
- User interrupted the 2026-08-24 goal-mode pass that implemented in the parent context.
- User limited scope to the 30 formula visualizers; oscillator.html is the look reference and is out of this pass.
- User chose cream canvases (oscillator-like), stacked full-width canvas + controls below, identical in Lab modal and inline flashcard backs.
- User required legends in a reserved strip outside the moving drawing; “no overlap” means nothing collides inside the drawing.
- User allowed free redesign (picture, parameters, copy) of any weak sim, still for that formula.
- User required desktop-only visual check of all 30, one by one, in Visualizer Lab.
- User required a 10-way fan-out after splitting into 10 files so agents do not share a file. Trios: (1) 1.35, 1.38, 1.3 (2) 1.4, 1.22, 1.20 (3) 1.39, 1.41, 1.42 (4) 1.47, 1.24, 1.25 (5) 1.26, 1.27, 1.15 (6) 1.28, 1.29, 1.30 (7) 1.31, 1.32, 1.33 (8) 1.9, 2.4, 2.8 (9) 2.70, 4.14, 5.18 (10) 5.27, 6.18, 7.17.
- Working tree already has uncommitted visualizer CSS/engine/trio work from that interrupted pass; user directed to continue from those, not revert.
- Site rule: no emojis or decorative icons. User has little CS background — when a decision is required, explain options in plain terms.

## Principles of Paramount Importance
- **Zero Assumptions:** Never guess user intent. If multiple implementations exist or requirements are incomplete, **halt and use the `AskUserQuestion` tool** to gather explicit direction.
- **No Silent Assumptions:** Even when the task is requested, confirm the *method* if it wasn't specified.
