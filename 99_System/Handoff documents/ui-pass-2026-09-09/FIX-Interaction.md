# FIX-Interaction (2026-09-09)

Owner: InteractionFixer. `?v=20260909h`. Did not commit. Did not touch the LayoutShell 860px block, `.stweek-*`, `js/app.js`, or drawer/sidebar CSS.

## What changed

1. **Exam long-stem (must).** `.exam-navrow` is no longer `position: sticky` inside `.exam-main`. Markup moves the row to the last child of `.exam-room`. The room is `position: fixed; inset: 0; height: 100dvh` flex column: bar / body / nav. Stem scrolls in `.exam-main` (desktop) or `.exam-body` (narrow). Choice E and Flag/Next no longer share a scrollport.
2. **Practice long-stem (must).** Question + feedback live in `.practice-scroll`. `.practice-actions` is appended on the card *after* that scroller (not inside `#feedback`). Next/Finish stay on screen; E scrolls above them.
3. **Exam-results glyph.** Dropped the leftover `⚠` on the missing-bank note. Bookmark stars `★`/`☆` stay — they are the bookmark *control*, not running copy, and they were not in that hunk.
4. **Empty-book ghost.** `.btn-ghost:disabled` (and `:hover`) is ivory fill, `--ink-3` text, `not-allowed` — same “this is dead” read as `.btn-primary:disabled`.
5. **Formulas intro.** Replaced “Each day **you pick** which cards to recall.” with “Each day a short batch is due — start with unseen cards, or pick them yourself.” Picker unchanged (N4 parked).

## Live measurements (Chromium)

### Exam room, long stem, `scrollIntoView({block:'end'})`

390x844 (`gr8677-94`, 778 chars). Room 0–844. Nav static at 779–844. After `block:'end'`: E 730–779, nav 779–844, overlap −0.5 px, gap 0. `elementFromPoint` on E hits `.choice`; on the row hits `#exam-prev`. Mid-scroll: E 636–685 vs nav 779–844, overlap −94.

1440x900. Room 0–900. Nav 833–900. After `block:'end'`: E 784–833, nav 833–900, overlap −0.2 px, gap 0. E hit = choice; row hit = `#exam-prev`. Mid-scroll getBoundingClientRect can report E below the `.exam-main` clip (766 px pane); that overflow is clipped, not painted over Flag/Next.

### Practice, long stem after answer (`cpg-5.5.5-2`)

390x844. `.practice-scroll` 585 / 1749. Actions `position: static` on `.practice-card`. After `block:'end'`: E 675–723, actions 735–798, gap 12, `#next-btn` in view and hit-tested.

1440x900. E 697–745, actions 757–820, gap 12, `#next-btn` hit-tested.

### Empty mistake book (fresh origin)

390x844. `#drill-all` “Nothing to drill”, `disabled`, color `rgb(142, 139, 130)` (`--ink-3`), background `rgb(239, 233, 222)` (`--ivory`), cursor `not-allowed`. `#drill-due` “Nothing due today” stays the grey primary.

### `#/formulas` landing

390 and 1440. Intro has no “you pick”. Landing still offers “Study 10 today”.

## Suites

`node tools/test-ux-interaction.js` 108/108. `node tools/test-exam-engine.js` 47/47. Did not run `test-mistakes-srs.js` (drill wiring untouched).
