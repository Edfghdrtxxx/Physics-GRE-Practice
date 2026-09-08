# Content / pedagogy / exam-readiness survey

**Role:** SurveyContent (senior peer). Content, teaching surfaces, and whether the site is ready as a daily instrument for a 2026-11-01 GRE Physics sitting (D-54 as of 2026-09-08). No app code was edited.

---

## Method

Opened and counted (metadata only; no stems, choices, or solutions copied here):

- Specs: `AGENTS.md`, `README.md`, `content/README.md`, `simulations/README.md`, `20_docs/Project Docs/DESIGN.md`, `PROPOSAL.md`, `PGRE-Philosophy.md`, `Practice Resources.md`.
- Data / merge: `js/data-topics.js`, `js/data-questions.js`, `js/data-formulas.js`, `js/data-plan.js`, `js/bank.js`, `js/exam-engine.js`, `js/view-exam.js`, `js/view-topic.js`, `js/view-content.js`, `js/view-dashboard.js`, `js/view-plan.js`, `js/view-build.js`, `js/store.js`, `js/notes.js`, `index.html`.
- Gitignored banks (JSON-parsed, counts only): `content/bank/cpg-questions.js`, `cpg-exams.js`, `cpg-formulas.js`, `ets-exams.js`.
- ETS build metadata: `content/ets-src/*/meta.json`, `tools/build-ets-exams.js`. Figure filenames counted under `content/book-assets/` and `content/ets-assets/`.
- Kahn markdown existence/structure only (heading levels, not body): `20_docs/Conquering the Physics GRE (Yoni Kahn)/Conquering the Physics GRE (Yoni Kahn).md`.
- Visualizers: `js/visualizers/trio-g1.js` … `trio-g10.js`, `js/visualizer-engine.js`, `simulations/oscillator.html`.
- Live UI (reused `pgre-liveui` at `http://127.0.0.1:51651/`): Dashboard, `#/topic/cm`, `#/topic/sp`, `#/topic/lb`, `#/topic/at`, `#/exam`, `#/formulas`, `#/plan`, `#/library`.
- Silent Jaccard overlap of drill vs kept-mock tokens (ids/scores only; threshold 0.5).

**Not checked** (see section 6).

Confidence: **high** for bank counts, dates, live copy, and spoiler wiring. **Medium** for “item species” pedagogy (judgment, grounded in `PGRE-Philosophy.md` and Kahn’s own disclaimer, not a scored rubric). **Low / unchecked** for physics correctness of any extracted item.

---

## Ranked findings

### 1. The remaining-weeks plan still runs a July–Oct 28 paper-era script

**Claim.** The site’s daily calendar, countdown, and mock sequence are aimed at **Wednesday 28 October 2026**, schedule **GR8677 / GR9277 as timed Tests #1–#2**, and still describe the simulator as deferred / paper-only — none of which matches the shipped bank, the spoiler rules, the current 70-question format, or exam day **2026-11-01**.

**Evidence.**

- Canonical date is still `PGRE.EXAM_DATE = '2026-10-28'` (`js/data-topics.js:5`). Store default `examDate: '2026-10-28'` (`js/store.js:65`). Dashboard copy: “50 days until the exam / Wed, Oct 28, 2026” (`js/view-dashboard.js:397-398`; live UI 2026-09-08). Sidebar: “exam Oct 28, 2026”. True remaining days to Nov 1: **54**.
- Plan header: “Jul 13 – Oct 28” (`js/data-plan.js:1-7`). Live `#/plan`: “July 13 → October 28, 2026 · … five released practice tests”; “0 / 93 tasks complete”; “50 days to go”; current week **Atomic II + Special Relativity (Sep 7–13)**; Phase 2 still “full released exams **(on paper, timed)**”; W16 “Taper — exam Wednesday Oct 28” (`js/data-plan.js:127, 137, 167-197`).
- Test #1 / #2 labels: `PRACTICE TEST #1: GR8677, full, timed, on paper` and `PRACTICE TEST #2: GR9277` (`js/data-plan.js:127, 137`). Those two forms are **drills** (`src: 'ets-drill'`, `content/ets-src/gr8677/meta.json` `drill: true`, likewise GR9277) and already sit in `PGRE.allQuestions()` (`js/bank.js:38-42`). They are **not** listed on `#/exam` (live: ets2024, GR1777, GR0877, GR0177, GR9677 only). A student who has been doing daily practice has already seen them; the plan still treats them as fresh mocks.
- The **only current-format (70×120) verbatim official mock** is `ets2024` (`content/bank/ets-exams.js`: format `70x120`, 70 items). It is **not** in the five-test sequence. Tests #3–#5 are GR9677 / GR0177 / GR1777 (100×170).
- File header still says “the in-app timed simulator is designed but deferred” (`js/data-plan.js:6-7`) even though `#/exam` is live. W01 still says “book chapter — import pending” (`js/data-plan.js:18`) after parser v2 has shipped (`DESIGN.md` §3).
- README / DESIGN leftover frame language: “20-question preview bank”, “Mock exam designed but deferred”, “formula deck empty by design” (`README.md:25-32, 35-43`; `DESIGN.md:94-95`) — false on this machine.

