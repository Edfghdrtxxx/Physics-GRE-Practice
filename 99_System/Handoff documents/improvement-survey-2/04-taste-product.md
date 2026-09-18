# Taste / product survey — 2026-09-18

Method. Read `AGENTS.md`, `20_docs/Project Docs/DESIGN.md` §1–2, `css/style.css` header plus `:root` / dark block, `css/fonts.css`, `css/motion.css`, `index.html`, and copy in `js/view-dashboard.js`, `js/view-formulas.js`, `js/view-exam.js`, `js/view-plan.js`, `js/view-analytics.js`, `js/view-concepts.js`, `js/gamify.js`, `js/data-achievements.js`, `js/formula-checkin.js`, `js/motion.js`, `js/concept-door-fx.js`, `js/focus-fx.js`. `99_System/Handoff documents/pgre-philosophy/REVIEW-2.md` is item-writing philosophy, not a visual spec; visual intent is the DESIGN / `style.css` header. Counted `font-size`, hex/rgb, and `var()` in `style.css`; weighed every `fonts/**/*.woff2`. Live pass: isolated origin `http://localhost:8125/` (hub process `taste-http-8125`), harness `browser.open`, viewport 1440x900, cold `localStorage`, calendar 2026-09-18, in-app countdown 44 days to Sun, Nov 1, 2026. Screenshots under `99_System/Handoff documents/improvement-survey-2/shots/taste-*.png`. No application code edited. Server stopped; tab closed.

## Findings

### F1. Home still greets as an XP game, not as today’s work

**Claim.** Today is on the first screen, but the visual owner of `#/` is still Level / XP / empty stat tiles / a full Question-of-the-day item; a master’s student opening the instrument at 08:00 is told they are a Quark with five zeros.

**Evidence.**
- Hero copy is a greeting plus `Level N · title` and `XP to Level N+1` (`js/view-dashboard.js:487-504`). Live: `Good morning.` / `Level 1 · Quark` / `0 / 100 XP to Level 2` (`shots/taste-home.png`).
- Five stat tiles in the fold, all empty on a cold profile: Total XP 0, Day streak 0, Questions answered 0, Accuracy —, Days active 0. Same shot.
- `#today-agenda` is the second card (top 250, height 272) and does contain Mixed practice / Formula `Study 10 →` / next mock (`js/view-dashboard.js:427-442`). It is not the first thing the serif display says.
- `#view` holds **19** `.card` nodes and **11** headings; `#main` scrollHeight **3288** px vs 900 px viewport. QOTD card top 657 / height 809 — a full multiple-choice item with a figure, mostly below the fold (no question text quoted). `shots/taste-home.png`, `shots/taste-home-full.png`.
- File comment still describes the view as “level/XP hero, stat tiles, daily challenges…” (`js/view-dashboard.js:1-3`).
- Countdown `44` / `days until the exam` / `Sun, Nov 1, 2026` is correct; `.countdown-num` also carries `.countdown-breathe` (6 s opacity 1→0.68 loop, `css/motion.css:206-211`, applied `js/view-dashboard.js:737-738`).

**Impact on daily study before Nov 1.** Every cold open spends the fold on a progress costume. Today’s launchers work, but they sit under a game HUD. Forty-four mornings of that is a tone tax, not a start tax.

**Severity.** should-fix

**Fix sketch.** Keep `#today-agenda` as the first content card (or fold the greeting into it). Move Level / XP meter / five stat tiles / QOTD / challenges below the fold or behind a “Progress” disclosure. Stop `countdown-breathe` on the exam number. Files: `js/view-dashboard.js`, `css/style.css` hero rules.

**Effort.** M

### F2. Formula recall is a seven-mode settings wall around a good Study-10 button

**Claim.** Direct `#/formulas` can start a batch, but the page still presents as a vocabulary-app studio (tabs, streak check-in, Anki controls) rather than one recall action.

