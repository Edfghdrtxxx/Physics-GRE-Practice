# Chairman lock — Physics GRE Prep Studio (D-54)

Role: DebateChair (grok-4.6). Not an advocate. One aspect. Narrow is allowed. Do not union nominations. No application-code edits in this document.

Exam the user is sitting: **2026-11-01**. Calendar day this lock was cut: **2026-09-08** (`daysUntil('2026-11-01') = 54`). User: physics master’s student, little CS. The site is the daily instrument.

Surveys and debates read in full: `01`–`04` surveys, `05` N1, `06` N2, `07` N3, `08` critic. New evidence since the surveys: DebateN2 reproduced last-write-wins on the live origin (details in §2).

---

## 1. Lock sentence (copy-pasteable)

Lock N1-narrow only: one exam date `2026-11-01` and a `#/` Today agenda that can start mixed practice and a 10-card formula batch without a 334-row picker. Do not rebuild `localStorage`, do not ingest Kahn, do not rewrite the 93-task plan, do not redesign the 23-link sidebar.

---

## 2. Why this beats the runners-up

The ranking question is what the user is blocked from doing at 08:00 tomorrow, not what a perfect studio would look like in six weeks. Product F1, UX F1, and Content F1 are the same hole restated (home/plan/date). Consensus on that sentence is not a license to ship N1-full + N3-A + N4 as one wave.

**N1-narrow is the certain daily cost.** Opening `#/` still leads with Level/XP, a countdown that `countUpText`s from 0 and is labeled **Wed, Oct 28, 2026**, five stat tiles, a Review row that prints “nothing picked yet” on a 334-card unseen deck, QOTD, volume/XP challenges, and “This week” as plain text with no launchers (`js/view-dashboard.js` `render` / `mount`). Mixed practice is not in `buildNav`. Formula Study has no `#study-btn` until the user composes a batch (`js/view-formulas.js` empty-batch branch; DESIGN §4b “nothing auto-selected”). Practice and exam rooms themselves start; the instrument does not start a directed morning. A non-CS user will not invent `#/practice/all` or scroll a 12k-px picker of colliding topic tags. That failure is on every open. This slice owns the date and two buttons that spend the morning on physics.

**N2 (persistence) is real, reproduced, and still not this lock.** SurveyEng nominated last-write-wins at 9/10 but did not reproduce a loss. DebateN2 did, same origin (`pgre-liveui`):

- Mechanical LWW: tab B’s stale heap overwrote tab A’s marker and XP bump.
- Close-tab / `pagehide` (the D-54-shaped one): after a study-tab `gamify.recordAnswer`, disk was **2 attempts / 3054 B**. Closing the idle dashboard tab ran `study-time` `pagehide` → `beat(); flush();` → `store.save()` of the stale heap. Disk dropped to **1 attempt / 2677 B**, last id `gr9277-93`. Study-tab RAM still had `q01`; disk did not.

Quota is **not** a D-54 event. Live blob ~2.6 KB (`attempts: 1`). `QuotaExceededError` was not reproduced. Do not spend this wave on caps, IndexedDB progress, or DESIGN’s 1.2 MB hope.

The clobber requires **two documents of this origin**. Default sidebar clicks stay in one tab. Same-tab hash navigation does not clobber (one heap). The user has little CS background; two-tab use is plausible (Cmd-click, session restore, mock in `exam-fullscreen` plus a dashboard) and **unobserved on the daily Chrome**. N2’s own concession: if they are strictly single-tab, N2 does not fire in 54 days and N1 should win. A reproduced engineering bug does not automatically outrank a certain empty morning. Shipping a store revision first would persist the buffet more reliably. Park N2 as the first follow-up, scoped to cross-tab LWW and fail-visible persist — not quota.

**N3-A (plan-calendar rebuild) is not the 08:00 block.** N3 correctly retreated from Kahn ingest (N3-B) and from gluing Notes onto the calendar. What remains is a true operating-system lie: Jul 13 → Oct 28, Tests #1/#2 = GR8677/GR9277 (`ets-drill` already in the 366-pool), `ets2024` unscheduled, W16 ends Oct 28, `currentWeek` then sticks forever. That is a later plan pass. Liveui had **0/93** tasks; whether the user follows `#/plan` is unverified. This lock takes the **clock and the silent Oct 29–Nov 1 hole** (horizon / `w16.end` only) and a Today **pointer** at the next unused intact ETS form. It does not reauthor 93 task bodies. A rebuilt ledger without a Today owner is still a ledger; an honest date plus two launchers is a morning.

