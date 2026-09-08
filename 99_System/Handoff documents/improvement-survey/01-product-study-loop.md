# Product / study-loop survey

Role: SurveyProduct (grok-4.6). Question: does this SPA actually run a D-54 GRE Physics day, or a pile of features around one?

Exam the user is sitting: **2026-11-01** (D-54 as of 2026-09-08). The site still believes **2026-10-28**.

---

## Method

Opened and ran:

- Docs: `README.md`, `AGENTS.md`, `20_docs/Project Docs/DESIGN.md`, `PGRE-Philosophy.md`, `ANKI-SRS-CANON.md`.
- Loop code: `index.html`, `js/app.js`, `js/bank.js`, `js/store.js`, `js/srs.js`, `js/gamify.js`, `js/data-plan.js`, `js/data-topics.js`, `js/exam-engine.js`, `js/view-dashboard.js`, `js/view-practice.js`, `js/view-plan.js`, `js/view-topic.js`, `js/view-exam.js`, `js/view-formulas.js` (home surface), `js/view-mistakes.js` (empty/drill chrome), `js/view-content.js` (library copy), `js/view-build.js` (source toggle).
- Live UI on existing `pgre-liveui` (`python3 -m http.server 51651` from the project root). Hash routes: `#/`, `#/practice/all`, `#/plan`, `#/formulas`, `#/exam`, `#/topic/at`, `#/library`, `#/mistakes`, `#/history`, `#/analytics`, `#/build`, `#/achievements`. Live `PGRE.*` counts taken from that Chromium tab.

Did **not** edit application code. Did **not** sit a full timed mock. Did **not** grade formula cards. Did **not** import Library markdown.

Live profile caveat: this headless tab was nearly empty (0 attempts at first paint; 334 formulas unlearned; 0 plan tasks). A concurrent surveyor or a practice-config click left **one** CM miss in History / Mistake book before later screenshots. Counts below that depend on progress are from this tab, not the user’s real Chrome. Structural claims (dates, pools, copy, routing) do not depend on that.

---

## Ranked findings

### 1. There is no D-54 daily program — only a feature buffet with a “today” skin

**Claim.** Opening the site does not answer “what should I do today to raise the Nov 1 score?” The dashboard leads with level/XP, a generic 3-challenge set, and one untimed Question of the Day. The thing that is supposed to sequence the remaining weeks — the study plan — is a checkbox list that does not launch practice, mocks, or formula work. Formula recall will not start until the user hand-picks a batch. Sidebar offers 14 destinations plus 9 topic portals.

**Evidence.**

- Dashboard hero is XP + hardcoded “Wed, Oct 28, 2026” countdown (`js/view-dashboard.js` ~389–400). Next: Review queue, QOTD, “Today’s challenges”, “This week” as **plain text** of the first three unchecked plan labels (no buttons) (~445–459).
- Today’s live challenges (2026-09-08): “Practice in 2 different topics”, “Open a topic’s notes”, “Get 5 questions right” — volume/XP, not GRE skill (`js/gamify.js` `CHALLENGE_POOL` 537–544; live `#/`). Jump for notes goes to `#/topic/cm` even when the week is Atomic + SR (`CHALLENGE_NAV` in `view-dashboard.js` 16–23).
- Plan tasks grant XP on check, with no verification they were done (`js/gamify.js` `toggleTask` 333–352; `js/view-plan.js` 57–62). Week “Study:” links only to topic portals, not to a 20-question AP+SR set or a named mock (`view-plan.js` 65–73). Current week task “Drill: 20 atomic + SR questions” has no launcher.
- Formula home: 334 cards in deck, **Remaining today 0 / 10**, copy “Nothing picked yet — choose today’s cards below. … nothing is chosen for you.” (live `#/formulas`; DESIGN.md §4b “User-curated daily batch”). Dashboard review queue echoed “nothing picked yet”.
- Nav built in `js/app.js` `buildNav` 560–586: Dashboard, Study plan, History, Analytics, Custom quiz, Search, Notes, Mistake book, Formula recall, Focus timer, Study time, Achievements, Library, Mock exam, then 9 portals.

**Severity:** 9 / 10.

**User impact on D-54 prep.** A physics master’s student with little CS background has ~54 days and a real 70×120 exam. The instrument they open every morning does not convert remaining days + due reviews + unused mocks + unlearned formulas into a single next action. They will spend attention on XP, challenges, and choosing among 20+ surfaces. That is the opposite of GRE triage.

**Uncertainty:** Medium-low for structure (read + live). High for how the user’s *real* Chrome profile already uses the buffet — this tab was empty.

