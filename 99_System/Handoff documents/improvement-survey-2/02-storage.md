# Storage survey — 2026-09-18

Method. Read `AGENTS.md`, `js/store.js`, `js/study-time.js`, `js/timer.js`, `js/formula-checkin.js`, `js/view-content.js`, `js/app.js` (`persistWarning`), `js/gamify.js` `recordAnswer`, `js/srs.js` (no IndexedDB of its own), `tools/test-store-persist.js`, `README.md` (file:// IndexedDB note), `DESIGN.md` §1 / §4b, and the prior N2 lock (`09-lock.md`, `06-debate-n2-persistence.md`). Isolated origin only: `python3 -m http.server 8124` from the repo root (hub `storage-audit-http`) plus headless Chrome CDP `127.0.0.1:9334` with user-data-dir `/tmp/pgre-storage-audit-sLhAYI` (hub `storage-audit-chrome`). Two documents `storeA` / `storeB` on `http://localhost:8124/`. Did not open `file://`, `:8000`, or `127.0.0.1:8000`. Ran `node tools/test-store-persist.js` (38 passed, 0 failed) as direct evidence for the shipped merge. No application code edits. Calendar day 2026-09-18; in-app countdown 44 days to Sun, Nov 1, 2026.

## Findings

### F1. The Studio still does not say which origin holds the work

**Claim.** Progress is per origin, `file://…/index.html` / `http://localhost:8000` / `http://127.0.0.1:8000` / this isolated `:8124` are four different stores, and the UI never names the origin or warns when localStorage is empty while IndexedDB is not (or the reverse).

**Evidence.** `AGENTS.md` "Progress origin". `README.md:16-17` invites both `python3 -m http.server` and double-clicking `index.html`. Live `location.origin` on this pass was `http://localhost:8124`; brand-sub is only `Prep Studio · exam Nov 1, 2026` (`index.html:30`). `#/library` body text hits `this machine`, `localStorage`, `IndexedDB` and does not contain `file://`, `localhost`, `origin`, or `profile` (`js/view-content.js:214`). No `[data-origin]` / `#origin-label`. After `localStorage.clear()` the formula-deck record in IndexedDB `pgre-content` was still present (`idbDeckSurvivedClear: true`); the restored empty-looking Studio did not mention it.

**Impact on daily study before Nov 1.** Opening the "other" bookmark (README's file:// vs the local server) paints a blank Studio. A non-CS user will re-do a morning or think four weeks of SRS vanished. This is the remaining daily footgun now that two-tab clobber is fixed.

**Severity.** should-fix

**Fix sketch.** Paint the origin (protocol + host, not the full path) on `#/library` and in the sidebar footer. If `pgre-state-v1` is missing/default but `pgre-content` has files, or the reverse, show one sentence pointing at Library export / the other URL. Do not auto-merge across origins.

**Effort.** S

### F2. There is no automatic backup; one profile wipe ends the 44-day record

**Claim.** The only durable copy of attempts, SRS cards, mistake ladders, and mock sittings is this origin's `localStorage['pgre-state-v1']` plus IndexedDB `pgre-content`. Nothing periodically exports it.

**Evidence.** `PGRE.store.exportJSON` is a manual pretty-print of `this.state` (`js/store.js:630-632`), wired only to `#export-btn` (`js/view-content.js:266-275`). Grep of `js/` finds no `setInterval` export, no second key rotation, no download-on-idle. `save()` writes one key (`js/store.js:499-521`). Cold blob on this origin: **1296 B**, 0 attempts. After 14 mixed answers: **6630 B**. User vault memory of the real Chrome blob is ~70 KB — still one key. Chrome "Clear browsing data" / a profile reset deletes it.

**Impact on daily study before Nov 1.** Not a every-morning wound. One Clear-Data or a lost Chrome profile is the whole transcript: formula intervals, mistake book, any mock already sat. There is no time to rebuild that from memory before Nov 1.

**Severity.** should-fix

**Fix sketch.** Once a day (or every N successful `save()`s), write a rotating `pgre-state-v1-backup` side key and/or trigger the existing Library download without extra UI chrome. Keep one previous blob. Do not build a sync product.

**Effort.** S

### F3. Library Export/Restore is a localStorage snapshot, not a full Studio backup

**Claim.** Export includes `_rev`, `_epoch`, tombstones, notes, attempts, cards, exams — and does **not** include IndexedDB `formula-deck` or imported book/PDF blobs. Library copy still describes "XP, achievements, plan, streaks".

**Evidence.** Live export keys (2026-09-18): `_epoch`, `_rev`, `achievements`, `attempts`, `bookmarks`, `cardNotes`, `cardReviews`, `cards`, `contentMeta`, `created`, `daysActive`, `exams`, `flags`, `focusSessions`, `formulaCheckIn`, `formulaDay`, `formulaStudy`, `formulaSuspended`, `lastAgentReceipt`, `log`, `migrations`, `mistakes`, `notes`, `packReceipts`, `plan`, `questions`, `sessions`, `settings`, `streak`, `studyLog`, `timer`, `timerStats`, `today`, `tombstones`, `topics`, `xp`. `exportHasFormulaDeck: false` after `contentDB.put({id:'formula-deck', …})`. Round-trip: `exportJSON` (pretty, **10371 B**) → `localStorage.clear()` (`lsAfterClear: null`) → `importJSON` → compact disk **6763 B**. Diff of all keys except `_rev`/`_epoch`: **empty**. `_rev` 26 → 1, `_epoch` 1 → 2 (import bumps epoch and resets rev, `js/store.js:649-652, 675`). Notes `q01`, bookmark `q02`, tombstone `bookmarks.q99`, 14 attempts all came back. Then `contentDB.del('formula-deck')` + `importJSON` of the same file: deck stayed gone. Copy: `js/view-content.js:224` "Back up or restore all progress (XP, achievements, plan, streaks) as a JSON file."

**Impact on daily study before Nov 1.** Formula SM-2 lives in `state.cards` and **is** in the JSON, so a restore keeps recall intervals. Imported Kahn/PDF notes and any extra IDB cards do not. A student who exports because the persist toast told them to, then restores on a new profile, will see XP/plan/SRS and empty Notes portals with no explanation.

**Severity.** should-fix

**Fix sketch.** Honest Library sentence (attempts, formula cards, mocks, notes, **not** imported files). Optional: zip or a second JSON of `contentDB.all()`. Restoring progress must not invent IDB files from `contentMeta` alone.

**Effort.** S (copy) / M (include IDB)

### F4. `QuotaExceededError` is visible, sticky, and fail-open — and will not fire before Nov 1 at measured growth

**Claim.** `setItem` throw sets `_persistFailed` and a sticky error toast, then **keeps mutating RAM**; reload drops everything after the last successful write. `attempts` / `exams` / `sessions` remain uncapped. Measured growth is hundreds of bytes per answer, not megabytes.

**Evidence.** `js/store.js:510-520`; `js/app.js:356-371`. Live monkeypatch of `localStorage.setItem('pgre-state-v1')` throwing `QuotaExceededError`: `_persistFailed` false → true; RAM `xp` 330 → 337; disk stayed **330 / 14 attempts / 6630 B**; toast text "Saving failed — browser storage may be full. Recent progress is not being recorded. Back up from the Library page, then free up space." Still present after 5 s (sticky). Screenshot: `99_System/Handoff documents/improvement-survey-2/shots/02-quota-toast.png`. Successful `save()` cleared the flag, wrote xp 337, added "Saving works again — your progress is being recorded." `failClosed: false`.

Blob growth on this origin (mixed correct/miss, `gamify.recordAnswer`):

| step | attempts | bytes | delta |
|---|---|---|---|
| cold load | 0 | 1296 | — |
| first `q01` (first-time XP + badges) | 1 | 2276 | +980 |
| 4 attempts (after both-dirty) | 4 | 3360 | — |
| +10 more (`q11`–`q20`) | 14 | 6630 | mean **+327 B/call** (range 210–456; misses larger) |

Per-attempt JSON itself: min 156 / max 159 / avg **157 B** (DESIGN.md §4b hoped ~120 B). 44-day heavy use at 50 answers/day: 2200 × 327 B ≈ **719 KB** plus ~334 formula card records (not measured this pass; order 50 KB) plus a handful of 70-item mocks. Vault memory of the real blob ~70 KB. Chrome/Safari localStorage is ~5–10 MB. Caps: `cardReviews` 8000, `focusSessions` 300, `log` 60 (`js/store.js:193-203, 627`); `attempts`/`exams`/`sessions` have no cap (`unionArr` without cap at `js/store.js:190-192`).

**Impact on daily study before Nov 1.** Quota will not eat this cycle. If it ever did, the toast is the right warning; grades after it still look accepted and vanish on reload. That fail-open is the only quota-shaped daily risk, and it is latent.

**Severity.** nit (caps / rewrite); should-fix only for fail-closed grades if persist is already failing

**Fix sketch.** When `_persistFailed`, refuse `recordAnswer` / `gradeCard` / exam persist with the existing toast — do not append to RAM. Do not spend this cycle capping arrays.

**Effort.** S

### F5. Unreadable JSON starts a silent fresh profile

**Claim.** `load()` stashes a `-corrupt-*` side key and replaces state with defaults. `_recoveredFromCorruption` is session-only and never painted. Boot does not throw.

**Evidence.** `js/store.js:416-439, 467-473`. Live: wrote `{not json` into `pgre-state-v1`, called `load()`. `threw: null`, `recovered: true`, attempts 0, xp 0, stash key `pgre-state-v1-corrupt-1789695719642`. No `.corrupt` / `#persist-corrupt` node; `document.body.innerText` had no "unreadable" / "corrupt" / "starting fresh". Old-shape blob (no `_rev`/`_epoch`, `settings.examDate: '2026-10-28'`, orphan `plan.w01t1`) loaded without throw: exam date **2026-11-01**, `_rev`/`_epoch` filled, `formulaExamCap` true, `dailyTargetMin` 120, `plan.w01t1` dropped by `planRebuild2026`, `ankiReset2026` stamped (`js/store.js:441-456, 481-496`). Parseable-but-wrong `attempts: "oops"`: `load()` did not throw; `attempts` stayed a string (`migrate()` only fills missing keys and type-fixes `settings`/`today`/`timer`/`formulaCheckIn`/`streak`). `importJSON` **does** reject wrong-typed arrays (`js/store.js:642-646`).

**Impact on daily study before Nov 1.** Torn localStorage is rare. If it happens, the student sees a blank Level 1 Studio with no "we had to start over — restore from Library". They will not look in Application → Local Storage for the stash key.

**Severity.** should-fix (banner only)

**Fix sketch.** If `_recoveredFromCorruption`, sticky toast pointing at Library Restore and mentioning a backup key was kept. Do not broaden `migrate()` into a type-coercer this cycle.

**Effort.** S

### F6. Residual window: Reset in tab A discards in-flight work in a stale tab B

**Claim.** `_epoch` wholesale-adopt on a higher-epoch disk is working as designed and will throw away answers that existed only in a sibling heap that missed the `storage` event, including answers recorded **after** the reset but before that tab's next `save()`.

**Evidence.** `js/store.js:388-399, 538-543`. Live: tab A `reset()` epoch 3 → 4, disk attempts 0. Tab B adopted via `storage` (RAM attempts 0, epoch 4). Then B was force-staled to the pre-reset heap (14 attempts, epoch 3) and `recordAnswer` `q07` + `save()`: disk stayed **0 attempts / epoch 4**; `q07` never landed. `tools/test-store-persist.js` "epoch: a missed sibling wipe beats a stale heap save" asserts this. Contrast: both-dirty **without** reset unioned `q01,q02,q04,q05` onto disk (3360 B, rev 12) — merge works when epochs match.

**Impact on daily study before Nov 1.** Reset is a two-step confirm on `#/library` (`js/view-content.js:305-323`) and is rare. Two tabs plus Reset is the same shape as the old clobber, but the user asked for the wipe. Worst case: a practice tab keeps grading after Reset in Library and those grades vanish.

**Severity.** nit

**Fix sketch.** If live epoch < disk epoch, adopt the wipe **and** queue a blocking "this window's unsaved answers were dropped because progress was reset elsewhere" toast. Do not merge pre-reset arrays back (that reopens resurrection).

**Effort.** S

## Top 3 in this aspect

1. **Invisible origin split (F1)** — the only remaining way a normal morning looks like a wipe, because README documents both `file://` and the local server and the chrome never says which store is live.
2. **No automatic backup (F2)** — N2 no longer silently deletes a sitting; a Chrome-profile clear still deletes the only 44-day copy, and Export is a button the user has to remember.
3. **Export hatch is localStorage-only and undersold (F3)** — restore round-trip of progress keys is solid, but IDB books/`formula-deck` are omitted and the Library sentence still sounds like an XP dump.

## Not nominated

- **Shipped N2 two-tab clobber — PASS, do not re-open.** Prior survey: idle dashboard `pagehide` dropped 2 attempts / 3054 B → 1 attempt / 2677 B. This pass, same shape on `http://localhost:8124/`:
  - Cold: **1296 B**, 0 attempts, `_rev` 6, `_epoch` 1.
  - Tab A `gamify.recordAnswer` on `q01`: disk **2276 B**, 1 attempt, `_rev` 8, last id `q01`.
  - Tab B heap forced stale (`attempts: []`, `_rev` 7, xp 0) then `pagehide` (same listener as close: `js/study-time.js:82` `beat(); flush();` → `store.save()`): disk **2276 B**, qids `[q01]`, `_rev` 9. RAM on B merged to 1 attempt. **Pass.**
  - Both tabs dirty (A wrote `q04`, B held a pre-A snapshot and wrote `q05`): disk qids `[q01, q02, q05, q04]`, **3360 B**, `_rev` 12. **Pass.**
  - `node tools/test-store-persist.js`: 38 passed, 0 failed, including "THE CLOBBER: idle tab pagehide save must not erase sibling work".
- **`save()` read-merge-write with `_rev` / `_epoch` / tombstones** — present at `js/store.js:15-28, 171-404, 499-521`. `storage` listener `js/store.js:406-413`. Tombstones used by notes/bookmarks/cardNotes/formulaSuspended.
- **`formula-checkin.js` one-off `storage` merge** — gone. Only `store._bindAdoptHook` listens. `js/timer.js:495-500` `PGRE.onStateAdopted` is a paint hook, not a second merge policy.
- **Exam date default / Today agenda (N1)** — already shipped; this origin showed 44 days / Sun, Nov 1, 2026. Not a storage defect.
- **Quota caps / move progress to IndexedDB** — not a D-44 event at 327 B/answer and a ~70 KB real blob. Fail-open is F4, not a cap project.
- **Old-shape blobs crashing boot** — they do not. Missing keys and `'2026-10-28'` migrate. Unreadable JSON is F5 (silent), not a crash.

## Uncertainties

- User's real `file://` / `:8000` blob was not opened (forbidden). Size ~70 KB is vault memory, not measured this pass. `_persistFailed` on that profile unknown.
- Real tab **close** (CDP `Target.closeTarget`) was not used; the clobber check dispatched `pagehide`, which is the registered listener. A force-kill without `pagehide` still cannot clobber a sibling that already `save()`d, because B's stale `save()` now re-reads disk.
- Simultaneous grades of the **same** formula card in two tabs: `recNewer` keeps higher `reviews` then later `lastReviewedAt` (`js/store.js:229-237`). One of two equal reviews can drop. Not live-reproduced.
- `file://` IndexedDB was not opened. Fallback is code-certain: `contentDB.open` resolves `null` on missing `indexedDB`, thrown `open()`, `onerror`, `onblocked` (`js/store.js:687-705`); `put` rejects `'no db'`; Library toasts "Import failed — IndexedDB unavailable in this browser context." (`js/view-content.js:171-172, 197-198`). `_opening` caches that failed promise for the session. Shipped `BOOK_FORMULAS` / `FORMULAS` still feed `formulaDeck()` (`js/store.js:781-791`).
- Parseable wrong-typed `attempts` does not crash `load()`; the first view that treats it as an array of objects might. `importJSON` already rejects that shape. Not a daily path.
- This isolated profile's IndexedDB was mutated (a `formula-deck` put/del, a `kind:'test'` put). Sibling auditors on **:8124 / :9334** should not treat leftover IDB rows as the user's. The Chrome user-data-dir is deleted with this pass.
- Two-tab frequency on the daily machine is still unknown. N2 no longer loses the sitting when it happens.
