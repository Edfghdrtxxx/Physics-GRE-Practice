# REVIEW — FIX-Interaction (adversarial)

Reviewer: ReReviewFix. Date: 2026-09-09. Read-only on application code. Write-only this file.

Live Chromium against `http://127.0.0.1:8066/` (`?v=20260909h`) at **390x844** and **1440x900**. Isolated origin; store cleared or surgically emptied per surface. This is not a rubber stamp of `FIX-Interaction.md`. Numbers below were re-measured; theirs are cited only to compare.

Confidence: **high** = live geometry / hit-test; **medium** = source-only; **low** = not exercised.

Line numbers as of this write.

---

## Method

- Read `FIX-Interaction.md`, `REVIEW-InteractionA.md` (medium exam-nav covering E; low practice Next trapped in `#feedback`), `REVIEW-InteractionB.md` (B1 ghost look, B2 intro copy).
- Source: `js/view-exam.js`, `js/view-practice.js`, `js/view-formulas.js`, `js/view-mistakes.js`, exam/practice/ghost hunks of `css/style.css`. Did not edit JS/CSS/HTML.
- Assigned probes: `choice.scrollIntoView({block:'end'})`, a mid-scroll with E on screen, `elementFromPoint` on E’s centre and on Flag/Next, empty `#/mistakes`, `#/formulas` intro + Study 10, `⚠` grep, 390 LayoutShell drawer / hero / study-time overflow.
- `gr8677` is an `ETS_DRILLS` id, not in `examById` / replay list, so `create({ source: 'gr8677' })` returns null. Their `gr8677-94` sitting is not a UI path. Re-measured on a real sitting (`gr1777` Q87, figure + long choices) and by splicing `gr8677-94` into that sitting to match their claimed qid.
- Did **not** run `node tools/test-ux-interaction.js` (optional). Treat 108/108 as **unchecked**.

---

## Verdict

**Pass** on all five assigned fixes. The 0 px / −0.5 px “gap” in the fixer report is real and is **not** a leftover sticky overlay. `scrollIntoView({block:'end'})` parks E flush with the scrollport floor; the nav is a sibling below that clip, `position: static`. Centre-of-E hit-tests a `.choice`. Flag/Next hit-test themselves and accept a DOM click. LayoutShell 390 drawer / hero / study-time overflow still hold.

---

## 1. Exam long-stem — **pass (high)**

Source: `js/view-exam.js:302–335` (nav is last child of `.exam-room`, not inside `.exam-main`). `css/style.css:1346–1354` (room `position:fixed; inset:0; height:100dvh` flex column), `:1393–1403` (desktop `.exam-main` scrolls), `:1432–1444` (`.exam-navrow` `position:static; flex:0 0 auto`), `:1586–1597` (narrow: `.exam-body` is the scroller, `.exam-main { overflow:visible }`).

Sticky overlay is gone. Choice E and Flag/Next do not share a scrollport.

### 390x844 — `gr1777-87` (real path)

Room 0–844. Nav static **779–844** (Flag/Next 790–828). `.exam-body` clip 175–779, `overflow-y:auto`, `scrollHeight` 1596.

| probe | E | nav | gap | overlapY | `elementFromPoint` E centre | Flag / Next |
|---|---|---|---|---|---|---|
| `block:'end'` | 730.34–778.84 | 779–844 | **0.16** | −0.16 | `.choice` **E** | `#exam-flag` / `#exam-next` |
| E mid-pane (scrollTop +220) | 510.94–559.44 | 779–844 | 219.56 | −219.56 | `.choice` **E** | both nav buttons |

After `block:'end'`, E bottom−1 and `nav.top − 1` also hit choice E. `nav.top + 2` hits `.exam-navrow`. DOM click on `#exam-flag` toggled `Flag for review` → `Unflag` while E was at `block:'end'`.

Their claimed 0 px / overlap −0.5 is the same flush seam (I measure **0.16 px**, not overlap). It is the `block:'end'` alignment against a sibling footer, not E painted under the row.

### 390x844 — spliced `gr8677-94` (their qid; 778 HTML chars)

`block:'end'`: E 639.48–778.55, nav 779–844, gap **0.45**, overlap −0.45. Centre hits `.choice-body` (letter E). Bottom−1 and `nav.top − 1` hit choice E. Flag/Next hit-test their buttons.

### 1440x900 — `gr1777-87`

`.exam-main` is the scroller (`overflow-y:auto`, pane **766 px**, clip bottom **833**). Nav static **833–900**.

