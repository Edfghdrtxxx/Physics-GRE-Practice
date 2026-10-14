---
name: verify
description: Launch and drive this site end-to-end (headless Chrome + CDP, isolated profile) to verify changes.
---

# Verifying Physics GRE Prep Studio

Static site, no build. State lives in localStorage/IndexedDB **per origin**.
Never verify against the user's daily-progress origin (often
`file:///…/Physics GRE/index.html`; sometimes `http://localhost:8000` — they do
**not** share storage). Serve an isolated port + fresh profile:

    python3 -m http.server 8123   # from the repo root

The Claude-in-Chrome extension blocks localhost here; use headless Chrome over CDP
instead — zero dependencies, Node ≥22 has global `fetch` and `WebSocket`. Start
Chrome on `about:blank`, never on the app:

    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
      --headless=new --remote-debugging-port=9333 \
      --user-data-dir="$(mktemp -d)" --no-first-run about:blank

Connect: `GET http://127.0.0.1:9333/json/list` → the page target's
`webSocketDebuggerUrl` → send `{id, method, params}` frames. Send these three
first, in this order, so the app never reaches the OrbitOS status bridge (see
Gotchas):

1. `Network.enable`
2. `Network.setBlockedURLs` with
   `{urls: ['*://127.0.0.1:4789/*', '*://localhost:4789/*']}`
3. `Page.navigate` with `{url: 'http://localhost:8123/'}`

Count the `Network.requestWillBeSent` and `Network.responseReceived` events whose
URL is on port 4789. Before you quit Chrome, assert that `responseReceived` is 0.

The workhorses are `Runtime.evaluate` (`returnByValue: true, awaitPromise: true`)
and `Page.captureScreenshot`. A ~60-line driver (`connect/ev/shot/go/click`)
suffices. Keep its one connection open until Chrome quits.

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

- **Status bridge on port 4789.** `js/status.js` POSTs `PGRE.buildStatusSummary()`
  to `http://127.0.0.1:4789/pgre-status` when `index.html` loads and every 30 s
  after. The bridge accepts any origin and replaces `~/.orbitos/pgre-status.json`,
  which agents read as the user's real study status. One load from a test profile
  therefore overwrites the real status with an empty or fixture summary. Every
  automated session that loads `index.html` needs one of two guards:
  - Raw CDP: the three calls in the launch recipe. Reference:
    `tools/test-pack-launch-chrome.js`, `tools/test-intensity-chrome.js`. The
    block belongs to one tab and one CDP connection. A second tab
    (`Target.createTarget` on `about:blank`) needs `Network.enable` and
    `Network.setBlockedURLs` before it navigates; reference:
    `tools/test-srs-anki-chrome.js`. When the connection closes, the block ends
    and the open page posts at its next 30 s tick, so quit Chrome before you
    disconnect; a driver that reconnects for each step is unguarded between
    steps.
  - `chrome-devtools-axi` (it cannot block a URL): serve the repo from the test's
    own Node server with the response header
    `Content-Security-Policy: connect-src 'self'; report-uri /__csp-report`,
    count the reports whose `blocked-uri` is the bridge, and fail if the count
    is 0. Reference: `tools/test-exam-pause-chrome.js`. `python3 -m http.server`
    cannot add a response header, so the recipe above must use the CDP block.
- Hash routes don't reload — wait ~250 ms after `location.hash` changes; the formula
  deck loads async from IndexedDB (~400 ms).
- To find the correct answer for the on-screen question, match the question's
  plain-text prefix (text before the first `$`, tags stripped) against
  `PGRE.QUESTIONS` — KaTeX rewrites the math spans, so full-text matching fails.
- `confirm()` dialogs guard file-remove and progress-reset — don't click those
  headless (they hang the target).
