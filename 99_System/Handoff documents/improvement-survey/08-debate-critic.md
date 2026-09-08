# Debate critic

Role: DebateCritic (grok-4.6). No nomination owned. Job: stop a rubber-stamp of the fattest survey finding.

Question the chairman must answer before locking: **what is the user actually blocked from doing at 08:00 tomorrow?** Not “what would a perfect prep studio look like in six weeks.” Exam is 2026-11-01 (D-54 as of 2026-09-08). User is a physics master’s student with little CS background. The site is the daily instrument.

Did not edit application code. Re-read all four surveys. Re-checked `js/data-topics.js`, `js/store.js` `save()`, `js/view-dashboard.js` first-screen order, `js/view-formulas.js` empty-batch branch, `js/app.js` `buildNav`, `js/data-plan.js` header/tests, and that `pgre-liveui` still serves `http://127.0.0.1:51651/`. Did not sit a mock, did not reproduce two-tab clobber, did not open the user’s real Chrome profile.

---

## Ranked lock (chairman copy)

**Recommended lock sentence:**

> Lock N1-narrow only: one exam date `2026-11-01` and a dashboard Today agenda that can start mixed practice and a 10-card formula batch without a 334-row picker. Do not rebuild `localStorage`, do not ingest Kahn, do not rewrite the 93-task plan, do not redesign the 23-link sidebar.

| Rank | Nomination | Verdict |
| ---: | --- | --- |
| 1 | **N1 Daily program / home as study instrument** — **narrow slice only** | Real job of the site. The surveys over-ask. Lock the date + today’s next action, not a sequencer rewrite. |
| 2 | **N4 Formula recall cannot start** (UX F2 / Product F4) | The only true *capability* block tomorrow morning. Absorb it as the formula row of the Today agenda, not as a separate lock. |
| 3 | **N3 Stale plan + empty Notes vs shipped bank** | Date/mock-sequence half is already inside N1-narrow. Kahn ingest is a different, slower product. Do not glue them. |
| 4 | **N2 Persistence: last-write-wins localStorage blob** | Architecture is last-write-wins. Loss event is **unreproduced**. Live blob was 2.6 KB. Not tomorrow’s block. |

If the chairman refuses “daily program” as too vague, copy this fallback instead:

> Lock N4: one-click “Study 10” that fills today’s formula batch and starts Study, and stop the dashboard Review row from reading “nothing picked yet” as caught-up. Still move `PGRE.EXAM_DATE` to 2026-11-01 in the same pass.

---

## 1. Steelman of the nominations

### N1 — Daily program / home as study instrument

A D-54 candidate opens `#/` to be told what to do with the remaining days. What they get is Level/XP, a countdown that count-ups from 0 and is hard-coded to Wed Oct 28, five zeroed stat tiles, a Review queue that reports formulas as “nothing picked yet,” QOTD, volume/XP challenges, and a “This week” list of plan labels with no launchers (`js/view-dashboard.js` ~389–459). Mixed practice is not in `buildNav` (`js/app.js` 563–585). The study plan is a Jul 13 → Oct 28 checkbox ledger that grants XP without starting physics (`js/view-plan.js`, `gamify.toggleTask`). Formula work is opt-in. Mock sittings are a fourteenth nav item.

For a non-CS master’s student this is decision tax on every open. Product finding 1 (severity 9) and UX finding 1 (severity 9) are pointing at the same failure: the home is a feature buffet with a “today” skin. If the instrument does not convert remaining days + due reviews + unused mocks + unlearned formulas into one next action, every other fix is an input to a loop that still does not exist. That is a coherent product claim.

### N2 — Persistence last-write-wins

`PGRE.store.save` is `localStorage.setItem(this.KEY, JSON.stringify(this.state))` with no revision and no merge (`js/store.js` 203–216). One key, `pgre-state-v1`, holds attempts, exams, sessions, cards, mistakes, studyLog, timer, formula batch, XP. `attempts` / `exams` / `sessions` are uncapped. Quota failure sets `_persistFailed` and a toast, then **keeps mutating RAM**; reload drops everything after the last successful write. Unreadable JSON is stashed to a side key and the app **starts fresh**. Cross-tab sync is two partial patches (timer `studyLog`, formula check-in), not a store policy.

This is the only copy of 54 days of SRS, mocks, and streaks. A second tab, or a full mock submit that appends 70 attempt rows into a full quota, can silently discard a session. The user will not open DevTools. SurveyEng is right that a clobbered `pgre-state-v1` is not recoverable the way a four-day date error is. If that loss happens, N1/N3/N4 work was for nothing.

### N3 — Stale plan + empty Notes vs shipped bank

