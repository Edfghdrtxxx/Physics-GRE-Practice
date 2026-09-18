# Code architecture survey — 2026-09-18

Static read of `index.html` (all 52 script/link tags, defer order), `js/app.js` (router, boot, nav), `js/store.js` (defaults, `_mergeFromDisk`, `_adopt`, `save`, `rollDay`, `formulaDeck`, `splitChapters`), `js/srs.js` (SM-2, formulaDay reconcile/fill), `js/gamify.js` (recordAnswer, metrics, checkAchievements), `js/bank.js`, `js/timer.js`, `js/study-time.js`, `js/formula-checkin.js`, `js/packs.js`, `js/plan-engine.js`, `js/data-plan.js`, `js/view-formulas.js` (3007 lines), `js/view-dashboard.js`, `js/view-practice.js`, `js/view-mistakes.js`, `js/view-exam.js`, `js/view-focus.js`, `js/view-topic.js`, `js/view-plan.js`, `js/view-build.js`, `js/view-analytics.js`, `js/view-study-time.js`, `js/view-concepts.js`, `js/view-content.js`, `js/visualizer-engine.js`, all ten `js/visualizers/trio-g*.js` headers + drag-binding code, `js/concept-door-fx.js`, `js/focus-fx.js`, `js/motion.js`, and headers of `tools/test-*.js`. Grep counts for `PGRE.*` assignments, `PGRE.store.state.*` writes, `addEventListener`/`setInterval`/`requestAnimationFrame` per file. No live browser (assigned to siblings); no repo edits.

## Findings

### F1. Dynamically-injected scripts carry stale or missing `?v=` tokens — the cache-bust hole the static tags just closed is still open on the lazy path

