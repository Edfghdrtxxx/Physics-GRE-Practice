# Implement lock — Physics GRE Prep Studio (D-44)

Cut 2026-09-18 from `00-chairman.md` plus a second live pass (full 5-question set by keyboard, seeded mistake book, exam room entry/resume/discard, Pack 03 run end to end, 390 px mobile, dark mode, `#/formulas` mount timed). Not an advocate for any aspect report. Narrow on purpose. No application code edited in this document.

## 1. Lock sentence

Close the daily loop inside the site: plan set rows and the Today card start their pack, a finished pack ticks its own plan task, and the practice summary stops asking an agent to do it. Second wave: make `#/formulas` and `#/` open as instruments (lazy print sheet, Today first, one Study control). Third wave: make the store say what happened to the data. Do not touch sidebar IA, achievements, SM-2, exam engine, or the merge logic.

## 2. What the second pass changed

Rooms are good. Keyboard `1-5` answers, `Enter` advances, verdict + solution + Knew/Guessed/Slow/Forgot tags + bookmark on every item, palette summary, misses with solutions, `Practice again`. Exam room: full-screen, 70-cell palette, `1:59:59` clock, flag, `Pause`/`Submit`, lobby `Resume exam` / `Discard it`, pointer falls back to ETS 2024 after discard. Mistake book: two seeded misses appear as `DUE IN 1 D - missed x1 - last just now`, `Re-drill` / `Archive`. Mobile 390: sidebar hidden, no horizontal overflow, KaTeX fits. Dark mode: works, persists in `settings.theme`. None of this is on the list.

**The loop is half outside the site (upgrades item 1).** `PGRE.launchPack('03')` -> 8-question set -> `Session complete` writes `state.packReceipts['03']` but `state.plan['set-03']` stays `null`; the `#/plan` checkbox stays empty. The summary ends with `Copy agent receipt` / `Download .json` and the sentence `OrbitOS: copy or download the receipt, then in chat say you are done (or paste the JSON) so the agent can tick the daily row and log misses` (`js/view-practice.js:797-803`). That sentence is shown after **every** practice set, including mixed practice from Today. `Done` on a pack routes to `#/build`, not to the plan. So: plan (no launcher) -> agent -> practice -> receipt -> agent -> plan checkbox. Two hops of the user's daily loop are agent-only, and the site knows both facts (`packReceipts`, `plan`) and refuses to join them.

**Formula mount cost measured.** `#/formulas` mount: 245-318 ms long task, 51,929 nodes under `#view`; `#/` is 555 nodes, `#/mistakes` 3,766. Removing `#formulas-print` takes 3 ms. Confirms `01` F2.

**Costume confirmed by inflation.** Twelve answers and a discarded mock: `Level 3 - Photon`.

**Nit found.** Mobile toast (`In-progress exam discarded.`) sits over the Today mock row.

**Not in need.** Practice/exam/mistake rooms, mobile layout, dark mode, reduced-motion, N1 Today agenda, N2 store merge, exam pointer logic.

## 3. Wave A -- close the loop (ship first)

| File | Owner | Allowed change |
|---|---|---|
| `js/view-plan.js` | A1 | For tasks with `kind === 'timed'` or `'extra-set'`, render one `Start ->` control that calls `PGRE.launchPack(n)` (`n` from the task id `set-NN`). Drop `+N XP` from `.task-meta` (keep hours). Delete the hero sentence `Mirror of the vault syllabus ... regenerate: node tools/build-plan.js`; render `5+6+2 load (~16 h/wk)` as `~16 h/wk: 5 timed sets, 6 formula sessions, 2 extras`. Week 0 `<details>` closed by default. Checkbox stays for non-set tasks. |
| `js/view-dashboard.js` | A1 | "This week" card: the first undone `timed`/`extra-set` task gets the same `Start ->` control. No other dashboard change in this wave. |
| `js/view-practice.js` | A2 | On `Session complete` for a two-digit pack: if `state.plan['set-NN']` is not done, call `PGRE.gamify.toggleTask('set-NN', xp)` once (idempotent; never un-tick). Summary line `Set NN marked done in your plan`. `Done` routes to `#/plan` for packs. Show `Copy agent receipt` / `Download .json` and the OrbitOS hint **only** when `session.pack` is set; delete them from mixed/topic/custom summaries. Do not change receipt content or `packReceipts` write (OrbitOS skill still consumes it). |
| `js/plan-engine.js` | A2 | Expose the XP value used for set tasks so A2 does not hardcode `20`/`15` (one exported constant or read from `weekTasks`). No carry-rule change. |
| `tools/build-plan.js` | A1 | Only if the hero string or `5+6+2` originates here; otherwise untouched. |

