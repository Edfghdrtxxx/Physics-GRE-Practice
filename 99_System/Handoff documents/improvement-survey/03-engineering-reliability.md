# Engineering / reliability / performance survey

Role: SurveyEng (engineering, reliability, performance). No app-code edits. Site inspected as a no-build hash-routed SPA.

---

## Method

Opened / ran / read:

- `index.html` (script order, `?v=` cache-busters), `js/app.js` (router, boot, persistWarning), `js/store.js` (localStorage + IndexedDB), `js/srs.js`, `js/bank.js`, `js/exam-engine.js`, `js/timer.js`, `js/study-time.js`, `js/gamify.js`, `js/formula-checkin.js`, `js/view-exam.js`, `js/view-practice.js`, `js/view-formulas.js` (grade/save), `js/view-search.js` / `js/search.js` (lazy load), `js/data-topics.js`, `js/data-questions.js`.
- Assigned tests, executed: `node tools/test-exam-engine.js` (47/47), `test-bank.js` (23/23), `test-file-structure.js` (pass), `test-mistakes-srs.js` (36/36).
- Docs: `README.md`, `AGENTS.md`, `20_docs/Project Docs/DESIGN.md` §1–4b, `ANKI-SRS-CANON.md` §4 (examCap).
- Live UI: reused existing `pgre-liveui` at `http://127.0.0.1:51651/` (did not bind :8000). Dashboard painted; `tab.evaluate` against `window.PGRE` for pool sizes, storage, resource decoded sizes, countdown. HTTP headers via `urllib` against that server.
- File sizes: `wc -c` on `content/bank/*.js` and key engines.

Did **not** implement, lint, format, or run project-wide suites. Did not reproduce quota failure or two-tab clobber in a second real Chrome profile.

---

## Ranked findings

### 1. All durable progress is one last-write-wins localStorage blob

**Claim.** `PGRE.store` serializes the entire study life (`attempts`, `exams`, `sessions`, `cards`, `mistakes`, `studyLog`, timer, formula batch, XP) to a single key `pgre-state-v1`. `save()` is `localStorage.setItem(JSON.stringify(this.state))` with no write queue, no revision, no merge. A second tab’s save overwrites the first. `attempts` / `exams` / `sessions` are uncapped (unlike `cardReviews` 8000, `focusSessions` 300, `log` 60). Quota failure sets `_persistFailed` and shows a sticky toast, but in-memory state keeps mutating — reload drops everything after the last successful write. Corrupt parse does stash a side key, then **starts fresh**. Cross-tab sync exists only as two partial patches: timer adopts `studyLog` when idle (`js/timer.js` `storage` listener); formula check-in copies `formulaCheckIn` before claiming. Everything else (SRS grades, mock answers, streaks, XP) is last-write-wins.

**Evidence.**

- `js/store.js:8`, `203-216` (`KEY`, `save`), `139-162` (unreadable → defaults), `182-186` (corrupt stash can itself fail if quota-full).
- `js/gamify.js:86-94` and `244-251` (`attempts.push`, no cap). DESIGN.md §4b explicitly budgets ~120 B × 10,000 ≈ 1.2 MB inside a ~5 MB quota and calls that “comfortably inside” — that is a hope, not an enforced cap.
- `js/exam-engine.js:239-240` (`s.exams.push` + save); `js/exam-engine.js:219-220` drops any unfinished sitting on `create()`.
- `js/timer.js:521-525` (studyLog-only adopt); `js/formula-checkin.js:146-160`.
- `js/app.js:346-360` (`persistWarning`).
- Live headless origin had `lsBytes: 2643`, `attempts: 1` — **not** the user’s daily Chrome profile. Quota risk is inferred from schema + DESIGN, not measured on the real blob. Confidence on the write model: **high**. Confidence that the user will hit 5 MB before 2026-11-01: **medium** (depends on mock volume and note size).

**Severity:** 9/10.

**User impact on D-54 prep.** This is the only copy of SRS schedules, mistake ladders, mock sittings, and streaks. Two windows (dashboard + formulas, or a forgotten mock tab) can silently discard a session. A full mock submit appends 70–100 attempt rows in one `save()` (`exam-engine.js:252-296`). Storage-full mid-exam or mid-formula-review means the sitting looks fine until reload. The user has little CS background and will not think “open DevTools → Application → Local Storage.”

