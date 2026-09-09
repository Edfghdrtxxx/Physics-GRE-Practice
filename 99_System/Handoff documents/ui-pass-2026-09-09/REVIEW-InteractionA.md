# REVIEW — InteractionA (adversarial)

Reviewer: ReviewIntA. Date: 2026-09-09. Read-only on application code. Live checks on `http://127.0.0.1:8766` at 1440x900 and 390x844 (Chromium). Bank on this machine: daily 366, `poolSize()` 666, whole bank with exams 1135.

This is not a rubber stamp. Several report claims hold in source and in the browser. One claimed “never covered” result does not.

Confidence key: **high** = source + live; **medium** = source and/or one viewport; **low** = inferred / not fully exercised.

---

## 1. Confirmed claims (and how)

### Pace trainer 5 s grace; question-stage hints A–E only
**Confirmed (high).**

- `js/view-practice.js:164` `PACE_GRACE_MS = 5000`; `paceMark` returns `''` when `elapsedMs < 5000` (`:185–187`). Live chip still ticks from `0 s` (that is the live timer, not the mark).
- Live, custom 5-question set, `paceTrainer` default on:
  - Answer ~400 ms after render: no `.pace-mark`; feedback still rendered (`Incorrect — the answer is C`).
  - Answer after 5.2 s: `.pace-mark` text `5 s — under pace (target 103 s)`.
- Question stage (`:431–436`): hint is `A–E or 1–5 to answer` only. Assess chips (Knew it K / Guessed G / Too slow T / Forgot something F) appear only after the answer (`PGRE.assess.html`). `Enter next` sits beside `#next-btn` (`:499`).
- Residual, not a fail of the claim: after answering, the *question-stage* A–E hint node is not removed, so both `A–E or 1–5 to answer` and `Enter next` are on screen. A–E keys are ignored in the feedback stage (`onKey`).

### `#exam-q-heading:focus { outline: none }` still focuses
**Confirmed (high, Chromium).**

- `js/view-exam.js:372` `tabindex="-1"`; `:392–393` `heading.focus()`.
- `css/style.css:1383` `#exam-q-heading:focus { outline: none; }` (specificity beats the global `:focus-visible` rule at `:158`).
- Live exam room, 390 and 1440: `document.activeElement.id === 'exam-q-heading'`, computed `outline-style: none`.

### Practice resume via `sessionStorage['pgre-practice-session']` (resume vs start over; no double-count)
**Confirmed for custom sets (high). `#/practice/all` same code path (medium, source only).**

- Snapshot on every `renderQuestion` / `answer` (`js/view-practice.js:206–217, 448, 504`). Key `pgre-practice-session`. Resume point is `i = answers.length`, not `session.i`, so leaving on the feedback screen starts at the *next* question.
- `loadSaved` requires matching `topicId` + `filter` (`:224–233`). Custom path also requires `sameIds` against `pgre-quiz-config` (`:359–361`).
- `recordAnswer` runs only in `answer()` (`:465`). `resumeSaved` rebuilds `session.answers` from the snapshot and does not call `recordAnswer` (`:236–251`). `beginPractice` mints a new gamify `sid` (`:404`); resume reuses `snap.sid`.
- Live (custom label `ReviewIntA long-stem`):
  - Answered Q1, left to `#/`, returned to `#/practice/custom` → `Resume session (4 of 5 left)` / `Start over`.
  - Resume landed on `Question 2 of 5`. Attempts stayed at 1 until the new click, then 2. Last attempt qid was the new question, not a replay of Q1.
  - Later: `Resume session (2 of 5 left)` after three answers; **Start over** showed `Question 1 of 5`, new `sid`, `saved.answers.length === 0`, attempts still 3 (profile not rewritten).
- Cleared on summary (`renderSummary` `:535`) and start over (`:271, 399`).

### `#/exam` card order, pool copy 666 not 1135, next mock is intact ETS
**Confirmed (high).**

- Live cold `#/exam` order: intro → **Your next mock** (`btn-primary` `Start ETS Official Practice Test (2024)`) → **Other released ETS exams** (GR1777 / GR0877 / GR0177 / GR9677, all ghost) → **Practice set in the current format** (`btn-ghost` `Start a 70-question set`, copy `draws from 666 questions`) → **Legacy format** (Sample Exam 1–3) → **Past simulations**. No Resume card (none in progress). No `1135` in the setup text.
- `PGRE.examEngine.poolSize()` live = **666**. Composition: preview 20 + cpg 146 + ets-drill 200 + cpg-exam 300. Intact `ets-exam` 469 excluded. Whole bank with exams = 1135.
- `PGRE.nextMockPointer()` live = `{ id: 'ets2024', title: 'ETS Official Practice Test (2024)' }`. Skip map `gr8677` / `gr9277` (`js/view-dashboard.js:398`). Those two ids are drills (`ETS_DRILLS`), not on the setup list. After starting and then discarding a weighted 70-set, the pointer was still ets2024.