**N3-B (Kahn Notes ingest) is a different product.** Portals wait for Library drag-drop; `splitChapters` only sees `#`/`##`; 314 of 338 headings are `####`. A master’s student can read Kahn on paper this week. They cannot get a second unused `ets2024` from a parser. Out.

**N4 (formula cannot start) is a row, not the aspect.** It is the only true *capability* stall tomorrow (no Study button). Locking it alone leaves Oct 28 and an XP-first home. Absorb it as the formula line of the Today agenda: one-click fill to `formulaDailyTarget` (default 10) and start Study. Full picker redesign is the next formula aspect.

**N1-full is rejected.** SurveyProduct’s “if chosen” list (Today sequencer + plan-as-launcher + catch-up from today + drop GR8677 as tests + schedule every remaining form + strip task XP) plus SurveyUX’s sidebar/mobile/footer pass is a rewrite. The critic’s cut is the implement ticket. Do not smuggle N3-A or a 23-link rethink into “daily program.”

---

## 3. In-scope files (owners) and out-of-scope

Single-source date string: `'2026-11-01'`. `gamify.daysToExam()` reads `settings.examDate` falling back to `PGRE.EXAM_DATE`. Dashboard, brand, plan hero, and formula `examCap` / final-pass must not be able to disagree. Existing profiles that still hold the shipped default `'2026-10-28'` must move; a custom typed date is left alone.

### In scope (this wave)

| File | Owner | What this file is allowed to change |
|---|---|---|
| `js/data-topics.js` | **Unit A (Clock)** | `PGRE.EXAM_DATE = '2026-11-01'` only. |
| `js/store.js` | **Unit A (Clock)** | Default `settings.examDate` to `'2026-11-01'`. One migrate: if stored `examDate` is exactly `'2026-10-28'`, set `'2026-11-01'`. **No** `save()` / merge / quota / `splitChapters` / revision work. |
| `js/gamify.js` | **Unit A (Clock)** | `daysToExam()` reads the one source above. Challenges stay; they are not the default day. |
| `index.html` | **Unit A (Clock)** | Brand-sub exam date. No cache-bust / script-order work. |
| `js/data-plan.js` | **Unit A (Clock)** | Horizon only: file header, Phase 3 `desc`, `w16.end = '2026-11-01'`, W16 title / exam-day task so `currentWeek` covers Oct 29–Nov 1. **Do not** reauthor W01–W15 task bodies, mock sequence, or XP values. |
| `js/view-plan.js` | **Unit A (Clock)** | Hero copy (“July 13 → October 28…”) must name November 1. No launcher rewrite, no checkbox-XP change. |
| `js/view-dashboard.js` | **Unit B (Today)** | Today agenda **above** XP tiles / challenges / QOTD. Countdown label from the one date source; **do not** `countUpText` `.countdown-num`. Formula Review row must not read as caught-up when the deck is unlearned. Mock line: next unused intact ETS form (`ets2024` if none sat), never GR8677/GR9277 as a “fresh test.” Do not add a 15th nav item named “Today.” |
| `js/srs.js` | **Unit B (Today)** | One helper: if today’s `formulaDay` is empty and unlearned cards exist, fill `newIds` up to `formulaDailyTarget` (default 10) and persist via existing `store.save()`. Do not auto-raise the target. Do not rewrite SM-2, `examCap`, or reconcile-never-adds for any path other than this explicit fill. |
| `js/view-formulas.js` | **Unit B (Today)** | Honor the fill so a dashboard CTA reaches a Study flip (Again/Hard/Good/Easy) without `renderPicker`. Picker remains for add/remove. No Lab / Match / Type / Quiz / Cloze / Search work. |

`js/app.js` is **not** in this wave (no sidebar redesign, no extra “Today” route). A dashboard control that sets `location.hash` to an existing route (`#/practice/all`, `#/formulas`, `#/exam`, `#/mistakes`) is enough. Hash-router remount is a given: fill `formulaDay` *before* navigating to `#/formulas`, then start Study on mount when remaining > 0 from that fill (one-shot flag is allowed; do not invent a new persisted schema).

### Out of scope (explicit)

