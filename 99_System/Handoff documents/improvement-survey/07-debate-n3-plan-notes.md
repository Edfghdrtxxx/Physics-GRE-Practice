# Debate N3 — stale plan + empty Notes, not the shipped bank

Role: DebateN3. Nomination: remaining days are steered by a Jul–Oct 28 paper-era plan and empty teaching Notes, not by the bank that already shipped. No app-code edits. Surveys read: product, UX, engineering, content.

Exam the user is sitting: **2026-11-01** (D-54 as of 2026-09-08). The site still believes **2026-10-28**.

Inside N3 there are two sub-moves. They are not the same job:

| Sub-move | What it is | Rank inside N3 |
|---|---|---|
| **N3-A Plan-calendar rebuild** | Rewrite the Jul 13 → Oct 28 checklist, mock sequence, and single exam date so remaining days spend the shipped bank against Nov 1 | **The actual #1** |
| **N3-B Kahn Notes ingest** | Make topic-portal Notes teach from the Kahn markdown already on disk, instead of waiting for a Library drag-drop that cannot even split `####` | Next content job, not the same 1–3 day slice |

They must not be fused into one “content dump.” A rebuilt calendar without a full ingest is still a D-54 win. A full ingest without a rebuilt calendar still sends the student to sit GR8677 as “Practice Test #1” and taper on Oct 28. **Lock N3-A. Do not require N3-B in the same slice.**

---

## 1. Steelman of the other nominations

### N1 — Daily program / home as study instrument (Product + UX)

The honest case for N1 is that **even a perfect calendar is unused if every morning opens a feature buffet.**

Product finding 1: opening `#/` does not answer “what should I do today to raise the Nov 1 score?” Hero is Level/XP + a hardcoded Oct 28 countdown. Then Review queue, one untimed Question of the Day, volume/XP challenges (“Practice in 2 different topics”, “Open a topic’s notes”, “Get 5 questions right”), and “This week” as **plain text** of the first three unchecked plan labels — no launchers. Formula recall ships 334 cards with an empty daily batch; the Review row then reads “nothing picked yet / 0 remaining,” which a non-CS user can take as “caught up.” Sidebar is 14 destinations plus 9 portals; mixed practice has **zero** `#/practice` nav items (`js/app.js` `buildNav`). Plan tasks grant XP on checkbox with no session behind them (`gamify.toggleTask`).

UX finding 1: at 1440×900 the view is ~3000 px tall. QOTD starts at y≈575; topic grid at y≈1930. Five of nine topic links collide with or sit under the sticky Dark-mode footer. The countdown `countUpText`s from 0, so the one number that should be trusted is a tween. Formula finding 2: with 0 picked there is no Study button; “Pick today’s cards” sits at y=902 on a 900 px window, then a 12k-px checklist of colliding topic tags.

The steelman: **the product job at D-54 is one next action.** Hierarchy, not content, is what fails that job. Fix nav + dashboard and the student reaches practice, formulas, mistakes, and the next mock without knowing hashes. The plan can stay a ledger; home becomes the sequencer. A master’s student with little CS background will not reverse-engineer `#/practice/all`. Fifty-four mornings of XP-first chrome is 54 mornings of unowned triage. Product’s own nomination already says this beats pool labels and auto-pick because those are inputs to a loop that does not exist.

If N1 is locked, the files are `js/app.js`, `js/view-dashboard.js`, `css/style.css`, date constants, and a one-click “Study 10” on the Review row — a 1–3 day IA cut, not a rewrite.

### N2 — Persistence: last-write-wins localStorage blob (Engineering)

The honest case for N2 is that **N1 and N3 argue about how to spend 54 days of work that currently has one silent delete path.**

`PGRE.store.save()` is `localStorage.setItem(JSON.stringify(this.state))` on a single key `pgre-state-v1`. No revision, no write queue, no merge. A second tab’s save overwrites the first. `attempts` / `exams` / `sessions` are uncapped (unlike `cardReviews` 8000). Quota failure sets `_persistFailed` and a toast, then **keeps mutating RAM**; reload drops everything after the last successful write. Corrupt parse stashes a side key and **starts fresh**. Cross-tab sync is two one-off patches (timer adopts `studyLog` when idle; formula-checkin), not a store policy. A full mock submit appends 70–100 attempt rows in one `save()`.

