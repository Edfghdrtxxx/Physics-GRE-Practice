# Live AC review — N1-narrow (lock §4)

Role: ReviewLive (grok-4.6). Skeptical auditor. No application-code edits. Binding spec: `09-lock.md` §4 items 1–7.

Live origin: `http://127.0.0.1:51651/` (`pgre-liveui`). Headless Chromium, **not** the user’s Chrome profile. Viewport `innerWidth=1440`, `innerHeight=900`. `prefers-reduced-motion: reduce` = false. Calendar today in-app: `2026-09-08`. Hard-reload used `bypassCache: true` on the countdown watch and the migrate reload.

Cold profile: this origin already had a filled `formulaDay` (10 `newIds`) from earlier implement work. For AC4 I emptied `formulaDay` to `{ date: '2026-09-08', reviewIds: [], newIds: [] }` and `cards: {}` on this origin only, then reloaded. XP 0, `exams: []`. Did not touch any other browser profile.

In-scope file SHA-256 at review time:

| File | sha256 |
|---|---|
| `js/data-topics.js` | `e2e1c8d7b24cbcc2d1b3128c4e763c5b87c8dfb4a77fcb4bd113360fce7659f3` |
| `js/store.js` | `7d82d47de904709b8ff614c626bd9ec68ebf8c5a8f59ef1082b887bd001ac56b` |
| `js/gamify.js` | `10981b8a4930adcc3f33cdebaaa51a5e049efdb79df5ff93eda526aa52282b90` |
| `index.html` | `5a700f2116fcfe6129070a6947c13eeb9b65efd7c43183048111751692eced2d` |
| `js/data-plan.js` | `b09c309001b8fd04a7c578ab64588134d3fef4d1f175c5a8b2fffe5f69d1f542` |
| `js/view-plan.js` | `4eb4fc38ac8e1048ba2f9ca4b1b013c6b2485ecad7b9847a0be7116213f09e84` |
| `js/view-dashboard.js` | `62a45f39c9540d3e2c0f44fbff7bdb0043ab3493101a15a23f9e56fbf643365b` |
| `js/srs.js` | `8af7390c027234a62f8c88e5593fa31b4bce74e999e0daa196e592a631ab1fa4` |
| `js/view-formulas.js` | `6c2a36cd394c32c66108299d64abc28274b69200c48be904ba6a4e814ce4ab28` |

`PGRE.srs.daysUntil('2026-11-01')` = **54**. `daysUntil('2026-10-28')` = **50**. Do not treat 54 as the only legal number on a later calendar day; it is the correct number today.

---

## Scoreboard

| §4 | Result | Fails §4? |
|---|---|---|
| 1 Clock | **PASS** | no |
| 2 Today above the buffet | **PASS** | no |
| 3 Mixed practice without a hash | **PASS** | no |
| 4 Formula Study 10 without the picker | **PASS** | no |
| 5 Mock pointer | **PASS** | no |
| 6 Plan horizon only | **PASS** | no |
| 7 Non-goals held | **PASS** (two-tab clobber not live-reproduced) | no |

---

## AC 1 — Clock

**Verdict: PASS.** Does not fail lock §4.

**Countdown number.** `#/` `.countdown-num` text is `54`. Equals `PGRE.srs.daysUntil('2026-11-01')` and `PGRE.gamify.daysToExam()`. `PGRE.EXAM_DATE` is `'2026-11-01'`. `settings.examDate` on the cold profile is `'2026-11-01'`. `examCap()` is `53` (`daysUntil - 1`), same stored date.

**No 0/10 flash.** Dashboard `mount` no longer calls `countUpText` on `.countdown-num` (comment in `js/view-dashboard.js` mount: “countdown must paint at its final value”). Live: hard-reload with cache bypass, 66 DOM samples over ~1200 ms at ~16 ms, **unique values `{ "54" }`**. First sample at t=6 ms already `54`. I did not catch a 0 or 10. Confidence high; a sub-6 ms first paint was not sampled, but source writes the final `days` into the HTML and does not tween that node.

**Label.** `.countdown-label` innerText: `days until the exam` / `Sun, Nov 1, 2026`. Allowed wording. Not Wednesday, Oct 28.

**Brand-sub.** `.brand-sub` = `Prep Studio · exam Nov 1, 2026` (`index.html`). Matches November 1.

**Formula home date input.** `#/formulas` `#exam-date` `type=date` **value** `2026-11-01`. Visible locale rendering was `01/11/2026` (day-first). Value and `examCap` agree with the stored date. Not a second clock.

