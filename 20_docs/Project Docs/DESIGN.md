# Physics GRE Prep Studio — Design Document

Personal, fully-local study site for the GRE Physics Test (exam day: **Sun, November 1, 2026**).
Everything runs from static files; all data stays on this machine (localStorage + IndexedDB).

---

## 1. Architecture

- **No build step.** Plain HTML/CSS/JS, hash-routed single page (`index.html` → `#/...`).
- **State** in `localStorage` (`pgre-state-v1`). Schema keys: `xp`, `questions`,
  `topics`, `achievements`, `plan`, `daysActive`, `streak`, `today`, `flags`,
  `attempts`, `sessions`, `mistakes`, `exams`, `notes`, `bookmarks`, `settings`,
  `formulaDay`, `formulaStudy`, `migrations`, `studyLog`, `timer`, `timerStats`,
  `focusSessions`, `formulaSuspended`, `formulaCheckIn`, `cards`, `cardReviews`,
  `cardNotes`, `log`, `contentMeta`, `_rev`, `_epoch`. Persistence is
  read-merge-write (`save()`): `_rev` is a monotonic counter, `_epoch` is a wipe
  marker, `_mergeFromDisk` unions append-only arrays and takes maxes of counters.
  A `storage` listener adopts sibling-tab writes; `PGRE.onStateAdopted` is the
  repaint hook. Not last-write-wins.
- **Book content** in `IndexedDB` (`pgre-content`): raw imported markdown, chapter splits,
  chapter→topic mapping. Kept out of localStorage because of its ~5 MB quota.
- **Vendored libraries** (offline): `marked` (markdown → HTML), `KaTeX` + auto-render
  (math typesetting, `$...$`, `$$...$$`, `\(...\)`, `\[...\]`).
- **Aesthetic:** Anthropic-inspired — cream floor (`#f5f0e8`), ivory cards, near-black
  ink (`#141413`), terracotta accent (`#CC785C`), serif display type, thin meters.

## 2. Gamification

### XP sources
| Event | XP |
|---|---|
| Correct answer | +10 (+5 extra the first time a question is solved) |
| Incorrect answer | +2 |
| Formula card reviewed | +2 (any grade; awarded quietly at session end) |
| Formula daily check-in | +15 (once per local day on first Study / Match / Type / Quiz / Cloze settle; formula-specific streak) |
| Plan task | +5 to +50 (task-specific; granted once, survives un-checking) |
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

### Achievements (80, hierarchical)
80 across 10 categories (`progress`, `knowledge`, `dedication`, `mastery`, `plan`,
`exam`, `formulas`, `focus`, `review`, `secret`); 7 are secret (hidden until unlocked).
Chains (Problem Solver I–IV, streak 3/7/14/30, XP milestones, topic mastery 1/3/6/9)
create the hierarchy.
Defined in `js/data-achievements.js`; metric- or flag-based, checked centrally in
`gamify.checkAchievements()` (looped, since bonus XP can cascade into XP-milestone unlocks).

### Mastery
Per-topic mastery = share of that topic's question bank solved correctly at least once.
The default practice pool is 366 questions (20 preview + 146 CPG chapter problems +
200 ETS drills from GR8677/GR9277). Exam-only content is excluded from the denominator
(see §3).

## 3. Content pipeline — *status: SHIPPED (July 15, 2026 — parser v2 ran as an offline extraction pipeline)*

> **What shipped:** the book markdown was parsed offline (multi-agent extraction with
> adversarial verification, one agent per problem section / exam chunk / index chapter)
> into three **gitignored** generated files under `content/bank/`:
> `cpg-questions.js` (146 end-of-chapter problems, `PGRE.BOOK_QUESTIONS`, ids `cpg-<sec>-<n>`),
> `cpg-exams.js` (Sample Exams 1–3, 100 questions each, `PGRE.BOOK_EXAMS`, ids `cpg-x<n>-<q>`),
> `cpg-formulas.js` (334 formula cards, **strictly 1:1 with the book's numbered equations**
> per the EQUATION INDEX — user rule: only labeled equations are memorization-worthy;
> ids `cpgf-<eq>`). Referenced figures are copied to `content/book-assets/` (gitignored).
> ~96% of questions also carry `choiceSols` — per-choice distractor explanations mined
> from the worked solutions (see §8). `js/bank.js` merges preview + book + exam sources
> (`PGRE.allQuestions`, `questionById`, `questionsForTopic`); mastery denominators use the
> default pool (preview + chapter problems; exam questions are opt-in via the quiz builder
> to keep sims fresh). The pipeline is re-runnable; regenerated files simply overwrite.