**Evidence.**
- Live fold (`shots/taste-formulas.png`): tab strip Study / Match / Type / Quiz / Cloze / Lab / Search plus Print; intro card “Flip cards the way vocabulary apps do it…” (`js/view-formulas.js:553-557`); check-in card `Not yet today` / `No streak yet` (`js/formula-checkin.js:195-207`); landing `Nothing picked for today yet` with primary `Study 10 today`; then four stat tiles (334 / 0 / 10 / 0 / 334); then Today’s formulas with Formulas per day stepper, Exam day, Intervals `Capped to exam day`.
- Six `.card` nodes above the browse/print sheet; `#main` scrollHeight 1401 px. Headings also include a full “Physics GRE — Formula Sheet” dump by topic (measured, below the fold).
- Comment at top of the view still says “four study modes” while the tab list is seven (`js/view-formulas.js:1-8`, `:218-219`).
- Study-10 from Today is already shipped (not re-nominated). This finding is the **page’s own** chrome, which still makes the daily formula visit look like a product, not a deck.

**Impact on daily study before Nov 1.** The CTA exists; the student still has to ignore a check-in, seven tabs, and SM-2 settings to press it. Match/Type/Quiz/Cloze/Lab are not the 44-day path.

**Severity.** should-fix

**Fix sketch.** On an empty or remaining batch, paint one primary Study control and bury Match–Search, check-in, exam-cap, direction, and reset behind a single “Options” row. Keep the picker as a ghost. Files: `js/view-formulas.js`, `js/formula-checkin.js` mount site, `css/style.css` `.flash-tabs-bar`.

**Effort.** M

### F3. Gamification copy reads as Duolingo, not as a 27-year-old’s instrument

**Claim.** Level titles, 80 achievements, three daily challenges, and a formula 签到 streak are a second product sitting on top of the study tool; the names are physics-pun gamification, not quiet bookkeeping.

**Evidence.** Five representative strings:
1. `LEVEL_TITLES: ['Quark', 'Electron', … 'Nobel Laureate']` (`js/gamify.js:10-12`); live hero `Level 1 · Quark` (`shots/taste-home.png`).
2. Toast: `'Level up! Level ' + after.level + ' — ' + after.title` (`js/gamify.js:38`).
3. `'Formula check-in! Day 1 — the streak starts here.'` / `'Come back tomorrow to keep the chain'` (`js/formula-checkin.js:113`, `:206`). Live: `Not yet today` / `No streak yet` (`shots/taste-formulas.png`).
4. `'Reach 100 XP.'` / `'Charged Up'` / `'Megajoule'` (`js/data-achievements.js:33-36`). Live gallery: **80** `.ach-card` nodes, heading `0 of 80 unlocked · tier bonuses: Bronze +25 · Silver +50 · Gold +100 · Platinum +200 XP` (`shots/taste-achievements.png`).
5. Challenge pool: `'Answer 8 questions today'` xp 25; `'Get 4 correct in a row today'` xp 25 (`js/gamify.js:546-548`). Home card `Today’s challenges` with `+25 XP` rows (`js/view-dashboard.js:528-537`).

DESIGN.md §2 specifies this system (levels, 80 achievements, 3 challenges). The execution matches the spec. The spec is the problem for this user.

**Impact on daily study before Nov 1.** It does not block Practice or Study 10. It does occupy the home hero, a sidebar destination, formula home, and plan task rows (`+20 XP` on every live checkbox, `shots/taste-plan.png`). Attention that should go to mixed practice and one mock is spent on a medal board.

**Severity.** should-fix

**Fix sketch.** Keep XP internally if plan-task grants depend on it. Stop putting Level/title on `#/`. Demote `#/achievements` out of the default nav. Do not mount formula check-in on the daily landing. Quiet the challenge card or drop it below the fold with F1. Files: `js/view-dashboard.js`, `js/app.js` `buildNav`, `js/view-formulas.js`, `js/view-plan.js` task XP label.

**Effort.** M

### F4. Plan page copy is a build log; tasks are XP rows, not launchers

**Claim.** `#/plan` talks to the person who runs `node tools/build-plan.js`, then lists timed sets as checkboxes with `+20 XP`, so a non-CS student cannot tell whether this is the day’s work or a generator residue.