**Old-default migrate.** Wrote `settings.examDate = '2026-10-28'` into `pgre-state-v1` on this origin, then reloaded `#/` with cache bypass. After reload: disk `'2026-11-01'`, RAM `'2026-11-01'`, countdown `54`, label `Sun, Nov 1, 2026`, brand-sub November 1. No DevTools UI step. `migrate()` is the exact-string replace; `rollDay` / later `save()` persisted it on this run.

**Custom typed date (scope rule, not a numbered §4 bullet).** In-memory: set `examDate` to `'2026-12-15'`, call `PGRE.store.migrate()`, value stayed `'2026-12-15'`. Re-ran `'2026-10-28'` → `'2026-11-01'`. A full-reload custom-date check on this shared origin was contaminated by a second headless tab on the same origin (disk/RAM disagreed in a way migrate() cannot explain). **I did not get a clean single-tab reload proof that a custom date survives boot.** Code path for migrate() leaves custom dates alone.

---

## AC 2 — Today above the buffet

**Verdict: PASS.** Does not fail lock §4.

Geometry at scrollTop 0, 1440×900 (`documentElement.scrollHeight` 3202):

| Block | top | bottom | vs fold (900) |
|---|---:|---:|---|
| Hero (Level/XP + countdown) | 81 | 246 | above |
| `#today-agenda` | 262 | 488 | **fully above** |
| XP `.stat-row` (Total XP / streak / answered / accuracy / days active) | 504 | 606 | above, **below Today** |
| Review queue | 622 | 801 | above |
| QOTD `.dash-qotd-card` | 817 | 1349 | heading on-fold, body mostly below |
| Today’s challenges | 1388 | — | below |

Today is above the XP tiles, above challenges, and above QOTD. It is not “This week” plain text. Launchers are real buttons/links: `Practice →`, `Study 10 →` (empty deck) / `Study →` (filled), `Open →`.

Hero still leads with “Good evening. / Level 1 · Quark / 0 / 100 XP to Level 2”. Lock requires Today above XP **tiles** / challenges / QOTD, and “not Level/XP as the **only** above-the-fold work.” Today is also above the fold. I am not failing that.

QOTD still starts at y=817 of 900. Allowed to remain below; leftover on-fold chrome is not a §4 miss.

---

## AC 3 — Mixed practice without a hash

**Verdict: PASS.** Does not fail lock §4.

Clicked the Today-agenda `Practice →` (`#today-agenda a[href="#/practice/all"]`), not the sidebar and not a typed URL. Landed on `http://127.0.0.1:51651/#/practice/all`. Heading: `Practice — All topics (mixed)`. Config buttons: `5 questions`, `10 questions`, `20 questions`, `All 366`. Did not start a set.

---

## AC 4 — Formula Study 10 without the picker

**Verdict: PASS.** Does not fail lock §4.

**Empty unseen deck copy.** After emptying `formulaDay` and waiting for `formulaDeck()`: `#today-formulas` = `334 not yet introduced`. Button `#today-formulas-btn` = `Study 10 →`. Review-queue `#rq-formulas` = `334 not yet introduced` (not “nothing picked yet” / “0 remaining” / “all caught up”). Deck length 334. `formulaDailyTarget` 10.

**One click.** Clicked `#today-formulas-btn`. Hash became `#/formulas`. Picker not shown (`#pick-btn` null). Study chrome: `Card 1 · 10 left`, Classical Mechanics kinematics prompt, `Show answer`. Trail `Home · Formula recall · Study`.

**Batch.** After the click, `state.formulaDay.newIds` = 10 ids `cpgf-1.1` … `cpgf-1.10`. `reviewIds` empty. Up to target 10. Not auto-raised.

**Grades.** Again / Hard / Good / Easy were **not** on the first Study paint. They appeared after `Show answer`: `Again 1 today`, `Hard 2 soon`, `Good 3 soon`, `Easy 4 4 d`. That is the existing Study flip, not `renderPicker`. I am not failing §4 for the extra flip click. Nit only (below).

**Picker still exists.** Before the Today click, `#/formulas` via hash (no fill) showed formula home, `#exam-date` = `2026-11-01`, `#pick-btn` = `Pick today’s cards`, no `#study-btn`, copy “Nothing picked yet — choose today’s cards below.” After the Today click I did not re-open that picker (session was live). Source still wires `#pick-btn` → `renderPicker`.

---

## AC 5 — Mock pointer, not a plan novel

**Verdict: PASS.** Does not fail lock §4.

Today mock row: `Next current-format mock: ETS Official Practice Test (2024)`. Link `href="#/exam"`. Does not name GR8677 or GR9277. `state.exams` was `[]`.

