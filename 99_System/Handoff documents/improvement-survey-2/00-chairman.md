# Chairman synthesis — Physics GRE Prep Studio (D-44)

Date 2026-09-18. Exam 2026-11-01. Inputs: `01-code-architecture.md`, `02-storage.md`, `03-ux-interaction.md`, `04-taste-product.md`, plus my own live pass on an isolated origin (`http://localhost:8126/`, headless Chromium, 1440x900). Subagent claims were re-verified where they drove the ranking; two were rejected (see §4). Analysis only; no application code edited.

## 1. Ranking

Ordered by certain daily cost between now and Nov 1, then by fix cost.

### 1. The plan and the practice room are two products that do not talk

**What I saw.** `#/plan` renders 60 task rows; 3 have a launcher, all `Open simulator ->` on mock rows (`js/view-plan.js:67-74`). This week's five timed sets (`Set 02 ... Set 06 -- timed (~100 min)`) are checkboxes worth `+20 XP`. The dashboard "This week" card lists the next three tasks as plain `<li>` (`js/view-dashboard.js:554-556`). Yet `js/data-packs.js` already holds Sets 01-35 as id lists, `PGRE.launchPack('02')` already writes `pgre-quiz-config` and routes to `#/practice/custom` (`js/packs.js:32-56`), and `plan-engine.js:86` emits the task id as `set-02` -- the join key exists on both sides and nobody joins it. Today the only launcher for a pack is an OrbitOS skill run by an agent, not the site.

**Honesty gap on top.** Every set row says "timed (~100 min)"; `#/practice/custom` is untimed by design ("Nothing is timed here", `js/view-build.js:188`). The plan promises a mode the room does not have.

**Voice.** Hero: `Mirror of the vault syllabus (8-Week-Syllabus.md) -- regenerate: node tools/build-plan.js`; `5+6+2 load`; `Week 0 - Historical -- pre-rewrite week. Kept so the Set 02 carry rule resolves` (`js/view-plan.js:34-35`, `js/data-plan.js:53-54`). This is a build log shown to a non-CS user.

**Why first.** The syllabus's unit of daily work is the timed set. It is the one thing the user must do every study day, and it is the one thing the site cannot start. Everything else on this list is a tax; this is a missing door.

**Slice.** `js/view-plan.js`: for `kind === 'timed' | 'extra-set'`, render a `Start ->` control that calls `PGRE.launchPack(n)`; drop `+N XP` from task meta. `js/view-dashboard.js`: the "This week" list gets the same control on its first undone set. `js/view-practice.js`: honor an optional `timed` flag from `pgre-quiz-config` with a visible countdown (or change the plan label to stop claiming "timed"). `js/view-plan.js` + `tools/build-plan.js`: delete the regenerate sentence, translate `5+6+2` to hours, collapse Week 0 by default. Effort M. No router or nav change.

### 2. Every daily screen is a buffet; the home and formula pages still wear a game costume

**What I saw.** `#/` cold: `Good morning.` / `Level 1 - Quark` / `0 / 100 XP` / five zero tiles / a full Question-of-the-day item, 25 sections, 3243 px tall, 11 headings. The Today agenda is present and works, but it is the second card and the serif display belongs to the level title (`04-taste-product.md` F1, `shots/taste-home.png`). `#/formulas` cold: 7 mode tabs + Print, a streak check-in card, "Flip cards the way vocabulary apps do it", `Study 10 today`, four stat tiles, SM-2 settings (F2). Sidebar: 24 links; the hover letter-swap effect expands them into 1452 `<span>`s (`js/motion.js:219-355`).

**Measured cost, not just tone.** Every `#/formulas` mount builds a `display:none` print sheet: 1,915,366 bytes of HTML, 1330 KaTeX renders, ~52k DOM nodes under `#view` (my measurement; `js/view-formulas.js:2999` -> `buildPrintSheet` `:314-346`, `flagWideCards` `:369-386` forces layout). Only printing needs it; `beforeprint` already rebuilds it (`:388`). `PGRE.allQuestions()` rebuilds the 366-pool up to ~72 times per `recordAnswer` (`01-code-architecture.md` F3). `fonts/` ships 741 KB of woff2 of which 420 KB (Poppins, Lora, variable Newsreader, duplicate JetBrains) is never referenced (`04` F5).

**Taste call.** The cream/ink/coral system, Newsreader-at-400 display, and the Concepts door are good and should stay. The problem is accretion: a design spec that asked for levels, 80 achievements, 3 challenges, a check-in streak, and 7 flash modes, all executed faithfully, on an instrument for a master's student 44 days out. The user does not need to be told he is a Quark. He needs the four launchers and the number 44.

**Slice.** `js/view-dashboard.js`: Today becomes the first card and the greeting folds into it; Level/XP meter, stat tiles, challenges, QOTD move below into one collapsed "Progress" disclosure; remove `.countdown-breathe` from the exam number. `js/view-formulas.js`: on landing paint one primary Study control; Match/Type/Quiz/Cloze/Lab/Search, check-in, and SM-2 settings behind one "Options" row; make `buildPrintSheet` lazy (call on `printSheet()` and `beforeprint` only). `js/bank.js`: memoize `allQuestions()`. `fonts/` + `css/fonts.css`: delete the 420 KB of dead files. Effort M. Out: sidebar IA redesign, dropping XP internally (plan grants depend on it), achievements deletion.