**Uncertainty.** Two-tab clobber and `QuotaExceededError` were **not** reproduced live. Safari/`file://` IndexedDB vs localStorage split not exercised.

---

### 2. Parser-blocking boot of the whole bank + visualizers; `?v=` is incomplete

**Claim.** Every route, including Dashboard, synchronously parses ~1.85 MB of gitignored bank JS plus KaTeX, `view-formulas.js`, `visualizer-engine.js`, and all ten `trio-g*.js` files (formula labs, unused on Home). `index.html` comments that `?v=` exists so “browsers can never serve a stale copy,” but 18 classic tags have **no** buster — including the scoring engines `js/exam-engine.js` and `js/gamify.js`, all `js/data-*.js`, and three of four bank files. `python3 -m http.server` sends `Last-Modified` and **no** `Cache-Control`. Dynamic injects `js/search.js` and `js/formula-search.js` also lack `?v=`; a failed search inject caches the rejected promise for the session (`view-search.js:23-28`).

**Evidence.**

- Live decoded sizes (headless, disk-cached so `transferSize` 0): `content/bank/ets-exams.js?v=20260901a` 987,145 B; `cpg-exams.js` 501,149; `katex.min.js` 276,574; `cpg-questions.js` 262,688; `view-formulas.js` 120,136; `visualizers/trio-g8.js` 114,735; `cpg-formulas.js` 101,657. `wc -c` matches those four banks. **High.**
- Live `noBust` list (18): `js/data-topics.js`, `data-questions.js`, `data-formulas.js`, `data-achievements.js`, `data-plan.js`, `content/bank/cpg-questions.js`, `cpg-exams.js`, `cpg-formulas.js`, `js/notes.js`, `js/gamify.js`, `view-topic.js`, `view-history.js`, `view-analytics.js`, `view-search.js`, `view-study-time.js`, `view-achievements.js`, `view-content.js`, `js/exam-engine.js`. 32 tags have `?v=`. `index.html:8-9, 98-132, 146`. **High.**
- HTTP: `Cache-Control: None` on `exam-engine.js`, `gamify.js`, `store.js?v=…`, both bank URLs. `exam-engine.js` `Last-Modified: Sun, 23 Aug 2026`. **High.**
- Live navigation timing `dur/dcl/load ≈ 67 ms` is a **warm-cache** measurement, not a cold parse. Do not treat 67 ms as boot cost. Cold parse of ~3 MB JS on this machine was **not** timed. Confidence on size: **high**. Confidence on user-visible delay: **medium**.
- Live pool after those scripts: default `allQuestions()` **366** (20 preview + 146 cpg + 200 ets-drill); `includeExam` **1135** (plus 300 cpg-exam + 469 ets-exam). `canStart('70x120').ok === true`. Banks are present locally; a public clone without gitignored `content/bank/` 404s those tags (classic 404 does not stop later scripts — app boots with empty `BOOK_*` / `ETS_*`, guarded by `|| []` in `bank.js:40-49`). **High** for this machine; **unverified** for a clean clone.

**Severity:** 8/10 (reliability of “did my engine change?” + architectural load; local M4 hides latency).

**User impact on D-54 prep.** Every hard reload re-parses the entire ETS corpus and every formula visualizer before Home paints. Stale `exam-engine.js` / `gamify.js` after an agent edit is the failure mode the `?v=` comment was written to prevent — and those two files are in the hole list. The user cannot distinguish “code didn’t save” from “browser served August 23.”

**Uncertainty.** Heuristic cache lifetime in the user’s real Chrome (not this headless profile) not measured. Service worker: none observed in `index.html`; not hunted beyond that.

---

### 3. Assigned tests pass against fabricated banks; they do not guard production integrity or persistence