**Evidence.**
- Hero muted line: `Mirror of the vault syllabus (8-Week-Syllabus.md) — regenerate: node tools/build-plan.js` (`js/view-plan.js:34-35`). Visible in `shots/taste-plan.png`.
- Same hero: `Sep 14 → November 1, 2026 · 7 live weeks · 5+6+2 load (~16 h/wk)` — insider load code, not English.
- Live week card: eight checkboxes, each `1.7 h · +20 XP`; **0 primary buttons**. `cardCount` 9; scrollHeight 1753 px. Date is correctly Nov 1 (not re-nominating the clock).
- Week 0 · Historical still leads the page (`0/5`, “pre-rewrite week. Kept so the Set 02 carry rule resolves”).

**Impact on daily study before Nov 1.** If they follow the plan, they get a ledger without Start. If they do not, the page still teaches the wrong voice. N3-A (calendar rebuild) stays parked; this is the **copy and XP costume** on the current 7-week calendar.

**Severity.** should-fix

**Fix sketch.** Delete the regenerate/`8-Week-Syllabus.md` sentence. Translate `5+6+2` into hours. Hide Week 0 by default. Drop `+N XP` from task rows. Optional: one `Start` control per timed-set task (out of this aspect if it becomes a router change). Files: `js/view-plan.js`; `tools/build-plan.js` only if the hero string is generated.

**Effort.** S (copy); M if rows become launchers

### F5. Type system is coherent at the token level and messy at the size/file level

**Claim.** Live voices are Inter + Newsreader (+ JetBrains Mono when instrument UI appears). `fonts/` still ships Poppins, Lora, and unused Newsreader variable files; `style.css` uses 38 distinct `font-size` values.

**Evidence.**
- `fonts/` contains 20 woff2 files, **758,780 B (741 KB)**, six family names: Inter, Newsreader, EB Garamond, JetBrains Mono, Poppins, Lora.
- `css/fonts.css` declares four families (comment lines 7–17) and 11 unique `url()`s totaling **338,612 B (330.7 KB)**. Poppins and Lora are never referenced in SPA CSS (they appear in `.agents/skills/brand-guidelines/`, not in the app). Also unused on disk: `fonts/Newsreader-*-200-800.woff2` (278,908 B) and `fonts/JetBrainsMono-normal-400.woff2` (31,340 B). Dead on disk: **420,168 B (55% of the folder)**.
- Live `document.fonts` on `#/achievements`: **Newsreader 400** and **Inter 400/500/600** `loaded`. JetBrains Mono and EB Garamond declared but `unloaded`. No Poppins/Lora.
- Computed: body Inter 16px; `h1` Newsreader 28px weight 400; `.countdown-num` Newsreader 44px (`shots/taste-home.png`). Matches `css/style.css:104-109, 128-144, 366-368` (“bigger, never bolder”).
- `style.css` has **312** `font-size` declarations, **38 distinct** values, including half-pixels (`8.5`, `9.5`, `10.5`, `11.5`, `12.5`, `13.5`, `14.5`, `15.5`, `16.5`) and display outliers (`44px`, `46px`, `60px`, `84px`, `86px`, `118px` — mostly focus-page). That is not a scale; it is accretion.
- One call site uses `var(--mono, ui-monospace, …)` (`css/style.css:513`) while the token is `--mono-instr`. Undefined `--mono` falls through to system mono.

**Impact on daily study before Nov 1.** None on the wire if the unused files are never requested. The half-pixel stew does not stop a session. It does make every later UI pass more expensive, and it is leftover weight in the repo the student syncs.

**Severity.** nit

**Fix sketch.** Delete unused woff2 (Poppins, Lora, variable Newsreader, duplicate JetBrains). Map UI type to a short scale (12 / 13.5 / 16 / 19 / 28 / 44). Point the orphan `--mono` at `--mono-instr` or drop it. Files: `fonts/`, `css/fonts.css`, `css/style.css`.

**Effort.** S (delete files); M (scale)

### F6. Cream/coral/ink is real; muted captions sit on the AA edge; the palette is not light-only

**Claim.** The Anthropic-cream claim in `AGENTS.md` / DESIGN.md is what `#/` actually paints. Caption `--ink-3` on `--floor` is 3.00:1 at 12px (fails AA for normal text). Dark mode exists as a token overlay, not a second product.