Clicked that `Open →`. Hash `#/exam`. Page lists `ETS Official Practice Test (2024)` under Released ETS exams. GR8677 / GR9277 absent from that page. **Did not sit the mock.**

---

## AC 6 — Plan horizon only

**Verdict: PASS.** Does not fail lock §4.

`#/plan` hero: `July 13 → November 1, 2026 · intensive (~15–17 h/week) · two full passes, five released practice tests, then taper.` Countdown `54` / `days to go`. `0 / 93 tasks complete`. No “October 28” in the hero.

`PGRE.currentWeek('2026-10-30')` = `w16` `Taper — exam Sunday Nov 1`, `start: 2026-10-26`, `end: 2026-11-01`. Not a stuck Oct 26–28 taper. I did not time-travel the UI; this is the live `currentWeek` function on the served plan data.

W01–W15 bodies were not rewritten. `js/data-plan.js` still has `PRACTICE TEST #1: GR8677, full, timed, on paper` and `PRACTICE TEST #2: GR9277`. Allowed.

---

## AC 7 — Non-goals held

**Verdict: PASS**, with an explicit non-check on live two-tab clobber. Does not fail lock §4.

**Sidebar.** `#sidebar-nav` still 14 app links + 9 topic portals = 23. Destinations: Dashboard `#/`, Study plan `#/plan`, History, Analytics, Custom quiz, Search, Notes & bookmarks, Mistake book, Formula recall, Focus timer, Study time, Achievements, Library, Mock exam, then CM…ST. **No** `#/today` and no nav item whose text is `Today`. `js/app.js` `buildNav` still the same list. Mixed practice is still not a nav item (out of scope).

Top-bar `TODAY 1 min` is `#today-learn` → `#/study-time` (pre-existing study-time chip). Not a 15th sidebar destination.

**`PGRE.store.save`.** Still `localStorage.setItem(this.KEY, JSON.stringify(this.state))` with no rev / lock / merge. Key `pgre-state-v1`. **I did not live-reproduce two-tab `pagehide` clobber.** I am not asserting the clobber still fires; I am asserting the write model was not revised.

**Notes.** `#/topic/cm` and `#/topic/cm/notes`: “Waiting for “Conquering the Physics GRE”. When the book markdown arrives, import it in the Library…”. Still waiting.

---

## Findings (none are blockers)

1. **Plan countdown still tweens.** `js/view-plan.js` `mount` still `PGRE.motion.countUp` on `#plan-root .countdown-num` (700 ms). AC1 is `#/` only; Unit B was told to stop tween on dashboard `.hero-right .countdown-num` only. I did **not** sample `#/plan` for a 0/10 flash. Severity: **nit**. Fails §4? **no**.

2. **Study grades after Show answer, not on the first paint.** One Today click reaches a flip card; Again/Hard/Good/Easy need the existing Show-answer click. Severity: **nit**. Fails §4? **no**.

3. **Formula home via sidebar still says “Nothing picked yet”** when `formulaDay` is empty. Today + Review queue do not. Sidebar path is still the picker wall; that is parked N4, not this wave. Severity: **nit**. Fails §4? **no**.

4. **QOTD heading still on the last ~80 px of the 900 px fold** (y=817). Challenges are below. Allowed. Severity: **nit**. Fails §4? **no**.

5. **`data-plan.js` header still says the in-app simulator is “designed but deferred.”** Horizon date in that header is Nov 1. Leftover lie is out of this slice except in-scope date strings. Severity: **nit**. Fails §4? **no**.

6. **Hero is still Level/XP first**, then Today. Meets “above XP tiles,” not “Today is the first pixel.” Severity: **nit**. Fails §4? **no**.

---

## Not checked

- User’s real Chrome `pgre-state-v1` (size, custom `examDate`, already-sat `ets2024`, already-picked `formulaDay`).
- Two-tab `pagehide` clobber (code still LWW; no live repro this pass).
- Clean single-tab **reload** of a custom typed exam date (in-memory `migrate()` leaves it; shared-origin reload was dirty).
- `#/plan` countdown tween samples (source still countUps; live samples were `#/` only).
- Re-opening `renderPicker` after the Today fill (picker was live **before** the fill).
- Sitting a mock, grading a formula card, or changing `formulaDailyTarget`.
- Mobile / reduced-motion / dark mode.

This origin was mutated for the empty-deck and migrate tests. Sibling reviewers sharing `51651` should not treat post-review `formulaDay` / attempt counts as the survey baseline.

---

SHIP
