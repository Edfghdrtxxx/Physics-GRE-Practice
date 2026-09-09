# REVIEW-InteractionB

Adversarial review of unit InteractionB. Read-only on application code. Reviewer did not edit JS/CSS and did not re-run the unit's claimed test suites.

Date of review: 2026-09-09. Exam lock: 2026-11-01.

## Method

- Read `InteractionB.md`, `HANDOFF-brief.md`, lock `09-lock.md`, and UX survey finding 2 / 5.
- `git diff` on the claimed files: `js/view-mistakes.js`, `js/view-content.js`, `js/view-formulas.js`, `css/visualizer.css`, plus the Library / FLASH hunks of `css/style.css`.
- Live Chromium against `http://127.0.0.1:8014/` (hub `pgre-revintb`, isolated origin). Viewports 1440x900 and 390x844. Cold `localStorage` except where a state was injected on purpose (resume / remaining / caught-up / archived-only).
- After LayoutFinisher froze `css/style.css` / `index.html ?v=20260909d`, a second 390x844 pass on `http://127.0.0.1:8015/` (`pgre-revintb2`) re-measured the InteractionB surfaces. Selectors and live numbers did not move.
- Did **not** run `node tools/test-*.js`, formatters, or linters. Those claims are unchecked.

Confidence language: **high** = live measurement or an unambiguous diff; **medium** = source-only or a reconstructed state; **low** = not verified.

## Verdict

The five claimed surfaces landed. Empty mistake book, library danger zone, `#/formulas` empty-day Study-without-picker, 390 tab strip, and the Kepler modal fold all match the report under live 1440/390. N4 picker is still the old 334-row wall, as parked.

No must-fix that undoes those claims. Remaining issues are a disabled ghost that still looks live, leftover "you pick" copy on the same first screen as Study 10, pre-existing glyphs in a file this unit touched, and a dead `revealTab` call that happens to be rescued by a later remount.

## Confirmed claims

### 1. Empty mistake book — **confirmed (high)**

Source: `js/view-mistakes.js` `drillLabel` 51–56, `renderBook` 208–215. Diff is only the empty-copy argument, the chip-row guard, and the in-place label updater. Archive/browse `missCard` / `[data-restore]` / archived `<details>` were not in the diff.

Live 1440x900 and 390x844, empty profile:

| Control | Text | disabled |
|---|---|---|
| `#drill-due` | Nothing due today | true |
| `#drill-all` | Nothing to drill | true |
| `#drill-size-row` | absent | — |

Placeholder "Nothing in the book yet." present. No size chips.

Archived-only (injected one archived miss, no open items): still "Nothing due today" / "Nothing to drill", both disabled, no size row, `.archived-block` summary "Archived (1) — hidden from drills and due counts", `[data-restore]` present, `[data-drill-one]` absent. Archive list behaviour unchanged.

### 2. Library danger zone — **confirmed (high)**

Source: `js/view-content.js` `render` 223–243, `mount` 296–323. The two `confirm()` calls on Reset all progress are gone. Export / Restore / Reset formula cards stay in "Your data". Reset-formula-cards still uses `confirm()` at 298 — that is the "unmoved" path, not a regression.

Live 1440 and 390:

- Last `#view > .card` is `.card.danger-zone`, heading "Danger zone", border `rgb(189, 61, 61)` (`--bad`).
- Your data buttons: Export progress / Restore from backup… / Reset formula cards.
- First click on `#reset-btn` hides `#reset-row`, shows `.danger-confirm` (`display:flex`, `--bad-tint` `rgb(245, 232, 228)`), copy "Erase all progress on this machine?", `#reset-yes` "Yes, erase everything" `.btn btn-danger`, focus on `#reset-yes`.
- Cancel restores the button and focus to `#reset-btn`.
- Global `[hidden] { display: none !important; }` (`css/style.css:37`) is what makes the `hidden` + `.btn-row { display:flex }` pair actually hide. Without that author rule the confirm row would leak; it is present.

Did not click Yes (destructive). Inline two-step is the replacement for the old double `confirm()`.

### 3. `#/formulas` empty-day landing — **confirmed (high)**

Source: `js/view-formulas.js` `renderHome` 591–607, 670–704, 756–763. `fillFormulaDayIfEmpty` in `js/srs.js` 456–474 (owned by the earlier Today unit; consumed, not rewritten here). `renderPicker` 1197+ untouched (N4 parked).