> **Released ETS exams (2026-07-18):** five intact ETS exams (`PGRE.ETS_EXAMS`: ets2024 —
> the current 70-question format, with official P+ stats — plus GR1777, GR0877, GR0177,
> GR9677, all 100 questions) plus two drill sets (GR8677, GR9277; see exception below)
> are extracted from local PDFs (gitignored `20_docs/ETS Released Exams/`) by a multi-agent
> pipeline (transcribe → fidelity audit → blind-solve vs official key → reconcile) into
> gitignored `content/ets-src/`, then built by `tools/build-ets-exams.js` into gitignored
> `content/bank/ets-exams.js`. The simulator replays the five exams verbatim with the
> official answer key. Official raw→scaled tables live on the bank field `exam.scale[]`;
> a submitted sitting records `scaledEst` and `scaledOfficial: true`.
> **Spoiler-protection rule (user-approved):** exam-sourced questions (`cpg-exam`, `ets-exam`)
> never enter the default practice pool — `{ includeExam: true }` is reserved for the
> simulator draw and by-id lookups (review, mistake book, analytics) so intact exams stay
> fresh for simulation. The three other `includeExam` consumers — global search, the
> custom-quiz "include sample-exam" toggle, and the weighted 70-question draw — filter
> `src === 'ets-exam'` back out (protective default, 2026-07-18), so only the book's
> sample exams flow through them. See AGENTS.md → Content Rules.
> **Approved exception (2026-07-18):** GR8677 (1986) and GR9277 (1992) — the two oldest,
> least-representative forms — are deliberately broken up into ~200 daily-drill questions
> instead of mocks: built with `drill: true` into `PGRE.ETS_DRILLS` (src `ets-drill`), they
> DO join the default practice pool and are never listed in the simulator. The other five
> exams stay pristine under the rule above. Drill questions that near-duplicate a kept
> exam's question are quarantined (`meta.json → quarantine`) so they can't spoil that mock.

The site is frame-first: **20 preview questions** (hand-written, GRE-style, 5 choices)
spread across all 9 topics. Shipped: the CPG bank (146 chapter problems, 3×100 sample
exams, 334 formula cards) and ETS drills + exams are merged in (see the SHIPPED callout
above); the preview set remains as `src: 'preview'`.

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

**Parser v2 — shipped (July 15, 2026).** Historical plan (executed; not remaining work):
1. Inspect the actual markdown structure (chapter headings, problem blocks, solutions,
   answer keys — the book has end-of-chapter problems with worked solutions).
2. Write a structure-aware parser: chapter → topic auto-mapping; extract each problem
   into the question format of `js/data-questions.js`
   (`{id, topic, difficulty, q, choices[5], answer, sol}`), converting math to KaTeX-renderable form.
3. Merge extracted questions into the bank (namespaced ids, e.g. `cpg-ch2-p14`), keeping
   the 20 preview questions as a `preview` source that can be filtered out.
4. Recompute mastery denominators; unlock the mock-exam simulator (below).

## 4. Timed mock-exam simulator — *status: SHIPPED (July 15, 2026)*

Implemented as designed below (`js/exam-engine.js` + `js/view-exam.js`). Weighted
70×120 draw (official weights, largest-remainder apportionment, prefer-unseen) plus
verbatim replay of the five released ETS exams (`ETS_EXAMS`, including ets2024 70q)
then the three book sample exams (`BOOK_EXAMS`). In-progress sittings persist
and resume across reloads; the countdown is wall-clock-based (background-tab throttling
can't buy time). Blanks and misses feed the mistake book; every question logs an
attempt row `mode:'exam'` for analytics. Original design:

### Formats
- **Current (default):** 70 questions · 120 minutes — the revised test (since Sept 2023);
  weighted draw, plus verbatim ets2024 (70q).
- **Legacy mode:** 100 questions · 170 minutes — verbatim replay of intact 100q mocks:
  GR1777, GR0877, GR0177, GR9677, and book Sample Exams 1–3. GR8677 and GR9277 are
  drill sets (`ETS_DRILLS`, src `ets-drill`), not mocks.

### Exam-room UI
- Full-screen takeover, countdown timer (amber at 15 min, red at 5 min).
- Question palette: grid of numbers — unanswered / answered / flagged-for-review.
- Flag, skip, back-navigation; **no feedback until submission**; optional pause (practice integrity note shown).
- Question order: fixed random seed per session; topic distribution follows official weights
  (CM 20%, EM 18%, QM 13%, TS 10%, AP 10%, ST 9%, OW 8%, SR 6%, LM 6%).

### Scoring & results
- Raw score = number correct (no guessing penalty on the current test).
- Scaled score: verbatim released sittings use the bank exam's `exam.scale[]` (sitting
  sets `scaledEst` + `scaledOfficial: true`); otherwise an estimate table (documented as an estimate).
