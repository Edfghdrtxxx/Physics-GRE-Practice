# Debate N1 — Daily program / home as study instrument

**Advocate:** DebateN1. **Nomination:** the site never turns remaining days into a directed daily program; home and sidebar IA are a feature buffet.

**Win claim.** Lock N1. The next implement wave should make `#/` answer “what do I do today for 2026-11-01?” with one ordered agenda and a nav that can launch it. Do not spend that wave on a persistence rewrite or on Kahn Notes ingest.

Exam: **2026-11-01**. Calendar today: **2026-09-08** ($D = 54$). User: physics master’s student, little CS background. The site is the daily prep instrument.

Surveys read in full: `01-product-study-loop.md`, `02-ux-interaction.md`, `03-engineering-reliability.md`, `04-content-pedagogy.md`. No application code was edited.

---

## 1. Steelman of the other nominations

### N2 — Persistence: last-write-wins localStorage blob

This is the only copy of 54 days of prep. `PGRE.store.save()` is `localStorage.setItem(JSON.stringify(this.state))` on a single key `pgre-state-v1`: no revision, no merge, no write queue. A second tab’s save overwrites the first. `attempts` / `exams` / `sessions` are uncapped (unlike `cardReviews` 8000). Quota failure sets `_persistFailed` and a sticky toast, then **keeps mutating RAM**; reload drops everything after the last successful write. Corrupt parse stashes a side key and **starts fresh**. Cross-tab sync exists only as two partial patches (timer adopts `studyLog` when idle; formula check-in is its own field).

A full mock submit appends 70–100 attempt rows in one `save()`. Two windows (dashboard + formulas, or a forgotten mock tab) can silently discard a session. The user will not open DevTools → Application → Local Storage. Engineering rated this 9/10 and nominated it as the single worst aspect, correctly arguing that a four-day date error is a constant, while an overwritten SRS schedule is not. Boot/cache-bust and green fabricated tests are detection gaps; this is the loss event. Practice remounts wipe a set; this wipes the corpus.

If N2 is true and fires, N1’s sequencer is decorating a corpse. That is a real #1 case, not a nit.

### N3 — Stale plan + empty Notes vs shipped bank

The remaining-weeks operating system is a July–October 28 paper-era script aimed at the wrong day, the wrong tests, and a site that no longer exists. Canonical date is still `PGRE.EXAM_DATE = '2026-10-28'`. Live `#/plan` on 2026-09-08: “July 13 → October 28 · five released practice tests”, **0 / 93** tasks, current week Atomic II + SR, Phase 2 still “full released exams **(on paper, timed)**”, W16 “Taper — exam Wednesday Oct 28”. Tests #1–#2 are GR8677 / GR9277, which are `src: 'ets-drill'` already inside `PGRE.allQuestions()` (200 of the 366 default-pool items) and **not** on `#/exam`. The only current-format official mock (`ets2024`, 70×120) is never scheduled. After Oct 28, `currentWeek` sticks on the last week forever; Nov 1 is a four-day gap.

On the teaching side, every topic portal still waits for a Library drag-drop. A 1.09 MB Kahn markdown file is already on disk (338 ATX headings, **314 at `####`**), but `splitChapters` only splits on `#{1,2}`, so even a successful import would collapse into ~14 giant blobs, with QM+Atomic as one. This week’s plan tasks are literally “Read: selection rules, Zeeman/Stark…” with no in-app chapter. The dashboard challenge “Open a topic’s notes today” can be completed on the empty waiting card.

Content’s nomination is coherent: the 9-topic banks are already large enough to drill (366 daily + 5 intact ETS + 3 book samples + 334 cards). What will waste $D = 54$ is following `#/plan` and `#/topic/*/notes`. Bank size is not the bottleneck; **what to do with the next 54 days** is. That sentence is the strongest sentence in the four surveys. N3 claims ownership of it.

---

## 2. Attack — why they are not #1

### Against N2

N2 is insurance against an **unobserved** failure. Engineering did not reproduce two-tab clobber or `QuotaExceededError`. The inspected live origin had `lsBytes: 2643`, `attempts: 1` — not the user’s daily Chrome, and also not a quota crisis. Confidence that the user hits ~5 MB before 2026-11-01 is **medium**, and it depends on mock volume and note size, neither of which exists yet because the daily loop does not run.