**Severity:** 9/10.

**User impact on D-54 prep.** This is the instrument a non-CS master’s student will follow for the next seven weeks. It will: (a) under-count remaining days by 4; (b) spend W10–W11 on two forms that are already in the daily pool; (c) never schedule the 2024 70-question sitting; (d) taper on Oct 26–28 and go silent through Nov 1; (e) keep pointing “read the book” at empty portals (finding 2). Bank size is not the bottleneck; **what to do with the next 54 days** is.

**Uncertainty:** Low on the date/sequence facts. Medium on how much the user already ignores the in-app plan and uses paper. The liveui profile had 0/93 tasks checked; that profile is not proven to be the user’s daily browser.

---

### 2. Knowledge-portal Notes never ingest the Kahn textbook that is already on disk

**Claim.** Teaching text is the missing half of the “knowledge portal.” A 1.09 MB Kahn markdown file exists locally, but every topic portal still waits for a Library drag-drop that has not happened — and even if it did, the splitter only sees `#` / `##`, so the real chapter structure (mostly `####`) would collapse into ~14 giant blobs.

**Evidence.**

- Live `#/topic/cm` (and SP, LM, AT): “Waiting for ‘Conquering the Physics GRE’. When the book markdown arrives, import it in the Library…” (`js/view-topic.js:113-115`).
- Live `#/library`: “No content imported yet.” Copy still promises “A proper parser … will be built against the real file” (`js/view-content.js:93-95`) even though `content/bank/cpg-*.js` are loaded from `index.html:98-101`.
- File on disk: `20_docs/Conquering the Physics GRE (Yoni Kahn)/Conquering the Physics GRE (Yoni Kahn).md` — **1,093,111 bytes**, 338 ATX headings. Levels: **h1=14, h2=4, h3=6, h4=314**. `PGRE.splitChapters` only splits on `#{1,2}` (`js/store.js:465-484`). The h1/h2 set is title/preface/how-to plus one heading per book chapter (CM, E&M, Optics, Thermo, **“5 Quantum Mechanics and Atomic Physics” as a single blob**, SR, Lab, Specialized, tips, equation index). Subtopic teaching (`1.1.1 Blocks on Ramps`, etc.) lives at h4 and would not become mappable Notes cards.
- This week’s plan tasks are literally “Read: selection rules, Zeeman/Stark…” with no in-app chapter to open (live `#/plan` W09). The dashboard challenge “Open a topic’s notes today” can be completed on the empty waiting card.

**Severity:** 8/10.

**User impact on D-54 prep.** Portals advertise official subtopic chips and a Notes card, then teach nothing. Formula cards and questions exist; the **explanatory layer** (worked examples, “how to use this book,” chapter prose) does not. A student with little CS background will not know they must drag a gitignored markdown file into IndexedDB, then hand-map 14 coarse sections.

**Uncertainty:** High that Notes are empty in the inspected liveui profile. Unverified whether the user’s personal Chrome already has an IndexedDB import. Heading-level counts are high-confidence; quality of the markdown conversion (math, figures) was not read.

---

### 3. Daily practice trains on Kahn homework + 1986/1992 drills; current-style items are locked

**Claim.** The default pool is large enough, but it is the **wrong species** for a 2026 computer-delivered sitting. Representative recent forms are correctly spoiler-protected — which means daily drilling cannot be in current GRE voice unless the user burns a mock.

**Evidence (counts, no item text).**

| Source | n | In default pool? | Notes |
|---|---:|---|---|
| Preview (`js/data-questions.js`) | 20 | yes (`src: preview`) | All 9 topics; difficulties 1–2 only |
| Kahn chapter problems | 146 | yes (`src: cpg`) | All 9 topics; 142/146 have some `choiceSols` |
| GR8677 + GR9277 drills | 200 | yes (`src: ets-drill`) | Vintage 100-item forms; **0** `choiceSols` |
| Kahn Sample Exams 1–3 | 300 | no (simulator / `includeExam`) | `src: cpg-exam` |
| Intact ETS (ets2024, GR1777, GR0877, GR0177, GR9677) | 469 | no | `src: ets-exam`; **0** `choiceSols`; GR9677 emits 99 items because Q90 is quarantined as originally unscored (`content/ets-src/gr9677/meta.json`) |

