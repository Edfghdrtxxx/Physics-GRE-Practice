# PR 82 evidence

Screenshots from an isolated Chrome profile on `127.0.0.1` (fixture questions; not the captain's file:// studio).

- `01-table-light.png` — mock exam room, Table of Information drawer open, light theme. Full table including peta.
- `02-table-dark.png` — same sitting, dark theme.
- `03-table-700.png` — 700 px window; name/equation columns stacked; prefixes begin below the constants (body scrolls).
- `04-table-mid-slide.png` — drawer held at `translateX(-42%)` with `transition: none`. Headless Chrome does not interpolate CSS mid-transition.
- `e2e-log.txt` — full `tools/test-exam-table-chrome.js` output (54 passed, 0 failed).