This blob is the only copy of SRS schedules, mistake ladders, mock sittings, and streaks. The user will not open DevTools. Engineering’s ranking is coherent: boot parse is hidden by an M4 disk cache; green tests (`test-exam-engine.js`, `test-bank.js`) replace production banks with fakes and never assert quota or merge; a four-day date error is one constant; a wiped practice queue is one set. A clobbered `pgre-state-v1` is the corpus.

If N2 is locked, the files are `js/store.js` plus the unbounded writers (`js/gamify.js`, `js/exam-engine.js`), the two partial syncs (`js/timer.js`, `js/formula-checkin.js`), persist copy in `js/app.js` / `js/view-content.js`, and a new `tools/test-store-persist.js`. That is the only nomination whose failure mode is **irreversible loss of already-done work.**

---

## 2. Attack — why those are not the #1

### Against N1: louder chrome around the wrong program

N1 treats “what do I do today?” as an information-architecture problem. It is a **content-of-the-program** problem that home already projects.

Dashboard “This week” is not an empty slot waiting for a sequencer. It is the first three unchecked labels from `PGRE.currentWeek()` — on 2026-09-08 that is W09, Atomic II + Special Relativity, including “Read: selection rules, Zeeman/Stark…” and “Drill: 20 atomic + SR questions” with no launcher (`js/view-dashboard.js`; `js/data-plan.js` w09). Promoting that block above XP does not invent a daily program. It **amplifies the stale calendar**. The notes challenge already jumps to `#/topic/cm` even when the week is AT+SR. A 23-link sidebar that occludes topics is ugly; it is not what will make the student sit GR8677 on paper next week while `ets2024` (the only 70×120 official form) never appears in the five-test sequence.

Product’s own suggested N1 scope already smuggles N3-A: “Plan as launcher, not ledger” and “catch-up from today → Nov 1; drop GR8677/GR9277 as tests; schedule ETS 2024.” That is not a dashboard reorder. That is this nomination. If the chairman wants one next action, the action has to be **true**. IA cannot make it true.

Formula “cannot start” (UX finding 2 / Product finding 4) is a real stall, not this debate’s dark horse. It is also recoverable without a rewrite: a user can pick 10 cards. They cannot un-spoil a form the plan labeled “fresh test,” and they cannot recover Oct 29–Nov 1 after W16 ends on Oct 28 (`currentWeek` then returns the last week forever, `js/data-plan.js:212-219`).

Scrolling 2 kpx is friction. Following `#/plan` is **misallocation of the remaining 54 days and of the scarce intact mocks.** A physics master’s student can learn where Practice lives. They cannot reconstruct an unused 2024 sitting.

### Against N2: protecting work is not directing work; the loss event is unobserved

Engineering ranked persistence 9/10 on the **write model**, then flagged the loss event as unverified. Live headless blob: **2643 bytes, 1 attempt** — not the user’s Chrome, and nowhere near a 5 MB quota. Two-tab clobber and `QuotaExceededError` were **not reproduced**. DESIGN.md’s 1.2 MB / 10k-attempt budget is a hope, not a measurement on this user’s volume.

N2 is a hedge against a failure that might happen. N3-A is a steering error that **is already on screen every day**: countdown 50 vs 54, plan hero “July 13 → October 28,” W16 “exam Wednesday Oct 28,” Tests #1–#2 named GR8677/GR9277 while those ids are `src: 'ets-drill'` inside `PGRE.allQuestions()`. If persistence is perfect for 54 days, the student still tapers four days early, still treats two daily-pool forms as mocks, and still never has `ets2024` on the calendar.

Catastrophe ranking is also inverted for this user. A clobber of an empty or thin profile is cheap. A faithfully persisted plan that burns the wrong papers is expensive. Engineering itself put the date split-brain at finding 4 and called it “recoverable in one constant.” The constant is the shallow part. The **mock sequence and the eight already-past weeks with no catch-up** are the deep part, and they do not live in `store.save`.

N2 should be the first reliability follow-up after the calendar is honest. It is not the thing that changes tomorrow morning’s physics.

