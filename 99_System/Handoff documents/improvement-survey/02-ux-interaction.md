# UX / interaction / visual survey

Role: SurveyUX (interaction, information hierarchy, motion, answering surfaces, formula-card UX, exam room, visualizers, narrow viewports, print CSS, ambient theme). No app-code edits. Pedagogy volume is out of scope.

## Method

Opened the live SPA at `http://127.0.0.1:51651/` (reused hub process `pgre-liveui`; did not bind port 8000). Desktop viewport 1440x900 and mobile 390x844. Walked `#/`, `#/practice/all` (started a 5-question set and answered one), `#/formulas` (home, Pick today’s cards, Lab tab, Open Simulation modal), `#/exam` (setup, started a 70-question sitting, then discarded). Toggled dark mode. Measured geometry with in-page `getBoundingClientRect` / `scrollHeight`.

Read: `index.html`; `css/style.css` (tokens, sidebar, responsive, dark, dashboard, exam); `css/motion.css`; `css/ambient.css`; `css/print.css`; `css/visualizer.css` (modal + canvas); `js/view-dashboard.js`; `js/view-practice.js`; `js/view-formulas.js` (home, picker, flip/grade); `js/view-exam.js` (setup + room); `js/timer.js` (head + paint); `js/motion.js` (summary + reduced-motion contract); `js/app.js` (`buildNav`, theme, skip-link); `js/store.js` defaults; `AGENTS.md`. Used `tools/test-ux-interaction.js` and `tools/test-visualizer-aesthetics.js` as clues, not as proof.

Did not run formatters, linters, or project test suites.

## Ranked findings

### 1. The daily home and sidebar bury the work that D-54 is for

**Claim.** Every session lands on a gamified dashboard and a 23-link sidebar. Mixed practice has no nav item. Question of the day starts below the first screen. Knowledge portals (the topic path into practice) sit ~1900px down. Five of nine topic links are off-screen or collided with the sticky Dark-mode footer. The one number that should be trusted — days until the exam — counts up from 0 on every visit and is hard-coded to Wed, Oct 28, 2026 (user exam is 2026-11-01).

**Evidence.**

- Live `#/` at 1440x900: `#view` `scrollHeight` 2942–3048px vs `innerHeight` 900. QOTD top = 575px; `.topic-grid` top = 1933px. Hero is greeting + Level/XP + countdown; then five zeroed stat tiles; then Review queue; QOTD is third. (`js/view-dashboard.js` `render()` order ~389–479; live card list.)
- Sidebar: `PGRE.buildNav` in `js/app.js:563-585` lists Dashboard, Study plan, History, Analytics, Custom quiz, Search, Notes, Mistake book, Formula recall, Focus timer, Study time, Achievements, Library, Mock exam, then Knowledge portals. Zero `#/practice` links. Live query: `navPractice: []`. The only in-view “Practice →” links are challenge jumps, themselves below QOTD.
- Sticky footer overlap, 1440x900, `scrollTop` 0: `#sidebar-footer` top 824px. OW Optics overlaps it (`top` 778–837). TS Thermodynamics overlaps it (`top` 838–919). QM, AP, SR, LM, ST are below the viewport (`top` 920–1134). `scrollHeight` 1211 vs `clientHeight` 900. CSS: `css/style.css:2965-2971` (`position: sticky; bottom: 0` on `#sidebar-footer`).
- Countdown motion: `js/view-dashboard.js:608` `countUpText(.countdown-num, 700)`. Caught mid-tween at “10 days” on a dark-mode remount; 1.2s later it settled at 50. Source writes the final value first, then tweens from 0 (`js/motion.js` countUp + `countUpText`).
- Stale date (high confidence vs this repo; user date given as 2026-11-01): `index.html:28` brand-sub “exam Oct 28, 2026”; `js/view-dashboard.js:397-398` “Wed, Oct 28, 2026”; `js/data-topics.js` `PGRE.EXAM_DATE = '2026-10-28'`; `js/store.js:65` default `examDate: '2026-10-28'`. Formula home has an editable date input that still showed 28/10/2026.

**Severity:** 9/10.

