# Performance2 — asset loading pass (index.html)

## What changed

1. **One cache-buster everywhere.** Every `<link rel="stylesheet">` (6, including
   `vendor/katex/katex.min.css`) and every `<script src>` (52, including the three
   vendor libraries and the four `content/bank/*.js` files) in `index.html` now
   carries the single value `?v=20260909a`. The previous mix (`20260725c`,
   `20260831b`, `20260901a`, `20260804a`, `20260718a`, `20260907a`, `20260908a`,
   `20260908d`, `20260908e`, and ~18 tags with none at all) is gone. The head
   comment explains the rule: bump the one value (search-and-replace) whenever any
   asset changes.

2. **All scripts `defer`.** Every `<script src>` gained `defer`. Deferred classic
   scripts still execute in document order, so the existing load-order contracts
   (marked -> katex -> auto-render; data -> bank -> engine -> views -> app.js ->
   motion.js) are preserved; the browser now fetches them in parallel while it
   parses the markup instead of blocking on each one. The comment block above the
   scripts was rewritten to document this.

3. **Boot guard in `js/app.js` (applied by ShellLayout on my patch).** Deferred
   scripts run while `document.readyState === 'interactive'`, so the old guard
   (`readyState === 'loading' ? wait : boot()`) would have booted synchronously
   before `motion.js` ran. New guard: boot immediately only when `readyState ===
   'complete'` (late injection: tests, devtools), otherwise wait for
   `DOMContentLoaded`, which fires after every deferred script has executed.

4. **Test regex widened.** `tools/test-visualizer-aesthetics.js` lines 730 and
   740 pinned the exact tag shape `<script src="…"></script>`; they now accept an
   optional ` defer` (`(?: defer)?`) and still reject `type="module"`.

## Files

- `index.html` (exclusive)
- `js/app.js` lines 666-675 (via ShellLayout, exact patch supplied by me)
- `tools/test-visualizer-aesthetics.js` lines 730, 740

## Measurements (headless Chromium, 1440x900, cache disabled, `http.server` on localhost, cold load of `#/`)

| metric | before (3 runs) | after (3 runs) |
| --- | --- | --- |
| script requests / bytes | 52 / 3.56 MB | 52 / 3.56 MB (unchanged; same files) |
| `domInteractive` (parser finished, DOM usable) | 125 / 57 / 53 ms | 19 / 11 / 12 ms |
| `domContentLoadedEventEnd` | 151 / 84 / 79 ms | 110 / 84 / 83 ms |
| `responseEnd` of last script (motion.js) | 125 / 57 / 52 ms | 63 / 42 / 40 ms |
| `<script defer>` count | 0 | 52 |
| console errors | 0 | 0 |

Interpretation: the HTML parser is no longer blocked behind 3.5 MB of
sequential script fetch+execute, so the shell markup (sidebar, topbar, `#view`)
is in the DOM ~4-5x sooner (domInteractive 53-125 ms -> 11-19 ms). Total
time-to-first-route (DCL) is roughly unchanged on localhost because the same
bytes still have to be parsed before `PGRE.boot` can run; the win grows with
network latency (parallel fetch vs. serial) and the page is paintable while
scripts stream. A side-by-side A/B on the same server (classic vs. defer
variant, 4 runs each) showed domInteractive 34-54 ms vs. 10-16 ms with DCL
within noise.

## Verification

- Capture-phase `DOMContentLoaded` probe registered before any deferred script:
  at DCL `PGRE.motion` present, `PGRE.views` has 16 entries,
  `renderMathInElement` is a function; `.motion-loader` element is in the DOM
  after the first route (proves `PGRE.motion.loader.start()` ran on first paint);
  11 `.katex` nodes rendered on the dashboard.
- All 17 hash routes iterated in one `tab.run` (`#/`, plan, practice,
  practice/mechanics, history, analytics, build, search, notes, mistakes,
  formulas, focus, study-time, achievements, library, exam, topic/mechanics):
  each rendered content into `#view`, 0 console errors, 0 page errors.
  (`#/topic/mechanics` renders "Unknown topic." because the topic id is not
  `mechanics`; pre-existing, not a load issue.)
- `node tools/test-file-structure.js`: all PASS.
- `node tools/test-visualizer-aesthetics.js` (the test I edited): 1091 passed,
  0 failed.

## Lazy-loading `js/view-formulas.js` — deliberately skipped

Measured compile cost of the 120 KB file in the browser: ~1.9 ms per parse
(`new Function` x5 average). With `defer` it no longer blocks the HTML parser
at all. Lazy-loading it would need a router change plus guards in
`view-dashboard.js` (`armStudyFromFill` before `location.hash = '#/formulas'`)
and `visualizer-engine.js` (`PGRE.views.formulas.getCard/getDeck` lookups),
and a placeholder to avoid a flash of empty view: real complexity for a
~2 ms gain. Not worth it; `content/bank/ets-exams.js` (963 KB, ~14 ms compile)
and `cpg-exams.js` (489 KB, ~6 ms) would be the first candidates if lazy
loading is ever wanted.

## Open items

- None blocking. When any CSS/JS file changes, bump `20260909a` in
  `index.html` (single search-and-replace).