---

## 3. Defense — N3-A is the single aspect, with D-54 impact

### The bank already shipped. The operating system did not.

Live on `pgre-liveui` (surveys, 2026-09-08): default pool 366 (20 preview + 146 cpg + 200 ets-drill); intact ETS 469 across five forms; book sample exams 300; formula deck 334. Topic portals have questions. `#/exam` is live. Parser v2 already filled `content/bank/cpg-*.js`. README/DESIGN/Library copy still narrate a 20-question preview, a deferred simulator, and “formula deck empty by design.” That documentation lie is a symptom. The **steering lie** is the plan.

`js/data-plan.js` is still a Jul 13 → Oct 28 paper script:

- Canonical date `PGRE.EXAM_DATE = '2026-10-28'` (`js/data-topics.js:5`); store default the same (`js/store.js:65`); brand-sub “exam Oct 28, 2026” (`index.html:28`); dashboard label “Wed, Oct 28, 2026”. User exam **2026-11-01**. Four days missing from every countdown, SM-2 `examCap`, and the taper week.
- Header comment: “in-app timed simulator is designed but deferred.” False. `#/exam` sits the forms.
- W01t1 still says “book chapter — import pending.” The questions and formulas are imported; only Notes are not.
- Phase 2: “full released exams **(on paper, timed)**.”
- **Test #1 GR8677** (w10t5) and **Test #2 GR9277** (w11t4) are drills (`content/ets-src/*/meta.json` `drill: true`), already in the default daily pool, **not** on the exam-room list. Daily mixed practice spoils the papers the plan still schedules as fresh mocks.
- Tests #3–#5 are GR9677 / GR0177 / GR1777 (100×170). The **only current-format 70×120 official mock, `ets2024`, is not in the five-test sequence.**
- W16 is Oct 26–28, “EXAM DAY — arrive early.” Oct 29–Nov 1 do not exist. `currentWeek` after the last `end` returns W16 forever.

On Sep 8 the live plan showed **8 weeks `week-past` (W01–W08), current W09, 7 future, 0 / 93 tasks**, no catch-up, no “you are behind.” Task rows are checkboxes (`js/view-plan.js:57-62`). “Study:” links only to `#/topic/{id}` — the empty-Notes portals. Checking a box is a study day and 10–50 XP.

### Why plan-calendar (N3-A) outranks Notes ingest (N3-B)

N3-B is real and severe (content finding 2, 8/10). Live `#/topic/cm` (and SP, LM, AT): “Waiting for ‘Conquering the Physics GRE’.” Live `#/library`: “No content imported yet” plus “A proper parser … will be built,” while `content/bank/cpg-*.js` already load from `index.html`. File on disk: `20_docs/Conquering the Physics GRE (Yoni Kahn)/Conquering the Physics GRE (Yoni Kahn).md`, ~1.09 MB, 338 ATX headings, **h1=14, h2=4, h3=6, h4=314**. `PGRE.splitChapters` only splits `#{1,2}` (`js/store.js:465-484`). A drag-drop would yield ~14 coarse blobs, with “5 Quantum Mechanics and Atomic Physics” as one card. This week’s Read: tasks have no in-app chapter. The “Open a topic’s notes” challenge can be completed on the waiting card.

That is a teaching-layer hole, not the allocator of remaining days.

- The plan file header already tells the user to **use their own copy of the text** until markdown is imported. A physics master’s student has Kahn on paper or PDF. They do not have a second unused `ets2024`.
- Empty Notes waste reading time. A wrong mock sequence **spends the scarce resource the spoiler rules were written to protect.** AGENTS.md keeps intact ETS out of the daily pool; the plan then schedules the two **excepted** drills as Tests #1–#2, which is how you undo the exception.
- N3-B is a larger, copyright-sensitive job (do not dump textbook body into the SPA; heading-level mapping; KaTeX/figures unverified). Shipping a bad 14-blob ingest is worse than the current honest empty state. N3-A is a data rewrite of one file plus date constants.

