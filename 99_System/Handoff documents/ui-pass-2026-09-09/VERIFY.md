# UI pass verification — 2026-09-09

Repo: `/Users/Reid Hu/Physics GRE`
Cache-buster in `index.html`: `20260909h` (confirmed; all stylesheet/script `?v=` tokens).
Verifier did not edit product JS/CSS/HTML. No commit.

Server: hub process `pgre-verify-20260909h` = `python3 -m http.server 8765 --bind 127.0.0.1` from repo root. Stopped after measurements (SIGTERM / exit 143).

Proof: `node tools/test-*.js` stdout in `/tmp/pgre-verify-20260909h/*.out`; live Chromium via Puppeteer (`setCacheEnabled(false)`, `index.html?v=20260909h` + hash).

---

## 1. Suites — every `tools/test-*.js` (12 files)

Run from repo root, sequential, 2026-09-09. Glob matched exactly these 12; no extras.

| File | Exit | Passed | Failed | Notes |
|---|---|---|---|---|
| `tools/test-bank.js` | 0 | 23 | 0 | |
| `tools/test-exam-engine.js` | 0 | 47 | 0 | |
| `tools/test-file-structure.js` | 0 | 7 | 0 | `[PASS]` lines; "All canonical structure and placement checks passed successfully." |
| `tools/test-focus-sound.js` | 0 | 66 | 0 | ALL OK |
| `tools/test-formula-checkin.js` | 0 | 71 | 0 | ALL GREEN |
| `tools/test-mem-history.js` | 0 | 36 | 0 | ALL PASS |
| `tools/test-mistakes-srs.js` | 0 | 36 | 0 | |
| `tools/test-oscillator-chrome.js` | 0 | (no numeric tally) | 0 | "Dynamic Chrome CDP testing completed successfully!" Own ephemeral HTTP + Chrome. |
| `tools/test-srs-anki-chrome.js` | **1** | 0 recorded | **1** | See fail list. Own ephemeral HTTP + Chrome. |
| `tools/test-srs-intervals.js` | 0 | 59 | 0 | |
| `tools/test-ux-interaction.js` | **1** | **107** | **1** | See fail list. |
| `tools/test-visualizer-aesthetics.js` | 0 | 1091 | 0 | ALL GREEN |

**10 pass / 2 fail.**

---

## 2. Seventeen routes (Chromium, cache disabled)

Base: `http://127.0.0.1:8765/index.html?v=20260909h` + hash.
Viewport 1280x800. Listeners: `console` (type=error), `pageerror`, `response` status >= 400.
`#view` content = element present and `innerText.trim().length > 0`.

Known (not a fail): `#/topic/mechanics` renders "Unknown topic."; `#/practice/mechanics` shows 0 available (id is not `mechanics`).

| Hash | `#view` content | viewLen | error count (console.error + pageerror + HTTP>=400) | view start |
|---|---|---|---|---|
| `#/` | yes | 3033 | 0 | Good morning. Level 0 · Quark … |
| `#/plan` | yes | 1927 | 0 | Review plan July 13 → November 1, 2026 … |
| `#/practice` | yes | 293 | 0 | Practice — All topics (mixed) 366 questions available. … |
| `#/practice/mechanics` | yes | 251 | 0 | Practice — All topics (mixed) 0 questions available. … (known) |
| `#/history` | yes | 583 | 0 | History Every answer you have ever given … |
| `#/analytics` | yes | 453 | 0 | Analytics & trends Where your practice is going … |
| `#/build` | yes | 858 | 0 | Custom quiz Assemble a practice set … |
| `#/search` | yes | 394 | 0 | Search One box across questions … |
| `#/notes` | yes | 391 | 0 | Notes & bookmarks Everything you have starred … |
| `#/mistakes` | yes | 392 | 0 | Mistake book Every question you have missed … |
| `#/formulas` | yes | 1032 | 0 | Study Match Type Quiz Cloze Lab Search Print formula sheet … (4 console *info* KaTeX slow-network fallbacks; not errors) |
| `#/focus` | yes | 461 | 0 | RUN 2026-09-09 STANDBY … |
| `#/study-time` | yes | 1504 | 0 | Study time A deeper look at how much you show up … |
| `#/achievements` | yes | 5327 | 0 | Achievements 0 of 80 unlocked … |
| `#/library` | yes | 866 | 0 | Library Everything stays on this machine … |
| `#/exam` | yes | 1639 | 0 | Timed mock exam A full exam-room simulation … |
| `#/topic/mechanics` | yes | 14 | 0 | Unknown topic. (known) |

