---
name: verify
description: Launch and drive this site end-to-end (headless Chrome + CDP, isolated profile) to verify changes.
---

# Verifying Physics GRE Prep Studio

Static site, no build. State lives in localStorage/IndexedDB **per origin** — never
verify against `http://localhost:8000` (the user's real progress lives on that origin).
Serve on a different port for a clean slate:

    python3 -m http.server 8123   # from the repo root

The Claude-in-Chrome extension blocks localhost here; use headless Chrome over CDP
instead — zero dependencies, Node ≥22 has global `fetch` and `WebSocket`:

    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
      --headless=new --remote-debugging-port=9333 \
      --user-data-dir="$(mktemp -d)" --no-first-run "http://localhost:8123/"

Connect: `GET http://127.0.0.1:9333/json/list` → the page target's
`webSocketDebuggerUrl` → send `{id, method, params}` frames. The workhorses are
`Runtime.evaluate` (`returnByValue: true, awaitPromise: true`) and
`Page.captureScreenshot`. A ~60-line driver (`connect/ev/shot/go/click`) suffices.

## Flows worth driving

- Practice set (`#/practice/all`): answers must append to `state.attempts`, update
  `state.sessions`, and create `state.mistakes[qid]` on a miss.
- `#/history`: session rows, topic/correct/missed filters, show-more paging.
- `#/mistakes`: drill due/all (correct → ladder climbs, entries persist), archive →
  restore, a repeat miss resets to step 0.
- `#/formulas`: inject a test deck with
  `PGRE.contentDB.put({id:'formula-deck', kind:'formula-deck', cards:[...]})`,
  study (space flips, 1–4 grades, Again requeues), then delete the record.
- Time travel: set `srs.due = PGRE.srs.today()` via evaluate, re-route, and check
  dashboard Review queue + sidebar badges react.

## Gotchas

- Hash routes don't reload — wait ~250 ms after `location.hash` changes; the formula
  deck loads async from IndexedDB (~400 ms).
- To find the correct answer for the on-screen question, match the question's
  plain-text prefix (text before the first `$`, tags stripped) against
  `PGRE.QUESTIONS` — KaTeX rewrites the math spans, so full-text matching fails.
- `confirm()` dialogs guard file-remove and progress-reset — don't click those
  headless (they hang the target).
