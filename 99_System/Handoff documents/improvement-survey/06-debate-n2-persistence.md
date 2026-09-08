# Debate memo — N2 Persistence (last-write-wins localStorage)

Role: DebateN2. Nomination: durable progress is a single last-write-wins `localStorage` JSON blob (`pgre-state-v1`). No app-code edits. Chairman locks one target after this wave.

Live origin re-checked: `pgre-liveui` at `http://127.0.0.1:51651/` (did not bind :8000). Blob at first paint this pass: **2642 bytes**, `attempts: 1` (`gr9277-93`), `exams: 0`, `cards: 0`, `_persistFailed: false`, `_recoveredFromCorruption: false`. Matches SurveyEng’s ~2643-byte empty-ish headless profile, **not** the user’s daily Chrome.

---

## 1. Steelman of the other nominations

### N1 — Daily program / home as study instrument (Product + UX)

The site is supposed to be the D-54 instrument. Opening it does not answer “what do I do today to raise the Nov 1 score?”

Product finding 1 and UX finding 1 agree on the same surface: `#/` leads with Level/XP and a countdown that counts *up* from 0 and is aimed at Wed Oct 28, not Nov 1. Mixed practice is not a nav item. Question of the day starts below the first screen. Knowledge portals sit ~1900 px down; five topic links collide with the sticky Dark-mode footer. Formula recall reports “nothing picked yet / 0 remaining” while 334 cards are unlearned. The study plan is a checkbox ledger that does not launch practice, mocks, or formula work. Sidebar is 14 destinations plus 9 portals.

This is not a taste complaint. A physics master’s student with little CS background has 54 mornings. Every morning the instrument spends the first screen on XP, challenges, and a sitemap. Getting to mixed practice requires knowing a hash or scrolling past widgets. That failure is **certain, every session**, on the live UI. Fixing pool labels, auto-picking 10 formulas, or moving the date still leaves twenty doors. The product job — one next action that spends due reviews, unlearned formulas, and scarce ETS mocks against a 70×120 clock — is unowned.

If the chairman is optimizing for *daily time-on-task starting tomorrow morning*, N1 is the obvious lock.

### N3 — Stale plan + empty Notes vs shipped bank (Content)

The bank already shipped. Default pool 366, intact ETS 469, book samples 300, formula deck 334. What will waste the remaining weeks is the operating system around that bank.

`#/plan` still runs July 13 → October 28. Live hero: “five released practice tests”; current week Atomic II + SR; 0/93 tasks; W16 tapers for Wednesday Oct 28 and then sticks forever. Tests #1/#2 are GR8677 and GR9277 **on paper**, but those forms are already `src: 'ets-drill'` in the daily pool. The only current-format verbatim mock (`ets2024`, 70×120) is not in the sequence. File header still says the simulator is deferred. Topic portals still wait for a Library drag-drop of Kahn, while a 1.09 MB markdown file already sits on disk and `splitChapters` would collapse it on `#`/`##` anyway (314 of 338 headings are `####`). This week’s plan tasks are “Read: selection rules…” with no in-app chapter to open.

If the student *trusts* the plan, they spend W10–W11 on spoiled drills, never schedule the 2024 sitting, taper four days early, and treat empty Notes as a completed “open a topic’s notes” challenge. Bank size is not the bottleneck; **what to do with the next 54 days** is. That is a content-pedagogy lock, not an engineering one.

### N4 (not my nomination)

Formula recall cannot start without a 12k-px picker. Real, and it feeds N1. It is a room, not the instrument. I am not running it as a dark horse.

---

## 2. Attack — why N1 and N3 are not the #1

N1 and N3 are **high-frequency, recoverable**. N2 is **low-frequency, unrecoverable**. At D-54 the ranking question is not “what is ugly every morning” but “what can delete the only copy of the work those mornings produce.”