**They should not be required to ship together.** Coupling argument that fails: “W09 says Read: Zeeman/Stark, so Notes must land in the same PR.” Counter: the smallest honest plan **stops pretending the portal is the book**, keeps “read Kahn on paper” as the reading task, and **does** attach drill/mock launchers to the bank that exists. That is N3-A. Full `####` ingest is N3-B, a follow-up the chairman can queue without blocking D-54 steering.

### D-54 user impact if N3-A wins vs if it loses

If N3-A wins this week:

- Countdown, plan horizon, and `examCap` agree on **54 days to 2026-11-01**.
- The eight past foundation weeks are either marked catch-up-or-skip against actual remaining hours, or collapsed so W09 is not “on schedule” at 0/93.
- Next mocks are **intact forms in the exam room**, with `ets2024` as the first (or only) current-format sit, not GR8677/GR9277 on paper.
- Remaining 100-item ETS papers are scheduled as extras, not confused with daily drills.
- Taper covers Oct 30–Nov 1 instead of going silent.
- Dashboard “This week” — even before any N1 IA pass — starts quoting work that is legal to do.

If N3-A loses to N1: home gets Practice in the nav and QOTD above the fold. The student more efficiently opens W09, checks Read: tasks against empty Notes, and in six days sits GR8677 as Test #1 after mixed practice has already served those stems. XP rises. Readiness is still computed on the 366 mixed pool. The 70×120 sitting remains unscheduled.

If N3-A loses to N2: `save()` grows a revision field. Tomorrow’s plan is still Oct 28 / paper tests / import pending. The well-persisted object is the wrong 54-day script.

This beats N1 because N1 is how the program is **presented**; N3-A is whether the program **matches the bank and the exam**. This beats N2 because a persistence bug is a risk; this calendar is the current daily instrument. This beats N3-B because reading can fall back to the physical book; mock order cannot.

---

## 4. Smallest shippable slice (if N3 wins)

**1–2 days. Plan-calendar only. Not a Notes ingest. Not a dashboard rewrite. Not a store rewrite.**

### In slice (N3-A)

- `js/data-plan.js` — rebuild `PGRE.PLAN` from **today (2026-09-08) → 2026-11-01**. Collapse or retitle W01–W08 as catch-up optional, not “past and still the foundation you haven’t checked.” Current week must not assume the Jul 13 start happened. Drop GR8677 / GR9277 as “PRACTICE TEST #1/#2.” Insert `ets2024` as the current-format sit. Use remaining intact 100-item forms (GR1777, GR0877, GR0177, GR9677) as later extras, spaced so a miss week does not force two full sittings. Delete “import pending,” “on paper,” “simulator deferred.” W16 (or a short W17) must include Oct 29–Nov 1. Do not put copyrighted stems in task labels — ids and form names only.
- Single exam-date source, default **2026-11-01**: `js/data-topics.js` (`PGRE.EXAM_DATE`), `js/store.js` (`settings.examDate`), `index.html` brand-sub, `js/view-dashboard.js` countdown label (stop hardcoding “Wed, Oct 28, 2026”), `js/view-plan.js` hero copy (“July 13 → October 28…”). `js/gamify.js` `daysToExam()` should read that one source so formula `examCap` and the hero cannot diverge.
- `js/view-plan.js` — minimal launcher, not an IA project: task rows that name a drill or a mock get `href`s to `#/practice/...` (topic-filtered, not “all 366”) and `#/exam` replay ids. Reading tasks stay “Kahn, paper/PDF” until N3-B. XP-on-check can remain for this slice; stripping task XP is N1/gamify, not required to make the calendar true.

### Explicitly out of this slice

- **N3-B Notes ingest:** `js/store.js` `splitChapters`, `js/view-topic.js` empty-state, `js/view-content.js` Library copy, generated `content/bank/cpg-notes.js`. That is a 2–3 day content job with copyright and heading-level risk. Queue it; do not block N3-A on it.
- N1 dashboard density, sidebar reorder, formula “Study 10,” countdown tween, mobile wrap-nav.
- N2 revision/merge/quota.
- Pool relabel (`ets-drill` vs “preview”), weighted-draw “1135” copy, new GRE-voice items, ST/AT formula cards, visualizers.
- README / DESIGN frame leftovers: fix the date and “deferred mock” lines only if they are one-line lies next to the plan; do not take on DESIGN.md §4b as this slice.