- **N2 persistence:** `PGRE.store.save()` revision / `storage` adopt / `navigator.locks` / fail-closed persist / capping `attempts`/`exams`/`sessions` / extra `-corrupt-*` keys / `tools/test-store-persist.js`. `js/timer.js` and `js/formula-checkin.js` field patches stay as they are.
- **N3-A full plan:** 93-task rewrite, catch-up of W01–W08, dropping GR8677/GR9277 from task labels, inserting `ets2024` into `PGRE.PLAN`, plan-row `href`s, stripping task XP.
- **N3-B Kahn:** `splitChapters` `####`, `js/view-topic.js` empty-state, `js/view-content.js` Library copy, `content/bank/cpg-notes.js`, any textbook-body ingest.
- **Sidebar / CSS IA:** `js/app.js` `buildNav`, `css/style.css` `#sidebar-footer` / mobile wrap-nav, two-tier chips.
- **N4 picker wall:** `renderPicker` redesign, flash-mode play, visualizer two-pane.
- **Pool / mock honesty beyond the Today pointer:** `js/view-topic.js` preview-vs-`ets-drill` labels, `js/view-exam.js` 1135-vs-666 copy, `js/exam-engine.js` weighted draw, new GRE-voice items.
- **Engineering else:** `?v=` completeness, lazy bank parse, practice-queue remount, fabricated-bank tests.
- **Docs frame leftovers** except the in-scope date strings in `index.html` / plan header. Do not take on README/DESIGN §4b as this slice.
- **New permanent tests.** Cold click-through is the proof. Do not add `tools/test-*.js` so the change “has tests.”

---

## 4. Observable acceptance criteria

Cold reviewer, empty or nearly-empty profile, desktop ~1440×900, motion not reduced. Date of review may be after 2026-09-08; do not pin “54” as the only passing number.

1. **Clock.** Open `#/`. Hero `.countdown-num` equals `PGRE.srs.daysUntil('2026-11-01')` and is **not** tweened from 0 (it must not flash 0/10 on mount). `.countdown-label` names **Sunday, Nov 1, 2026** (wording may be `Sun, Nov 1, 2026` / `Sunday, November 1, 2026`) — not Wednesday, Oct 28. Sidebar brand-sub matches November 1. Formula home date input and `examCap` use the same stored date. A profile whose `settings.examDate` was the old shipped default `'2026-10-28'` shows November 1 after reload without DevTools.

2. **Today above the buffet.** The first useful block on `#/` (above XP tiles, challenges, and QOTD) is a Today agenda with launchers, not Level/XP as the only above-the-fold work. Challenges and QOTD may remain **below**. “This week” plain-text labels without a button do not count as the agenda.

3. **Mixed practice without a hash.** One Today control starts mixed practice: after the click, the reviewer is on `#/practice/all` (config with 5/10/20/All is acceptable) without typing a URL. They must not have to open the sidebar or a topic portal to get there.

4. **Formula Study 10 without the picker.** On an unseen 334-card deck with empty `formulaDay`, the Today formula control is **not** copy that reads as caught-up (“nothing picked yet” / “0 remaining”). It names that cards are not yet introduced. One click from that control reaches a Study flip card (Again / Hard / Good / Easy visible). `renderPicker` is not shown. After the click, `state.formulaDay.newIds` has up to `formulaDailyTarget` (10 unless the user already changed it). The picker still exists for later add/remove.

5. **Mock pointer, not a plan novel.** If `state.exams` has no `ets2024` sitting, Today names **ETS 2024** (or the form’s existing `#/exam` label) as the next current-format mock and links to `#/exam`. It does not name GR8677 or GR9277 as a fresh test. If `ets2024` is already sat, it may name the next unused intact form or omit the line. The reviewer does not sit the mock.

6. **Plan horizon only.** `#/plan` hero includes **November 1, 2026**. On 2026-10-30 the current week is still a real week (not a forever-stuck Oct 26–28 taper). Task bodies may still say GR8677 / “import pending”; Notes portals may still be empty. `#/plan` is not the daily program.

7. **What must still be true (non-goals held).** Sidebar still has the existing destination list (no 23-link redesign). `PGRE.store.save` is still last-write-wins. Two-tab `pagehide` can still clobber (not this wave). `#/topic/*/notes` may still wait for Library import.

---

## 5. Implement-team split