**Against N1.** A messy home wastes attention. It does not delete SM-2 intervals, mistake ladders, or a submitted mock. The student can still type `#/practice/all` or `#/exam`. XP chrome is loud, not load-bearing. N1’s own suggested cutover (`view-dashboard.js`, `buildNav`, exam-date constants) **does not touch `store.save()`**. Whatever sequencer N1 ships — `formulaDay`, agenda flags, “next unused ETS mock” — will be written into the same last-write-wins blob. Shipping N1 first means the new daily program is stored in a structure this pass already watched clobber itself. Friction every morning is bad; friction plus a silent reset in week 6 is how a non-CS user quits the instrument.

**Against N3.** A stale plan can be ignored. `#/exam` already lists ets2024. Empty Notes are a teaching hole, not a wipe of graded cards. The liveui profile had 0/93 tasks checked — even this empty profile is not *following* the Jul–Oct script. N3’s worst case is four days of calendar error plus two spoiled “paper tests” the student may already have seen in mixed practice. Recoverable with one date constant and a rewritten `data-plan.js`. N3 also persists plan check-offs and `settings.examDate` through `PGRE.store.save()`. Same blob.

**Shared failure of both.** They assume accumulated state is safe. SurveyEng finding 5 already notes that hash remounts drop an in-flight practice *queue*; answers that did land are in `state.attempts`. That is only true until another tab’s `save()` writes an older heap over them.

N1/N3 are the right *product* conversation. They are not the right *first implement* conversation while the only durable copy has no revision, no merge, and a close-tab path that overwrites.

---

## 3. Defense of N2, with D-54 user impact

### What is actually true (write model)

`PGRE.store.save()` is `localStorage.setItem(this.KEY, JSON.stringify(this.state))` (`js/store.js`). One key: `pgre-state-v1`. No revision, no write queue, no merge. Every writer — `gamify.recordAnswer`, exam persist every 4 s, formula grade, theme toggle, sidebar fold, study-time heartbeat — serializes the **entire in-memory heap**.

Capped: `cardReviews` 8000, `focusSessions` 300, `log` 60. **Uncapped:** `attempts`, `exams`, `sessions`, plus user text in `notes` / `cardNotes`. DESIGN.md §4b budgets ~120 B × 10,000 attempts ≈ 1.2 MB inside a ~5 MB quota and calls that “comfortably inside.” That is a hope, not an enforced cap.

On unreadable JSON, `load()` stashes a side key and **starts fresh**. On `setItem` throw, `_persistFailed` sticks a toast and **in-memory mutation continues**; reload drops everything after the last successful write.

Cross-tab sync exists only as two field patches: `js/timer.js` adopts `studyLog` when the timer is idle; `js/formula-checkin.js` `syncFromStorage()` copies `formulaCheckIn` so a second tab does not re-award the daily bonus. Those patches are a confession: the authors already knew two heaps share one key. They did not generalize.

Book markdown lives in IndexedDB (`pgre-content`). Progress does not. Export/restore on `#/library` is the recovery hatch (`view-content.js`); copy still describes XP/achievements/plan, not SRS/exams. A non-CS user will not open DevTools.

### Quota: not a D-54 loss event (do not use it)

Live blob **2642 bytes**. I did **not** reproduce `QuotaExceededError`. `_persistFailed` stayed false.

54-day projection if the student actually uses the site (order-of-magnitude, not measured on the user profile):

- ~50 attempts/day × 54 × ~200 B ≈ 0.5 MB
- 334 formula card states ≈ 0.1 MB
- ~8 mock sittings (order + answers) ≈ 0.05 MB
- `cardReviews` at 10/day ≈ 0.05 MB

Even DESIGN’s 10,000-attempt ceiling is ~1.2 MB. User-typed `notes`/`cardNotes` are the only wild card, and they would have to be enormous to approach Safari’s ~5 MB or Chrome’s typical ~10 MB. **I downgrade the quota half of SurveyEng finding 1.** It is a real code smell (uncapped arrays, corrupt-stash can itself fail when full). It is not why this should ship in the next 1–3 days.

### Two-tab clobber: SurveyEng did not reproduce; this pass did

SurveyEng: “Did not reproduce quota failure or two-tab clobber in a second real Chrome profile.” That statement is still true of *their* method.

This pass, same origin, two headless tabs:

**Mechanical LWW.** Tab A wrote `_n2marker = A-only-…` and `xp += 7`, then `save()`. Tab B, still holding the pre-A heap, pushed a probe attempt and `save()`. Disk then had B’s marker, original xp 62, and **no** A marker. Last writer won. A’s XP bump was gone.

**Close-tab / `pagehide` — the D-54-shaped one.** After cleanup, both tabs reloaded to the 2642-byte baseline (`attempts: [gr9277-93]`). Dashboard tab received a click so `study-time` had a `lastBeat`. Study tab called `PGRE.gamify.recordAnswer` on the first bank item (`q01`). Disk went to 2 attempts, 3054 bytes. **Closing the dashboard tab** (`pagehide` → `studyTime.beat(); flush();` → `store.save()` of the stale heap) dropped disk back to **1 attempt**, 2677 bytes, last id `gr9277-93`. Study tab RAM still had `q01`. Disk did not.

That is the loss event. `js/study-time.js` registers `pagehide` → `beat(); flush()`. `flush()` writes the **whole** blob if `dirty`. Closing the *idle* window is enough. A 30 s heartbeat after a click on the stale tab is enough while both stay open (`SAVE_MS = 30000`). Exam room persists every 4 s (`view-exam.js`); a dashboard click 30 s later can still overwrite that sitting.

Nuance, not a rescue: reloading the study tab in this run restored `q01` because *that* tab’s own `pagehide` on navigation flushed the good heap back. Permanent loss is the order that actually happens in a browser:

1. Close the good tab first, then the stale one — stale `pagehide` wins.
2. Stale tab `save()`s while the good tab is still open; user then reloads the good tab (or opens a third window) — loads the stale disk.
3. Stale `save()`, then the good tab is killed without `pagehide` (force-quit, crash).

Same-tab hash navigation does **not** clobber (one heap). The bug is two documents of this origin.

### Is two tabs D-54-plausible?

Not certain. Default sidebar clicks stay in one tab. The user is not a CS person and may never Cmd-click. **If they are strictly single-tab, N2 does not fire in 54 days** and I would yield to N1.

Plausible extra-tab paths, none of which I watched this user do:

- Duplicate tab / session restore after a Chrome crash (two `#/` documents).
- Cmd-click Formula recall or Library while a practice set or mock is live (look-up-a-formula during a sitting is a thing humans do).
- Dashboard left open, practice started in a new window because the mock is `exam-fullscreen`.
- This wave’s own surveyors already shared the origin (Product: a concurrent surveyor left one CM miss). The site invites multiple documents the moment two people or two windows exist.

I am not claiming the user’s real profile has already lost data. I am claiming the write model **will** discard a session if a second document saves later, and I watched it do that on the live origin.

### D-54 user impact (the part that is not quota)

This blob is the only copy of:

- formula SM-2 (`state.cards`) — 334 cards, default 10/day, most of the remaining calendar if they start now
- mistake book ladders (1→3→7→14→30→60)
- mock sittings (`state.exams`), including an in-progress 70×120 that persists by design
- streaks, XP, plan check-offs, attempt history

A clobber in week 6 does not look like an error. The UI still paints. Formula home says “nothing picked yet” or a due queue that forgot last month’s Easy grades. The student has little CS background. They will not think “Application → Local Storage → `pgre-state-v1`.” They will think the site is flaky and go back to paper.

N1 wastes a morning. N3 mis-schedules a week. N2 can zero the only SRS transcript those mornings were for. At D-54 there is no time to rebuild a deck from memory.

That is why N2 is the implement lock even though N1 is the louder daily wound: **the instrument’s value is the accumulated schedule, and the store can throw it away without a stack trace.**

Verdict for the chairman: **lock N2**, scoped to cross-tab last-write-wins and fail-visible persist — **not** quota caps, **not** an IndexedDB rewrite of progress.

---

## 4. Smallest shippable slice if N2 wins

1–3 days. Files, not patches. Not a rewrite. Not “move everything to IndexedDB.” Not attempt-capping (quota was not shown).

**In:**