**Timed claim.** Plan rows say `timed (~100 min)`; `#/practice/custom` is untimed by design. Wave A does **not** add a countdown. It changes the row label to `~100 min` (a budget, not a mode). A real timed practice mode is a separate decision; do not sneak it in.

**Out:** `js/app.js` router and `buildNav`; `js/packs.js`; `js/data-packs.js`; `js/data-plan.js` task bodies; `js/gamify.js` XP values; the OrbitOS `/practice-physics-gre-set` skill (it keeps working: `launchPack` and `packReceipts` are unchanged).

### Acceptance (cold profile, desktop 1440x900, then 390 px)

1. `#/plan`, this week open: every `Set NN ... ` row shows `Start ->`. Click on Set 03 lands on `#/practice/custom` with `Set 03 - Oscillations & Harmonic Motion - 8 Q` as the label and 8 palette cells. No sidebar, no `#/build`, no typed hash.
2. Answer all 8. `Session complete` says Set 03 is marked done. `state.plan['set-03'].done` is truthy. `#/plan` shows Set 03 checked and the week meter moved. Re-running Set 03 does not un-tick it.
3. Mixed practice from Today: summary has `Practice again` and `Done`; no `Copy agent receipt`, no `Download .json`, no sentence containing `OrbitOS`.
4. Pack summary still has `Copy agent receipt` and the receipt JSON is byte-identical in shape to today's (`tools/test-agent-receipt.js` passes unchanged).
5. `#/plan` hero has no `regenerate`, no `.md`, no `5+6+2`. Week 0 is collapsed. No task row shows `XP`.
6. `#/` "This week" card shows one `Start ->` on the first undone set; clicking it is the same as AC1.
7. Held: sidebar still 24 links; `PGRE.launchPack` signature unchanged; `packReceipts` still written.

## 4. Wave B -- instruments, not costumes (after A)

| File | Owner | Allowed change |
|---|---|---|
| `js/view-formulas.js` | B1 | `buildPrintSheet` is called only from `printSheet()` and a `beforeprint` listener, never from `mount`. Landing (empty or remaining batch) paints one primary Study control; the tab strip Match/Type/Quiz/Cloze/Lab/Search, the check-in card, and the SM-2 settings sit behind one `Options` disclosure (closed by default, state remembered in `settings`). Delete `Flip cards the way vocabulary apps do it` copy. No SM-2, picker, or flash-mode logic change. |
| `js/view-dashboard.js` | B2 | `#today-agenda` is the first card; the greeting line folds into its header. Level/title/XP meter, five stat tiles, challenges, QOTD move below into one `Progress` disclosure (open state remembered). Remove `.countdown-breathe` from `.countdown-num`. Toast container must not overlap `#today-agenda` on 390 px (CSS only, `css/style.css` `#toasts`). |
| `js/bank.js` | B2 | Memoize `allQuestions()` for both `includeExam` variants like `questionById`. No API change. |
| `fonts/`, `css/fonts.css` | B1 | Delete Poppins, Lora, variable Newsreader, duplicate JetBrains woff2 (the 420 KB never referenced by `style.css`). Verify `document.fonts` still loads Inter 400/500/600, Newsreader 400, JetBrains Mono when instrument UI is on screen. |

**Out:** deleting XP/achievements/levels internally (plan grants depend on XP); `js/app.js` `buildNav`; sidebar letter-swap; verb unification; contrast token.

### Acceptance

1. `#/formulas` cold mount: `#formulas-print` absent; `#view` node count under 5,000; no long task over 100 ms on mount. Ctrl+P (or dispatching `beforeprint`) builds the sheet and the printed output equals today's.
2. `#/formulas` cold: one primary control above the fold reads Study (10 on an empty batch); Match/Type/Quiz/Cloze/Lab/Search not visible until `Options` is opened; Study-10 still lands on `Card 1 - 10 left`.
3. `#/` cold: first card is Today with four launchers; `Level`/`XP`/`Quark` not in the fold; stat tiles and QOTD inside a closed `Progress` disclosure; `.countdown-num` has no `countdown-breathe`.
4. `#/` after 12 answers: same layout; XP still accrues in state.
5. `fonts/` total under 350 KB; no 404 in the network log for a woff2.
6. Held: Today fill/mock pointer unchanged; `tools/test-formula-picker.js`, `tools/test-srs-anki-chrome.js` pass.

## 5. Wave C -- the store speaks (after A, independent of B)