**Evidence.**
- DESIGN.md:25-26 and `css/style.css:1-12`: cream floor `#f5f0e8`, ink `#141413`, coral `#cc785c`. Live computed tokens matched those hexes. Primary buttons are ink on canvas (`css/style.css:487`), which is the Claude-chat move (scarce coral), not a coral CTA.
- `style.css`: **85** hex literals (**49 distinct**), **26** `rgb`/`rgba` (**19 distinct**), **52** custom-property names, **938** `var()` uses. Discipline is in `:root`; leakage is the dark block (`css/style.css:4324-4347`), heat ramp, medal teal `--platinum: #5db8a6` (comment: “replaces the app’s only cool colour”), and focus-page hairlines.
- Contrast, computed from tokens and confirmed live on `#/`:

  | Pair | Ratio | AA normal |
  |---|---|---|
  | `--ink` on `--floor` | 16.25 | pass |
  | `--ink-2` `.muted` 13.5px on floor | 4.77 | pass |
  | `--ink-3` `.brand-sub` 12px on floor | 3.00 | fail |
  | `--accent` `#cc785c` on floor | 2.89 | fail (fill, not text — by rule) |
  | `--silver` on floor | 2.39 | fail (comment already says decorative) |

  Header comment claims `--ink-3` is “3.2:1” (`css/style.css:49-50`). Measured 3.00:1 on `#f5f0e8`. Sidebar `Prep Studio · exam Nov 1, 2026` is that 12px caption (`shots/taste-home.png`).
- Not light-only: `[data-theme="dark"]` redefines the ladder (`css/style.css:4344+`); footer control `Dark mode` is on every shot.

**Impact on daily study before Nov 1.** Body copy is fine. The exam-date line in the sidebar is the daily caption that fails AA. Unlikely to stop a 27-year-old; it is the one contrast miss that is always on screen.

**Severity.** nit

**Fix sketch.** Darken `--ink-3` one step toward `--ink-2` until ≥4.5:1 on `--floor` and `--ivory`, or use `--ink-2` for `.brand-sub`. Do not put `--ink-3` on 12px exam-critical text. File: `css/style.css`.

**Effort.** S

### F7. Decorative motion is mostly reduced-motion-safe and mostly unearned on a timed tool

**Claim.** `prefers-reduced-motion` is honored in CSS and in the three JS motion modules; the animations that remain on the default path (countdown breathe, nav letter-swap, concept-door particles) do not help a 44-day exam.

**Evidence.**
- `css/motion.css` three reduce blocks (`:76-95`, `:125-132`, `:337-359`) collapse durations to 1ms and kill breathe / shake / xp-pop / letter-swap transforms.
- JS: `PGRE.motion.reduced` (`js/motion.js:3-4, 11-17`); `concept-door-fx.js` `reduced()` + `matchMedia` listener (`:32-33, :249-252`); `focus-fx.js` “the whole module no-ops” (`:28-29`).
- Default (reduced = false) live: `.countdown-breathe` on the 44; sidebar `letterSwapNav` (hover letter cells; `innerText` of `#sidebar-nav a` triples, e.g. Dashboard + per-glyph copies); `#/concepts` canvas 1200×950 dotted wave under three doors (`shots/taste-concepts.png`).
- Concepts door is the most coherent visual in the audit — one title, three actions, cream field — and the least related to Nov 1.

**Impact on daily study before Nov 1.** Breathe on the remaining-day number is a fidget, not a timer. Letter-swap is chrome. Door particles cost a rAF loop when someone opens Concepts. None block study.

**Severity.** nit

**Fix sketch.** Do not add `.countdown-breathe` on `#/`. Leave letter-swap behind reduced-motion (already). Do not promote Concepts. Files: `js/view-dashboard.js`; no change required in `motion.css` reduce blocks.

**Effort.** S

### F8. Voice is mixed across equivalent actions

**Claim.** The same user-facing verbs are not stable: Study / Drill / Practice / Open, Put away / Archive, simulation / mock / exam.

