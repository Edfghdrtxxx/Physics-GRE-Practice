# Scope review — N1-narrow vs 09-lock.md

Role: ReviewScope (grok-4.6). Skeptical auditor. No application-code edits. Binding spec: `09-lock.md`. Live UI and product copy are sibling jobs; this memo is file ownership, allowed hunks, and fill/clock contracts in the nine owned files.

Method: `git diff` vs `HEAD` (`b7f1d7b`) for the nine owners; current text of those files; implementer transcripts (`history://ImplClock`, `history://ImplToday`) to separate this-wave hunks from the already-dirty tree. Did not run the live origin. Did not re-audit files Unit A/B were forbidden to touch except to confirm they were not N1-authored.

---

## 0. Tree hygiene (read this first)

The working tree is not an N1-narrow slice. `git status` also has `css/style.css`, `css/motion.css`, `js/app.js`, `js/flashmodes.js`, `js/motion.js`, `js/study-time.js`, `js/timer.js`, `js/view-exam.js`, `js/view-mistakes.js`, `js/view-practice.js`, `tools/test-formula-checkin.js`, and untracked `tools/test-ux-interaction.js` (1334 lines). Those diffs are a11y / motion / study-time / visualizer work, not clock or Today.

ImplClock and ImplToday did not author those files (transcripts + their yields). A commit of "whatever is dirty" would violate lock §3 even if the N1 hunks are clean.

---

## Findings

### F1. Unit A `index.html` cache-bust (this wave)

- **Rule:** lock §3 table: `index.html` — "Brand-sub exam date. No cache-bust / script-order work." §3 out-of-scope: "`?v=` completeness".
- **Evidence:** ImplClock yield and diff: brand-sub `exam Nov 1, 2026` (allowed) plus `?v=20260908e` on `data-topics.js`, `data-plan.js`, `store.js`, `gamify.js`, `view-plan.js`. Main's implement ticket relaxed this to "optional `?v=` bump for A-owned JS tags"; the lock did not.
- **Severity:** nit
- **Fails lock §4?** No. Cold hard-reload still sees Nov 1.

### F2. Owned files vs HEAD contain non-N1 hunks

- **Rule:** lock §3 file table + "If a change is not required to pass §4, it is out." Unit B: "No Lab / Match / Type / Quiz / Cloze / Search work." Unit A: brand-sub only.
- **Evidence (current `git diff` vs HEAD, not authored by N1 units per transcripts):**
  - `index.html`: brand became `<a id="brand-home">`; `#today-learn` study-time chip; `aria-pressed` on theme; `?v=` bumps on css, `app.js`, `view-dashboard.js`, `view-formulas.js`, `srs.js` left at `20260831b`, etc.
  - `js/view-dashboard.js`: `dayKey` shifted to a 03:00 study-day; QOTD `reveal-in` / `aria-pressed`.
  - `js/view-formulas.js`: visualizer nav (`hasInteractiveVisualizer`, `openVisualizerFor`, `vizNavButtonHTML`, Lab keyboard guard), flash-tab a11y, browse-tab a11y, `flashmodes.js?v=20260907a` — plus the N1 `studyFromFill` / `armStudyFromFill` / `renderHome` start-from-fill.
- **Severity:** should-fix (commit hygiene). Not an N1 logic defect.
- **Fails lock §4?** No, if those hunks are excluded from the N1 commit. Yes as a process failure if this working tree is labeled "N1-narrow."

### F3. Extra tests / docs / CSS / `app.js` in the tree

- **Rule:** lock §3: no new `tools/test-*.js`; `js/app.js` and `css/style.css` not in this wave; Unit B must not edit `app.js` / css / `index.html`; no extra markdown in the app.
- **Evidence:** N1 units did not edit `app.js`, `css/style.css`, or add tests/docs (transcripts). `tools/test-ux-interaction.js` is untracked leftover (header: motion/flashmodes/view-exam gating, not N1). App `README.md` / `DESIGN.md` unmodified. Handoff markdown under `99_System/Handoff documents/improvement-survey/` is this survey, not app docs.
- **Severity:** should-fix for whoever commits; not an implementer miss.
- **Fails lock §4?** No.