| File | Owner | Allowed change |
|---|---|---|
| `index.html` / `js/app.js` | C1 | Sidebar footer: one muted line `Progress stored for <protocol>//<host>` (path omitted). Boot: if `PGRE.store._recoveredFromCorruption`, sticky toast naming the kept backup key and pointing to Library Restore. |
| `js/store.js` | C1 | In `save()`, after every 20th successful write (counter in `_rev`), copy the just-written blob to `pgre-state-v1-backup`. Keep exactly one. `load()` reads it only on explicit Library Restore -> `Restore last automatic backup`. No merge-logic change. |
| `js/gamify.js`, `js/srs.js`, `js/exam-engine.js` | C2 | When `PGRE.store._persistFailed` is true, `recordAnswer`, `gradeCard`, and exam persist return without mutating state and re-raise the existing toast. |
| `js/view-content.js` | C2 | Library copy: export contains attempts, formula cards and intervals, mistake book, mocks, notes; does **not** contain imported files. Add `Restore last automatic backup`. |

**Out:** IndexedDB export, array caps, cross-origin merge, `navigator.locks`, Safari/`file://` IDB work.

### Acceptance

1. Sidebar footer shows `http://localhost:NNNN` on the test origin; on `file://` shows `file://`.
2. Write `{not json` into `pgre-state-v1`, reload: a sticky toast names the backup key and Library Restore; the Studio is not silently Level 1.
3. After 20 saves, `pgre-state-v1-backup` exists and parses; `Restore last automatic backup` on a cleared store brings attempts and cards back (diff empty except `_rev`/`_epoch`).
4. Monkeypatch `setItem` to throw, answer a question: `state.attempts.length` does not change; toast shows. Restore `setItem`, answer again: persists.
5. Held: `tools/test-store-persist.js` 38/38; two-tab pagehide still passes.

## 6. Parked (not this cycle)

Sidebar IA (24 links); verb unification; `--ink-3` 12 px contrast; stale `?v=` on lazy injects (`js/view-formulas.js:186,202`, `js/view-search.js:26`) -- one-line fix, take it with Wave B if the file is open; tests for `recordAnswer`/`timer.credit`/carry rule; `trio-g*.js` helper dedupe; real timed practice mode; N3-A calendar rebuild; N3-B Kahn notes.

## 7. Shipped 2026-09-18 (all three waves)

Verified by the chairman on a cold isolated origin with real interactions. Wave A: plan/dashboard `Start ->` launch packs; pack completion ticks `plan['set-NN']`; receipt UI pack-only; build-log copy gone. Wave B: `#/formulas` mount 51,929 -> 76 nodes, 0 long tasks, print sheet built on `beforeprint` (334 cards, removed on leave); landing = one Study control + `Options` disclosure; `#/` = Today first with countdown, `Progress` disclosure closed by default; `allQuestions` memoized; `fonts/` 759 KB -> 339 KB. Wave C: origin line in footer; corruption toast sticky with key (fresh-document path); `pgre-state-v1-backup` every 20th rev; `canWrite()` fail-closed on `recordAnswer` / `gradeCard` / exam `persistAnswer` + `submit`; Library backup restore. Tests: store-persist 38, bank 29, formula-picker 13, agent-receipt 25, plan 37, packs 212. Uncommitted; 26 paths changed.

## 8. Wave C adversarial review and fix (2026-09-18, same day)

`06-review-wave-c.md` (swe-2, code-traced) returned FIX. Chairman confirmed each from source and fixed: **F1** `recordAnswer` now returns `null` on refusal and `view-mistakes.js` `commitAnswer` bails before capturing a row, so a re-answer under outage cannot `revertAnswer` an unrelated attempt (live repro: 5 seeded attempts, refused answer + re-pick + recovery -> 0 rows lost). **F2** `doSubmit` checks `submittedAt` before teardown; refused submit stays in `#/exam/run` fullscreen with palette and clock (live: refused -> `#/exam/run`, then recovered -> `#/exam/review/<id>`). **F4** `_rev` rolls back when `setItem` throws (live: 19 while failing, 20 on recovery). **F5** `srs.setLastAssess` guarded (chip tap under outage stamps nothing). **F6** backup-restore toast is honest when the post-import save failed; corruption toast no longer names a key that was not written. **F3** resolved by doc, not code: AGENTS.md now states which entries are fail-closed and that navigation-shaped state is deliberately self-healing. Practice feedback under outage says `not recorded -- saving failed` instead of `+0 XP`. Cleanup also landed: lazy-inject `?v=` tokens (`flashmodes.js` was two days stale at its own commit), `index.html` cache-bust comment rewritten to the per-file rule, README dashboard/formula/plan/library rows updated, receipt hint rewritten now that the plan ticks itself. Tests: store-persist 38, agent-receipt 25, bank 29, formula-picker 13, plan 37, packs 212. 30 paths changed, uncommitted.
