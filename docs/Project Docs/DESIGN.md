# Physics GRE Prep Studio — Design Document

Personal, fully-local study site for the GRE Physics Test (exam day: **Wed, October 28, 2026**).
Everything runs from static files; all data stays on this machine (localStorage + IndexedDB).

---

## 1. Architecture

- **No build step.** Plain HTML/CSS/JS, hash-routed single page (`index.html` → `#/...`).
- **State** in `localStorage` (`pgre-state-v1`): XP, per-question/per-topic records,
  achievements, plan check-offs, streaks, daily counters, activity log.
- **Book content** in `IndexedDB` (`pgre-content`): raw imported markdown, chapter splits,
  chapter→topic mapping. Kept out of localStorage because of its ~5 MB quota.
- **Vendored libraries** (offline): `marked` (markdown → HTML), `KaTeX` + auto-render
  (math typesetting, `$...$`, `$$...$$`, `\(...\)`, `\[...\]`).
- **Aesthetic:** Anthropic-inspired — ivory ground (`#FAF9F5`), near-black ink (`#141413`),
  terracotta accent (`#CC785C`), serif display type, quiet cards, thin single-hue meters.

## 2. Gamification

### XP sources
| Event | XP |
|---|---|
| Correct answer | +10 (+5 extra the first time a question is solved) |
| Incorrect answer | +2 |
| Formula card reviewed | +2 (any grade; awarded quietly at session end) |
| Plan task | +10 to +50 (task-specific; granted once, survives un-checking) |
| Daily challenge | +10 to +30 |
| Achievement | Bronze +25 · Silver +50 · Gold +100 · Platinum +200 |

### Levels
Cumulative XP for level *n*: `50·n·(n−1)` → 0, 100, 300, 600, 1000, 1500, …
Titles climb the physics ladder: Quark → Electron → Photon → Atom → Molecule → Oscillator →
Wavefunction → Eigenstate → Hamiltonian → Lagrangian → Tensor → Quasar → Pulsar →
Neutron Star → Supernova → Nobel Laureate.

### Streaks & days
A day counts as active when ≥1 question is answered, a plan task completed, or a formula card reviewed.
Streak = consecutive active days (shown live; broken if the last active day is before yesterday).

### Daily challenges
3 per day, picked deterministically from a 6-item pool seeded by the date, auto-claimed
when their live counters (answers, correct-run, topics touched, plan tasks, notes visits) cross the goal.

### Achievements (36, hierarchical)
6 categories × 4 tiers. Chains (Problem Solver I–IV, streak 3/7/14/30, XP milestones, topic
mastery 1/3/6/9) create the hierarchy; five are secret (hidden until unlocked).
Defined in `js/data-achievements.js`; metric- or flag-based, checked centrally in
`gamify.checkAchievements()` (looped, since bonus XP can cascade into XP-milestone unlocks).

### Mastery
Per-topic mastery = share of that topic's question bank solved correctly at least once.
It will become more meaningful as the bank grows past the 20 preview questions.

## 3. Content pipeline — *status: placeholder, awaiting the real file*

The site is frame-first: **20 preview questions** (hand-written, GRE-style, 5 choices)
spread across all 9 topics stand in until the *Conquering the Physics GRE* markdown arrives.

**Math convention:** all formulas — in question statements, choices, and solutions — are
authored as LaTeX inside `$...$` delimiters and typeset offline by KaTeX at render time
(`PGRE.typesetMath`, called after every practice-view render stage and on imported notes).
Anything added to the question bank, including parser-v2 output, must follow the same convention.

**Implemented now (Library page):**
- Drag-drop / file-picker import of any `.md` file → stored raw in IndexedDB.
- Naive splitter on `#`/`##` headings → sections.
- Manual section → topic mapping; mapped sections render (marked + KaTeX) in that
  topic portal's *Notes & reading* card.
- Importing sets the "The Tome Arrives" secret achievement.

**To build once the real file is here (parser v2):**
1. Inspect the actual markdown structure (chapter headings, problem blocks, solutions,
   answer keys — the book has end-of-chapter problems with worked solutions).
2. Write a structure-aware parser: chapter → topic auto-mapping; extract each problem
   into the question format of `js/data-questions.js`
   (`{id, topic, difficulty, q, choices[5], answer, sol}`), converting math to KaTeX-renderable form.
3. Merge extracted questions into the bank (namespaced ids, e.g. `cpg-ch2-p14`), keeping
   the 20 preview questions as a `preview` source that can be filtered out.
4. Recompute mastery denominators; unlock the mock-exam simulator (below).

## 4. Timed mock-exam simulator — *status: designed, deliberately deferred*

Deferred because a full-length simulation is meaningless with a 20-question bank.
The UI slot exists (`#/exam`, sidebar entry "Mock exam · soon"). Design:

### Formats
- **Current (default):** 70 questions · 120 minutes — the revised test (since Sept 2023).
- **Legacy mode:** 100 questions · 170 minutes — matches released ETS practice PDFs
  (GR8677, GR9277, GR9677, GR0177, GR1777), which the study plan schedules on paper meanwhile.