### 3. The store is now correct, but it is silent about your data

**What I saw.** N2 two-tab clobber is fixed and re-verified (`02-storage.md` "Not nominated": stale `pagehide` no longer erases a sibling's attempt; 38/38 in `tools/test-store-persist.js`). What remains is that every data-shaped failure paints the same screen -- a fresh `Level 1 - Quark` -- with no sentence explaining why:

- Wrong bookmark. `file://`, `localhost:8000`, `127.0.0.1:8000` are four stores; the README recommends two of them; nothing in the chrome names the live origin (`index.html:30`, `js/view-content.js:214`).
- Corrupt blob. `load()` stashes a `-corrupt-*` key and starts fresh; `_recoveredFromCorruption` is never rendered (`js/store.js:416-439, 467-473`).
- Profile wipe. One `localStorage` key holds 44 days of attempts, SRS intervals, mistake ladders and mock sittings; there is no automatic backup, only a manual Library export (`js/store.js:630-632`, `js/view-content.js:266-275`).
- Quota. Toast is correct, but grading keeps mutating RAM after `setItem` throws, so answers look accepted and vanish on reload (`js/store.js:510-520`; fail-open confirmed live).

**Why third.** Low probability per day, but any one of these is the whole record, and the user cannot rebuild it before Nov 1. Every fix is a few lines and none touches the merge logic.

**Slice.** Sidebar footer: one muted line with `location.protocol + host`. `js/app.js` boot: if `_recoveredFromCorruption`, sticky toast "Progress could not be read; a backup key was kept -- restore from Library." `js/store.js` `save()`: every Nth successful write, rotate a `pgre-state-v1-backup` side key (keep one previous). `js/gamify.js` / `js/srs.js`: when `_persistFailed`, refuse `recordAnswer` / `gradeCard` with the existing toast instead of appending to RAM. Library copy: say what export contains (attempts, cards, mocks, notes) and what it does not (imported files). Effort S.

## 2. Honorable mentions (real, not this wave)

- Dynamic script injects carry stale or no `?v=`: `js/view-formulas.js:186` (`flashmodes.js?v=20260907a`), `:202`, `js/view-search.js:26`; dead loader `js/view-exam.js:17-24`. Latent until the next edit to `flashmodes.js`. S. (`01` F1)
- No tests on `gamify.recordAnswer`, `timer.credit`, `plan-engine` carry rule. (`01` F8)
- `--ink-3` captions at 12 px measure 3.00:1 on cream (header comment claims 3.2). The always-visible exam-date caption is that pair. S. (`04` F6)
- Mixed verbs: Study / Drill / Practice / Open; Put away vs Archive; simulation vs mock vs exam. S. (`04` F8)
- ~1,000 lines of drifted helper copies across `trio-g*.js`. Maintainability only. (`01` F6)

## 3. Not in need of improvement (verified)

- Today agenda, Study-10 fill, mock pointer, exam date 44 / Sun Nov 1 2026: all live and correct.
- Store read-merge-write, tombstones, epoch: pass under two-tab pagehide and both-dirty.
- Exam lobby hierarchy: one primary `Start ETS Official Practice Test (2024)`; forms sat/unsat visible via Past simulations.
- `prefers-reduced-motion`: honored in CSS and all three JS motion modules.
- Console: 0 errors on every core route.
- Cream/ink/coral palette and Inter + Newsreader pairing: coherent at the token level. Keep.

## 4. Subagent claims rejected after re-verification

- **LiveUX F3 "Study 10 today strands the user in the picker" -- false.** Clicked `Study 10 today` on `#/formulas` with an empty batch: landed on `Card 1 - 10 left`, `Show answer`, no `.picker-row`, `formulaDay.newIds.length === 10`.
- **LiveUX F2 "Back destroys the session" -- overstated.** Back mid-set does pop to the previous hash (state and attempts persist: 2 attempts, 1 session survived). Forward shows `You left a set part-way through: 3 of 5 questions left -- Resume session / Start over`. That is a resume, not a loss. A history push on session start so that Back stays in the room would be a nit-level nicety.
- LiveUX did not write its report on first yield; it was written on request. Its metrics table is retained but its severity labels were not trusted.

## 5. Unknowns

- User's real `file://` blob (size, `_persistFailed`, which mocks already sat) was not opened; all measurements are cold isolated profiles.
- Whether the user follows `#/plan` at all. If not, item 1 is still the plan's fault, not the user's: a plan that cannot be started teaches itself to be ignored.

## 6. Second pass (same day) and lock

A second live pass (full set by keyboard, seeded misses, exam room entry/resume/discard, Pack 03 end to end, 390 px, dark mode, mount timing) found the rooms solid and sharpened item 1: finishing a pack writes `state.packReceipts['03']` but leaves `state.plan['set-03']` null; every practice summary -- including mixed practice -- ends with `Copy agent receipt` and an `OrbitOS:` instruction to have an agent tick the plan (`js/view-practice.js:797-803`). Two hops of the daily loop are agent-only. `#/formulas` mount measured at 245-318 ms long task / 51,929 nodes vs 555 on `#/`. Ranking unchanged. Implement lock with owners and acceptance criteria: `05-lock.md`.