### F4. Unit A clock / horizon stayed inside the table

- **Rule:** §3 Unit A: `EXAM_DATE` only; store default + exact `'2026-10-28'` migrate; `daysToExam()` one source; plan horizon only; view-plan hero only. Do not reauthor W01–W15, mock sequence, XP, `save()` / merge / quota / `splitChapters`.
- **Evidence:**
  - `js/data-topics.js`: `PGRE.EXAM_DATE = '2026-11-01'` only.
  - `js/store.js`: default `examDate: '2026-11-01'`; `migrate()` line `if (st.settings.examDate === '2026-10-28') st.settings.examDate = '2026-11-01'`. `save()`, merge, quota, `splitChapters` bodies unchanged.
  - `js/gamify.js`: `daysToExam()` reads `settings.examDate || PGRE.EXAM_DATE`. Challenges untouched.
  - `js/data-plan.js`: 4 lines — header, Phase 3 `desc`, `w16.end = '2026-11-01'`, W16 title + `w16t3` weekday `Wed` → `Sun`. `w10t5` still GR8677 on paper; `w11t4` still GR9277; all W01–W15 labels/XP unchanged; `w16t3` still `xp: 50`.
  - `js/view-plan.js`: comment + hero `July 13 → November 1, 2026`. Checkbox XP wiring unchanged.
- **Severity:** n/a (held)
- **Fails lock §4?** No. AC1 migrate-on-load and AC6 horizon are in the source. `currentWeek('2026-10-30')` matches `w16` because `end` is Nov 1; after Nov 1 it still returns the last week forever (pre-existing, parked N3-A).

### F5. Store migrate does not `save()`

- **Rule:** §3 "No `save()` work" vs AC1 "old default `'2026-10-28'` shows November 1 after reload without DevTools."
- **Evidence:** migrate mutates RAM only. `load()` → `migrate()` → `rollDay()`. `rollDay()` saves only when `today.date` changes. Same-day reload: disk may still say `'2026-10-28'`; migrate runs again so the UI still shows Nov 1. Custom dates are left alone (exact-string test).
- **Severity:** nit (intentional given the save ban). Disk/export can lag until some other `save()`.
- **Fails lock §4?** No for the UI clause of AC1. Did not inspect a real blob.

### F6. Unit B Today / fill / Study path matches the contract

- **Rule:** §3 Unit B + §5 fill API. AC2–5, 7. No new `pgre-state-v1` keys. No second date constant. `countUpText` off `.hero-right .countdown-num` only. Fill: empty batch + unlearned → `newIds` up to `clampTarget(formulaDailyTarget)`, existing `store.save()`. Dashboard: fill, then `#/formulas`, then Study. One-shot flag allowed.
- **Evidence:**
  - `js/srs.js`: only additive `fillFormulaDayIfEmpty`. SM-2, `examCap`, `_reconcileFormulaDay` unchanged. Empty test is `reviewIds.length + newIds.length`. Unseen ids from `newInDeck`, skip suspended, cap `T = clampTarget(formulaDailyTarget)`, write `batch.newIds`, `store.save()`. Does not raise the target. Writes existing `state.formulaDay` only.
  - `js/view-dashboard.js` N1 hunks: `examDateStr` / `examDateLabel` from `settings.examDate || PGRE.EXAM_DATE` via `toLocaleDateString` (no hardcoded weekday, no `'2026-11-01'` literal). Countdown number is `g.daysToExam()`. `todayAgendaHTML()` inserted after hero, before `.stat-row` / Review queue / QOTD / challenges. Practice `href="#/practice/all"`. Mock: if no sat `ets2024`, title from catalog or `'ETS 2024'`; skip `gr8677`/`gr9277`; link `#/exam`. Formula copy: unlearned + empty batch → `N not yet introduced` (not "nothing picked yet"). CTA: `fillFormulaDayIfEmpty` then `armStudyFromFill()` then `location.hash = '#/formulas'`. `countUpText` on `.hero-right .countdown-num` removed; level/XP/stat/challenge count-ups remain; `#rq-formulas` still count-ups when `remaining > 0`.
  - `js/view-formulas.js` N1 hunks: in-memory `studyFromFill`; `armStudyFromFill`; `renderHome` starts `startStudy(remainingFromFill)` and returns when remaining > 0 (skips picker). Flag is not persisted.
  - `js/app.js` `buildNav`: still Dashboard / Study plan / … / Mock exam / portals. No "Today" item. Unit B did not edit this file.