---

### 2. The calendar that should steer the loop is stale, split-brained, and non-adaptive

**Claim.** Exam day, countdown, plan horizon, and formula SRS do not share one date, and that date is the wrong one. The plan is a Jul 13 → Oct 28 checklist. On Sep 8, 8 of 16 weeks are already “past” with no catch-up. Tasks still describe a site that no longer exists (book import pending, simulator deferred, GR8677/GR9277 as paper tests). After Oct 28 the last week sticks forever. Nov 1 is a 4-day gap the plan does not cover.

**Evidence.**

- `PGRE.EXAM_DATE = '2026-10-28'` (`js/data-topics.js:5`). Dashboard countdown uses `gamify.daysToExam()` → `srs.daysUntil(PGRE.EXAM_DATE)` (`gamify.js` 607–610) and hardcodes the label “Wed, Oct 28, 2026”. Sidebar brand: “exam Oct 28, 2026” (`index.html:28`). Formula SRS uses `settings.examDate` (default the same string, `store.js:65`) via a date input on `#/formulas` only (`view-formulas.js` ~609–706). Changing the formula date would **not** move the dashboard countdown. Live: `daysUntil('2026-10-28') = 50`, `daysUntil('2026-11-01') = 54`.
- Plan data: `js/data-plan.js` header still says “in-app timed simulator is designed but deferred”. Phase 3 desc: “arrive fresh on October 28.” Week w16 title: “Taper — exam Wednesday Oct 28”. Live `#/plan` hero: “July 13 → October 28, 2026 · … five released practice tests”. `PGRE.currentWeek` after the last `end` returns the last week forever (`data-plan.js` 212–219).
- Live plan: 8 weeks `week-past` (w01–w08), current w09 “Atomic II + Special Relativity” Sep 7–13, 7 future, **0 / 93 tasks**. No “you are behind” or remaining-days rebuild. Dashboard “This week” lists reading tasks as if Foundation Pass were on schedule.
- Task copy vs shipped product: w01t1 “book chapter — import pending”; w10t5 “PRACTICE TEST #1: GR8677, full, timed, **on paper**”; w11t4 GR9277 the same. Those two forms are **not** in the simulator list; they are `PGRE.ETS_DRILLS` (100+100) inside the **default daily pool** (`bank.js` 13–42; live `etsDrills`). Sitting mixed practice spoils the paper tests the plan still schedules. Remaining verbatim mocks on `#/exam`: ETS 2024 (70q), GR1777, GR0877, GR0177, GR9677, plus book Sample Exams 1–3. Plan never names the 2024 current-format book or GR0877; it does name the two drills.
- Library live copy still says a “proper parser … will be built” (`#/library`; `view-content.js` header comment). Bank is already merged.

**Severity:** 9 / 10.

**User impact on D-54 prep.** If they trust the plan, they are on Atomic+SR in week 9 with Lab/Specialized and every full mock still “ahead”, while eight foundation weeks sit unchecked and two “practice tests” are already in daily drill. If they ignore the plan, there is no other sequencer. Either way the remaining 54 days are not budgeted against Nov 1.

**Uncertainty:** Low on dates and task text. Medium on whether the user already mentally moved to Nov 1 (formula date input exists but default is still Oct 28).

---

### 3. Default practice trains a mixed, mislabeled bank — and the “current format” mock is not a current exam

**Claim.** The path challenges and topic portals send the user down is instant-feedback mixed practice over 366 items: 20 hand-written previews + 146 CPG end-of-chapter problems + 200 GR8677/GR9277 drills. Portals call the drills “preview”. Philosophy says CPG chapter problems are **not** GRE clones. The 70×120 “current format” button claims the full 1135-question bank; the engine actually draws 666 items including the three book sample exams (spoiling them) and excluding the real ETS forms.

**Evidence.**