The operating calendar still aims at Wednesday 28 October 2026 (`PGRE.EXAM_DATE` in `js/data-topics.js:5`; store default `examDate`; dashboard label; sidebar brand). The plan header still says the simulator is deferred and Tests #1–#2 are GR8677 / GR9277 “full, timed, on paper” (`js/data-plan.js` 1–7, 127, 137) — those two forms are already `ets-drill` in the default 366-pool. The only current-format verbatim mock (`ets2024`, 70×120) is unscheduled. W16 tapers Oct 26–28; Nov 1 is a four-day hole. Live `#/plan` on Sep 8: 8 weeks past, current week Atomic II + SR, 0/93 tasks.

At the same time every topic portal Notes card waits for a Library drag-drop (`js/view-topic.js` 113–115) while a 1.09 MB Kahn markdown file already sits on disk, and `splitChapters` only sees `#` / `##` so even an import would collapse 314 `####` subtopics into ~14 blobs. This week’s plan tasks are “Read: selection rules…” with no in-app chapter. Content’s claim: the bank already shipped; what wastes D-54 is following the wrong calendar and empty teaching surfaces.

### N4 — Formula recall cannot start (dark horse)

This is the only nomination that is a **button that does not exist**. With 334 cards and `formulaDay` empty, `#study-btn` is not rendered; the primary chrome is a “Nothing picked yet” heading plus “Pick today’s cards” (`js/view-formulas.js` 652–662). DESIGN §4b and `srs.js` 370–373 are explicit: nothing is auto-selected. UX measured the picker at ~12388 px of colliding topic tags, pick button below the 900 px fold. Dashboard Review then writes “nothing picked yet” (`js/view-dashboard.js` 630–635), which a tired user will read as “you’re done.” Default target 10/day × 334 unseen = 34 days of *new cards only* before reviews, against 54 days to Nov 1.

Conway/Kahn both require a memorized undergraduate equation core. Practice can start; formula study cannot, until the user hand-composes a batch. That is a tomorrow-morning stall on one of the two daily levers, not a taste complaint about sidebar density.

---

## 2. Attack — why none of these, as surveyed, is the #1 lock

### Double-counting: three surveys, one sentence

Product F1, UX F1, and Content F1 are the same claim in three costumes:

- Product: “no D-54 daily program — only a feature buffet with a today skin.”
- UX: “daily home and sidebar bury the work that D-54 is for.”
- Content: “remaining-weeks plan still runs a July–Oct 28 paper-era script.”

Product F2 (stale split-brained calendar) **is** Content F1. Engineering F4 (exam-date split-brain) is the same date bug again. Product F4 **is** UX F2 (formula cannot start). Content F2 (empty Notes) is then glued onto the calendar finding so N3 looks like two independent disasters.

If the chairman “picks the worst aspect from each survey,” they will lock the same home/plan/date problem three times and call it consensus. It is one problem, restated. Consensus without a **narrow slice** is how this becomes a rewrite.

### N1 as nominated is a rewrite wearing a product hat

SurveyProduct’s “if chosen” list is: a new Today sequencer, single exam date, plan-as-launcher with catch-up from today → Nov 1, drop GR8677/GR9277 as tests, schedule ETS 2024, delete “import pending,” XP only after a session exists, and “do not add a 15th nav item.” SurveyUX’s list on the same nomination adds: rebuild `buildNav`, restyle `#sidebar-footer`, two-tier mobile nav, kill countdown `countUpText`, and a dashboard “Study 10.”

That is four weeks of product, not 1–3 days. It smuggles N3’s plan rebuild and N4’s picker into N1 so that “daily program” can never lose.

**Tomorrow morning they are not blocked from doing physics questions.** `#/practice/all` exists, 366 items, instant feedback, 5/10/20/All. `#/exam` can start a 70-question sitting. Topic portals launch practice. UX finding 4 itself says practice and exam answering are “solid cores.” The failure is *decision*, not *capability* — except for formulas (N4).

A master’s student who already knows “do 20 mixed + 10 formulas” can work today. N1-full treats that student as helpless and proposes to own their entire remaining calendar. That is not the smallest thing that unblocks 08:00.

### N2: unreproduced engineering risk, dressed as D-54 catastrophe

SurveyEng states, in its own method and uncertainties:

- Two-tab last-write-wins was **not** reproduced.
- `QuotaExceededError` was **not** reproduced.
- Live headless origin: `lsBytes: 2643`, `attempts: 1`.
- Confidence the user hits 5 MB before 2026-11-01: **medium**, inferred from schema + DESIGN’s 10,000 × 120 B hope, not measured on the real blob.
- User’s real Chrome `pgre-state-v1` size: **not inspected**.