| probe | E | nav | gap | E centre |
|---|---|---|---|---|
| `block:'end'` | 784.19–832.69 | 833–900 | **0.31** | `.choice` E |
| E 24 px above nav | 760.19–808.69 | 833–900 | 24.31 | `.choice` E |

Matches their 784–833 vs 833–900 within a fraction of a pixel.

Spliced `gr8677-94` at 1440 `block:'end'`: E 761.56–833.13 vs nav 833–900, signed overlap **+0.13 px**. Centre (y 797) still hits `.choice-body`. `nav.top − 1` (y 832) hits E; `nav.top + 2` hits the row. The +0.13 px is subpixel clip-rounding, not a finger-sized overlay. See nits.

### Mid-scroll when E’s *unclipped* box crosses the nav

If you wind the scroller back so E’s `getBoundingClientRect()` sits in the nav band:

- 390 straddle: E 754.94–803.44 vs nav 779–844 (overlap +24). **Visible** centre of E (y 767) hits `.choice` E. Unclipped centre (y 779.2) and E bottom−1 hit `#exam-flag` / `.exam-navrow`.
- 1440 “mid” with `scrollTop` pulled toward 0: E 872–921 vs clip bottom 833. Unclipped centre hits `.exam-navrow`; just-above-nav hits choice **D** (the choice actually in the pane). `visH` negative — E is not painted there.

That is clip, not the old sticky cover. You cannot tap E in the Flag/Next band because E is not painted there. The fixer report’s “overflow is clipped, not painted over Flag/Next” is accurate. The assigned `block:'end'` + “E in view” probes do **not** collide.

Screenshot of 390 `block:'end'`: E fully above Back / Flag / Next with a hairline rule; nav tappable.

---

## 2. Practice long-stem after answer — **pass (high)**

Source: `js/view-practice.js:415–439` (question + `#feedback` inside `.practice-scroll`), `:498–504` (`.practice-actions` appended on `.practice-card` *after* the scroller). `css/style.css:531–541, 602–612` (card flex column, actions `position:static`).

`cpg-5.5.5-2` after answering, `E.scrollIntoView({block:'end'})`:

| vp | E | actions | gap | `#next-btn` in view | E centre | Next hit |
|---|---|---|---|---|---|---|
| 390x844 | 674.59–723.09 | 735–798 static | **11.91** | yes (747–785) | `.choice` E | `#next-btn` |
| 1440x900 | 696.69–745.19 | 757–820 static | **11.81** | yes (769–807) | `.choice` E | `#next-btn` |

Their 390 numbers (E 675–723, actions 735–798, gap 12) and 1440 (E 697–745, actions 757–820, gap 12) match. Feedback is inside the scroller; actions are not inside `#feedback`. Next stays on screen while E is in view. E is not covered.

At 390 with E `block:'center'` (397–446), Next remained on screen (hit-tested). The old “Next trapped in `#feedback`” failure is gone.

---

## 3. Empty mistakes `#drill-all` looks disabled — **pass (high)**

Source: `js/view-mistakes.js:210–211` (`disabled` on `.btn.btn-ghost#drill-all`). `css/style.css:489–495` (new `.btn-ghost:disabled, .btn-ghost:disabled:hover`: `--ink-3` / `--ivory` / `not-allowed`).

Live 390, empty book (`mistakes = {}`):

| control | text | disabled | color | background | cursor |
|---|---|---|---|---|---|
| `#drill-due` | Nothing due today | true | `rgb(250, 249, 245)` on `rgb(142, 139, 130)` | grey primary | `not-allowed` |
| `#drill-all` | Nothing to drill | true | **`rgb(142, 139, 130)`** (`--ink-3`) | **`rgb(239, 233, 222)`** (`--ivory`) | `not-allowed` |

`#drill-size-row` absent. Placeholder “Nothing in the book yet.” present. B1 (live-looking ghost at `rgb(20, 20, 19)` / transparent) is closed. Matches the fixer table.

---

## 4. `#/formulas` intro + Study 10 without picker — **pass (high)**

Source: `js/view-formulas.js:555` (intro). Landing `:591–607` (`#fill-study-btn` “Study N today”).

Live 390 and 1440, empty `formulaDay`:

- Intro: “Each day a short batch is due — start with unseen cards, or pick them yourself.” **No** “you pick” / “you must pick”.
- `.fm-landing` present. `#fill-study-btn` = “Study 10 today”. `#pick-btn` absent.
- 390 click Study 10: `#flip-btn` “Show answer”, meta “Card 1 · 10 left”, **0** `.picker-row`, `formulaDay.newIds` = `cpgf-1.1` … `cpgf-1.10`.