- Live default pool `PGRE.allQuestions()` = **366** (`preview` 20, `cpg` 146, `ets-drill` 200). `#/practice/all`: “366 questions available” with 5 / 10 / 20 / All. Instant key + solution (`view-practice.js` `answer` 352–400). Pace chip exists and `paceTrainer` defaults **true** at 103 s (`store.js:61`) — good, but still not an exam sitting.
- Atomic portal live: “In bank 30 questions · **7 book · 23 preview**”. Actual sources for `at`: preview 2, cpg 7, **ets-drill 21** (`view-topic.js` 16–28 lumps anything not `src === 'cpg'` as preview). CM: 4 preview / 26 cpg / **41 ets-drill**. Across topics, ets-drill is the largest slice of the daily pool (200/366).
- `PGRE-Philosophy.md` ~137: Kahn “don’t intend [chapter-end problems] to exactly replicate GRE questions”. Daily mix is therefore homework + vintage 100-item papers + a 20-q preview, served with instant feedback.
- Weighted mock: UI `pool = PGRE.allQuestions({ includeExam: true }).length` → live **1135** (`view-exam.js` 128–161). Engine `buildWeighted` then **filters `src !== 'ets-exam'`** (`exam-engine.js` 90–98). Live filtered size **666** = 20 preview + 146 cpg + 200 ets-drill + **300 cpg-exam**. Starting “Start 70-question exam” can consume Sample Exams 1–3, which `#/exam` also offers as verbatim legacy sittings. Custom quiz copy is honest: “Include sample-exam questions / off keeps your mock sims fresh” (`view-build.js` 221–222); the dashboard mock teaser is not.
- Intact ETS forms (2024 70q, GR1777, GR0877, GR0177, GR9677 = 469 `ets-exam`) are correctly kept out of daily practice. They are also the only current-format-shaped sitting (the 2024 book). Nothing in the daily loop points at “sit ETS 2024 once, keep the other four fresh.”

**Severity:** 8 / 10.

**User impact on D-54 prep.** Volume on this pool can raise XP, mastery %, and the readiness gauge while training the wrong time object (instant feedback, homework length, 1986/1992 stems). Using the prominent 70-q sim can burn the book’s three sample exams. The five real ETS papers — the scarce resource — are one extra click that the plan and dashboard do not protect or schedule.

**Uncertainty:** Low on counts and draw filter (executed live). Content quality of `cpg` vs GRE style is SurveyContent’s job; philosophy is cited, items not re-audited here.

---

### 4. Formula recall is a 334-card engine that does not start, at a default pace that cannot finish cleanly

**Claim.** The book deck is present (334 equation cards). The daily loop treats it as empty until the user composes a batch. Default target is 10/day. 334 unseen / 10 = 34 days of *new cards only*, before reviews, with 54 days to Nov 1 and the exam-cap still on. Dashboard does not warn that the deck is unlearned.

**Evidence.**

- Live `PGRE.formulaDeck()`: **334** (`cpgf-1.1` …), `PGRE.FORMULAS` seed array empty, `BOOK_FORMULAS` 334. `state.cards` empty. `formulaDay` `{ reviewIds: [], newIds: [] }`.
- `#/formulas` home: “Cards in the deck 334 · Remaining today 0 / 10 · Not yet introduced 334 · Nothing picked yet.” Study/Match/Type/Quiz/Cloze are present; DESIGN.md says games draw only from the picked remaining batch — empty batch ⇒ empty round.
- `settings.formulaDailyTarget` default 10 (`store.js:62`). DESIGN.md §4b: nothing auto-selected; reconcile never adds. `ANKI-SRS-CANON.md` final-pass is `days ≤ 7` and still only a **banner** to pick due cards (`srs.finalPassActive`, `view-formulas.js` ~578–582) — not auto-inclusion.
- `examCap` in code is now horizon `days - 1` (live cap 49 for Oct 28), matching the canon fix, **not** the 0.2×days bug DESIGN.md §4b still documents. Split-brain: DESIGN stale; scheduler closer to canon. Not the main product issue.

**Severity:** 8 / 10.

**User impact on D-54 prep.** Conway/Kahn both require a memorized undergraduate equation core. 334 labeled equations with a picker that starts at zero means formula work competes with “remember to open Formula recall and pick 10.” At default 10/day, introducing the deck consumes most of the remaining calendar *if they never miss a day and ignore reviews*. The dashboard line “nothing picked yet” reads like “you’re caught up.”

**Uncertainty:** Low on empty-batch behavior (live). Medium on whether a diligent user would raise the target; the product does not suggest it from remaining days.

---

### 5. XP, achievements, and “readiness” can steer a master’s student off the exam

**Claim.** Gamification is the loudest daily feedback. Achievements grew from the documented 36 to **80**. Mastery and readiness are computed on the mixed default pool. Study-time compared to 15–17 h/week is tab-heartbeat minutes. Checking a plan box is a study day.

**Evidence.**