Two units. Non-overlapping file ownership. If a file must be shared, it already has one owner above — do not dual-edit.

**Contract both units consume (do not re-litigate):**

- Canonical date `'2026-11-01'`.
- `daysToExam()` is the only countdown number on `#/` and `#/plan`.
- Unit B must not introduce a second date constant or hardcode a weekday string.
- Unit B may write `state.formulaDay` / `state.settings.examDate` only through existing `PGRE.store.save()`. No new keys on `pgre-state-v1`.
- Fill API (Unit B owns the implementation): given a resolved `formulaDeck()`, if the picked batch is empty and unlearned cards exist, put up to `clampTarget(formulaDailyTarget)` unseen ids into `newIds` and save. Dashboard CTA: fill, then `#/formulas`, then Study. Practice CTA: `#/practice/all`. Mock CTA: `#/exam`.

### Unit A — Clock

Files: `js/data-topics.js`, `js/store.js` (default + old-default migrate only), `js/gamify.js` (`daysToExam` only), `index.html` (brand-sub only), `js/data-plan.js` (horizon only), `js/view-plan.js` (hero copy only).

Done when AC items 1 and 6 pass even if Unit B has not landed (countdown and plan hero already say Nov 1; dashboard label may still say Oct 28 until Unit B edits `view-dashboard.js` — Unit A does **not** touch that file). Coordinate the string only.

### Unit B — Today agenda + formula start

Files: `js/view-dashboard.js`, `js/srs.js` (fill helper only), `js/view-formulas.js` (start-from-fill only).

Done when AC items 2–5 and 7 pass. Consume Unit A’s `daysToExam()`; format the hero label from `settings.examDate` / `PGRE.EXAM_DATE`. Stop `countUpText` on `.hero-right .countdown-num` only; other count-ups may stay.

Do not start Unit B by rewriting `buildNav` or `css/style.css`. Do not wait on N2.

---

## 6. Residual risks / follow-ups (parked)

Ordered. Not this wave. Do not pull them in “while you’re here.”

1. **N2 — cross-tab last-write-wins (first reliability follow-up).** Repro already exists: dashboard `pagehide` flushed a stale heap over a study-tab `recordAnswer` (2 attempts / 3054 B → 1 attempt / 2677 B). Slice if locked later: monotonic rev on `js/store.js` `save()`, `storage` adopt when idle, do not silent-save when dirty, fail-visible persist; delete the two one-off merges in `js/timer.js` / `js/formula-checkin.js` once store-level adopt exists. **Out even then:** quota caps, IndexedDB progress, Safari/`file://` IDB split. User’s real Chrome blob size is still unread — inspect before expanding scope.

2. **N3-A — plan-calendar rebuild.** From today → Nov 1: collapse or retitle W01–W08 as optional catch-up; drop GR8677/GR9277 as Tests #1/#2; put `ets2024` in the sequence; space remaining intact 100-item forms; delete “import pending” / “on paper” / “simulator deferred.” Task-row launchers. Only after N1-narrow is the daily owner.

3. **N4 — formula picker.** 12k-px indistinguishable rows, no equation preview, no “give me 10” on `#/formulas` itself. Needed only if Study-10 from Today is not enough for daily use.

4. **N3-B — Kahn Notes.** `####` split or pre-split `cpg-notes.js`, Library copy, portal empty-state. Copyright-sensitive; do not dump textbook body. Reading stays paper/PDF until then.

5. **Pool species / weighted-draw copy.** Daily 366 is homework + 1986/1992 drills; 1135 vs 666 on the 70-draw teaser; portal “preview” mislabel. Pedagogy, not tomorrow’s start.

6. **Unknowns that would have flipped this lock (they did not).** User’s real Chrome `pgre-state-v1` (size, persistFailed, already-sat mocks, already-picked `formulaDay`, already-edited `examDate`); two-tab as a daily habit; ETS registration actually Oct 28 (brief says Nov 1; in-app said Oct 28). If Oct 28 is the real sitting, keep the Today agenda and unify clocks to Oct 28 instead — do not reopen N2/N3-B. If a persist toast or two-tab clobber has already dropped SRS/mocks on the daily machine, promote parked item 1 immediately.

---

**Implement ticket is §1.** If a change is not required to pass §4, it is out. Re-litigating N2’s repro, Kahn ingest, or a 93-task novel inside this wave is a process failure, not a product insight.