### `#/plan` `.countdown-num` not tweened
**Confirmed (high for post-mount; medium for the first frame).**

- `js/view-plan.js:32` paints `days` (from `gamify.daysToExam()`) into the HTML. `mount` (`:174–188`) countUps `.hero-xp-note` and meters only; comment says the countdown is never tweened from 0.
- Live `#/plan`: four samples over ~570 ms after `waitForSelector` were all `53` (= `daysToExam()` on 2026-09-09). No 0/10 flash in that window. A sub-frame first paint was not instrumented; source does not tween that node.

### Spoiler protection not weakened
**Confirmed (high).**

- InteractionA did not edit `js/bank.js`. `PGRE.allQuestions()` (daily / `questionsForTopic`) still has no `cpg-exam` / `ets-exam`. Live daily 366, `dailyHasExam === false`.
- `drawPool` (`js/exam-engine.js:96–99`) is `allQuestions({ includeExam: true }).filter(src !== 'ets-exam')`. Intact ETS stay out of the 70-draw. Book sample exams (`cpg-exam`, 300) remain in that draw — the engine comment calls this pre-existing, not a new hole. Practice/custom builder still filters `ets-exam`. Bookmarking exam questions does not add them to a practice pool (`view-exam.js` notesBlock comment).

### No-glyph pass (partial — see bugs)
Timer warning is text + tint (`view-exam.js:542–546`). Palette flag is a coral `::after` dot (`css/style.css:1433–1441`). Review cards say `Right` / `Wrong` (`view-exam.js:824`). Setup/room innerText at 390 had no `⏱✓✗⚑⚠⌛`. Report’s own leftover (`hist-mark` 14 px min-width) is real and still there (`css/style.css:998`).

---

## 2. Bugs / regressions / overclaims

### [medium] Exam sticky nav covers choice E while scrolling to it (390x844)
The unit claimed: longest stem, `.exam-navrow` sticky at the viewport bottom, “at full scroll choice E bottom 274/803 vs nav top 292/825 — never covered.”

**Full scroll matches. Mid-scroll and `scrollIntoView({block:'end'})` do not.**

Live 390x844, weighted 70-set, longest item in the sitting `gr9277-21` (~805 visible chars), `position:sticky; bottom:0` on `.exam-navrow` (`css/style.css:1407–1418`; markup `js/view-exam.js:320`):

| scrollY | choice E | navrow | overlap |
|---|---|---|---|
| 0 | 1025–1074 (below fold) | 779–844 stuck | no — E not on screen |
| 200 | 825–874 | 779–844 stuck | **yes** |
| 800 (max) | 225–274 | 292–357 in-flow | no, gap 18 px |

`choice.scrollIntoView({block:'end'})`: E 795–844, nav 779–844, **overlap**, gap −65 px. The bottom ~65 px of the viewport is the nav. There is no `scroll-margin-bottom` on `.choice`. Moving padding off `.exam-main` into the row (`css/style.css:1371–1374, 1414–1415`) only separates E from the row when the row is in-flow at the *end* of the document — the same 18 px gap the unit measured. While the row is stuck, E slides under it. A tap aimed at E can hit Flag/Next.

1440x900, same question: document `scrollHeight` equals the viewport; E 706–754, nav 776–851, gap 22 px, no overlap. Heading focused, `outline-style: none`. Their 1440 “803 vs 825” sitting was not reproduced (this draw’s longest still fit). **Uncertain** for a figure-heavy stem that exceeds 900 px tall.

**Severity: medium.** Flag/Next *are* reachable on first paint at 390 (that part of the original below-the-fold finding is fixed). “Choice E always clears the row” / “never covered” is false at 390 during the scroll that brings E on screen.

### [low] Practice sticky Next is confined to `#feedback`, so it is not on screen while choice E is
`.practice-actions` is injected *inside* `#feedback` (`js/view-practice.js:486–500`), with `position: sticky; bottom: 0` (`css/style.css:588–598`). Sticky cannot escape `#feedback`. Live 390, long stem `cpg-5.5.5-2` (q text ~798 chars), after answering, still looking at E (scrollY 186): E 790–838 (in view), action row 905–968 (**below the fold**). The row only sticks at 781–844 once scrollY ≳ 500, by which time E is already well above.

So: Next does stay pinned while *reading a long solution* (the report’s “long solution” wording). It does **not** stay pinned while the choices are still the thing on screen. `#next-btn` did receive `focus({ preventScroll: true })` (`:517`); live `activeElement` was `next-btn` and the page did not jump.