- **Severity:** n/a (held)
- **Fails lock §4?** Not from source. Live click-through is ReviewLive.

### F7. Fill helper edge cases (spec-adjacent, not out of scope)

- **Rule:** §5 fill API; AC4 one click → Study flip, `newIds` up to target.
- **Evidence:**
  1. `fillFormulaDayIfEmpty` calls `formulaDay(deck)` first. Absent batch still stamps an empty `{date, reviewIds, newIds}` and may `save()` before ids are filled (existing reconcile path, then a second save). Not a schema key.
  2. `formulaDayRemaining` includes never-studied ids (`!st`), so filled `newIds` are remaining and `renderHome` can `startStudy`. That path is consistent.
  3. If `formulaDeck()` rejects, the catch navigates to `#/formulas` without fill or arm → picker. Cold 334-card IndexedDB path is the AC4 case; this is the failure branch.
  4. Old Review queue below Today still has `#/formulas` "Open →" without fill. AC4 names the Today control, not every formulas link.
  5. Initial Today button text is `Study →` until async `formulaStatus` rewrites it to `Study 10 →`. Not a second date, not a schema change.
- **Severity:** nit
- **Fails lock §4?** No on (1)(2)(4)(5). (3) only if the deck promise fails (not the empty-profile AC4).

### F8. No new emojis / icons in N1 hunks

- **Rule:** assignment: no emojis/icons introduced.
- **Evidence:** N1 diffs use `→` text and existing button classes. No emoji code points in the clock/Today/fill hunks. Pre-existing QOTD `✓`/`✗` were not introduced here. Did not re-scan all 2600 lines of pre-existing `view-formulas.js` for older icons.
- **Severity:** n/a (held for this wave)
- **Fails lock §4?** No.

### F9. `daysToExam()` is the countdown number; Unit B has no second date constant

- **Rule:** §5: `daysToExam()` is the only countdown number on `#/` and `#/plan`. Unit B must not introduce a second date constant or hardcode a weekday string.
- **Evidence:** `#/` uses `g.daysToExam()` for `.countdown-num`; `#/plan` uses `g.daysToExam()`. Unit B files grep clean for `2026-11-01` / `2026-10-28` / `Wed, Oct`. Label is formatted from the same settings field `daysToExam()` reads. `examCap` / final-pass still use `settings.examDate` only (pre-existing; Unit B did not rewrite them). After Unit A default+migrate they agree on a cold or old-default profile.
- **Severity:** n/a (held)
- **Fails lock §4?** No from source.

---

## What I did not check

- Live `#/` / `#/plan` / Study flip / mock pointer (ReviewLive).
- Whether `toLocaleDateString('en-US', { weekday: 'short', ... })` actually paints `Sun, Nov 1, 2026` in the reviewer's locale (AC1 wording).
- User's real Chrome `pgre-state-v1`.
- Two-tab `pagehide` still clobbers (non-goal; `save()` still last-write-wins).
- Full SM-2 numerical identity beyond "Unit B diff is the fill helper only."
- Whether `tools/test-ux-interaction.js` was created in some earlier uncommitted wave.

---

## Verdict

**SHIP** the N1-narrow hunks in the nine owned files.

No lock-§4 blocker in source. Unit A did not reauthor W01–W15 / mocks / XP / `save()` / merge / quota / `splitChapters`. Unit B did not add persisted schema keys, did not rewrite SM-2/`examCap`, did not edit `app.js` / css / `index.html`. Fill helper and `countUpText` match §5. No N1-authored tests or app markdown.

Do not commit the current working tree as this wave. Unrelated dirty files and non-N1 hunks inside `index.html`, `js/view-dashboard.js`, and `js/view-formulas.js` would violate lock §3 if they ride along.

Nits (not blockers): Unit A `?v=` bumps vs lock's cache-bust ban; migrate does not persist; deck-promise catch skips fill.