Default pool = **366**. Per-topic (preview+book+drill): CM 71, EM 68, QM 52, TH 36, OW 35, SP 35, AT 30, SR 22, LM **17**. Every topic has items; LM and AT are the thin end, still enough to cover a 6–10% slice several times over.

`PGRE-Philosophy.md:137` (and Kahn/Anderson themselves): chapter-end problems “don’t intend them to exactly replicate GRE questions in style and difficulty.” Philosophy also: 1980s–1990s forms are muscle, not a 2026 style match; 2001/2008/2017/2024 are the representative set. Those representative forms are the ones `AGENTS.md` keeps out of the daily pool — correctly for spoiler integrity, incorrectly for **daily craft**.

Weighted 70-draw (`js/exam-engine.js:91-98`) uses preview + cpg + ets-drill + **cpg-exam**, excluding `ets-exam`. So a “current format” sim is a mix of homework, vintage drills, and the book’s three sample exams (spoiling those sample exams). Live `#/exam` copy says the draw is “from the full bank of **1135** questions” (`js/view-exam.js:129` counts `includeExam: true` including ets-exam). Actual draw pool is **666**. That overclaim is a teaching lie, not a draw bug.

Spoiler wiring itself looks sound: drills are not in `PGRE.ETS_EXAMS`; `view-build.js:85-88` and `search.js:55-60` strip `ets-exam`; Jaccard drill-vs-kept-mock at 0.5 flagged **0** pairs (lexical only).

**Severity:** 8/10 (pedagogy). Integrity of the spoiler rule: not a defect.

**User impact on D-54 prep.** Volume is not the problem (366 daily items is more than most people will finish). The problem is **clock-and-distractor craft**: textbook workouts plus vintage papers as the everyday diet, while the 70×120 voice lives behind one-shot mocks. Distractor autopsies (`choiceSols`) exist for Kahn items and are absent on all 669 ETS-derived items (drills + intact).

**Uncertainty:** Medium on how GRE-like the 20 preview items and 146 chapter problems actually are (stems not audited against the philosophy checklist). High on the pool composition numbers. Jaccard-0 does not prove no conceptual near-duplicates.

---

### 4. Formula deck and visualizers under-serve Atomic, Specialized, and Optics

**Claim.** The 334-card deck is real and complete as a 1:1 dump of numbered Kahn equations, but memorization coverage is badly skewed. Interactive visualizers cover ~10% of the deck and are almost all Classical Mechanics.

**Evidence.**

- `PGRE.FORMULAS = []` (`js/data-formulas.js:20`); live `#/formulas`: “Cards in the deck **334**”, “Not yet introduced 334”. Merge path: `PGRE.formulaDeck()` (`js/store.js:452-456`) from `content/bank/cpg-formulas.js`.
- Formula cards by topic: EM 85, QM 52, CM 51, TH 45, OW 32, SR 29, LM 19, **AT 12**, **SP 9**. Specialized tags are only “Fermi gas” (6) and “Cosmology” (3) — no nuclear, particles, crystals, semiconductors, superconductors, or math-methods cards, despite those being official ST subtopics (`js/data-topics.js:94-99`) and despite 35 ST **questions** in the default pool.
- Visualizers: **32** unique `cpgf-*` keys across `js/visualizers/trio-g1.js`–`g10.js`. Topics: CM 22, EM 4, TH 2, QM 2, SR 1, LM 1, **OW 0, AT 0, SP 0**. `view-formulas.js:53-54` comment: “About 30 book cards have a draw().” Standalone sim folder: **one** page, `simulations/oscillator.html` (`simulations/README.md`).
- This is consistent with the book’s equation index (user rule: only labeled equations are cards) — so the hole is **structural**, not a failed extract. Atomic + Specialized together are **19% of the exam** (`js/data-topics.js` weights 10 + 9) and have 21 formula cards total.

**Severity:** 7/10.

**User impact on D-54 prep.** Formula SRS is the site’s memorization engine. A student who “finishes the deck” will be over-trained on E&M numbered results and under-trained on the slogan-dense ST/AP slice the philosophy document says is costume-over-undergrad-slogan. Visualizers cannot carry those topics at all. Lab/print sheets will inherit the same skew.

**Uncertainty:** Low on counts. Medium on whether unlabeled-but-must-remember slogans (selection rules, particle table, semiconductor facts) should even be formula cards vs. a different note type. Did not grade individual card fronts for GRE usefulness.

---

### 5. Portals mislabel the bank, so the student cannot see what they are practicing