B2 is closed on the landing screen. Residual copy that is **not** this fail: `view-formulas.js:702` still says “nothing is chosen for you” on the non-landing empty path (`!landing`). Landing suppresses that block. Stats still print “Remaining today 0 / 10” on the empty-day home. Neither blocks Study 10.

---

## 5. Exam-results missing-bank `⚠` — **pass (medium, source)**

Assignment: source grep is enough if the branch is hard to hit.

`⚠` : **zero** matches under `js/` and `css/`. `js/view-exam.js:640–643` is now `exam.missing + ' question(s) could not be matched…'` with no glyph. Bookmark `★`/`☆` not re-checked (out of this hunk). Stale CSS comment at `css/style.css:1418` still talks about a `⚑` glyph on the flag chip — residual comment, not running copy.

---

## 6. LayoutShell not regressed — **pass (high)** at 390

Did not treat the LayoutShell review as gospel. Re-measured after InteractionFixer’s exam/practice/disabled CSS.

390 `#/`:

- `PGRE.isNarrow()` / `max-width: 860px` true.
- `#sidebar` `position:fixed`, `transform: matrix(1,0,0,1,-280,0)`, `x: -280`, width 280, `pointer-events: none`, `inert`, `aria-hidden="true"`.
- `#sidebar-nav` column, `flex-wrap: nowrap`, 23 links.
- `body` class `""` (no `sidebar-open`). Toggle `aria-expanded=false`.
- `.hero.card` top **115**, left 16, 358×303. Above the fold (vh 844).

390 `#/study-time`: `documentElement.scrollWidth === clientWidth === 390`. Eight `.stweek-lab` columns 30 px, `min-width: 0`. `.stweek-x { white-space: normal }`.

Drawer `@media (max-width: 860px)` block still at `css/style.css:1217–1284`. `.stweek-lab` / `.stweek-x` at `:4159, 4162`. InteractionFixer’s `body.exam-fullscreen { overflow: hidden; height: 100%; }` (`:1344`) did not undo the overlay.

---

## Bugs / nits (not success-criteria fails)

### [nit] `block:'end'` is flush, not gapped

`css/style.css:1432–1444` plus no `scroll-margin-bottom` on `.choice`. Gap is 0.16–0.45 px at 390 and 0.31 px at 1440 Q87. That is what `block:'end'` *does*. Do not read the fixer’s “gap 0 / overlap −0.5” as a remaining cover. Centre-of-E and Flag/Next are distinct hit targets.

### [nit] 1440 spliced `gr8677-94` unclipped bottom 0.13 px past nav.top

E 761.56–833.13 vs clip/nav 833. `elementFromPoint(cx, E.bottom − 1)` landed on `.exam-navrow`; `nav.top − 1` landed on E. Subpixel seam on a taller choice, not a tap collision on E’s centre. Same architecture as Q87 (gap 0.31, no overlap).

### [nit] `gr8677-94` is not a startable exam

`js/exam-engine.js:154–164` `examById` only walks `ETS_EXAMS` + `BOOK_EXAMS`. `gr8677` is a drill. The fixer either spliced the qid or measured it outside `create({ source })`. Geometry still holds on GR1777 Q87 (the path a user can actually open).

### [nit] leftover “nothing is chosen for you”

`js/view-formulas.js:702`, only when `!landing`. Not on the `#/formulas` first screen this ticket named.

### [residual] flag-chip CSS comment still names `⚑`

`css/style.css:1418`. Pre-existing vs this pass; not a glyph in the DOM.

---

## Unchecked / uncertain

- `node tools/test-ux-interaction.js` 108/108 and `node tools/test-exam-engine.js` 47/47: **not re-run**. Mark **uncertain**.
- Missing-bank results page live: **not hit** (source only, as allowed).
- Dark mode / `prefers-reduced-motion` on exam-room / practice-scroll.
- Real device finger on the 0.2 px seam.
- 1440 desktop rail `navBottom == footerTop` (not in this ticket; 390 drawer was).
- Open-but-not-due mistake book (due empty, open > 0): not re-opened after emptying.

---

## Report vs live, short

Accurate on behaviour and on the 390/1440 practice numbers. Exam “gap 0 / overlap −0.5” is the flush `block:'end'` seam; I measure 0.16–0.45 px at 390 and 0.31 px at 1440 Q87, with no centre-of-E → nav hit. Mid-scroll unclipped rects can overlap the nav band; those pixels are clipped and hit the nav, which is the intended split of scrollport vs footer. Empty-book ghost colours, formulas intro, Study 10, and the `⚠` deletion all hold. LayoutShell 390 overlay / hero / study-time overflow were not undone.