Catastrophe-if-it-fires is the wrong ranking key at $D = 54$. The certain daily cost is 54 mornings of “what now?” against a 23-link buffet. The uncertain cost is one clobber that has not been seen. Expected value: a persistence rewrite that the user never notices does not raise the November score; a home that still leads with Level/XP and “Get 5 questions right” will spend those 54 mornings on the wrong object **whether or not the blob survives**.

Worse: if N2 ships first, the site persists the buffet more reliably. Streaks, challenge XP, and checkbox-plan days (which count as study without physics) become the durable record. That is not safety. That is a better hard drive for the wrong program.

N2 also fails the “same aspect” test for this wave. A store revision / tab lock / cap-or-spill of `attempts` does not put mixed practice in the nav, does not stop the countdown tweening from 0, does not budget 334 unlearned formulas against remaining days, and does not schedule `ets2024`. Those are N1. Do not swallow a persistence rewrite into an N1 win.

The honest N2 remainder after an N1 win: keep Export/restore as the hatch (`js/view-content.js`); do not pretend last-write-wins is fine. It is the next insurance wave, not this one.

### Against N3

N3 smuggles two aspects under one heading.

**(a) Stale calendar / mock sequence** is an *input* to a daily program. The date, the spoiled “paper tests,” and the missing `ets2024` slot are why a sequencer would currently lie. That overlap is real. It is also already in N1’s slice as **one clock (Nov 1)** plus **live-state mock spacing** (unused `PGRE.ETS_EXAMS` vs `state.exams`), not as a 93-task paper rewrite.

**(b) Empty Notes / Kahn ingest** is a different product. Teaching text does not convert remaining days into a next action. A master’s student can read Kahn on paper this week; they cannot get a directed day from a dashboard that sells XP and a sidebar that hides Practice. Ingesting 314 `h4` headings, fixing `splitChapters`, generating `cpg-notes.js`, and mapping chapters onto portals is days of parser work that still leaves `#/` as a feature buffet. Content’s own suggested files for Notes (`store.js` splitter, `view-topic.js`, `view-content.js`, optional `content/bank/cpg-notes.js`) do not include `view-dashboard.js` or `buildNav`. That is the tell: Notes ingest does not own home.

