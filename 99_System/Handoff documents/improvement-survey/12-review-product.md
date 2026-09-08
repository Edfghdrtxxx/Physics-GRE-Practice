# Product review — N1-narrow (is Today a morning instrument?)

Role: ReviewProduct (grok-4.6). Skeptical auditor. No application-code edits.

Binding spec: `09-lock.md` §1 / §4 / §3 out-of-scope (the lock has no §7; non-goals are §3 + §4.7). This memo does not demand a sidebar redesign, Kahn ingest, a 93-task rewrite, or a store merge.

Live origin: `http://127.0.0.1:51651/` (`pgre-liveui`). Isolated headless Chromium, cache-bypassing navigations, viewport 1440×900, motion not reduced. Cold / nearly-empty `pgre-state-v1` in this profile (not the user's real Chrome). Calendar day of review: 2026-09-08.

Implement claims read: Unit A clock files; Unit B `js/view-dashboard.js`, `js/srs.js` `fillFormulaDayIfEmpty`, `js/view-formulas.js` `studyFromFill`.

---

## Verdict

**SHIP.**

Today is a morning instrument for two of the three levers the lock actually bought: mixed practice, and a 10-card formula Study start that does not go through the 334-row picker. The clock on `#/` and `#/plan` agrees on Sunday 1 November 2026 / 54 days. The assigned attacks that would have been §4 blockers (caught-up copy on the Today formula control; Study 10 filling a user batch; Today buried on a second screen; countdown vs plan still on Oct 28) did not land.

It is also still a widget glued onto the old buffet. The first screen keeps a second formula row whose `Open →` reproduces the original stall. The mock line names the right form and then dumps into a page whose primary button is not that form and whose sample exams are in the fold. Those are product should-fixes. They do not fail lock §4, and fixing them by rewriting `#/exam` or deleting Review queue was not this wave.

No product-level §4 blocker. Do not hold the ship for N2, Kahn, or a 23-link rethink.

---

## Method (what was actually clicked)

Cold open `#/` after `localStorage.clear`. Measured fold boxes. Clicked Today `Practice →`. Clicked Today `Study 10 →` on an unseen 334-card deck with empty `formulaDay`. Flipped the resulting card. Clicked Today mock `Open →`. Opened `#/plan`. Called `PGRE.currentWeek('2026-10-30')` (did not change the OS clock). Set a user-picked 4-card batch and clicked Today Study again. Clicked Review queue `Open →` on an empty batch. Wrote `settings.examDate = '2026-10-28'` into a valid blob and reloaded. Wrote a custom `'2026-11-15'` via `store.save()` and remounted.

Did not sit a mock. Did not reproduce two-tab `pagehide` clobber. Did not inspect the user's real Chrome profile. Did not capture first paint of `.countdown-num` (0-flash). Did not test `prefers-reduced-motion`.

---

## Attack results

### 1. Copy that still reads as caught-up

**Today control: no.** After deck load, `#today-formulas` is `334 not yet introduced`. Button `Study 10 →`. Not `nothing picked yet`, not `0 remaining`, not `all caught up`.

**Same first screen, second row: copy is fixed, action is not.** Review queue Formula recall uses the same `formulaStatus` string (`334 not yet introduced`) but the control is still a ghost `Open →` to `#/formulas` with no fill and no `armStudyFromFill`.

**Formulas home without the Today CTA: yes, the old lie.** Empty batch, 334 unseen: heading `Nothing picked yet`, line `Nothing picked yet — choose today’s cards below.`, tile `Remaining today 0 / 10`, primary `Pick today’s cards`. That is the pre-lock stall, still the destination of sidebar Formula recall and of Review queue Open.

### 2. Study 10 filling the wrong cards

**Not a §4 miss. File-order CM, which the lock allowed.** After Today `Study 10 →`, `state.formulaDay.newIds` was exactly `cpgf-1.1` … `cpgf-1.10` (deck order, all `topic: 'cm'`). Session opened `Card 1 · 10 left` on Classical Mechanics (interleave reordered inside the topic; first painted card was Energy / gravitational PE, id `cpgf-1.7`).

The fill helper only walks `newInDeck`. On a cold unseen deck that is the spec (`09-lock.md` §5: unseen ids into `newIds`). It is not a mixed GRE-weighted 10. That is a nit, not a wrong-species fill.

### 3. Mock pointer that still burns sample exams

**Today line does not name GR8677 / GR9277.** Copy: `Next current-format mock: ETS Official Practice Test (2024)`. Href `#/exam`. Catalog has no `gr8677` / `gr9277` intact forms (those two are the plan's paper-era Tests #1/#2, parked under N3-A).

**Landing still invites a burn.** `#/exam` first-fold primary is `Start 70-question exam` (weighted draw from 1135, `id="start-70"`, coral). ETS 2024 is a ghost button in a row with GR1777 / GR0877 / GR0177 / GR9677. Legacy `Sample Exam 1/2/3` (`data-replay="x1|x2|x3"`) sit at y≈776, still inside 900 px. A user who trusts Today `Open →` and then clicks the obvious button does not start ETS 2024. A user who scrolls one card starts a book sample exam.

AC5 explicitly says "links to `#/exam`" and "the reviewer does not sit the mock." Letter passes. The pointer is not an instrument; it is a caption on the old exam buffet. Should-fix. Out of scope to rewrite `js/view-exam.js` 1135-vs-666 copy (`09-lock.md` §3).

### 4. Countdown vs plan still disagreeing

**No.** `#/` `.countdown-num` = `54` = `PGRE.gamify.daysToExam()` = `PGRE.srs.daysUntil('2026-11-01')`. Label `days until the exam / Sun, Nov 1, 2026`. Brand-sub `Prep Studio · exam Nov 1, 2026`. `#/plan` hero: `July 13 → November 1, 2026` and countdown `54` / `days to go`. Formula `#exam-date` value `2026-11-01`. `examCap()` is `53` (`daysUntil - 1`); that is the interval cap, not a second exam date.

Old default migrate: valid blob with `examDate === '2026-10-28'` reloads to `'2026-11-01'` / 54, not 50. Custom `'2026-11-15'` (set through `store.save()`, then a real remount) stays 15 Nov / 68 on the hero; brand-sub remains Nov 1 as the lock's static product date.

`currentWeek('2026-10-30')` returns W16 `Taper — exam Sunday Nov 1` (`2026-10-26`–`2026-11-01`), not a stuck Oct 26–28 week. Task bodies may still say GR8677; that is §4.6 allowed.

### 5. Today buried on a second screen

**No.** `#today-agenda` box: top 262 / bottom 488 / height 225, fully inside 900. Above `.stat-row` (504–606), above Review queue (622–801), above QOTD (starts 817, not fully in fold). No 15th nav item named Today. Sidebar still 23 destination links.

Hero (Level 0 · Quark, XP meter, 54-day countdown) is still the first card (81–246). AC2's bar is "not Level/XP as the *only* above-the-fold work." Today is also above the fold. XP is louder. That is a nit.

### 6. Formula CTA that lands on picker after all

**Today `Study 10 →`: no.** One click → `#/formulas`, `hasPicker` false, flip card with `Show answer`, 10 left. After a second click (flip), Again / Hard / Good / Easy are visible. `renderPicker` was not shown.

**Review queue `Open →`: yes.** Same first screen, same `334 not yet introduced` copy, ghost button, `#/formulas`, no fill, `Nothing picked yet` + `Pick today’s cards`. This is the assigned attack, and it still works if the user clicks the lower formula row.

### 7. XP still louder than Today

**Yes, visually. Not a §4 fail.** The greeting is still Level / XP. Coral on the page is the XP meter and the Today primary buttons. Today is the first *work* card and is fully in fold. Challenges stay below. The lock did not require deleting the hero.

### 8. Fill that overwrites a user-picked batch

**No.** User batch `cpgf-3.1`–`cpgf-3.4` (Optics). Dashboard showed `4 left today` / `Study →`. Click Today Study: `newIds` unchanged; session `Card 1 · 4 left` / Optics & Wave Phenomena. `fillFormulaDayIfEmpty` returns early when `reviewIds + newIds > 0`. Direct API call matched.

---

## Findings

### F1. Review queue on the first screen still dumps an unseen deck into the picker

- **AC / scope:** AC4 spirit (formula start without picker) and the original Product/UX hole the lock absorbed. Letter of AC4 names "the Today formula control." Review queue was not deleted (not required).
- **Evidence:** Cold `#/`, Review queue fully in fold (top 622). Copy `334 not yet introduced`, button `Open →`, `href="#/formulas"`, class `btn-ghost`. Click: `#/formulas`, empty `formulaDay`, `Nothing picked yet`, `Remaining today 0 / 10`, `Pick today’s cards`. Today `Study 10 →` on the same screen does the fill. Two formula rows, one string, two different mornings.
- **Severity:** should-fix
- **Fails lock §4?** No (AC4's Today control works). Product: the first screen still contains the stall N4 was supposed to kill.

### F2. Mock pointer names ETS 2024 and then leads with a 70-draw plus in-fold sample exams

- **AC / scope:** AC5 letter is a pointer to `#/exam`, not a one-click start. Pool/exam-room honesty beyond the pointer is §3 out of scope.
- **Evidence:** Today mock row uses catalog title `ETS Official Practice Test (2024)` and `#/exam`. `#/exam` primary `Start 70-question exam` at y=341. ETS 2024 is ghost, same row as GR1777/GR0877. `Sample Exam 1/2/3` at y=776, in fold. GR8677/GR9277 not listed as intact forms.
- **Severity:** should-fix
- **Fails lock §4?** No. The pointer does not *start* the named form. A non-CS user can still burn a sample exam in one extra click. Do not "fix" this by rewriting `view-exam.js` in a supposed N1-narrow leftover pass.

### F3. Hero is still an XP buffet; Today is a second card

- **AC / scope:** AC2
- **Evidence:** First card is `Good evening. / Level 0 · Quark / 0 / 100 XP to Level 2` plus the 54-day countdown. Today is immediately under it and fully in fold, with three launchers.
- **Severity:** nit
- **Fails lock §4?** No. AC2 asked for Today above XP *tiles*, challenges, and QOTD, and "not Level/XP as the only above-the-fold work." Both hold.

### F4. Study 10 is the first ten CM cards in file order

- **AC / scope:** AC4 / §5 fill API (unseen ids, up to target). Not a picker redesign (N4 parked).
- **Evidence:** `newIds = cpgf-1.1 … cpgf-1.10`, all `cm`. Live session opened on CM Energy.
- **Severity:** nit
- **Fails lock §4?** No. Wrong-topic mix is a later formula aspect. Cold start with CM is not a lie.

### F5. Again / Hard / Good / Easy are not visible until a second click

- **AC / scope:** AC4 wording: "One click … reaches a Study flip card (Again / Hard / Good / Easy visible)."
- **Evidence:** Post-click DOM has `Show answer` / Rebuild hints / Skip / Put away. Grades appear after `flip()`. This is the existing Anki chrome, not a picker.
- **Severity:** nit
- **Fails lock §4?** No. The parenthetical describes the Study surface, not a requirement that grades paint before the flip. The user is in Study, not `renderPicker`.

### F6. Formulas home still teaches "you pick, nothing is chosen for you"

- **AC / scope:** AC4 allows the picker to remain for add/remove. DESIGN §4b empty-batch copy was not in-scope to rewrite except as reached from Today.
- **Evidence:** `#/formulas` empty-batch intro still says each day *you pick*; empty state is `Nothing picked yet`. Sidebar Formula recall and Review queue Open still land here.
- **Severity:** nit (expected leftover) unless counted as F1's destination
- **Fails lock §4?** No.

---

## AC scorecard (product, not a second live-AC pass)

| §4 | Result | Note |
| ---: | --- | --- |
| 1 Clock | Pass | 54 / Sun, Nov 1, 2026; brand Nov 1; formula input `2026-11-01`; 10-28 migrate; custom date left alone. First-paint 0-flash **not thoroughly checked**. |
| 2 Today above buffet | Pass | `#today-agenda` fully in fold, above tiles / challenges / QOTD. |
| 3 Mixed practice | Pass | Today `Practice →` → `#/practice/all` with 5 / 10 / 20 / All 366. No hash typed, no sidebar required. |
| 4 Formula Study 10 | Pass (Today control) | Fill 10, flip card, no picker. Review queue Open is F1. |
| 5 Mock pointer | Pass (letter) | Names ETS 2024, links `#/exam`, does not name GR8677/GR9277. F2 is the product leftover. |
| 6 Plan horizon | Pass | Hero November 1, 2026. `currentWeek('2026-10-30')` is W16 through Nov 1. |
| 7 Non-goals held | Pass | 23 sidebar links, no extra Today route. Did not retest LWW; did not open Notes portals. |

---

## Uncertainties (do not assert absence)

- **First paint of `.countdown-num`.** Source skips `countUpText` on `.hero-right .countdown-num`. After load the node was `54` and was never observed as `0`. A 0/10 flash on the first frame was **not** instrumented. Do not claim it cannot flash.
- **User's real Chrome `pgre-state-v1`.** Already-picked `formulaDay`, already-sat `ets2024`, already-typed `examDate`, blob size: unknown. Rankings assume the cold/sparse profile the lock specified.
- **OS clock on 2026-10-30.** W16 coverage was checked by calling `currentWeek('2026-10-30')`, not by moving the machine date.
- **Two-tab clobber / Kahn Notes / 23-link IA.** Out of wave. Not re-probed.
- **Shared `pgre-liveui` origin.** This review used an isolated headless profile. It did not read or write the daily Chrome profile ReviewLive may also be hitting.

---

## What this lock did *not* have to become

A sequencer. A plan-as-launcher. A catch-up of W01–W08. A mock that auto-starts `ets2024`. A formula picker with "give me 10" on `#/formulas` itself. IndexedDB Kahn. `navigator.locks`. Those are parked in `09-lock.md` §6. Treating F1/F2 as a license to pull them in is a process failure.

---

SHIP