- Per-topic breakdown chart → feeds the "weakest topics" ranking used by Phase 3 plan tasks.
- Session history stored in state (`state.exams[]`: date, format, raw, scaled-est, per-topic, duration used).

### Gamification hooks — shipped
- XP: +150 on submit; the sitting stores the raw score.
- Seven exam achievements: *First Full Sim*, *Marathoner*, *Peak Performer*,
  *Simulated Victory*, *Battle-Tested*, *Monte Carlo*, *Top of the Curve*.

### Data model sketch
```js
state.exams = [{
  id, startedAt, format: '70x120' | '100x170',
  seed, answers: {qid: choiceIdx}, flags: [qid],
  submittedAt, raw, scaledEst, scaledOfficial: true, perTopic: {cm: {right, total}, ...}
}]
```
Official raw→scaled table lives on the bank exam (`exam.scale[]`), not this row.

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

### Formula recall (`#/formulas`, `js/view-formulas.js`, deck: `PGRE.formulaDeck()`)
Vocabulary-app flip cards: prompt → flip → self-grade **Again / Hard / Good / Easy**.
Anki SM-2 scheduling (`js/srs.js` `nextIntervals`, lines 205–236) per card in
`state.cards` (`ease` 1.3–3.0 starting 2.5; Again resets reps and repeats within
the session). New cards: Hard/Good = 1d, Easy = 4d. Reviews add `daysLate`. Floors:
Hard $\ge$ ivl+1, Good $\ge$ Hard+1, Easy $\ge$ Good+1. Button labels preview the
exact next interval. `gradeCard` also stamps
`lastReviewedDay` (LOCAL date) — the `studiedToday` source of truth (never compare a
UTC ISO prefix to a local date string).

