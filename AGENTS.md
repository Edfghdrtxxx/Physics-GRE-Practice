# Personal Context
I have little background in computer science. When a decision is required of me, please explain the options clearly and in plain terms so that I can respond meaningfully.

# Repository Structure & Placement

- `index.html`: SPA entry shell (hash-routed, offline KaTeX/marked).
- `js/`: Application logic, state stores (`store.js`, `srs.js`, `gamify.js`, `bank.js`), static datasets (`data-*.js`), view modules (`view-*.js`), router (`app.js`).
- `css/`: Stylesheets (`style.css` Anthropic palette, `fonts.css`, `visualizer.css`, `print.css`).
- `simulations/`: Standalone interactive physics visualizers/sandboxes (`oscillator.html`, `simulations/README.md`).
- `tools/`: Offline node/python build scripts, extraction pipelines, and unit test suites (`test-*.js`).
- `content/`: Question banks and assets. Gitignored generated datasets (`bank/`), figures (`book-assets/`), ETS assets (`ets-assets/`, `ets-src/`).
- `20_docs/`: Project documentation (`Project Docs/` for specs/proposals/design) and gitignored exam/book PDFs (`ETS Released Exams/`, `Conquering the Physics GRE.../`).
- `99_System/`: Meta project files and structured cross-agent handoffs (`Handoff documents/`).
- `.agents/`: Custom agent capabilities, configurations, and skills (`skills/`).
- `vendor/`: Vendored offline third-party libraries (KaTeX, Marked).
- `fonts/`: Locally hosted web fonts.

## Placement Rules
- **UI Views:** Add `js/view-<name>.js` and register routes/navigation in `js/app.js`.
- **Simulations:** Add standalone HTML visualizers in `simulations/` matching `oscillator.html` patterns.
- **Tests & Scripts:** Place offline node/python runners, verification tools, and test suites in `tools/`.
- **Handoffs:** Place cross-agent handoff briefs in `99_System/Handoff documents/<topic>/`.
- **Agent Skills:** Place reusable agent workflows and instructions under `.agents/skills/<skill-name>/`.
- **Specs & Proposals:** Place design documents, RFCs, and proposals in `20_docs/Project Docs/`.
- **Copyrighted Materials:** Store all original and derived exam/book content exclusively in gitignored paths under `20_docs/` and `content/`.
- **Maintenance:** Update `AGENTS.md` immediately whenever repo structure or file placement patterns change.

# Content Rules

- **Spoiler protection (user-approved):** real-exam questions — the book's sample exams (`src: 'cpg-exam'`) and released ETS exams (`src: 'ets-exam'`) — must never enter the daily/topic practice pool. `PGRE.allQuestions()` (the default pool) excludes them; only the exam simulator's draw and by-id lookups (review, mistake book, analytics) may pass `{ includeExam: true }`. Never weaken this when adding features — intact exams must stay fresh for realistic simulation. Consumers of `includeExam` outside the sanctioned two (global search, the custom-quiz toggle, the weighted 70-question draw) filter `src === 'ets-exam'` back out as a protective default (2026-07-18). Open decision: whether ETS exams the user has already sat should graduate into the weighted draw.
  - **Approved exception (2026-07-18):** GR8677 and GR9277 only — the two oldest forms — are broken up into daily-drill questions (`src: 'ets-drill'`, `PGRE.ETS_DRILLS`) that DO live in the default pool, and are never offered as simulator mocks. This exception covers exactly these two exams; the other five stay under the rule.
- **ETS copyright:** released-exam PDFs and everything derived from them (extracted questions, figures, keys) live only in gitignored paths — `20_docs/ETS Released Exams/`, `content/ets-src/`, `content/ets-assets/`, `content/bank/`. The public repo carries code only. Link to sources; never commit or republish exam content.
- **LaTeX Math & Physics Content:** All math and physics variables, formulas, expressions, units, and symbols must always be written in LaTeX format (`$...$` for inline, `$$...$$` for display block), including all content in animations, simulations, canvases, diagrams, parameter controls, tables, and off-canvas legend strips. Do not use plain text/unicode approximations (e.g. use `$C_P$`, `$C_V$`, `$\Delta T$`, `$\Delta U = Q - W$`, `$\gamma = C_P/C_V$`, `$\omega$`, `$\hbar$`, `$\partial Q / \partial T$`, etc.).

# Visualizer & Simulation Rules

- **Animation speed control:** Animated content must offer adjustable playback (default 1.0x). Standalone sims: copy `oscillator.html`'s speed cluster. Lab cards: `simSpeed` parameter (0.2–3.0, default 1.0) scaling `dt`. Static cards exempt.

# Style Rules

- **No Emojis or Icons:** Never use emojis or decorative icons anywhere (chat, UI, canvas, code, docs, commit messages).