**Claim.** `test-exam-engine.js` and `test-bank.js` `vm.runInContext` the shipped engine files, then **replace** `PGRE.QUESTIONS` / `ETS_EXAMS` / etc. with tiny fakes. They never load `content/bank/*.js`. They never assert `store.save` quota, multi-tab merge, timer boot-gap, or `?v=` completeness. `test-file-structure.js` only checks folder placement + no emojis in AGENTS/README. `test-mistakes-srs.js` covers the ladder in RAM with a stub `questionById`. All four assigned files exit 0 — and would still exit 0 if GR9677 shipped 99 questions or if `exam-engine.js` lost its cache-buster.

**Evidence.**

- Tests run this session: exam 47 passed, bank 23, file-structure pass, mistakes 36. **High.**
- `tools/test-exam-engine.js:85-113` (fabricated 100 preview + fake GR8677); `tools/test-bank.js:48-59`.
- Live `PGRE.ETS_EXAMS`: ets2024 70, gr1777 100, gr0877 100, gr0177 100, **gr9677 99**. Sum 469 = live `srcs['ets-exam']`. Whether the missing item is a real extraction hole or a published 99 is **unchecked** against the PDF. Confidence on the count: **high**. Confidence it is a content bug: **low–medium**.
- No `tools/test-*.js` in the assigned set covers `QuotaExceededError`, `storage` events, or `index.html` cache-bust inventory. `test-srs-intervals.js` does hit `store.load` / `ankiReset2026` (read, not run this pass).

**Severity:** 7/10 as a detection gap (green tests ≠ safe daily instrument).

**User impact on D-54 prep.** A broken weighted draw, a spoiler leak, or a persist bug can ship while `node tools/test-*.js` stays green. The live 99-question GR9677 mock would score `/99` and still look “official.”

**Uncertainty.** Other tools (`test-srs-anki-chrome.js`, `test-ux-interaction.js`) were **not** executed; they may cover some SRS/UI paths. Production bank schema (required fields, answer indexes, figure URLs) not audited question-by-question — that is SurveyContent’s lane.

---

### 4. Exam-date split-brain (Oct 28 hardcoded vs editable SRS date vs user Nov 1)

**Claim.** Countdown, plan, brand line, and `PGRE.EXAM_DATE` are **2026-10-28**. Formula SRS cap / final-pass use `settings.examDate` (same default, but the date input on `#/formulas` writes only that setting). `gamify.daysToExam()` does **not** read the setting. User-stated exam is **2026-11-01 (D-54)**; live countdown was **50** days, `examCap()` **49**. README still says mock exam is “deferred” and the bank is a “20-question preview”; DESIGN.md §4b still documents the rejected `ceil(0.2·days)` cap that `ANKI-SRS-CANON.md` and `srs.examCap()` already replaced with `days-1`.

**Evidence.**

- `js/data-topics.js:5` `PGRE.EXAM_DATE = '2026-10-28'`; `js/store.js:65`; `index.html:28`; `js/view-dashboard.js:397-398`; `js/gamify.js:607-610`; `js/data-plan.js:1,193`; `js/view-formulas.js:612-705`.
- Live: `today: 2026-09-08`, `daysToExam: 50`, `settingsExamDate: '2026-10-28'`, `examCap: 49`. **High.**
- README.md:3, 25, 32, 36-43 (Oct 28, 20-question preview, mock deferred). DESIGN.md:1, 94-95, 231-232 (stale 20% cap formula). Code `srs.js:190-195, 242-247` matches ANKI-SRS-CANON §4.2–4.3, not DESIGN §4b. **High.**

**Severity:** 7/10 for scheduling honesty (4-day error compounds into SM-2 caps and the study-plan taper week).

**User impact on D-54 prep.** Dashboard says 50 days / Wed Oct 28. If ETS is Nov 1, every “final pass” banner, plan week, and interval cap is four days early. Editing the formula-page date does **not** fix the hero countdown. README/DESIGN describing a 20-question frame will mislead any later agent.

**Uncertainty.** Whether the user’s real exam registration is Nov 1 vs Oct 28 is taken from the survey brief, not from ETS. If Oct 28 is still correct, this finding collapses to “docs stale + two clocks.” Flag: **medium** on which calendar is ground truth; **high** that the two in-app clocks can diverge.

---

### 5. Hash router remounts wipe in-progress practice; exam sitting is the only resumable mode