### Exam-room UI
- Full-screen takeover, countdown timer (amber at 15 min, red at 5 min).
- Question palette: grid of numbers — unanswered / answered / flagged-for-review.
- Flag, skip, back-navigation; **no feedback until submission**; optional pause (practice integrity note shown).
- Question order: fixed random seed per session; topic distribution follows official weights
  (CM 20%, EM 18%, QM 13%, TS 10%, AP 10%, ST 9%, OW 8%, SR 6%, LM 6%).

### Scoring & results
- Raw score = number correct (no guessing penalty on the current test).
- Approximate scaled score via a published raw→scaled lookalike table (documented as an estimate).
- Per-topic breakdown chart → feeds the "weakest topics" ranking used by Phase 3 plan tasks.
- Session history stored in state (`state.exams[]`: date, format, raw, scaled-est, per-topic, duration used).

### Gamification hooks (reserved ids)
- XP: +150 completion, +1 per correct.
- Achievements to add when it ships: *First Full Sim* (bronze), *Marathoner* — 3 sims (silver),
  *Peak Performer* — ≥85% raw (gold), *Simulated Victory* — beat your previous sim score twice (gold).

### Data model sketch
```js
state.exams = [{
  id, startedAt, format: '70x120' | '100x170',
  seed, answers: {qid: choiceIdx}, flags: [qid],
  submittedAt, raw, scaledEst, perTopic: {cm: {right, total}, ...}
}]
```

## 4b. Attempt history, mistake book & formula recall — *status: shipped*

Three linked subsystems (all state in `localStorage`, so export/restore covers them;
scheduling in `js/srs.js`):

### Per-attempt history (`#/history`, `js/view-history.js`)
Every answer is appended to `state.attempts` — full logging, not aggregates
(a deliberate choice): `{ ts, qid, topic, picked, answer, correct, ms, sid, mode }`.
Each practice run / mistake drill is a row in `state.sessions`
(`{ id, mode, topicId, startedAt, endedAt, planned, answered, correct, xp }`), kept
live per answer so abandoned sessions still show real progress. Size budget: an
attempt is ~120 bytes of JSON; even 10,000 attempts ≈ 1.2 MB, comfortably inside
the ~5 MB localStorage quota for a one-exam-cycle site.

### Mistake book (`#/mistakes`, `js/view-mistakes.js`)
A miss creates/updates `state.mistakes[qid]`: first/last missed, every distinct
wrong pick, miss/solve counts, and a review schedule. Rules (user-chosen):
- **Permanent.** Solving a mistake never removes it — it climbs the ladder
  **1 → 3 → 7 → 14 → 30 → 60 days** (capped at 60). A new miss resets to step 0
  (due tomorrow). The only removal is the user's manual **Archive** (reversible;
  archived entries are hidden from drills and due counts; a fresh miss reopens them).
- Portal shows the wrong pick beside the correct answer and solution; re-drill
  (due / all / single) reuses the practice answering pipeline with `mode: 'mistakes'`,
  so drills earn normal XP and log attempts like any answer.

### Formula recall (`#/formulas`, `js/view-formulas.js`, deck: `js/data-formulas.js`)
Vocabulary-app flip cards: prompt → flip → self-grade **Again / Hard / Good / Easy**.
SM-2-style scheduling per card in `state.cards` (`ease` 1.3–3.0 starting 2.5;
Again resets reps and repeats within the session; Hard ×1.2; Good ×ease; Easy
×ease×1.3 — button labels preview the exact next interval). New + due cards form
the daily queue, surfaced on the dashboard *Review queue* card and as sidebar badges.
**The deck ships empty by design** — cards come only from the book import
(parser v2 appends to `PGRE.FORMULAS` or stores
`{ id: 'formula-deck', kind: 'formula-deck', cards: [...] }` in IndexedDB;
`PGRE.formulaDeck()` merges both). Keyboard: space flips, 1–4 grade.

## 5. Review plan (data: `js/data-plan.js`)

Jul 13 → Oct 28, 2026 · **intensive ~15–17 h/week** · three phases:

1. **Foundation Pass (W1–W9, Jul 13–Sep 13)** — one deep pass over all 9 topics in
   exam-weight order (CM, CM, EM, EM, OW, TS, QM, QM+AP, AP+SR), building a formula
   sheet page per topic.
2. **Second Pass & Practice Tests (W10–W13, Sep 14–Oct 11)** — finish LM+ST, then fast
   re-sweeps; one full released ETS exam per week (GR8677 → GR9277 → GR9677 → GR0177),
   timed, on paper; miss-classification feeds a weak-topic list.
3. **Sharpen & Taper (W14–W16, Oct 12–28)** — data-driven drilling of the 3 weakest
   topics, GR1777 + final mock, memorization sweep, logistics, taper. Exam Wednesday Oct 28.

Weeks render as collapsible cards; the current week auto-opens; checking tasks grants XP once.

## 6. Design-system notes (dataviz conventions applied)

- Meters: fill = accent terracotta; track = lighter step of the same hue (never gray).
- Stat tiles: sentence-case label, sans-semibold value, proportional figures.
- Status (correct/incorrect) always icon + label, never color alone; green/red reserved
  for status, never decoration.
- Text never wears data color; identity comes from a colored mark beside the text.
- Single-series meters carry no legend.

## 7. Deliberately out of scope (for now)

- Accounts, sync, server anything — the point is local.
- Dark mode (the ivory Anthropic look is the design; can be added as a `data-theme` layer).
- Question shuffle of choices (kept in authored order, GRE-style).