- Live `#/achievements`: “2 of 80 unlocked”. README still says 36. Dashboard hero is Level / XP; QOTD and challenges pay XP; plan tasks pay 10–50 XP without doing physics (`gamify.toggleTask`).
- Mastery = share of `questionsForTopic` with `firstCorrect` (`gamify.mastery` 359–369), denominator = mixed 366. Readiness = 70% last-30-day weight-adjusted accuracy (unattempted topic = 0) + 30% coverage of that pool, then linear map onto 200–990 (`view-dashboard.js` `readinessData` 274–336). Labeled “Estimate”, but it is the only score-like number on the home screen until a sim exists.
- Study-time card: live “8 min active today · 0.1 h this week · 0.0 of 15–17 h”. Copy admits “Counts active time in this tab only” (`view-dashboard.js` 249–260). Plan still assumes ~15–17 h/week of real study.
- A day counts as active when a question is answered, a plan task is checked, **or** a formula card is graded (`DESIGN.md` §2). Checking boxes keeps the streak.

**Severity:** 6 / 10.

**User impact on D-54 prep.** Secondary to (1)–(4), but it amplifies them: the site congratulates the wrong work. A student chasing “Get 5 right” on vintage drills and a rising readiness % can believe they are on pace.

**Uncertainty:** Low on formulas. Medium on whether this user ignores XP; the UI still leads with it.

---

## Nominated SINGLE worst aspect

**The site never turns remaining days into a directed daily program** — dashboard “today” is XP/challenges/QOTD, the plan is a dead Jul–Oct 28 checklist, and formula/mock/practice are opt-in rooms.

This beats the other findings because they are *inputs* to a loop that does not exist. Fixing pool labels, auto-picking 10 formulas, or moving the date to Nov 1 still leaves a D-54 candidate asking “what do I do now?” and getting twenty doors. The product job of a personal prep studio at D-54 is one next action that spends scarce mocks, due reviews, and unlearned formulas against a 70×120 clock. That job is unowned.

---

## Suggested fix scope if chosen

Not patches — files that would have to change if this aspect is the one locked:

- **Today sequencer (new thin owner, or `js/view-dashboard.js` + `js/gamify.js`):** one ordered agenda from (due mistakes, formula remaining vs unlearned vs days left, this week’s real work, next unused ETS mock, one timed mixed set). Challenges/QOTD become optional, not the default day.
- **Single exam date:** `js/data-topics.js` `PGRE.EXAM_DATE`, `js/store.js` `settings.examDate`, `js/gamify.js` `daysToExam`, `index.html` brand, `js/view-dashboard.js` countdown label, `js/data-plan.js` / `js/view-plan.js` horizon. Default **2026-11-01**.
- **Plan as launcher, not ledger:** `js/data-plan.js` (catch-up from today → Nov 1; drop GR8677/GR9277 as “tests”; schedule ETS 2024 + remaining intact forms; delete “import pending” / “simulator deferred”); `js/view-plan.js` (task rows start `#/practice/...`, `#/exam` replay ids, `#/formulas` picker — XP only after the session exists, or drop task XP).
- **Do not silently expand:** avoid a 15th nav item. The dashboard should *use* Mistake book, Formulas, Practice, Exam, Plan rather than adding “Today 2”.

If the debate instead picks finding 3 (pool/mocks), the files are `js/bank.js`, `js/view-topic.js`, `js/view-practice.js`, `js/view-exam.js`, `js/exam-engine.js`, `js/view-build.js` — source-aware daily pool, honest 70-q copy, keep `cpg-exam` out of weighted draws.

If it picks finding 4 (formulas), `js/srs.js` + `js/view-formulas.js` + dashboard review-queue: remaining-days new-card budget, stop shipping an empty daily batch as the default.

---

## What this survey explicitly did not verify

- The user’s real browser `localStorage` / IndexedDB (progress, which mocks already sat, formula grades).
- A full 70×120 or 100×170 sitting (timer integrity, submit → analytics/mistakes, pause).
- Formula Study / Match / Type / Quiz / Cloze grading, learning steps, undo, leeches, reverse cards, visualizers.
- Mistake-book drill, lucky-guess, archive, SRS ladder under repeated solves.
- Library markdown import → topic Notes (live notes still “Waiting for Conquering the Physics GRE”).
- Print/PDF, Search, Focus timer, Study-time page, keyboard-first practice beyond seeing the setting default on.
- Item-level GRE-style quality of `cpg` / `ets-drill` / preview (content survey).
- Engineering reliability, persistence, spoiler leaks beyond the draw/filter facts above (engineering survey).
- Visual polish / CSS (out of scope).
- Whether `countUp` on the dashboard countdown can leave “0 days” on screen (saw “0” mid-animation; plan later showed a mid-tween “46”; not treated as a product finding).
- README/DESIGN drift beyond where it contradicts the live loop (README still describes a 20-question frame and a deferred mock; both have shipped).