Acceptance for the implement team: live `#/plan` hero ends on **November 1, 2026**; countdown 54 (on 2026-09-08); no task labels GR8677/GR9277 as tests; `ets2024` appears as a named sit; W16/W17 covers Nov 1; `#/topic/*/notes` may still be empty.

---

## 5. What would change my mind

- **Exam date is actually Oct 28.** Engineering already flagged this as medium. If ETS registration is Oct 28, N3-A’s four-day gap collapses. The mock-sequence error (drills as Tests #1–#2, `ets2024` absent) **does not collapse.** I would still want N3-A, but the date-constant part would drop to a docs fix and N1’s “home as instrument” would look relatively stronger.
- **The user’s real Chrome already ignores `#/plan` and “This week,”** and they already have a paper calendar that schedules `ets2024` and keeps drills out of “mock” slots. Then N3-A is unused operating-system code, and N1 (or formula start) is the daily failure. Liveui had 0/93; that is not their profile.
- **IndexedDB already contains a mapped Kahn import** in the daily browser. Then N3-B’s empty-Notes claim is a liveui artifact, and I would drop the “and empty Notes” half of the slogan — still not a reason to fuse ingest into the first slice.
- **A real two-tab clobber or persist-failed toast has already dropped mocks or SRS** on the daily profile. Then N2’s loss event is no longer hypothetical, and it outranks a calendar rewrite because there is no point scheduling `ets2024` if sittings vanish.
- **Chairman wants one next action on `#/` in the same 1–3 days.** I would concede a **thin** N1 add-on: one dashboard CTA that launches the first N3-A task (not a 23-link rethink). I would not concede that IA without N3-A is the single aspect.

I would **not** change my mind because Notes are empty. That is N3-B. I would not change my mind because the formula picker is 12k px. That is N4 / UX finding 2. I would not change my mind because tests are green against fabricated banks. That is engineering finding 3, a detection gap.

---

## 6. Explicit uncertainties

- **Which calendar is ground truth.** User-stated exam is 2026-11-01; in-app and README are 2026-10-28. Not checked against an ETS registration or admission ticket. High that the two in-app clocks can diverge (`PGRE.EXAM_DATE` vs `settings.examDate`). Medium that Nov 1 is the sitting.
- **User’s real Chrome / IndexedDB / `pgre-state-v1`.** All four surveys used `pgre-liveui` (nearly empty: 0/93 tasks, 334 formulas unlearned, 2643 byte blob). Unverified: already-sat mocks, already-imported Kahn, already-edited formula date, persist-failed history, two-tab use.
- **Whether the user follows `#/plan` at all.** If the plan is a relic they never open, N3-A’s daily impact falls and N1’s “home is the instrument” rises. Dashboard still quotes the plan’s labels as “This week,” so the relic leaks into `#/` even then.
- **How much mixed practice has already spoiled GR8677/GR9277** on the real profile. If those drills are untouched, sitting them as “Test #1” is merely the wrong format (100×170 paper vs 70×120), not a spoiler. If they have been in the default 366, it is both.
- **N3-B markdown quality.** Heading-level counts are high-confidence. Math, figures, and whether a `####` split would produce usable Notes cards were not read (copyright; body not dumped). User’s personal import unverified.
- **Item-level physics / GRE-craft** of the 366 daily pool: out of lane; not used as evidence here.
- **N2 quota trajectory** over 54 days at this user’s actual volume: not measured. I do not assert they will not hit 5 MB. I assert it was not observed.
- Did not re-open live UI this pass; counts and copy are from the four surveys plus source reads of `js/data-plan.js`, `js/view-plan.js`, `js/store.js` (`splitChapters`), `js/view-topic.js`, `js/view-content.js`, `js/data-topics.js`, `index.html`. If a sibling’s live tab has since checked plan tasks, the 0/93 figure is stale; the task **text** is not.

---

**Ask of the chairman:** lock **N3-A (plan-calendar rebuild + single Nov 1 date + mock sequence that matches `#/exam`)**. Do not bundle N3-B. Do not accept N1 as a substitute that “includes the plan” unless the implement ticket names `js/data-plan.js` as the first file.
