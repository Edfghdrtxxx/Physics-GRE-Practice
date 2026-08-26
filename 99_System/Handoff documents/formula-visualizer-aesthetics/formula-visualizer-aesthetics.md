# Residue — Formula visualizer aesthetics

Companion to the clipboard handoff. Do not clone Why / Success / Principles / Non-document facts from that prompt. This file is leftover risk, already-patched work, exact extras, and where to write FINDINGS.

Repo: `/Users/Reid Hu/Physics GRE` (space in path). No-build SPA. Exam day 2026-10-28.

---

## Who acts

The clipboard prompt’s **Role** is binding. Parent = orchestrator (dispatch, review, `FINDINGS.md`). Children = one trio file each (plus any chrome/test child the parent sends). Parent does not edit `js/visualizers/trio-g*.js`. No worktree isolation in this vault — serialize same-file writes.

---

## Already patched (uncommitted — continue, do not revert)

Working tree after the interrupted 2026-08-24 goal-mode implementer pass, on top of `52e893b`. Mechanical split + chrome; **not** a finished Lab pass.

| Path | What already landed |
|---|---|
| `css/visualizer.css` | Stacked `.viz-sim-grid` (`1fr`, no 310px side column); cream `.viz-canvas-wrapper`; reserved `.viz-legend-strip`; canvases stay cream in dark mode. Cache-buster `20260824a`. |
| `js/visualizer-engine.js` | Chrome only (~1.4k lines): stacked HTML with legend strip, `appendVizLegend` / `paintLegendStrip`, cream `CV` / `DrawUtils` / `VizU`, HUD helpers write to the DOM strip not the canvas, `createStyleIfNotExists` is a no-op. |
| `js/visualizers/trio-g1.js` … `trio-g10.js` | The 30 registrations, one trio per file. Mechanical cream-shift of dark hex; pictures not visually redesigned. |
| `index.html` | Loads engine + the 10 trio scripts (`?v=20260824a`). |
| `simulations/oscillator.html` (untracked) | Look reference. Out of this pass. |
| `tools/test-oscillator-chrome.js` (untracked) | CDP driver for that page only. Not a Lab harness. |
| `.agents/skills/handoff-prompt/evolution.md` | Skill-log; unrelated to visualizer pictures. |

Nothing here is committed. User directed to continue from this tree.

---

## Leftover risk (will reappear if children only assume the split is done)

**Pictures still unreviewed**

- Split + palette remap is not a Lab pass. No `FINDINGS.md`. No in-repo Node tests for the 30 ids / stacked chrome / cream fill. Custom on-canvas HUDs (e.g. gyro readout in G2 `cpgf-1.20`) may still paint boxes on the drawing.
- Mechanical cream-shift can leave ink-on-cream collisions, leftover cyan trails, and plots that still overlap. Each trio still needs a teaching-picture pass.

**Lab is easy to miss / easy to find empty**

- Not a hash. Route `#/formulas`, then tab `Visualizer Lab` (`mode === 'visual'` in `js/view-formulas.js`).
- That tab is **disabled when the formula deck is empty** (`empty && t[0] !== 'study'`). Visualizers register from the trio files regardless; Lab UI still waits on the deck. Deck comes from gitignored `content/bank/cpg-formulas.js` via IndexedDB. If Lab is greyed out, the deck is missing — do not treat that as a missing visualizer.
- Lab listing keeps `k.startsWith('cpgf-')`. Ignore extra keys `cluster3` and `cluster-5` if they reappear.
- Inline path: Study mode, flip a card → `renderInlineVisualizer(c.id, backEl)`. Same chrome classes as the modal.

**Engine contract (so children do not break the loop)**

Each card is `PGRE.visualizers['cpgf-<eq>']` with roughly: `id`, `title`, `formulaLatex`, `physicalStory`, `derivationSteps`, `limitingCases`, `greTraps`, `parameters[]`, `challenge`, `draw(ctx, width, height, state, dt)`, optional `init` / `onParamChange` / `onChange` / `onUpdate`. Parameter types: range (default), `select`, `toggle`. Engine builds controls from `parameters`; `draw` is the picture. HUD/readout goes through `PGRE.appendVizLegend` into `.viz-legend-strip`.

Engine shell is ES5 (`var`, IIFE). Trio files use `const`/`let`/template strings. No build step. Shared helpers live on `PGRE.CV`, `PGRE.DrawUtils`, `PGRE.VizU`, `PGRE.VizH`.

**Verify origin**