**Severity: low** relative to the written claim about solutions; do not treat the 390 “action row sticky at 781–844 with no overlap of choice E when scrolled to it” screenshot as proof that Next is visible whenever E is.

### [low] `⚠` left in exam-results copy
`js/view-exam.js:640` still prefixes the missing-bank note with `⚠`. The report listed `⚠` among glyphs removed from practice/exam copy. This string only appears when `exam.missing` is set (not exercised live). Bookmark stars `★` / `☆` remain in practice and exam-review notes (`view-practice.js:95,111`; `view-exam.js:731,787`). Those are controls, not running copy; the wave still says no decorative icons. Stale CSS comment at `css/style.css:1393` still talks about a `⚑` glyph on the flag chip.

**Severity: low** (missed cleanup, not a functional break).

### [nit] 70-draw copy says “book and drill banks”
`js/view-exam.js:207–209`. Live pool 666 includes **300 book sample-exam items** (`cpg-exam`). Intact ETS are correctly excluded. The 1135→666 correction holds; the prose is a bit tidier than the draw.

### [nit] Pace mark appears at exactly 5.000 s
`< PACE_GRACE_MS` (`view-practice.js:187`). A 5.2 s wait produced `5 s — under pace`. The original “0 s — under pace” bug is gone. Boundary is inclusive of 5000 ms.

### [nit] Start-over leaves the previous gamify session open
`beginPractice` always `beginSession` (`:404`). Resume reuses `sid` (good). Start over never `endSession`s the abandoned `sid`. Attempts are not double-counted. Open rows in `state.sessions` can linger.

---

## 3. Concurrent `css/style.css` collision

LayoutFinisher signalled done (`?v=20260909d`, overlay drawer + study-time overflow). Post-land snapshot of this file:

- InteractionA selectors still exist **once** and were not rewritten: `.practice-actions` 588, `#exam-q-heading:focus` 1383, `.exam-navrow` 1407, mobile `.exam-navrow` 1572–1573.
- `#main` remains `flex: 1; min-width: 0` with no overflow (`:282`). `#view` has no overflow (`:283`). `index.html` still has `#main > #topbar + #view` — no extra wrapper.
- Overlay drawer `transform: translateX` and `overflow-y: auto` are on `#sidebar` / `#sidebar-nav` only (`:1203–1256`), not on a practice/exam sticky ancestor. `body.exam-fullscreen #sidebar` / `#topbar` hide rules still exist (`:1328–1329`).
- `[data-theme="dark"]` only retokenizes.

**No collision with InteractionA’s rules.** Sticky containing blocks for `.practice-actions` / `.exam-navrow` are unchanged in source. Live 390 overlap numbers in §2 were taken *before* the drawer (sidebar was still an inline wrap); after the drawer the 390 content column is taller, so a given stem may fit more often, but the missing `scroll-margin-bottom` on `.choice` is still the mechanism. Geometry not re-measured live after `20260909d`.

---

## 4. Explicitly unchecked / uncertain

- `node tools/test-exam-engine.js` 47/47 and `node tools/test-ux-interaction.js` 108/108 — **not re-run** (assignment: no suite sweeps). Treat the unit’s pass as unverified here.
- `#/practice/all` and `#/practice/<topic>/new|/done` resume — same `renderConfig`/`loadSaved` as custom; **not clicked live**.
- Resume after the last question’s feedback (`i >= ids.length` clears the snapshot, `:232`) — **not clicked**; source drops resume and never shows the summary.
- `resumeSaved` when the bank dropped an id (index alignment vs `snap.i`) — **not exercised**.
- First paint of `#/plan .countdown-num` in the first ~16 ms.
- 1440 exam room with a stem/figure taller than 900 px (this sitting fit).
- Dark mode, `prefers-reduced-motion`, keyboard-only walk of A–E / Flag / Next, screen reader announcement of `#exam-q-heading`.
- `#/exam` when every intact ETS form is already sat (`nextMockPointer()` → `null` → no “Your next mock” card; heading becomes “Released ETS exams”).
- Results page `⚠` missing-bank branch; `hist-mark` Right/Wrong at 14 px in a real review list.
- 390 exam-room overlap after the overlay drawer (live sweep was pre-drawer). Source mechanism unchanged.

---

## Verdict

Ship-blocking for the written InteractionA contract? **No** on pace grace, resume/double-count, exam landing/666/ets2024, plan countdown, spoiler, heading focus.

Do **not** accept “choice E never covered” as verified. At 390x844 (pre-drawer live sweep) the exam navrow is a sticky overlay without scroll-margin on the choices; E is under Flag/Next for a slice of the scroll, which is exactly the long-stem case the unit said it measured. LayoutFinisher’s land did not touch that rule.
