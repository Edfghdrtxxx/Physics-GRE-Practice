# Evidence for PR 70: shorten 16 overlong supplemental recall cards

All images come from the real page, opened over `file://` in an isolated temporary browser profile with no saved study data (`attempts: 0`).

- "before" is a `git archive` of `main` at commit `f10ac72`.
- "after" is the branch `fm/pgre-simplify-cards` at commit `b34da89`.
- The gitignored question bank was made available to both copies through temporary read-only symbolic links, removed afterwards. Without the bank the page logs five `ERR_FILE_NOT_FOUND` messages for the bank scripts on either copy.
- Desktop is a 1280 x 900 viewport at 1 device pixel per CSS pixel. Phone is a 390 x 844 viewport at 2 device pixels per CSS pixel with touch emulation.
- Images are palette-compressed PNG (256 colours).

## Files in this folder

`compare-<card id>-desktop.png`: one card on the Recall Search tab at 1280 px. Left column: before, closed above open. Right column: after, closed above open.

`compare-<card id>-phone.png`: the same card at 390 px, scaled to 1 image pixel per CSS pixel. Columns: before closed, before open, after closed, after open.

There is one pair for each of the 16 changed cards:
`supp-parallel-wire-force`, `supp-drift-current`, `supp-radiation-field` (the three cards in the owner's screenshots), `supp-coaxial`, `supp-rc-rl-transients`, `supp-capacitor-energy-halving`, `supp-energy-phase`, `supp-max-power-match`, `supp-newton-momentum`, `supp-thin-film`, `supp-pendulum-mass-shift-shortcut`, `supp-brewster-angle`, `supp-nuclear-q`, `supp-lattice-heat-capacity`, `supp-qm-length-scales`, `supp-hydrogenic-z-scaling`.

## `cards/` (128 images)

`<before|after>-<card id>-<desktop|phone>-<closed|open>.png`: the single states behind the comparison images. Each is the full-page screenshot cropped to the search result card plus a 12 px margin. The search query is the card's name without its "(supplemental ...)" suffix and without one- and two-character words.

## `pages/` (48 images)

Uncropped screenshots of the three cards in the owner's screenshots on the other card surfaces, `<before|after>-page-<card id>-<desktop|phone>-<surface>.png`:

- `search-open`: Recall, Search tab, back shown ("Hide formula" state).
- `complete-view`: the "Complete view" dialog opened from that search card. It shows the back, the prompt, and the note under "Physical & Formula Notes".
- `study-front`: a Study session of that one card started from "Choose cards", before "Show answer". The Options panel is open.
- `study-back`: the same Study card after "Show answer", with the note under the back and the grade buttons.

## `logs/`

- `table.md`: per-card characters and heights, before and after.
- `totals.json`: the totals quoted in the PR description.
- `measure-before-<desktop|phone>.json`, `measure-after-<desktop|phone>.json`: for each of the 72 supplemental cards, the rendered back height, line count, note height, characters on screen, and KaTeX error count.
- `shoot-before.log`, `shoot-after.log`: one line per captured state (64 each) with `open=`, `results=`, `katexErrors=`, `backPx=`, `overflowX=`.
- `surfaces-before.log`, `surfaces-after.log`: one line per step of the surface passes, with the console listing at the end of each pass.
- `test-summary.txt`: every `tools/test-*.js` and `tools/check-katex-latex.js` in the worktree (bank present through the symbolic links).
- `test-summary-clean-export.txt`: the non-browser tests on a clean `git archive` of commit `b34da89` (no bank, no agent-harness files).