**User impact on D-54 prep.** A physics master’s student with little CS background opens this app to do today’s questions and formulas. The first screen sells XP and a moving countdown. Getting to mixed practice requires knowing a hash, scrolling past ~2kpx of widgets, or finding a topic under a Dark-mode button. Four days of exam-date error plus a counting-up “days left” erodes trust in the instrument.

**Uncertainty.** Low on geometry and source. Medium on whether the user primarily uses a laptop (sidebar) vs a tablet (finding 3). Did not interview the user about which dashboard cards they actually use.

### 2. Formula recall cannot start today’s cards without a 12k-px picker of indistinguishable rows

**Claim.** Study is not the default. With 334 cards and 0 picked, there is no Study button. “Pick today’s cards” sits at y=902 on a 900px window. The picker is a 12388px checklist of repeated topic tags (“Energy”, “Kinematics”, …) with no equation preview and no “give me 10” action. The dashboard Review queue then reports “nothing picked yet” / “0 remaining”, which reads like “you’re done”.

**Evidence.**

- Live `#/formulas`: `#study-btn` absent; `#pick-btn` present; `firstScreen.pickTop` 902.3 vs `vh` 900. Home copy: “Nothing picked yet — choose today’s cards below” plus a second “Nothing picked yet” heading (`js/view-formulas.js:630-662`).
- Stats: Cards in the deck 334; Remaining today 0 / 10; Not yet introduced 334. Check-in strip: “Not yet today”.
- `renderPicker` (`js/view-formulas.js:1148-1273`): checkbox rows using `cardName(c)` (`name || tag`). Live innerText is a wall of NEW + topic labels, not formulas. `viewH` 12388px. Filter is “Filter by name” — useless when names collide.
- Dashboard review row after async deck load: “Formula recall / nothing picked yet / Open →” (`js/view-dashboard.js:627-638`). Remaining is `formulaDayRemaining` of an empty user batch, not “334 unseen”.
- Seven mode tabs (Study / Match / Type / Quiz / Cloze / Lab / Search) plus Print, target stepper, exam-day, interval cap, direction, Reset card progress, Memory stats, Browse — all before any flip. Lab itself is a strong surface (32 sims); it is a tab on this same overloaded home, not a rescue for the Study loop.

**Severity:** 8/10.

**User impact on D-54 prep.** Formula memorization is a daily lever. Today the path is: open Formula recall → scroll past settings → pick among 334 lookalike rows → save → then Study. A non-CS user will stall or skip the deck. 54 days of that is a lot of un-reviewed formulas.

**Uncertainty.** Low on the empty-batch / below-fold / picker-height facts. Did not complete a pick-and-flip session, so live Study-card chrome (Show answer, Again/Hard/Good/Easy, rebuild overlay) is inferred from `renderCard` / `flip` (`js/view-formulas.js:1413-1562`) plus `tools/test-ux-interaction.js`, not from a screenshot of a live card. Card-title collision may also be a content-modeling issue (SurveyContent).

### 3. Narrow viewports spend the first screen on a wrap-nav of every route

**Claim.** At `max-width: 860px` the sidebar becomes a full-width wrapping chip cloud. On 390x844 the nav block is 533px tall; `#view` starts at y=628; QOTD is at y=1489. Topic codes and weights are stripped, so “Mock exam” sits beside “Classical Mechanics” with no grouping. Dark mode is just another row in that stack. The hero countdown is clipped.

**Evidence.**

- CSS: `css/style.css:1162-1190` — `body { flex-direction: column }`, `#sidebar` full width / static, `#sidebar-nav { display: flex; flex-wrap: wrap }`, `.nav-heading` / `.nav-weight` / `.nav-mono { display: none }`. Topbar arrows enlarge to 44px (good) but add a second chrome band.
- Live 390x844 screenshot: 23 links in a wrap; Dark mode under Specialized Topics; hamburger + back/forward + Home + Today 12 min + Start focus, then “Good evening.” / Level 1; countdown truncated. `viewTop` 628, `qotdTop` 1489, `navCount` 23.
- Folded sidebar (`body.sidebar-folded #sidebar { display: none }`, `css/style.css:205`) hides this on desktop but also hides all navigation on mobile if the user hits the hamburger — no drawer, just gone.