DESIGN’s 1.2 MB-in-5 MB story is a 10k-attempt projection. This user has 54 days. Even a heavy 100 attempts/day is ~5.4k rows, still inside the hope — and that hope was never measured. Export/restore already exists (`store.exportJSON` / `importJSON`). Quota failure already toasts.

A single student on a Mac running `python3 -m http.server` is not a multiplayer sync problem. Two-tab clobber is a real footgun if they leave a mock sitting in one window and grade formulas in another. It is not what stops them at 08:00. Locking N2 spends the implement window on revision clocks and merge policy while the hero still says Oct 28 and formula Study still has no button.

**Do not promote an unreproduced loss event over a reproduced empty morning.**

### N3 glues a one-line date bug to a content pipeline

Two problems, different sizes:

1. **Stale plan / wrong date / GR8677-as-Test-#1.** True, high-confidence, small. Already inside N1-narrow (date) and a later plan pass. Harm **if they follow `#/plan`**. Liveui profile had **0/93 tasks** checked. SurveyContent’s own uncertainty: “Medium on how much the user already ignores the in-app plan and uses paper.” The plan header already tells them to use their own copy of Kahn until import (`js/data-plan.js` 4–5).

2. **Empty Notes / Kahn ingest.** Live portals wait for Library drag-drop. The 1.09 MB file is on disk. `splitChapters` is `#`/`##` only. Doing this “right” means a pre-split `content/bank/cpg-notes.js` (or a `####` splitter plus mapping), Library copy, empty-state, and some decision about 314 h4 blobs vs GRE-useful cards. That is a parser + pedagogy project. It is not 1–3 days, and it is not what they need to start a 20-question set tomorrow.

The user can read the physical book. They cannot get the site to tell them the exam is Nov 1. Gluing “empty Notes” onto “stale plan” inflates N3 so it can compete with N1. **Reject Kahn ingest as part of this lock.** Relabeling portals (“preview” vs `ets-drill`) and the 1135-vs-666 weighted-draw lie are real and cheap, and they are still not the #1.

### N4 is real, and it is a row, not a product

Formula Study literally will not start. That is the strongest *capability* attack in the packet. It still fails as the SINGLE aspect:

- It is already Product F4 and a named subset of N1. Locking N4 alone leaves the home selling XP and the countdown four days wrong.
- User-curated batch is **intentional DESIGN §4b**, not a regression. The bug is shipping that design as the default for a 334-card unseen deck with a 12k-px picker.
- Practice, mocks, and mistake book still start. N4 blocks one lever.
- “Give me 10” is a one-day slice. Promoting it to *the* lock is how the date and the home stay wrong.

If N1 is locked **narrow**, N4 is the formula line of the Today agenda (one-click fill `formulaDay` to target and `startStudy`). If N1 is rejected as vague, N4 is the fallback lock — still with the date constant in the same pass, because that constant is one line and already wrong.

### What they are *not* blocked on tomorrow

Do not let these ride along:

- 80 achievements, XP, readiness gauge (Product F5, severity 6) — they amplify a missing program; they are not the program.
- Mobile 23-chip wrap (UX F3) — workflow is a Mac `http.server`; unproven daily phone use.
- Visualizer controls below the fold (UX F5) — optional lab.
- Parser-blocking 1.85 MB boot (Eng F2) — warm cache 67 ms on this machine; cold parse untimed.
- Fabricated tests (Eng F3) — detection gap, not a morning block.
- Hash-router wiping practice (Eng F5) — friction on short drills.
- Formula topic skew AT/SP (Content F4) — structural to numbered Kahn equations; not a start-the-deck bug.
- Writing new GRE-voice items — out of every survey’s 1–3 day window.

---

## 3. Defense of the narrow lock (D-54 impact)

The user is blocked on **starting a directed session without thinking like a product manager**. They are not blocked on having questions. They are not (on evidence) blocked on a full disk. They are not blocked on reading Kahn on paper.

Tomorrow 08:00, a correct lock changes three observables:

1. **The number on the home is 54, labeled Sunday Nov 1, 2026** — not a count-up to 50 / Wed Oct 28. Same constant drives brand, plan header, and formula `examCap`. Four stolen days of interval cap and a taper that ends before the real exam are not a documentation nit.
2. **The first useful card is today’s work, with buttons that start it** — mixed practice (existing `#/practice/all`), formula Study 10 (must *create* the batch, not link to the picker), mistake drill if due. XP tiles, challenges, and QOTD may stay below. “This week” text without a launcher does not count.
3. **Formula Review no longer reads as caught-up** — “334 not yet introduced — Study 10 →” or equivalent. Empty `formulaDay` is a bug in the default, not a virtue.

That is the product job at D-54: spend the morning on physics, not on choosing among 20 doors or scrolling 12k px of “Energy / Kinematics” rows.