- `js/store.js` — monotonic `rev` (or `savedAt`) on each successful write. `window` `storage` listener on `KEY`: if the incoming blob’s rev is newer and this tab is not dirty, `load()` the remote heap; if this tab *is* dirty, do not silent-save — set a session flag. Optional `navigator.locks` (or a short-lived `pgre-writer` key) so two documents cannot `setItem` overlapping heaps. `save()` already toasts on throw; keep that, and **stop treating a failed persist as a license to keep mutating without blocking grade/submit**. Drop extra `-corrupt-*` keys when `setItem` already failed.
- `js/app.js` — `persistWarning` copy plus a boot banner if `_recoveredFromCorruption` or “another window saved; reload this tab or you will overwrite.”
- `js/timer.js`, `js/formula-checkin.js` — delete the two one-off field merges once store-level adopt exists (one policy, not three).
- `js/view-content.js` — Export button remains the hatch; warn when `_persistFailed` or recovered-from-corrupt. Do not expand the Library into a sync product.
- new `tools/test-store-persist.js` — sequential two-heap `save()` (last writer must be detectable), corrupt round-trip leaves a stash and does not throw at boot, `storage` adopt when idle. Do not fold this into fabricated bank tests.

**Out of this slice:** capping `attempts`/`exams`/`sessions`; spilling logs to IndexedDB; Safari/`file://` IDB split; service worker; cache-bust `?v=` (SurveyEng finding 2); practice-queue remount (finding 5).

Done looks like: two tabs, grade in B, close or click A, reload B, B’s grade still there — or a blocking toast instead of a silent disk rewrite.

---

## 5. What would change my mind

- Evidence the user is single-tab-only for this origin (one window, no duplicate, no session restore). Then N2 is latent and **N1 should win**.
- A live repro that `pagehide`/`storage` already cannot clobber because of some path I missed (I would then drop the close-tab claim and keep only mechanical LWW, which is weaker).
- The user’s real Chrome blob already near quota *or* `_persistFailed` already true. Then I would *raise* quota into the slice, not drop N2.
- Chairman prefers “value of the next 54 mornings” over “protect accumulated state.” That is a coherent product call. It is N1. I would still ask that N1 not add new persisted fields until `save()` has a rev.
- Proof that Library export is already a daily habit. Then clobber is recoverable and N1/N3 outrank.

---

## 6. Explicit uncertainties

- **User’s real Chrome `pgre-state-v1`:** unread. Size, attempt count, whether persist has already failed, whether two windows are in the session restore — all unknown. Liveui is a nearly empty headless profile.
- **QuotaExceededError:** not reproduced. 54-day projection is arithmetic on DESIGN’s ~120 B/attempt, not a measured growth curve with this user’s notes.
- **Two-tab frequency:** clobber was reproduced here with `evaluate` + `gamify.recordAnswer` + `tab.close()`, not with a human clicking Practice and closing a dashboard. The `pagehide` → `flush()` → `save()` path is the same code a real close uses. I did not watch this user open two tabs.
- **`storage` event in Safari / `file://`:** not exercised. User workflow is `python3 -m http.server` on a Mac, so `http://127.0.0.1` is the intended origin; Safari vs Chrome lock behavior unverified.
- **Corrupt-parse wipe:** not reproduced. `JSON.parse` failure → defaults is code-certain; how often Chrome writes a torn `localStorage` value is unknown (setItem is usually atomic).
- **This pass mutated liveui storage** (temporary markers, a `q01` `recordAnswer`, dashboard close). Later inspectors should not treat post-debate attempt counts as the SurveyEng baseline.
- **Exam date ground truth:** brief says 2026-11-01; app says 2026-10-28. Irrelevant to LWW; relevant if the chairman uses “D-54 vs D-50” in the lock.
- I did not sit a full mock across two tabs, did not test `navigator.locks` availability in the user’s Chrome, and did not open the Library export UI this pass (read `view-content.js` only).

**Bottom line.** SurveyEng’s 9/10 bundled quota + LWW. Quota is not D-54-plausible at 2642 bytes. LWW is. I reproduced it on the live origin. I am not bluffing a 5 MB cliff. I am nominating the write model that already threw away a `save()` I had just performed.