**User-curated daily batch** (`srs.formulaDay()` is prune-only — it never auto-fills).
The daily target is a **soft
suggestion** (clamp **1–100**, default **10**; every read routes the raw value through
`srs.clampTarget`, so an imported/corrupt value can't poison the UI). `state.formulaDay`
= `{ date, reviewIds: [], newIds: [], softIds?: [] }` holds the picked batch. It starts EMPTY
and grows through explicit user actions: the picker, browse/search Add, and the **fill**
CTA (`srs.fillFormulaDayIfEmpty`) on the dashboard (`js/view-dashboard.js`) and formulas
home (`js/view-formulas.js`), which fills up to `clampTarget` unseen ids when the batch
is empty. It **persists across day rolls** (un-studied
picks carry over) and is reconciled on every access (`srs.formulaDay(deck)`, persisted only
when it changed; an empty batch returns a transient object WITHOUT persisting, guarding the
nav-badge path that runs before IndexedDB resolves):
- **Reconcile (prune-only):** drop ids no longer in the deck or suspended; drop soft pins
  that left the deck, are suspended, or were studied today; retire completed picks (graded
  on an earlier day, due now in the future). Never adds, never trims to the target.
- **Picker** ("Pick today's cards", `srs.setFormulaDayPicks`): the batch composer — due-now
  cards first, then upcoming, then never-studied, each section topic-grouped, with a name
  filter. Save replaces the batch wholesale; `studiedToday` members are locked (a grade
  committed today is not undone by un-picking). No cap — the count line shows
  "N picked · target T" as a nudge only.
- **Browse chips / Search Add** (`srs.addFormulaDaySoft` / `removeFormulaDaySoft`): edit the
  same batch one card at a time. No state → `newIds`; has state → `reviewIds` (including
  not-yet-due); suspended → unsuspend then add. Not-yet-due learned adds are pinned in
  `softIds` so they stay review-eligible until studied today. Search stays side-effect free
  until the user clicks Add (`isInFormulaDay` / status:today never call `formulaDay()`).
- **Remaining** = batch cards where **(no state) OR (`due ≤ today`) OR (soft-pinned AND not
  studied today)** — an Again-graded card (due today) stays remaining across reloads; a
  Good/Hard/Easy card (future due) is done and reconcile prunes it.
- **Overflow line:** due reviews not picked are counted as "due but not picked" (advisory).
- **No auto-substitution:** Study/Match/Type/Quiz/Cloze draw ONLY from the picked batch's
  remaining cards (`formulaDayRemaining`); an empty batch means an empty round with a
  "pick today's cards" prompt. The final-pass week shows a banner suggesting due picks —
  it never adds cards on its own.

Remaining count drives the dashboard *Review queue* card and the sidebar badge.
**Browse** the deck via **Learned** (cards with state: last-grade + due chips) / **Upcoming**
(no state: "new" chip) sub-tabs; batch members carry a "today" chip; a row click toggles a
view-only peek (front/back/note, no schedule mutation). **In-session back-stepping:** every
grade is pushed to `study.history`; a "Back" control (or ←) opens a view-only peek of graded
cards (older/newer/Resume).

**Session mechanics (Study mode only; Match/Type/Quiz commit `gradeCard` directly — no steps).**
- **Exam-date cap (F3):** `settings.examDate` (default `2026-11-01`, editable via the Today card's
  date input). `srs.examCap()` = $\max(1,\ \text{days}-1)$ when $\text{days}>1$ and
  `settings.formulaExamCap !== false`; off when $\text{days}\le 1$ or `formulaExamCap === false`
  (also off if the date is invalid/past). `nextIntervals` clamps hard/good/easy to the cap (Again
  stays 0), so grade-button previews match reality. **Final pass** (`srs.finalPassActive()`,
  active `0 < days ≤ 7`): scheduling is unchanged; the home banner nudges the user to pick
  due cards into the batch so every learned formula gets one more look — no auto-inclusion.
- **Learning steps (F7):** stateless cards graduate on Easy (commit) or on a 2nd Hard/Good; a 1st
  Hard/Good bumps to step 1 (chip "learning 1/2", +2 XP, reinsert 3–5 back, no commit); Again
  resets to step 0 (reinsert, no lapse). `study.done` counts only commits; every press is +2 XP.
- **Undo (F1a):** `study.undo` (max 10, session-scoped) snapshots the whole session + card state
  before each press; a ghost "Undo" (or ⌘/Ctrl+Z) restores it and pops the matching trailing
  `cardReviews` entry. Overlays block undo.
- **Overlay state machine (F8):** single `study.overlay` (`null|'peek'|'scaffold'|'checkpoint'`)
  routes the keyboard — peek ←/→/Esc, scaffold/checkpoint space·Enter = continue, null = flip/grade/
  ←-peek/undo. "Rebuild hints" (pre-flip) and a post-Again interstitial show 5 reconstruction
  prompts. When a round-closing press is an Again, scaffold precedes checkpoint.
- **Rounds (F11):** every `ROUND_SIZE = 10` presses, a checkpoint overlay offers Keep going / Finish.
- **Interleaving (F9):** `interleaveByTopic` (view) round-robins the session queue across topics.

**Insight & browse (bundle 2).**
- **Review log:** `srs.gradeCard` appends `state.cardReviews` (capped 8000) `{ d, id, g, ivl, m: was-mature
  (ivl≥21), n: had-prior-state }` — captured *before* mutation. All modes flow through `gradeCard`, so the
  log is complete; F1a undo pops the matching trailing entry.
- **Leeches (F2):** `srs.isLeech(st)` = `st.lapses ≥ 8`. Learned browse rows carry a warning "leech" chip;
  home shows "N formulas keep slipping" + a **Drill N struggling** button → a normal-grading session over the
  leech cards, independent of the daily batch.
- **Mnemonic notes (F2):** `state.cardNotes` (id → `{ text, updatedAt }`, plain text). Browse peek (both tabs)
  has an Add/Edit-mnemonic textarea; Study reveal renders the mnemonic under the card note.
- **Reverse direction (F5):** `settings.formulaReverse` (Today-card toggle). When true, Study shows `back`
  as the question ("What is this? When does it apply?") and reveals name + `front` + note + mnemonic. Same
  SM-2 state/grading; games, print, browse unaffected.
- **Memory stats (F10):** collapsible home card. Maturity mix (mature `interval≥21`; young `reps>0 &&
  interval<21`; learning/new = rest). 30-day retention from `cardReviews` (n=1 only): pass rate of `g≠again`
  among `m=1` (mature) / `m=0` (young); <20 qualifying entries → "collecting data". 14-day due forecast
  (day 0 includes overdue) as div bars + a 30-day total line.

Game pools (Match/Type/Quiz/Cloze) are restricted to the **remaining batch + already-studied
cards** — games never introduce never-studied cards outside the daily cap/picker.

**Games sharpening (F4/F6/F1b — `js/flashmodes.js`).** Games commit `gradeCard` directly
(no learning steps — those are Study-only). *Type (F4):* the auto-check is a verdict line
("Auto-check: matched / no match"); the user grades on the full **Again/Hard/Good/Easy**
scale (keys 1–4), with the auto-check result preselected (matched→Good, miss→Again) and
**Enter** confirming the highlight. `acceptSet` also matches the legend-stripped back and an
optional `c.alts` array. *Quiz (F6):* `stripLegend(back)` keeps only the leading `$$…$$`/`$…$`
block (drops the symbol legend) for **display** — grading stays index-based. `perturbLatex(back)`
builds near-miss distractors from the legend-stripped formula (brace-depth aware): flip a
top-level ±, `^2`↔`^3`, add/remove a `\frac{1}{2}` factor, `2\pi`↔`\pi`, swap a top-level
fraction, `\sin`↔`\cos`; each variant must `normText`-differ from the correct string and every
other, and must render (`katexOK`, KaTeX `throwOnError`) or it is discarded. Options = correct +
up to 3 variants, then same-topic then any-topic legend-stripped backs. *Undo (F1b):* Type and
Quiz keep a **one-level** undo of the last committed grade `{ id, prevState, counter snapshots }`
— a ghost **Undo** link restores `state.cards[id]`, pops the matching trailing `cardReviews`
entry, rolls back the mode's score/XP counters, and hides itself; the undone question is not
replayed and the stack clears at round end.

**Cloze mode (bundle 4 — `startCloze`).** One top-level term of the (legend-stripped) formula is
blanked to `\boxed{?}` and the player picks the missing token from four KaTeX chips. Generation is
conservative — `clozeCandidates` tokenizes the side after the first top-level `=` (else the whole
expression), brace-depth aware, and blanks one of: an integer/decimal **coefficient**, a small
numeric `\frac{p}{q}`, an **exponent** (`^2`/`^{3/2}` — re-wrapped as `^{\boxed{?}}`, chips are the
content), `\pi`/`n\pi`, or a trig/`exp`/`ln`/`log` **function name** (a top-level ± is a candidate too
but can't form four distinct chips, so it self-skips). Distractors are token-scale perturbations
(`clozeDistractors`), falling back to same-category tokens **harvested from the whole deck**
(`clozeHarvest`); each chip and the boxed formula must render (`katexOK`) or the candidate/card is
dropped. Right → `gradeCard` Good (+2 XP), wrong → Again with the correct chip highlighted and a brief
auto-advance pause. Pool = `pickQueue` policy filtered to cloze-able cards, cap 12 (`clozePool`); the
intro tile shows the round size, or "No cloze-able cards in today's pool yet." when it's empty.

Card ids are **equation-numbered and assumed stable** across re-imports; a re-import that
renumbers ids resets card progress (known limitation).

**The formula deck is 334 cards** from `PGRE.BOOK_FORMULAS` (`content/bank/cpg-formulas.js`).
`PGRE.FORMULAS` itself is empty; `PGRE.formulaDeck()` in `js/store.js` returns the book
cards. Keyboard: space flips, 1–4 grade, ← steps back.

## 5. Review plan (generated: `js/data-plan.js`, resolved: `js/plan-engine.js`)

The source of truth is the OrbitOS vault syllabus
(`20_Project/GRE_Physics_Prep/01_Syllabus_&_Plan/8-Week-Syllabus.md`).
`tools/build-plan.js` compiles it (plus `### Set NN` titles from
`03_Topic_Sets/`) into `js/data-plan.js` — a pure-data file, never hand-edited.
`js/plan-engine.js` resolves each week's task list at runtime (`PGRE.weekTasks`)
so the Set 02 carry rule can depend on whether `set-02` was finished before
2026-09-14.

Sep 7 → Nov 1, 2026 · **3 phases / 8 weeks**:

1. **Week 0 · Historical (Sep 7–13)** — CM Sets 01–05 already assigned; kept so
   the carry rule resolves. Not replayed.
2. **Live calendar W1–W6 (Sep 14 – Oct 25)** — 6 live weeks at a **5+6+2** load
   (~16 h/wk): timed sets, formula recall, misses-first extras. Checkpoints:
   **Sun Oct 4** paper diagnostic GR0177/GR0877; **Sun Oct 25** 70Q/120 computer
   rehearsal (2024 Practice Book). Each replaces that week's 5th timed set.
3. **Exam week · taper (Oct 26 – Nov 1)** — Sets 32–33 new only; weekday timed
   slots replay the latest miss-heavy set (else 32); Fri logistics, Sat rest,
   exam Sun Nov 1 14:00. Deferred new: 30/31/34/35.

Weeks render as collapsible cards; the current week auto-opens; checking tasks grants XP once.
Regenerate after syllabus edits: `node tools/build-plan.js`.

## 6. Design-system notes (dataviz conventions applied)

- Meters: fill = accent terracotta; track = `--accent-track` `#e6dfd8` (neutral cream, not
  a lighter same-hue). Page floor `--floor` `#f5f0e8`; cards ivory.
- Stat tiles: sentence-case label, sans-semibold value, proportional figures.
- Status (correct/incorrect) always icon + label, never color alone; green/red reserved
  for status, never decoration.
- Text never wears data color; identity comes from a colored mark beside the text.
- Single-series meters carry no legend.

## 7. Deliberately out of scope (for now)

- Accounts, sync, server anything — the point is local.
- Question shuffle of choices (kept in authored order, GRE-style).
- ~~Dark mode~~ — shipped July 15, 2026 as the planned `data-theme` layer (see §8).

## 8. Feature waves — *shipped July 15, 2026 (all 15 PROPOSAL items)*

Everything in `PROPOSAL.md` was built in three orchestrated waves (infra → features →
theme/polish), each implementation reviewed adversarially and the whole site verified
end-to-end via headless Chrome (per `.agents/skills/verify/SKILL.md`):

- **Infra:** state schema v2 (`exams`, `notes`, `bookmarks`, `settings`, `studyLog`,
  attempt `confidence`), `js/bank.js` source merge, `js/study-time.js` passive active-time
  tracker, `js/notes.js` API, routes/nav for `#/analytics` `#/build` `#/search` `#/notes`,
  7 exam achievements.
- **#1 Mock-exam simulator** (§4) · **#2 Analytics** (`#/analytics`: weekly accuracy trend,
  points-lost-per-topic ranking, time histogram vs pace budget, volume heatmap, sims table)
  · **#3 Custom quiz builder** (`#/build`: topics × difficulty × unseen/missed/slowest/
  bookmarked, exam-source opt-in, deep link `#/build/topic-<id>`) · **#4 Pace trainer**
  (settings-driven, 103 s default) · **#5 Flashcard modes** (Match / Type-to-recall /
  Auto-quiz / Cloze in `js/flashmodes.js`, SRS-integrated) · **#6 Confidence tagging** (knew-it/
  guessed; lucky guesses enter the mistake book, cleared on a confident re-solve) ·
  **#7 Question of the day** (dashboard, date-seeded) · **#8 Notes & bookmarks**
  (`#/notes`) · **#9 Search** (`#/search`, all sources incl. book sections & notes) ·
  **#10 Readiness estimate** (dashboard, labeled estimate, blends sims) · **#11 Study-time
  tracking** (dashboard card vs 15–17 h target; `#/study-time`) · **#12 Distractor explanations**
  (`choiceSols` mined from the book's worked solutions; shown in practice feedback, exam
  review, mistake book) · **#13 Print/PDF** (`css/print.css`: paper mistake book +
  per-topic formula sheets) · **#14 Keyboard-first practice** (A–E/1–5, Enter, G;
  gated on `settings.keyboard`) · **#15 Dark mode** (tokenized palette,
  `[data-theme="dark"]`, sidebar toggle, per-theme heatmap/amber tokens).

Shipped after the original 15: **Concept visualization** (`#/concepts`, `js/view-concepts.js`,
`visualizer-engine.js`, `js/visualizers/`), **Focus timer** (`#/focus`), **Study time**
(`#/study-time`), and **Cloze** flashmode (see §4b).