**Severity:** 7/10.

**User impact on D-54 prep.** If any daily session happens on a phone or a split-screen laptop, the app presents as a sitemap, not a study room. Even if the user is desktop-primary, 860px is a common window width.

**Uncertainty.** Medium on how often this user studies on a phone (the workflow is `python3 -m http.server` on a Mac). High on the layout itself. Did not test landscape 844x390 or a real iPhone.

### 4. Practice and exam answering are solid cores wrapped in noisy chrome; long items push choices and Next off-screen

**Claim.** Choice buttons, A–E keys, immediate feedback, assess chips, and the exam palette/timer are well built. Defaults and layout then tax the same surfaces: pace trainer is on with no settings UI and reports “0 s — under pace (target 103 s)” on a click; keyboard hint on the question stage lists K/G/T/F which only work after answering; exam `renderQuestion` focuses `#exam-q-heading`, drawing a coral ring around the meta line; answers C–E and Flag/Next sat below the fold on the first 70-question item (figure + long stem).

**Evidence.**

- Practice question (live): meta “Question 1 of 5 · Classical Mechanics · pace 0 s”; `.practice-keys` text includes “Enter next · K knew it · G guessed · T too slow · F forgot” during the unanswered stage (`js/view-practice.js:328-334`). Pace default `paceTrainer: true`, `paceTargetSec: 103` (`js/store.js:61-62`). Grep found no in-app toggle for `paceTrainer` or `keyboard` outside `store.js` / the views that consume them.
- After answering A (incorrect): feedback “Incorrect — the answer is E · +2 XP”; `.pace-mark.pace-under`; `#assess-row`; `#next-btn` focused (`js/view-practice.js:377-400`). `viewH` 869 on a 900px window for that item; longer solutions will push Next off-screen (the pendulum solution innerText was already a full derivation).
- Exam room (live, then discarded): `body.exam-fullscreen` hides sidebar/topbar (`css/style.css:1247-1248`). Timer 2:00:00, palette 70 cells, figure of a cone Hamiltonian rendered cleanly. `viewH` 1201 vs 900; choices C–E clipped. Focus ring on “Question 1 of 70 · Classical Mechanics” from `heading.focus()` (`js/view-exam.js:371-372`). Keyboard A–E / 1–5 / arrows / F / P documented in `js/view-exam.js:62-99` and covered by `tools/test-ux-interaction.js` (clue, not live-proof).
- AGENTS.md “No Emojis or Icons” vs UI: pace `⏱`, feedback `✓`/`✗`, exam `⚑`/`⚠`, activity icons in `js/view-dashboard.js:525-526`. Decorative, but they also fail as the only status for color-blind users when paired with tint-only choice states.

**Severity:** 6/10.

**User impact on D-54 prep.** Daily question volume is the other half of the loop. Extra chips and a false “under pace” on a 0-second click add guilt without teaching. In a mock sitting, having to scroll to see C–E is exactly the kind of chrome the exam room should not have — real GRE booklets put all five choices with the stem.

**Uncertainty.** Medium on how often Next is below the fold (one live miss, one live exam item). Did not sit a full timed exam, pause/submit modal, or results review. Did not verify choice-keyboard on the live page (unit test only).

### 5. Visualizer modal paints a beautiful stage and hides the controls that make it a lab

**Claim.** Lab catalog and Kepler modal look on-brand (cream grid, coral mass, KaTeX banner). The modal window is `overflow: hidden` at 828px; `.viz-modal-body` is 756px with `scrollHeight` 1466; `.viz-canvas-wrapper` is 692px. Parameters, speed, legend values, and challenge items require a scroll the first screenshot does not hint at. CSS explicitly rejected a side column (`css/visualizer.css:49-50`), so the teaching controls lost the first screen.