`.agents/skills/verify/SKILL.md`: serve **not** on `:8000` (Reid’s real `localStorage` lives there). Typical: `python3 -m http.server 8123` + headless Chrome CDP `:9333`, isolated `--user-data-dir`. Screenshot via `Page.captureScreenshot`. Hash changes need ~250 ms; formula deck from IndexedDB ~400 ms.

**Do not touch**

- `simulations/oscillator.html` (reference only).
- Exam/bank gitignored content; no emoji/icon in canvas, CSS, or copy (`Agents.md`).

---

## Exact extras

### How to open one

1. Serve the repo root on a non-8000 port.
2. `#/formulas` → **Visualizer Lab** → click a card → modal (`PGRE.openVisualizerModal`).
3. Desktop window only (Reid waived phone-width checks).
4. Inline spot-check: `#/formulas` Study → flip a card that has a matching `cpgf-` id.

### Object / CSS hooks that every trio still shares

- Canvas: `#viz-canvas` (modal) / `#viz-inline-canvas` (flashcard). Wrapper `.viz-canvas-wrapper`. Grid `.viz-sim-grid`. Legend `.viz-legend-strip`. Controls `.viz-controls-panel`.
- Site tokens live in `css/style.css` (`--bg #faf9f5`, `--panel #f5f0e8`, `--accent #cc785c`, `--accent-deep #964b32`, `--platinum #5db8a6`, `--ink #141413`, `--line #e6dfd8`, `--gold #d4a017`, `--good` / `--bad`, `--serif` Newsreader, `--sans` Inter, `--mono-instr` JetBrains Mono). Dark: `[data-theme="dark"]`. Declared aesthetic: `docs/Project Docs/DESIGN.md` §1.

### File map (after the split)

| G | IDs | File | Titles |
|---|---|---|---|
| 1 | 1.35, 1.38, 1.3 | `js/visualizers/trio-g1.js` | Kepler 2nd / areal law; effective potential; centripetal *a* / hodograph |
| 2 | 1.4, 1.22, 1.20 | `js/visualizers/trio-g2.js` | centripetal force; Coriolis; rotational Newton |
| 3 | 1.39, 1.41, 1.42 | `js/visualizers/trio-g3.js` | Hooke / SHO ODE; SHO phasor; coupled oscillators |
| 4 | 1.47, 1.24, 1.25 | `js/visualizers/trio-g4.js` | pendulum; continuous *I*; parallel-axis |
| 5 | 1.26, 1.27, 1.15 | `js/visualizers/trio-g5.js` | continuous CM; discrete CM; work ∫F·dl |
| 6 | 1.28, 1.29, 1.30 | `js/visualizers/trio-g6.js` | Lagrangian; Euler–Lagrange; canonical / cyclic *p* |
| 7 | 1.31, 1.32, 1.33 | `js/visualizers/trio-g7.js` | Hamiltonian / Legendre; *H*=*T*+*U*; Hamilton’s equations |
| 8 | 1.9, 2.4, 2.8 | `js/visualizers/trio-g8.js` | ΔU=−∫F·dl; E=−∇V; Poisson integral for *V* |
| 9 | 2.70, 4.14, 5.18 | `js/visualizers/trio-g9.js` | Ohm / Drude; First Law; Heisenberg |
| 10 | 5.27, 6.18, 7.17 | `js/visualizers/trio-g10.js` | free-particle wave; relativistic KE; decay law |

### Rejected alternatives (do not re-open)

Oscillator in scope. Dark canvas stage. Side-by-side canvas\|controls (even if larger). On-canvas overlay legends. Look-only / no redesign. Shipping a subset. Phone-width QA for all 30. Ten agents editing the same `visualizer-engine.js` (worktrees or taking turns). Parent implementing the 30 in goal mode.

---

## Where FINDINGS go

Same folder as this brief:

`/Users/Reid Hu/Physics GRE/99_System/Handoff documents/formula-visualizer-aesthetics/`

| File | Who writes it |
|---|---|
| `FINDINGS.md` | Parent (orchestrator). One section per `cpgf-` id after the desktop Lab pass: native-to-site? full-width + controls below? legend strip clear of motion? any remaining collision? redesigned or restyled? screenshot path if taken. |
| `FINDINGS-g1.md` … `FINDINGS-g10.md` | The trio child, before parent review. Same checklist, just their three ids. |

Screenshots (if kept): `shots/` next to those files, named `cpgf-1.35.png` etc. Do not commit exam PDFs or gitignored bank files.