**Claim.** Topic portals count every non-`cpg` item as “preview,” so 200 vintage ETS drills read as hand-written placeholders. Combined with empty Notes and stale README, the UI still narrates a 20-question frame.

**Evidence.**

- `js/view-topic.js:16-33`: `bookCount` = `src === 'cpg'`; `previewCount = bank.length - bookCount`. Live CM: “**71 questions · 26 book · 45 preview**”. Actual CM default pool: 26 book + 4 preview + **41 ets-drill**. Live ST: “35 questions · 16 book · 19 preview” (16 book + 1 preview + 18 drill). Live LM: “17 · 10 book · 7 preview” (10 + 1 + 6).
- Empty-bank copy still used when `bookCount === 0`: “it grows when the book content is imported” (`js/view-topic.js:31-32`) — dead on this machine, but the “preview” label is live and wrong.
- Figure assets: book questions 52/52 present, book exams 145/145, ETS 143/143, drills 62/62 (filename match only). Structural completeness of Kahn/ETS items: 5 choices, in-range answers, non-empty `q`/`sol` for all counted records.

**Severity:** 6/10.

**User impact on D-54 prep.** Mastery denominators use the real 366-pool (`js/bank.js:57-61`; live readiness “1 of 366 touched”), so stats are not lying. The **story** next to the launcher is. A student trying to save intact mocks cannot tell that “preview” on CM is mostly GR8677/GR9277.

**Uncertainty:** None on the counting bug. Low on impact if the user never reads the subtitle.

---

## Nominated SINGLE worst aspect

**The remaining ~54 days are steered by a stale study plan and empty teaching Notes, not by the bank that already shipped.**

This beats findings 3–5 because the 9-topic question/formula banks are already large enough to drill (366 daily + 5 intact ETS + 3 book samples + 334 cards). What will actually waste D-54 is following `#/plan` and `#/topic/*/notes`: wrong exam date, paper Tests #1–#2 on forms that are already in the daily pool, no in-app Kahn reading for this week’s Atomic+SR tasks, and no scheduled sitting of the only 70-question official mock. Finding 3 (item species) is real but is a consequence of the same un-updated operating system: the plan never re-aimed daily work at current-format craft after the spoiler exception landed.

---

## Suggested fix scope if chosen

Files, not patches. If this aspect is locked:

- Rebuild the calendar and mock sequence: `js/data-plan.js` (Nov 1 end, drop GR8677/GR9277 as “fresh” tests, insert `ets2024` as the current-format sit, use remaining intact 100-item forms as extras, delete “import pending” / “simulator deferred”).
- Single source of exam date: `js/data-topics.js` (`PGRE.EXAM_DATE`), `js/store.js` default `examDate`, `js/view-dashboard.js` countdown label, `js/view-plan.js` header, `README.md`.
- Teach from the file that already exists: `js/store.js` (`splitChapters` must see `####` or a pre-split notes bank), `js/view-topic.js` (empty-state + source labels), `js/view-content.js` (Library copy), optionally a generated `content/bank/cpg-notes.js` analogous to formulas/questions so portals work without a drag-drop.
- Stop lying about pools: `js/view-topic.js` (count `ets-drill` separately from preview), `js/view-exam.js` (weighted-draw count must match `buildWeighted`’s 666, not 1135).
- Docs that still describe a 20-question frame: `README.md`, leftover “frame-first” paragraphs in `20_docs/Project Docs/DESIGN.md` §3.

Out of scope unless separately chosen: writing new GRE-voice items; adding ST/AT formula cards beyond numbered equations; new visualizers.

---

## What I explicitly did not verify

- Physics correctness, GRE-style craft, or distractor quality of any stem/solution (copyright; not read for content).
- The user’s real Chrome IndexedDB / localStorage (only the `pgre-liveui` profile).
- Whether imported Kahn markdown math/figures render if someone does drag-drop it.
- Official ETS 2024 P+ statistics beyond noting `scale` rows exist (ets2024: 71 scale rows).
- Conceptual (non-lexical) overlap between drills and kept mocks; only Jaccard-on-tokens.
- Full timed sitting of any mock (pacing UI, scoring tables against a known raw score).
- `simulations/oscillator.html` as a learning tool beyond confirming it exists.
- Subtopic-chip alignment at a labeled-official-subtopic granularity (book/drill `subtopic` strings are free text, not the ETS chip list).
- KaTeX failure rate on bank math (there is `tools/check-katex-latex.js`; not run, per “no project-wide suites”).
- Whether `settings.examDate` was already changed in some other browser profile.
- Practice Resources.md currency vs the 2024 booklet (it still leads with GR1777 as the ETS practice book).
- Achievements / XP / SRS scheduling (product/UX siblings).
- CSS, motion, or visualizer aesthetics.