All 17: view content yes, error count 0. No `pageerror`, no HTTP >= 400, no `requestfailed`.

---

## 3. Layout smoke — 390x844

After `setViewport({width:390,height:844})` a `resize` event was dispatched (headless `setViewport` without resize can leave `inert` on the desktop rail; not scored as a fail).

### `#/` closed overlay drawer (not wrap-cloud)

| Measure | Value |
|---|---|
| innerWidth x innerHeight | 390 x 844 |
| documentElement clientWidth / scrollWidth | 390 / 390 |
| `body.sidebar-open` | false |
| `#sidebar-toggle` `aria-expanded` | `"false"` |
| `#sidebar` position | `fixed` |
| `#sidebar` transform | `matrix(1, 0, 0, 1, -280, 0)` (translateX -280) |
| `#sidebar` getBoundingClientRect().left | **-280** |
| `#sidebar` width | 280 |
| `#sidebar` flex-wrap | `nowrap` |
| `#sidebar-nav` flex-wrap | `nowrap` |
| `#sidebar` inert / aria-hidden | true / `"true"` |

Drawer is off-canvas overlay, not an in-flow wrap-cloud.

### `.hero.card` above the fold on `#/`

| Measure | Value |
|---|---|
| selector | `div.hero.card.stagger-in` |
| top | **121** px |
| bottom | 423.6875 px |
| left / width | 16 / 358 |
| `top < innerHeight` (844) | **true** |

### `#/study-time` no horizontal overflow

| Measure | Value |
|---|---|
| hash | `#/study-time` |
| `document.documentElement.clientWidth` | **390** |
| `document.documentElement.scrollWidth` | **390** |
| `scrollWidth === clientWidth` | **true** |
| `document.body.scrollWidth` | 390 |

Layout AC holds.

---

## 4. Fail list (precise)

1. **`tools/test-srs-anki-chrome.js` exit 1**
   Full stdout:
   ```
   FAIL Error: Study button missing (card not in today batch?) {"toggle":"Capped to exam day","examDate":true}
       at main (/Users/Reid Hu/Physics GRE/tools/test-srs-anki-chrome.js:204:28)
   ```
   Seeded card `srs-test-1` due today; exam-cap toggle and exam-date input rendered (`toggle === "Capped to exam day"`, `examDate: true`); `#study-btn` text was empty/missing. No product edit (not proven here whether due-batch logic, button id, or headless timing).

2. **`tools/test-ux-interaction.js` 107 passed, 1 failed, exit 1**
   Assertion (line 1242): `keyboard undoLast restored the same SRS state the click path restored`.
   Preceding asserts in the same block passed: click undo pops `cardReviews`; Ctrl+Z while `#flash-input` focused removes `#flash-undo` and decrements `cardReviews.length`. Fail is the trailing-id check after keyboard undo (`last.cardReviews[].id === keyUndoId` with length still > 0). Overlay / Open Simulation asserts after this still passed. No product edit.

---

## 5. Verdict

**FAIL.**

- Suites: not all pass (2 of 12 fail, listed above).
- 17 routes: all have `#view` content and 0 console errors / pageerrors / HTTP >= 400.
- 390 layout smoke: holds (closed overlay drawer, `.hero.card` top 121px above the fold, study-time `scrollWidth === clientWidth === 390`).

Pass would require all suites green **and** the route table **and** layout smoke. Routes + layout are green; suites are not.