Landing predicate: `!resumeCards && M === 0 && !pickedN && fillN > 0` with `fillN = min(clampTarget, unsuspended new)`. Duplicate `#pick-btn` / `h3.caught-up` suppressed while landing.

Live, empty `formulaDay`, 334 unseen:

- `.fm-landing` under the intro: heading "Nothing picked for today yet", "Study 10 today" (`#fill-study-btn`), "Pick cards myself" (`#landing-pick-btn`).
- `#pick-btn` / `#study-btn` / `#resume-btn` absent. No `.picker-row`. `#fill-study-btn` top 488px on 1440x900 (above the fold).
- Click Study 10: `#flip-btn` present, meta "Card 1 · 10 left", no picker, `formulaDay.newIds` = `cpgf-1.1` … `cpgf-1.10` (length 10).
- Click Pick cards myself: 334 `.picker-row`, `#flash-body h2` "Pick today’s cards", `#view` scrollHeight 12388. N4 unchanged.

Other states (live, after store injection where noted):

| State | How | Result |
|---|---|---|
| Resume | leave mid-session, return | "Resume session — 10 left" + "Pick today’s cards", no landing |
| Remaining | `formulaStudy = null`, batch still 10 new | "Study 10 remaining" + "Pick today’s cards", no landing |
| Caught up | 10 ids with `lastReviewedDay = today` | "You’re all caught up" / "Today’s picks are done — the next cards return on their schedule." + Pick, no landing |

Report wording nit (not a product bug): landing sets `studyFromFill = true` then `renderHome()`; it does not call `armStudyFromFill()` or change the hash. Same flag, same `startStudy` path. Functionally the dashboard path.

### 4. Flash tabs one row + `revealTab` does not scroll the page — **confirmed (high)**

Source: `css/style.css` `.flash-tabs` ~1876–1894 (`flex-wrap: nowrap; overflow-x: auto; position: relative; scrollbar hidden`). `js/view-formulas.js` `revealTab` 246–253.

Live 390x844:

- 1 row (all seven tabs share top 119). Strip `clientWidth` 356, `scrollWidth` 465–466. Matches the report.
- Lab and Search start off the strip (`offsetLeft` 335 / 389).
- Click Search: `window.scrollY` stays 0, strip `scrollLeft` 110, Search fully inside the strip rect.
- Click Lab: `scrollY` 0, `scrollLeft` 33, Lab in view.

Implementation smell, not a user-facing miss: the click handler calls `revealTab(b)` then `switchMode` → `renderShell()` (`view-formulas.js` 264–265, 403), which throws the clicked node away and rebuilds the strip. The reveal that actually runs is the post-remount `revealTab(root().querySelector('.flash-tab.active'))` at 253. Live behaviour is still correct.

### 5. Visualizer modal fold + thumb `min-width:0` — **confirmed (high)**

Source: `css/visualizer.css` 80–89 (modal canvas `height: clamp(300px, 44vh, 420px); min-height: 0`; controls `border-top: 2px solid var(--ink-3)`), 764 (`.viz-thumb-card { min-width: 0 }`). Speed params live in the trio files (`simSpeed` min 0.2 max 3.0); not in this diff. "Cluster" in the unit report is a slider, not 0.2x–3.0x buttons.

Live Kepler `cpgf-1.35` at 1440x900:

- Canvas wrapper computed height 396px (`44vh`), used height ~380px. `min-height: 0`.
- `.viz-modal-body` top 132 / bottom 858 vs vh 900. Controls panel top 645 (report said 664; chrome shifted, still on-screen).
- Legend fully in viewport. "Parameters & Controls" fully in viewport. First range slider fully in viewport.
- Fold marker: `border-top: 2px solid rgb(142, 139, 130)`.
- Formula banner still KaTeX.

Same modal at 390x844 (not claimed, checked anyway): legend, heading, and first slider still fully in the 844px window. Canvas ~357px.

Lab catalog at 390: 32 `.viz-thumb-card`, each 326px, `min-width: 0px`, `.viz-thumb-formula` `overflow-x: auto`, page `scrollWidth` 390. KaTeX still typeset in the thumbs. The 663px-wide-card bug is gone.

## Bugs / issues

### B1. Disabled "Nothing to drill" still looks like a live ghost — nit

`js/view-mistakes.js:210–211` puts `disabled` on `.btn.btn-ghost#drill-all`. `css/style.css` styles `.btn-primary:disabled` (grey, `not-allowed`) and does **not** style `.btn-ghost:disabled`.