**Evidence.**
- Today row: `Practice →` / `Drill →` or `Open →` / `Study 10 →` / mock `Open →` (`js/view-dashboard.js:431-442`). Empty-batch Review vs Today label split was already a nit in `13-review-f1.md`; it remains (`Open →` vs `Study 10 →`).
- Formula session: button `Put away` (`js/view-formulas.js:1825`); chips `put away`; peek `Put away — held out of the daily batch.` Search filter label `Put away` (`js/formula-search.js:406`). Mistake book: `Archive` (`js/view-mistakes.js:188`).
- Home teaser `Start a simulation →` vs sidebar `Mock exam` vs exam h1 `Timed mock exam` vs button `Start ETS Official Practice Test (2024)` (`shots/taste-home.png`, `shots/taste-exam.png`).
- Formula intro proudly says “vocabulary apps” (`js/view-formulas.js:554`). Plan hero says `regenerate: node tools/build-plan.js` (F4).
- AGENTS.md “No Emojis or Icons” vs dashboard activity list still mapping kinds to decorative glyphs (`js/view-dashboard.js:627-628`) and challenge rows injecting a check span (`:536`).

**Impact on daily study before Nov 1.** Small. A non-CS user can still press the black button. Inconsistent verbs make the sidebar feel like several products glued together (F1–F3).

**Severity.** nit

**Fix sketch.** Pick one verb per object: Practice (questions), Study (formulas), Drill (mistakes due), Archive (mistakes), Put away (formulas). One mock verb. Strip decorative glyphs from activity rows. Files: the view modules named above.

**Effort.** S

## Top 3 in this aspect

1. **F1 — XP hero off the fold.** Today already starts the morning; the Quark meter and empty tiles are what make `#/` feel like a game instead of a bench, every remaining day.
2. **F2 — Formula page to one action.** Study-10 is shipped; the seven tabs, check-in, and Anki settings are what still make a daily recall visit look like a vocabulary startup.
3. **F3 — Demote the medal layer.** Eighty achievements, 签到 copy, and physics-pun levels are DESIGN-faithful Duolingo. They do not help a master’s student sit Nov 1.

## Not nominated

- **Today agenda, Study 10, next-mock pointer, exam date 2026-11-01.** Live and correct (`shots/taste-home.png`, countdown 44, `Sun, Nov 1, 2026`). Do not re-open N1-narrow.
- **`store.js` read-merge-write.** Out of aspect; not probed.
- **Anthropic cream/coral/ink as rendered.** Floor `#f5f0e8`, ink `#141413`, coral `#cc785c`, Newsreader display at 400, Inter UI, ink primary buttons — this is the Claude cream system, not a drift. Official Anthropic *brand* fonts (Poppins/Lora in `brand-guidelines`) are the unused files in `fonts/`, not the live UI.
- **`#/exam` lobby hierarchy.** One primary `Start ETS Official Practice Test (2024)` (`shots/taste-exam.png`). Other ETS forms / 70-draw / legacy sit below. Pool-count paragraph is dense; pedagogy honesty stays parked.
- **`#/analytics` empty state.** Two cards, one `Start practicing →` (`shots/taste-analytics.png`). Clean.
- **`prefers-reduced-motion` contract.** Honored in `motion.css` / `motion.js` / door FX / focus FX. Not a gap to lock.
- **Concepts door layout.** Best single composition in the survey (`shots/taste-concepts.png`). Not a daily lever.
- **N4 picker wall as “cannot start”.** Closed for the Today/landing CTA. Remaining issue is F2 chrome, not a missing button.
- **N3-B Kahn notes.** Not opened.

## Uncertainties

- User’s real `file://` profile is full; this audit is a cold 8125 origin. A filled XP hero might look less empty and more like a dashboard the user already believes.
- Whether they ever open `#/achievements` or `#/concepts` is unobserved. Ranking assumes they see `#/` every morning and `#/formulas` on formula days.
- QOTD on the cold home painted a bank item with a figure; stem not quoted (copyright). Card geometry only.
- Headless `document.fonts` did not load JetBrains Mono or EB Garamond on achievements; those files still download on focus/code/serif-fallback paths.
- `REVIEW-2.md` does not constrain visual taste; if the chairman wants philosophy-doc voice applied to UI copy, that is a separate brief.
- Sidebar destination count live is **24** (15 studio links including Concept visualization + 9 topics), not the parked “23”. IA redesign still parked; F1 does not require it.