What this lock deliberately **does not** claim to fix: catch-up of eight past plan weeks, scheduling every remaining ETS form, IndexedDB Kahn, store merge, sidebar IA, pool species, visualizers. Those can be later aspects. Shipping them as this aspect is how D-54 becomes D-40 with a prettier backlog.

---

## 4. Smallest shippable slice (if this critic wins)

1–3 days. Files, not patches. No persistence rewrite. No Kahn ingest. No 93-task rebuild.

**Date (hours, not days):**

- `js/data-topics.js` — `PGRE.EXAM_DATE = '2026-11-01'`
- `js/store.js` — `settings.examDate` default the same string
- `index.html` — brand-sub
- `js/view-dashboard.js` — countdown label from that date; **do not** `countUpText` the day count
- `js/gamify.js` — `daysToExam()` must read the same source as the formula page (today it does not)
- `js/data-plan.js` / `js/view-plan.js` — header + W16 end date only (Jul 13 → Nov 1; taper through Nov 1). **Do not** rewrite task bodies in this slice.

**Today agenda (the actual product):**

- `js/view-dashboard.js` — one ordered card **above** XP tiles: (1) Formula Study 10 if unseen/unpicked, (2) start mixed practice, (3) next unused intact ETS mock as a pointer, (4) mistake due if any. Challenges/QOTD stay, below.
- `js/srs.js` + `js/view-formulas.js` — a single “fill to `formulaDailyTarget` and study” path so the dashboard button does not dump the user into `renderPicker`. Empty batch must not render as “caught up.”
- `js/app.js` — optional: one `Practice` nav item to `#/practice/all`. Not a 23-link redesign.

**Out of this slice:** `js/store.js` save/merge/quota, `js/view-content.js` / `splitChapters` / any `cpg-notes.js`, full `data-plan.js` task rewrite, `css/style.css` sidebar, `js/view-exam.js` 1135-vs-666 copy, `js/view-topic.js` preview-vs-drill labels (cheap, still not this lock), new tests beyond a throwaway click-through.

Acceptance the implement team can demo: cold open `#/` on a empty profile → date is Nov 1 / 54 days, one primary button starts either 10 formulas or a mixed set without visiting the picker or typing a hash.

---

## 5. What would change my mind

- **User’s real Chrome already has a non-empty `formulaDay`, a Nov 1 `settings.examDate`, and a used plan.** Then N1-narrow is partly done in the profile and N2 (blob size / persistFailed) or N3 (they *are* following the paper-era plan) could outrank. None of the four surveys inspected that profile.
- **Live two-tab clobber or a persist toast on the daily machine.** Then N2 jumps to rank 1 the same afternoon. Until someone reproduces it, it is a design smell.
- **Evidence they study primarily on a phone.** Then UX F3 (wrap-nav eating the first screen) joins the narrow lock; still not N2/N3-ingest.
- **Evidence they cannot start `#/practice/all` without a hash** (broken route, empty bank on the machine they actually use). Then a Practice nav item is mandatory, not optional.
- **They explicitly want the 93-task plan as the sequencer** rather than a dashboard agenda. Then N3’s plan rebuild (date + drop GR8677/GR9277 as tests + schedule `ets2024`) becomes the lock, still without Kahn ingest.

---

## 6. Explicit uncertainties

- **User’s real browser state is unknown.** All four surveys used the headless `pgre-liveui` origin (empty or nearly empty). IndexedDB notes, `formulaDay`, sat mocks, `examDate` override, blob bytes — unverified. Rankings assume a cold-or-sparse profile, which matches “little CS background, daily instrument” better than “power user with a 4 MB blob,” but it is an assumption.
- **Whether 2026-11-01 is the registered ETS date** is taken from the brief, not from an ETS confirmation. If Oct 28 is actually correct, the date half of N1-narrow collapses to “unify two clocks”; the Today agenda still stands.
- **How often they already ignore `#/plan`.** 0/93 on liveui is not their laptop. If they religiously check the plan, N3’s GR8677-as-Test-#1 is more harmful than I ranked it — still fixable as a later plan pass, not Kahn ingest.
- **N2 quota/two-tab:** architecture confirmed by reading `save()`; **loss not observed**. I am not asserting absence of risk; I am asserting absence of a reproduced incident.
- **Formula picker UX after a batch exists** (flip/grade chrome) was not live-proven by UX; empty-batch / no `#study-btn` **was** (source + live). The dark horse is about *start*, not *grade*.
- **I did not wait for DebateN1/N2/N3 memos.** This critic attacks the survey nominations, not the advocates’ later narrowing. If an advocate already conceded N1-narrow, that is agreement, not a new fifth aspect.

No fifth nomination. The surveys did not miss a worse tomorrow-morning block; they over-counted one block as three, and under-weighted the only missing button (Study 10).