**Claim.** `PGRE.route` always `innerHTML = v.render(params)` + `v.mount(params)`. Practice keeps the session in a module `var session` and `mount` **nulls it** then shows the config screen. Already-recorded answers survive in `state.attempts`; the remaining queue does not. Formula Study **does** persist `state.formulaStudy`. Mocks persist `state.exams` and resume; `create()` still deletes any unfinished sitting (UI disables Start while one is active — `view-exam.js:163-184` — so the drop is engine-level, gated in the setup screen, not confirmed in `startExam` itself).

**Evidence.**

- `js/app.js:508-511`; `js/view-practice.js:23, 503-509`.
- `js/view-exam.js:140-151, 163-184, 268-271`; `js/exam-engine.js:214-220` (filter to `submittedAt`).
- Formula resume: `store.js:81-87` `formulaStudy`; `view-formulas.js:1614-1615` `persistStudy` + `save`.

**Severity:** 6/10.

**User impact on D-54 prep.** A sidebar click or Back mid-set returns the student to “5 / 10 / All N questions” with no resume card. Daily drills are short, so this is friction more than catastrophe — unlike a dropped mock, which the setup screen at least names.

**Uncertainty.** Whether `view-mistakes.js` drill sessions remount the same way was not fully traced (mistake book is 36 KB; drill state likely similar). **Medium.**

---

## Nominated SINGLE worst aspect

**The only durable copy of 54 days of prep is a single last-write-wins `localStorage` JSON blob with uncapped logs and almost no cross-tab merge.**

It beats finding 2 because this machine’s cached boot was 67 ms — local disk hides the megabyte parse, but it cannot hide a clobbered SRS schedule. It beats finding 3 because green fabricated tests are a detection gap, not the loss event itself. It beats finding 4 because a four-day date error is recoverable in one constant; a overwritten `pgre-state-v1` is not. It beats finding 5 because a wiped practice queue costs one set, not the streak/SRS/mocks corpus.

---

## Suggested fix scope if chosen

Not patches — files that would have to change:

- `js/store.js` — revision / `storage` merge or tab lock; cap or spill `attempts`/`exams`/`sessions`; make `save()` fail closed (don’t keep mutating past a failed persist without blocking the UI); stop minting extra `-corrupt-*` keys when already quota-full.
- `js/app.js` — persistWarning copy; optional boot banner if `_recoveredFromCorruption`.
- `js/gamify.js`, `js/exam-engine.js` — writers of the unbounded arrays.
- `js/timer.js`, `js/formula-checkin.js` — today’s partial sync should become one store-level policy, not two one-off fields.
- `js/view-content.js` — Export/restore remains the recovery hatch; it should warn on persist-failed and on recovered-from-corrupt.
- New `tools/test-store-persist.js` (quota mock, corrupt round-trip, two sequential saves) — do not fold this into the fabricated bank tests.

If the debate instead picks boot/cache-bust: `index.html` (complete `?v=`, defer visualizers and exam banks until `#/exam` / `#/formulas`), `js/view-formulas.js` / `js/view-exam.js` (lazy inject, same pattern as `flashmodes.js`), `js/view-search.js` + `js/formula-search.js` (busted URLs + retry on error).

---

## What I explicitly did not verify

- The user’s real Chrome `pgre-state-v1` byte size, attempt count, or whether persist has already failed on that profile.
- Live two-tab last-write-wins or `QuotaExceededError` reproduction.
- Cold (uncached) parse time and main-thread long tasks.
- `file://` IndexedDB (`contentDB.open` caches a failed `_opening` promise for the session — `store.js:360-376` — not exercised).
- `tools/test-srs-intervals.js`, `test-srs-anki-chrome.js`, `test-ux-interaction.js`, KaTeX checker, drill-overlap script.
- Per-question bank correctness, figure 404s, choice/answer index validity (content survey).
- Whether GR9677’s 99 items match the published form.
- Exam-room timer vs `pagehide` across a real laptop sleep (code path read; not slept).
- Hashchange during `doSubmit` / double-click submit in the live UI (`submit()` is idempotent on `submittedAt`; not clicked).
- Memory growth of `attempts` over a 54-day projection with the user’s actual daily volume.
- Port 8000 occupancy (reused 51651 only).
- Visual / interaction taste (out of lane).