Live computed style on the empty-book ghost: `opacity: 1`, `color: rgb(20, 20, 19)` — same as an enabled ghost. The primary "Nothing due today" is visibly grey. A non-CS user can read the second control as clickable; the click is a no-op because of the HTML `disabled` flag, not because it looks dead.

Severity: **nit**. Does not fail the assigned empty-book copy. Confidence: **high**.

### B2. Formula intro still says the user must pick, on the same screen as Study 10 — nit

`js/view-formulas.js:555`: "Each day **you pick** which cards to recall." Landing (591–607) then offers an auto-fill. Stats still print "Remaining today 0 / 10". The duplicate caught-up heading is gone, as claimed; the intro line and the 0/10 tile were not.

Severity: **nit** (copy honesty, not a stall — the primary is Study 10 and it works). Confidence: **high**.

### B3. Pre-existing status glyphs in a file this unit edited — residual

Wave lock: no emojis / decorative icons. InteractionB's `view-mistakes.js` diff does not add any. The file still ships `⚑` (`luckyChip` 91), `✗`/`✓` (`distractorBlock` 109, `missCard` 179–181, drill feedback 465). Not introduced this wave; not cleaned either.

No new glyphs in `view-content.js`, `view-formulas.js`, `css/visualizer.css`, or the Library/FLASH CSS hunks. Live landing / danger zone / tab strip / Kepler modal: no emoji in `#view` innerText.

Severity: **residual / process**. Confidence: **high** on "not introduced"; out of this unit's stated scope to sweep.

## Concurrent CSS

`css/style.css` grew while siblings edited (4185 → 4225 lines). InteractionB's selectors survived the LayoutFinisher freeze (`?v=20260909d`) and are still unique:

- `.danger-zone`, `.btn-danger`, `.danger-confirm`, `.danger-confirm-text` — Library block ~755–765 only.
- `.flash-tabs` nowrap/overflow and `.fm-landing` — FLASH block ~1878–1899 only.

No second `.btn-danger` or `.fm-landing`. `.btn-danger-ghost` is a pre-existing global (library Remove file, exam discard) and does not collide with `.btn-danger`.

Post-freeze live 390x844 (same numbers as the first pass): empty-book copy + disabled drills, no size chips; danger zone last card + inline confirm; landing "Study 10 today"; tab strip 1 row, `clientWidth` 356 / `scrollWidth` 466, Search click `scrollY` 0 and tab in view; lab thumbs 326px, `min-width: 0`, page `scrollWidth` 390, KaTeX still on thumbs.

Confidence on "no collision among InteractionB's new names": **high**. Confidence that a later sibling rule does not override them: **high** after the freeze snapshot (was medium).

`css/visualizer.css` is InteractionB-only this wave. Modal height rule (0,2,0) beats the 480px `min-height: 220px` (0,1,0), so the clamp holds on a 390-wide window.

## LaTeX

Still used. `formulaHTML` → `PGRE.formulaTextHTML` (`view-formulas.js:288–290`). Viz thumbs and modal banner render `.katex` / `.katex-display` (live). Kepler `formulaLatex` unchanged. No unicode-math substitution in this unit's diff.

## Unchecked / uncertain

- Claimed suites (`test-visualizer-aesthetics.js` 1091, `test-formula-checkin.js` 71, `test-mistakes-srs.js` 36, `test-ux-interaction.js` 108): **not re-run**. Mark **uncertain**.
- Clicking "Yes, erase everything" end-to-end: **not run** (destructive). Wiring is source + live up to the confirm row.
- Open-but-not-due mistake book (due empty, open > 0): chips should appear, "Drill all (N)" enabled. Source-only. **medium**.
- Dark mode on `.danger-zone` / modal fold: **not checked**.
- `prefers-reduced-motion` on the modal canvas: **not checked**. `css/motion.css` already collapses `--dur`; this unit did not touch it.
- Dragging `simSpeed` 0.2–3.0: **not checked**. Presence of the param is source-only in the trio files, outside this diff.
- Natural (non-injected) caught-up after grading 10 cards: reconstructed via `lastReviewedDay`. Predicate matches; a full grade loop was not sat.
- `/tmp/pgre-interactionB/` screenshots from the unit: **not found / not re-opened**. Live shots taken under `/tmp/pgre-revintb-*.png` instead.

## Report vs code, short

The unit report is accurate on behaviour. Inflations: "exact path the dashboard arms via `armStudyFromFill`" (same flag, different entry); "speed cluster 0.2x–3.0x" (it is a slider); controls top 664px (live 645px at 1440x900 after later chrome). None of those break the acceptance list.