**Claim.** Every static `<script>`/`<link>` in `index.html` now carries a `?v=` token (the prior survey's 18-tag gap is fixed), but the four runtime `document.createElement('script')` injects still use a stale token or none at all, so a returning browser can mix a fresh view with a stale engine.

**Evidence.** `js/view-formulas.js:186` injects `js/flashmodes.js?v=20260907a` — a token frozen 11 days before the rest of the shell (`20260916f`/`20260917j`); `js/view-formulas.js:202` injects `js/formula-search.js` with no token; `js/view-search.js:26` injects `js/search.js` with no token; `js/view-exam.js:21` injects `js/exam-engine.js` with no token (dead code — guarded by `if (PGRE.examEngine) return` at `view-exam.js:17` since `index.html:141` loads the engine statically). Same finding recorded in `99_System/Handoff documents/ui-pass-2026-09-09/REVIEW-Performance.md:116-121` on 2026-09-09 and never fixed. `index.html:8-11` still documents a single shared `?v=` value while the file now uses per-file tokens — the comment no longer describes the mechanism, so the next editor has no rule telling them to bump the token of the file they touched.

**Impact on daily study before Nov 1.** The mechanism for silent breakage: any future edit to `flashmodes.js` ships under the same `20260907a` URL, so a browser with the old copy cached keeps the old game logic while `view-formulas.js?v=<new>` expects the new API — Match/Type/Quiz/Cloze degrade to the 'flashmodes failed to load' retry card (`view-formulas.js:2245`) or worse, load stale code that misbehaves silently. The user's daily origin is `file://`, where heuristic caching makes unversioned URLs the riskiest. Low probability per week, high confusion cost for a non-CS user when it fires.

**Severity.** should-fix

**Fix sketch.** `js/view-formulas.js:186,202`, `js/view-search.js:26`: add a `?v=` token to each injected URL and bump it with the file (or derive from one shared constant). `js/view-exam.js:17-24`: delete the dead fallback loader and the `_examReadyQ` handshake (`view-exam.js:18,43`; `exam-engine.js:318-322`). `index.html:8-11`: rewrite the comment to state the actual rule — every asset URL carries `?v=`; bump the token of each file you change.

**Effort.** S

### F2. `#/formulas` mount eagerly renders and KaTeX-typesets the entire 334-card deck into a hidden print sheet

**Claim.** Every visit to `#/formulas` builds the full print sheet — all 334 cards' front+back HTML plus a `PGRE.typesetMath` pass over the whole deck plus a forced-layout measurement of every card — synchronously on mount, for a `display:none` element that only printing ever needs.

**Evidence.** `js/view-formulas.js:2999` calls `renderShell(); buildPrintSheet();` on every mount. `buildPrintSheet` (`view-formulas.js:314-346`) generates per-topic HTML for the whole deck (`topicCardsHTML`, `:301-312`), appends `#formulas-print`, typesets it (`:341`), then `flagWideCards` (`:369-386`) adds `.measuring` and reads `scrollWidth`/`clientWidth` on every `.ps-card` — a full layout pass. Prior live measurement: 1.9 MB of HTML, 1322 KaTeX nodes (`ui-pass-2026-09-09/REVIEW-Performance.md:145`). The sheet is rebuilt again inside `printSheet()` (`:348-352`) and re-measured on `beforeprint` (`:388`), so the mount-time build is redundant for the print button and only serves the browser's own Ctrl+P path.

**Impact on daily study before Nov 1.** `#/formulas` is the daily Study-10 destination the new Today agenda pushes every morning. The mount already waits on IndexedDB; this adds a multi-hundred-millisecond synchronous render+typeset+layout burst on the main thread before the first card paints — felt as a stall on every single daily entry, worst on the laptop's cold tab.

**Severity.** should-fix

**Fix sketch.** `js/view-formulas.js`: build `#formulas-print` lazily — on `printSheet()` and on `beforeprint` (add a listener that calls `buildPrintSheet` when the sheet is absent or `deck` changed), not in `mount`. Keep `flagWideCards` after each build. Removes the mount-time cost entirely; Ctrl+P still works because `beforeprint` fires before print layout.

**Effort.** S

### F3. `PGRE.allQuestions()` rebuilds the merged pool on every call — ~20–70 full pool rebuilds per answer or dashboard render

**Claim.** The merged question pool is recomputed from scratch on every call site, and the hot paths call it in nested loops, so one `recordAnswer` or one `#/` render rebuilds the 366-item pool (with per-question object copies) dozens of times.

**Evidence.** `js/bank.js:21-52` — `allQuestions` allocates a fresh array plus a shallow copy per untagged question on every call; only `questionById` is memoized (`bank.js:66-75`). Call multiplication: `questionsForTopic` calls `allQuestions` (`bank.js:58`); `gamify.mastery` calls `questionsForTopic` (`gamify.js:366`); `gamify.metrics` loops all 9 topics calling `questionsForTopic` + `mastery` (`gamify.js:384-393`) → ~18 rebuilds per `metrics()`; `checkAchievements` calls `metrics()` up to 4 times (`gamify.js:507-523`) → up to ~72 rebuilds per `recordAnswer` (`gamify.js:168`). Dashboard render calls `metrics()` once plus `mastery` per topic tile plus `allQuestions` twice more (`view-dashboard.js:493,572,61,302`) → ~20 rebuilds per `#/` mount. `view-topic.js:13-14`, `view-build.js:87`, `exam-engine.js:97`, `search.js:56` each add one more.

**Impact on daily study before Nov 1.** Pure waste: thousands of throwaway objects per answer and per dashboard paint — GC churn and battery on a page the user keeps open all day. Not a correctness bug; the fix is trivial and safe because the banks are static script files for the life of the page (the code already relies on that for `questionById`).

**Severity.** nit (engineering hygiene; cheap to fix)

**Fix sketch.** `js/bank.js`: memoize the default pool and the `includeExam` pool in module scope exactly like `questionById` (built once per page load; banks are static). Optionally memoize `questionsForTopic` per topic id. No caller changes needed.

**Effort.** S

### F4. Single-assignment global hooks on `PGRE` — one slot per notification, silently overwritten by the next writer

**Claim.** Several cross-module contracts are single mutable slots on the `PGRE` global: whoever assigns last wins, and a second consumer would silently disconnect the first.

**Evidence.** `PGRE.onStateAdopted`: fired by `store.js:401-403` on every adopted sibling write; assigned once by `timer.js:498-501` (`bindAdoptRepaint`, comment admits 'Single assignment — no other module registers this hook'). Any future module needing adopt-notification (e.g. a view that wants to repaint on sibling writes) must overwrite the timer's repaint or go without. Same pattern: `PGRE.deck` + `PGRE.getFormulaCard` written by `view-formulas.js:2997-2998`, read by `visualizer-engine.js:710-731` as one of four fallback lookup paths; `PGRE.nextMockPointer` written inside the dashboard IIFE (`view-dashboard.js:419`), read by `view-exam.js:146`; `PGRE._examReadyQ` handoff (`view-exam.js:18,43` → `exam-engine.js:319-321`) — dead under current load order. Direct `PGRE.store.state.*` writes are spread across ~15 modules (grep: `view-formulas.js:775,781,808,931,1707,1730,1739`, `view-mistakes.js:76,329,340`, `view-study-time.js:398,612`, `focus-sound.js:69-71`, `formula-checkin.js:165`, `flashmodes.js:614-615,791-792`, `srs.js:490,545,577,663`, `app.js:703,722`) — each followed by `store.save()`, which is now merge-safe, so this is coupling breadth rather than a bug.

**Impact on daily study before Nov 1.** No live defect today — the single registered hook works. The risk lands on the next change: a second `onStateAdopted` assignment silently kills the top-bar repaint, and `PGRE.deck` is a view-owned global that any other view could shadow. These are the kind of bugs that read as 'the app randomly stopped updating' to a non-CS user.

**Severity.** nit

**Fix sketch.** `js/store.js`: make the adopt hook a small listener list (`PGRE.onStateAdopted.push(fn)` or `store.onAdopt(fn)`) and migrate `timer.js`. Delete the dead `_examReadyQ` path (folds into F1's fix). Document `PGRE.deck`/`getFormulaCard` ownership or route the visualizer lookup through `PGRE.views.formulas.getCard` only.

**Effort.** S

### F5. Unguarded load-order dependencies — correct today, silently wrong on the next `index.html` edit

**Claim.** Three module pairs depend on script order with no runtime guard; reordering any of them degrades the app silently rather than failing loudly.

**Evidence.** (a) `js/data-questions.js:169-176` defines preview-only `questionsForTopic`/`questionById`; `js/bank.js:9-10,57-75` redefines them over the full bank — correct only because `index.html:97` loads data-questions before `index.html:114` bank. Reversed, the pool silently shrinks to 20 preview questions everywhere. (b) `js/visualizers/trio-g*.js:8` reads `var CV = PGRE.CV` at eval time; `PGRE.CV` is assigned at `visualizer-engine.js:2198`, loaded at `index.html:143` just before the trio block `:144-153` — a reorder makes every card fall back to hardcoded light-theme colors with no error. (c) `app.js` boots on `DOMContentLoaded` specifically so `motion.js` (loaded after it, `index.html:160-162`) exists at first route (`app.js:788-797`); correct, but the contract lives only in comments.

**Impact on daily study before Nov 1.** None while `index.html` is untouched. The cost is paid by the next agent that adds a script tag in the wrong place — a silent 20-question pool or unstyled sims, both hard to notice.

**Severity.** nit

**Fix sketch.** Delete the dead fallback functions in `data-questions.js` (bank.js is the only definition that should exist) or have `bank.js` warn if it detects it loaded first. In `trio-g*.js`, resolve `PGRE.CV` lazily inside draw (most already re-read `vizStageTheme` per frame) or assert once at eval. No behavior change.

**Effort.** S

### F6. ~1,000+ lines of duplicated helper code across the ten `trio-g*.js` files, with drifted variants

**Claim.** Each of the ten visualizer files re-implements the same ~10 helpers — theme sync, cream fill, grid, param coercion, dt clamp, simSpeed, label chips, arrows, legend wrappers — and the copies have already drifted into subtly different behavior.

**Evidence.** Duplicated per file (line refs): `syncStageTheme` in all ten (`trio-g1.js:34`, `g2:38`, `g3:34`, `g4:35`, `g5:36`, `g6:44`, `g7:34`, `g8:38`, `g9`-equivalent, `g10:48`); `creamFill`/`fillCream` (`g1:40`, `g2:44`, `g4:41`, `g5:50`, `g8:44`, `g9:96`); `lightGrid`/`faintGrid` (`g1:46`, `g2:50`, `g4:47`, `g5:56`, `g8:50`, `g9:100`); `numParam` (`g1:64`, `g2:77`, `g4:95`, `g5:94`, `g9:20`, `g10:64`); `flagParam` (`g1:69`, `g5:99`, `g9:24`, `g10:69`); `simSpeedOf` (`g3:266`, `g4:100`, `g5:86`, `g6:179`, `g7:80`, `g8:68`); `safeDt`/`scaledDt`/`clampDt`/`finiteDt` (`g1:77` cap 0.08, `g3:274` cap 0.05, `g4:119` cap 0.05, `g5:79` cap 0.08, `g6:187`, `g7:86`, `g8:76` cap 0.05, `g10:77` cap 0.05); `haloLabel`/`inkLabel` (`g1:108`, `g3:62`, `g6:203`, `g8:99`, `g9:77`, `g10:98`); `arrow` (`g2:115`, `g3:129`, `g6:142`, `g7:274`, `g9:117`); legend wrappers (`g1:93`, `g2:82`, `g3:54`, `g4:60`, `g5:75`, `g6:57`, `g7:69`, `g8:64`, `g9:44`, `g10:60`). A shared bag exists — `PGRE.VizH` (`visualizer-engine.js:2367`) — but covers only clamp/formatSci/contour helpers, not these. Drift already visible: dt caps differ (0.05 vs 0.08), `scaledDt` NaN handling differs (`g3` returns 0.016 default, `g8` returns 0), `haloLabel` argument order differs (`g6` is `(ctx,x,y,text)` vs `g1` `(ctx,text,x,y)`). AGENTS.md:48 instructs 'copy a sibling' for every new card, so the duplication grows with each visualizer.

**Impact on daily study before Nov 1.** No daily-study cost today; the cost is that a fix to a shared behavior (e.g. the simSpeed clamp, a dark-mode color) must be hand-propagated across ten files and is already inconsistent — the next copied card inherits whichever variant its sibling had. Maintenance drag on the one subsystem still actively growing (30+ `cpgf-` cards registered, more planned).

**Severity.** should-fix (maintainability, not user-visible)

**Fix sketch.** Extend `PGRE.VizH` in `visualizer-engine.js` with the canonical versions (theme sync, cream fill, grid, numParam/flagParam, simSpeedOf, scaledDt, haloLabel, arrow, legend). Convert one trio file as the template, update AGENTS.md's copy-a-sibling instruction to reference the shared helpers, then delete the local copies file-by-file as cards are next touched. Do not attempt a ten-file rewrite in one pass.

**Effort.** M

### F7. No router unmount hook — teardown is a per-view convention that currently holds but is unenforced

**Claim.** `PGRE.route` replaces `#view` innerHTML and calls `mount` with no `unmount`/`destroy` contract; every long-lived resource is cleaned up by ad-hoc per-view mechanisms, which all currently work — verified — but nothing stops the next view from leaking.

**Evidence.** `js/app.js:533-534` (`main.innerHTML = v.render(params); if (v.mount) v.mount(params);`) — no teardown call. Current coverage is manual: exam interval cleared via hashchange listener (`view-exam.js:50-56`); pace timers self-terminate when their chip leaves the DOM (`view-practice.js:177-179`, `view-mistakes.js:33-35`); focus face interval self-terminates on `!page.isConnected` (`view-focus.js:420-422`); rAF loops die on canvas disconnect (`focus-fx.js:482`, `concept-door-fx.js:133-135`); visualizer stage has explicit `stop()` (`visualizer-engine.js:404-416`) invoked from modal close and `teardownInlineVisualizer` (`view-formulas.js:1776`); spherical teach widget destroyed on hashchange (`view-concepts.js:373-376`); library object URLs revoked on hashchange (`view-content.js:204-208`); formulas game/study teardown on hashchange (`view-formulas.js:2938-2940`). Residual leak: `trio-g3.js:303-321` and `trio-g4.js:373-389,1820-1836` attach `window` mousemove/mouseup/touchmove/touchend drag handlers keyed on `window[flag+'_move']`; they are replaced on re-bind but never removed when the canvas dies — dead handlers accumulate on `window` for the session (harmless no-ops, but they retain closures over dead state).

**Impact on daily study before Nov 1.** None observed — every hot loop self-terminates. The exposure is structural: the next view or card that forgets the convention leaks an interval or listener silently, and there is no single place to audit.

**Severity.** nit

**Fix sketch.** Optional `v.unmount` in `PGRE.route` before `main.innerHTML` replacement; migrate the hashchange-based teardowns to it over time. In `trio-g3/g4`, remove the window drag listeners when the owning canvas disconnects (guard inside the handlers on `canvas.isConnected` is the minimal fix).

**Effort.** M

### F8. Test coverage is strong on store/SRS/exam/bank but absent on gamify, timer, study-time, router, and plan-engine

**Claim.** The modules that write the most state per day — `gamify.recordAnswer`, `timer.credit`, `study-time.beat`, `plan-engine.weekTasks` carry rule, `app.js` router — have no dedicated behavioral test; the suites that exist cover the persistence and scheduling cores well.

**Evidence.** Real coverage: `tools/test-store-persist.js` (two-vm-context cross-tab merge/tombstone/epoch, ~20 assertions over shipped `store.js`), `test-exam-engine.js` (47 checks: draw sizes, spoiler filter, scoring, shipped engine), `test-bank.js` (23 checks: dedup, src tagging, spoiler partition), `test-mistakes-srs.js` (36), `test-srs-intervals.js`, `test-mem-history.js`, `test-formula-picker.js`, `test-formula-checkin.js`, `test-pack-launch*.js`, `test-agent-receipt.js`, `test-plan.js`, `test-visualizer-aesthetics.js` (real DOM sandbox over shipped engine + all 10 trio files), `test-ux-interaction.js` (66 KB DOM stub driving shipped view-formulas/flashmodes/view-exam/view-practice/app.js), `test-srs-anki-chrome.js` + `test-pack-launch-chrome.js` + `test-oscillator-chrome.js` (headless-Chrome, isolated profile). `test-file-structure.js` asserts placement + no-emoji only — not behavior. No test loads `gamify.js`, `timer.js`, `study-time.js`, `plan-engine.js`, or exercises `PGRE.route` mount/unmount. `gamify.metrics`/`recordAnswer` (XP, mistake ladder, streak, challenges) and `timer.credit` (4 h cap, pause math, day-split) are the highest-write-frequency, highest-regret-if-wrong code in the repo.

**Impact on daily study before Nov 1.** A regression in XP, streak, or focus crediting ships silently — the user notices 'my streak reset' or 'focus time vanished' days later with no repro. These are exactly the modules a non-CS user cannot debug.

**Severity.** should-fix

**Fix sketch.** Add vm-context tests in the existing style (load shipped source, stub localStorage): `gamify.recordAnswer` XP/mistake/today counters + `revertAnswer` symmetry; `timer.credit` gap-cap, pause exclusion, 03:00 day-split; `plan-engine` carry-rule truth table. No browser needed.

**Effort.** M

## Top 3 in this aspect

1. **F2 — print sheet built on every `#/formulas` mount.** A guaranteed, every-morning synchronous render of 334 cards + ~1300 KaTeX nodes + full layout pass for an element only printing needs; lazy-build removes the entire cost with a few lines.
2. **F1 — stale/missing `?v=` on the four dynamic script injects.** The only remaining path for a fresh-view/stale-engine mix; `flashmodes.js?v=20260907a` is already 11 days stale relative to the shell and the next edit to it ships under the old URL.
3. **F8 — no tests on the highest-write-frequency modules.** `recordAnswer`, `timer.credit`, and the plan carry rule mutate the state the user trusts daily; a regression there is silent, personal, and undebuggable for this user.

## Not nominated

- **`index.html` static `?v=` coverage** — all 52 tags now carry tokens (prior survey's 18-tag gap is fixed); per-file tokens are strictly better than the documented single shared value, though the comment at `index.html:8-11` now describes a mechanism that no longer exists (folded into F1's fix).
- **`store.js` read-merge-write / `_rev` / `_epoch` / tombstones** — shipped per AGENTS.md; `_mergeFromDisk` unions append-only arrays, maxes counters, honors tombstones and epochs correctly on read; covered by `test-store-persist.js`. Not re-nominated.
- **Today agenda / `fillFormulaDayIfEmpty` / `armStudyFromFill`** — shipped and correct: fill only fires on an empty batch (`srs.js:474-493`), `formulaDay` reconcile only prunes (`srs.js:405-441`), dashboard CTA wires fill→arm→`#/formulas` (`view-dashboard.js:469-482`).
- **Exam date unification** — `PGRE.EXAM_DATE = '2026-11-01'` (`data-topics.js:5`), settings default + `'2026-10-28'` migrate (`store.js:80,496`), `daysToExam` reads the single source (`gamify.js:615-621`), plan horizon ends 2026-11-01 (`data-plan.js:266`), `currentWeek` clamps to the last week (`plan-engine.js:28-29`).
- **Timer/rAF/listener leaks across routes** — audited every `setInterval`/`requestAnimationFrame`/global listener; all self-terminate or are bound-once-and-guarded (see F7 evidence). No live leak found.
- **`splitChapters` `####` gap** — now splits `#{1,4}` (`store.js:815`), the parser half of parked N3-B; portal/Library copy remains a product question, not code architecture.
- **Lazy bank parse** — `content/bank/*.js` are static script tags parsed at load; prior survey measured ~20 ms compile for the two big banks (`ui-pass-2026-09-09/Performance.md:84-85`), not worth defer machinery.
- **`view-exam.js` fallback loader + `_examReadyQ`** — dead but harmless; folded into F1/F4 fix sketches rather than its own finding.
- **`srs.js` SM-2 / examCap / formulaDay logic** — read in full; interval math, cap cascade, reconcile, soft pins, and studiedToday local-date handling are internally consistent.
- **`timer.js` crediting** — timestamp-based gap crediting, 4 h cap, pause exclusion, 03:00 split, boot gap-credit all correct on read.

## Uncertainties

- Mount-time cost of `buildPrintSheet` was not re-measured live (no browser in this audit); the 1.9 MB / 1322-node figure is the prior survey's live measurement — the code path is confirmed current by reading `view-formulas.js:2999,314-346`.
- Whether Chrome's `file://` heuristic cache actually serves the stale `flashmodes.js?v=20260907a` indefinitely is unverified; the mechanism (same URL → same cache entry) is certain, the hit rate is not.
- `PGRE.store.state` write sites were counted by grep (~15 modules); a few may be read-only contexts the regex caught — the coupling-breadth claim stands regardless.
- Trio-file duplication is quantified by helper-name census, not a line-diff; the ~1,000-line estimate is conservative (10 files × ~100 lines of near-identical preamble each).
- `test-ux-interaction.js`'s hand-rolled DOM stub could diverge from real DOM behavior; its assertions were not re-run for this audit.