**Evidence.** Live Open Simulation on “Conserved Angular Momentum & Kepler’s 2nd Law”: canvas visible (“Equal areas in equal times”, apoapsis/periapsis); controls class list includes `.viz-controls-panel`, `.viz-param-slider`, `.viz-toggle-btn`, `.viz-challenge-box` — none in the first viewport. `scrollTop` 0. Ambient canvas is `pointer-events: none` (`css/ambient.css:10-20`) and dims under `body.exam-fullscreen` (opacity .35) — fine, not the issue.

Print CSS (`css/print.css`) is a serious paper path: shell hidden, tokens forced to black-on-white, `.print-sheet` for mistakes + formulas, two-column cards, KaTeX letter-spacing guard. Not exercised via `window.print`.

**Severity:** 5/10.

**User impact on D-54 prep.** The 32 labs are a differentiator for a non-CS physicist. If Open Simulation looks like a static diagram, the student will close it without finding eccentricity/speed. Lower than 1–4 because Lab is optional relative to daily questions/formulas.

**Uncertainty.** High that this one modal hides controls; low that all 32 do (same chrome). Did not drag sliders, change `simSpeed`, or check reduced-motion on the canvas.

## Nominated SINGLE worst aspect

The daily-home information architecture and chrome — dashboard density plus a 23-item sidebar that occludes topics — so the app does not behave like a D-54 study instrument on open.

This beats the formula picker (finding 2) because every session starts at `#/`, mixed practice is not in the nav at all, and the formula “0 remaining” lie is a symptom of the same “home does not present today’s work”. It beats mobile (finding 3) because the desktop rail already fails the same IA test; mobile only makes the failure occupy the whole first screen. Practice/exam chrome (finding 4) and visualizer fold (finding 5) are local. Fixing hierarchy would also make the countdown, exam date, and Review queue earn their pixels.

## Suggested fix scope if chosen

Files, not patches:

- `js/app.js` — `buildNav`: promote Practice (mixed), Formula recall, Mistake book, Mock exam; demote History / Achievements / Library / Focus / Study time; keep Knowledge portals without colliding the theme control.
- `js/view-dashboard.js` — put Review queue + QOTD + one Practice CTA above XP tiles; stop `countUpText` on `.countdown-num`; drive the label from `settings.examDate` / `PGRE.EXAM_DATE`.
- `index.html` — brand-sub exam date.
- `js/data-topics.js`, `js/store.js` — single exam-date source (Nov 1 if that is the lock).
- `css/style.css` — `#sidebar-footer` must not overlay topic links (scroll padding or non-sticky footer); `#sidebar-nav` mobile: two-tier (today’s work vs the rest), not 23 wrap-chips; optional tighter dashboard card gaps.
- `js/view-formulas.js` — if this aspect is chosen, at least surface a one-click “Study 10” on the dashboard Review row and move `#pick-btn` above the fold; full picker redesign is the next aspect, not this one.
- `css/motion.css` / `js/motion.js` — only if countdown is excluded from countUp; do not rip out reduced-motion.

Out of this nomination: pace-trainer default, exam heading `focus()`, visualizer two-pane layout, print PDF, flash-mode play.

## What I explicitly did not verify

- `window.print` / PDF of formula sheet or mistake book (read `css/print.css` + comments in `view-formulas.js` / `view-mistakes.js` only).
- `prefers-reduced-motion` in a live browser (read CSS/JS contracts only).
- Formula Study flip/grade, Match / Type / Quiz / Cloze, Search-as-flashcards, checkpoint overlay, undo — source + `tools/test-ux-interaction.js` only.
- All 32 visualizers, speed control, dark-mode canvas fill, inline-on-card visualizer.
- Full exam: pause overlay, submit confirm, auto-submit at 0:00, results/review, ETS replay start.
- Focus zen (`#/focus`), study-time page, analytics, plan checkboxes, library import, notes browser.
- Skip-link keyboard path, full axe/contrast audit, screen reader on KaTeX (extract showed MathML duplication; on-screen math looked clean).
- Real iPhone / Safari; only headless 390x844.
- Whether localStorage from this headless run matches the user’s daily profile.
- Content correctness of stems vs solutions (one practice solution looked unrelated; that is SurveyContent).
- Project-wide tests (`tools/test-ux-interaction.js` unread as a runner).