A rebuilt 93-task ledger without a today sequencer is still a ledger. Plan tasks already grant XP on check with **no verification they were done** (`gamify.toggleTask`). Week “Study:” links only to topic portals, not to a 20-question AP+SR set or a named mock. W09 “Drill: 20 atomic + SR questions” has no launcher. If N3 wins and only rewrites `data-plan.js` copy (Nov 1, drop GR8677 as Test #1, insert `ets2024`), the student still opens the site, sees Level 1 and five zeroed tiles, and must know a hash to start mixed practice. Product finding 1 survives a successful N3 content pass.

N3 also over-claims “the plan is the sequencer.” On Sep 8, eight of sixteen weeks are already `week-past` with no catch-up. A static Jul 13 start cannot be the D-54 instrument unless someone rebuilds it from **today**, which is exactly a remaining-days program — N1’s job — not a better checkbox novel.

Do not swallow Kahn Notes ingest into an N1 win. It is not the same aspect.

### N4 (formula recall cannot start) — not a dark-horse #1

UX finding 2 / Product finding 4 is real: 334 cards, 0 picked, no Study button, picker at $y = 902$ on a 900 px window, 12388 px of indistinguishable rows, dashboard “nothing picked yet” reading like “you’re done.” At default 10 new/day, introducing the deck alone is $334 / 10 = 33.4$ days of *new cards*, before reviews, inside $D = 54$ with `examCap` still on.

It is not #1 because it is a **child of home not presenting today’s work**. Every session starts at `#/`. Mixed practice is not in the nav at all. Formula “0 remaining” is the Review-queue lie of an empty user batch, not a separate product. Fixing hierarchy (UX’s own ranking) “would also make the countdown, exam date, and Review queue earn their pixels.” A full picker redesign is the next formula aspect, not this wave. The N1 slice may include a one-click “Study 10” from the dashboard row so the formula line of the sequencer is not a dead link. That is a CTA, not N4.

---

## 3. Defense of N1, with $D = 54$ user impact

**The product job of this SPA at D-54 is one next action that spends scarce mocks, due reviews, and unlearned formulas against a 70×120 clock. That job is unowned.**

Product and UX independently nominated the same aspect (Product finding 1 + finding 2; UX finding 1). Engineering’s exam-date split-brain (finding 4) and Content’s stale plan (finding 1) are the calendar half of the same hole. Four surveys, one missing owner.

Live `#/` at 1440×900 (UX, 2026-09-08): `#view` `scrollHeight` 2942–3048 px vs `innerHeight` 900. Hero is greeting + Level/XP + countdown. Then five zeroed stat tiles. Review queue. QOTD top = 575 px (third card). Topic grid top = 1933 px. Challenges that day: “Practice in 2 different topics”, “Open a topic’s notes”, “Get 5 questions right” — volume/XP, not GRE skill; the notes jump goes to `#/topic/cm` even when the week is Atomic + SR. “This week” is **plain text** of the first three unchecked plan labels, no buttons.

Sidebar (`PGRE.buildNav`, `js/app.js`): Dashboard, Study plan, History, Analytics, Custom quiz, Search, Notes, Mistake book, Formula recall, Focus timer, Study time, Achievements, Library, Mock exam, then Knowledge portals. **Zero `#/practice` links.** Sticky Dark-mode footer overlaps OW/TS; QM, AP, SR, LM, ST sit below the viewport. The daily drill surface is a hash the user has to remember (`#/practice/all`).

The one number that should be trusted is wrong and animated. Countdown uses `gamify.daysToExam()` → `srs.daysUntil(PGRE.EXAM_DATE)` with `PGRE.EXAM_DATE = '2026-10-28'`, label hardcoded “Wed, Oct 28, 2026”. Live: 50 days. True remaining to Nov 1: **54**. `settings.examDate` (formula SRS cap / final-pass) is a second clock, edited only on `#/formulas`, and does not move the hero. Mount then tweens `.countdown-num` from 0 (`countUpText`, 700 ms). Caught mid-tween at “10 days.” A non-CS student is being told, every morning, that time is a slot machine.

Formula and mocks are opt-in rooms. DESIGN.md §4b: nothing auto-selected into the formula batch. Dashboard Review queue: “nothing picked yet / 0 remaining.” Mock teaser is a paragraph at the bottom with “Start a simulation →”; nothing says “sit `ets2024` once, keep the other four fresh.” Weighted 70-draw UI claims 1135; engine draws 666 and can burn Sample Exams 1–3. Intact ETS (469 items) are correctly kept out of daily practice and then **never scheduled**.

**D-54 impact, in the user’s actual mornings:**

- **Attention tax, 54 times.** Opening the instrument does not start work. It starts a sitemap. Mixed practice, the default 366-pool drill, is not a nav item. Five of nine topics collide with or sit under Dark mode. QOTD and challenges pay XP for the wrong object (one untimed item; “open empty notes”).
- **Four days of calendar theft, compounding.** Dashboard 50, `examCap` 49, plan taper Oct 26–28, silent Oct 29–Nov 1. Formula interval cap and “final pass” banners fire four days early. If they trust the plan, they are on W09 with eight foundation weeks unchecked and two “practice tests” already in the daily pool. If they ignore the plan, there is no other sequencer. Either way the remaining days are not budgeted.
- **Formula deck does not start.** 334 unseen. Default target 10. New-card-only introduction consumes most of the calendar *if they never miss a day and ignore reviews*. Home currently reports this as caught-up-shaped copy.
- **Scarce mocks are unprotected.** Five intact ETS papers are the only current-format-shaped sittings. The plan spends W10–W11 on drills already in mixed practice. The dashboard does not name `ets2024`. A student chasing readiness % (70% last-30-day accuracy on the mixed 366 + 30% coverage, mapped 200–990) can believe they are on pace while the 70×120 voice stays behind one extra click.
- **Gamification amplifies the buffet.** 80 achievements (README still says 36). Checking a plan box is a study day. The loudest daily feedback is Level/XP, not due mistakes, not unlearned formulas vs days left, not unused mocks.

N2 says: don’t lose the save. N3 says: don’t follow the wrong 93 tasks and empty Notes. Both can be true. Neither is the job that is unowned. **Inputs to a loop that does not exist are not the loop.** Fixing pool labels, auto-picking 10 formulas in isolation, moving the date to Nov 1, ingesting Kahn, or adding a store revision still leaves a D-54 candidate asking “what do I do now?” and getting twenty doors.

The user has little CS background. They will not invent `#/practice/all`, will not hand-pick 334 formula rows, will not know GR8677 is already in the daily pool, and will not reconcile two exam dates. The instrument has to do that on open.

---

## 4. Smallest shippable slice if N1 wins

**1–3 days. Files, not patches. Not a rewrite.** Include exam date **2026-11-01** and a **today sequencer**. Do not ingest Kahn. Do not rewrite persistence.

### In scope

| File | Why it is this aspect |
|---|---|
| `js/view-dashboard.js` | Replace XP-first hero + challenges-as-the-day with one ordered **Today** agenda: (1) due mistakes, (2) formula remaining vs unlearned vs days left, (3) one timed mixed set (week topics if any), (4) next unused intact ETS mock if the spacing rule says so. QOTD / challenges / achievement chips move below the fold or become optional. Stop `countUpText` on `.countdown-num`. Drive the label from the single exam date. Formula Review row: never print “nothing picked yet” as if caught up; CTA is Study / Pick 10, not Open. |
| `js/app.js` | `buildNav`: promote **Practice** (`#/practice/all`), Formula recall, Mistake book, Mock exam; demote History / Analytics / Achievements / Library / Focus / Study time. Do **not** add a 15th item named “Today.” Badges already exist for mistakes/formulas — keep them. |
| `js/data-topics.js` | `PGRE.EXAM_DATE = '2026-11-01'`. |
| `js/store.js` | Default `settings.examDate` to the same string. **Only this default.** No splitter change, no revision/merge, no quota caps. |
| `js/gamify.js` | `daysToExam()` must read the one source (`settings.examDate` falling back to `PGRE.EXAM_DATE`), not a second hardcoded constant. Challenges stay; they stop being the default day (dashboard order owns that). |
| `index.html` | Brand-sub exam date. |
| `css/style.css` | `#sidebar-footer` must not overlay topic links (scroll padding or non-sticky footer). Mobile `#sidebar-nav`: two-tier (today’s four launches vs the rest), not 23 wrap-chips. Optional tighter dashboard gaps so Today fits the first screen. |
| `js/view-formulas.js` | **Only** a one-click default batch (“Study 10” / remaining-days budget) callable from the dashboard CTA so the formula line of the sequencer is live. No picker redesign, no Lab/Match/Cloze work. |
| `js/srs.js` | Thin helper: remaining-days new-card budget from unlearned count and `daysToExam()` (so 334 / 10 is not a silent default). No SM-2 rewrite. |
| `js/data-plan.js` | **Horizon only:** header, Phase 3 desc, `w16.end = '2026-11-01'` and exam-day task so `currentWeek` does not go silent Oct 29–Nov 1. Do **not** reauthor all 93 tasks, do not ingest chapters. |
| `js/view-plan.js` | Hero date; drill/mock-shaped task rows may grow `href`s to `#/practice/...` or `#/exam`. XP-on-check can stay for this slice. |

Sequencer mock rule (live state, not the checkbox novel): if no `ets2024` sitting exists in `state.exams`, the Today card names it as the next current-format mock; otherwise name the next unused intact form. Do not schedule GR8677/GR9277 as “fresh tests.” Implementation can live in `view-dashboard.js` against `PGRE.ETS_EXAMS` + `state.exams`. That is why a full `data-plan.js` resequence is not required for N1.

### Out of scope (other nominations)

- Kahn Notes ingest, `splitChapters` `####`, `content/bank/cpg-notes.js`, Library copy — **N3**.
- `store.save` revision / tab lock / quota fail-closed / capping `attempts` — **N2**.
- Formula picker wall, flash-mode play, visualizer two-pane — **N4 / UX 2 and 5**.
- Weighted-draw honesty (1135 vs 666), portal “preview” mislabel, new GRE-voice items — Content findings 3 and 5.
- `?v=` completeness, lazy bank parse — Engineering finding 2.

### Acceptance for the implement team

On 2026-09-08, a cold open of `#/` at 1440×900 shows, above the fold: days until **Sun, Nov 1, 2026** (not tweened from 0); one primary button for the first undone Today item; mixed Practice in the sidebar without scrolling under Dark mode. Formula row does not read as “caught up” when 334 cards are unlearned. `#/plan` still exists as a ledger; it is not the daily program.

---

## 5. What would change my mind

- **N2 becomes the fire:** the user’s real Chrome `pgre-state-v1` is already near quota, persist has failed, or two-tab clobber has already dropped SRS/mocks. Then insurance is #1, because there is no program to direct.
- **The site is not the daily instrument.** If the user already runs a paper/Anki program and only uses this SPA as a question bank, N1 is chrome. Then N3’s mock-sequence honesty (don’t sit GR8677 as a fresh test; do sit `ets2024`) or N4’s formula start would beat home IA.
- **Exam day is actually 2026-10-28** and they already know the day’s work. The four-day error collapses; N1’s clock argument weakens. Buffet IA remains, but Content’s “wrong tests / empty Notes” could outrank it.
- **Evidence they stall only at Formula recall** (open `#/formulas` daily, fail the picker, never fail to find practice). Then N4 is #1 and N1’s “Study 10” CTA is the whole slice, not a dashboard rewrite.
- **Notes emptiness is already blocking this week’s physics**, not just the challenge XP — i.e. they refuse to read the paper book and the portals are the only teaching surface. Then N3(b) is #1. I do not believe that of a physics master’s student, but I would yield on evidence.

I would **not** change my mind because N3’s plan copy is stale. Stale copy without a today owner is why N1 exists. Fixing the novel without fixing home leaves the buffet.

---

## 6. Explicit uncertainties

- **User’s real Chrome profile** was not inspected. Live `pgre-liveui` was nearly empty (0–1 attempts, 334 formulas unlearned, 0/93 plan tasks). Structural claims (dates, nav, render order, empty default formula batch) do not depend on that. Claims about “they currently wander” vs “they already have a ritual” are **medium**. Flagged.
- **Which calendar is ground truth.** Brief says 2026-11-01. Repo and UI say 2026-10-28. Not checked against an ETS registration. **Medium** on the date; **high** that two in-app clocks can diverge. If Oct 28 is correct, N1 still wants one clock and a sequencer; only the literal default changes.
- **Two-tab clobber / quota** not reproduced (Engineering). I am attacking N2 as #1 on expected value, not denying the write model. Write model confidence: **high** (code). User-visible loss this week: **unknown**.
- **IndexedDB already holding a Kahn import** in the daily browser: **unverified**. Liveui Notes were empty. Even if import exists, `splitChapters` still would not map `####`. That does not make ingest #1.
- **Phone vs laptop.** UX mobile finding (23 wrap-chips, QOTD at y=1489 on 390×844) is high-confidence on layout, medium on how often this user studies there (`python3 -m http.server` on a Mac). Desktop rail already fails the same IA test.
- **Whether they ignore XP.** Unknown. The UI still leads with it. Impact of N1 is **higher** if they follow the loudest widget, **lower** if they already skip to `#/practice/all` by habit — which the nav does not teach.
- **Formula Study flip/grade** was not live-completed in the UX pass. Empty-batch / below-fold / picker-height facts are high-confidence. I am not claiming the grading chrome is broken.
- **Item-level GRE craft** of the 366-pool is Content’s lane; not re-audited here. N1 does not need it: even a perfect bank is unreachable as a daily program if home does not launch it.
- **N3 plan-as-launcher overlap.** I am asserting that live-state mock spacing on the dashboard is enough for this slice and that a 93-task rewrite is N3. If the chairman believes “the plan *is* the sequencer,” they should still lock N1’s home+clock and assign plan *content* as a follow-up, not merge Kahn ingest into the same wave.

---

**Lock request.** N1. Smallest wave: Nov 1 as the only exam date, Today agenda on `#/`, Practice in the nav, formula line that can start. Next waves, in order I would accept: N4 picker if Study 10 is not enough; N3 mock-sequence/Notes; N2 store revision.
