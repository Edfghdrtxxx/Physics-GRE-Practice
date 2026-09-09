# UI pass re-verification — 2026-09-09 (VERIFY-2)

Repo: `/Users/Reid Hu/Physics GRE`
Cache-buster in `index.html`: `20260909i` (confirmed; every stylesheet/script `?v=` token).
Verifier did not edit product JS/CSS/HTML. No commit. No formatters.

Server: hub process `pgre-verify-20260909i` = `python3 -m http.server 8766 --bind 127.0.0.1` from repo root. Stopped after measurements.

Proof: `node tools/test-*.js` stdout in `/tmp/pgre-verify-20260909i/*.out`; live Chromium via Puppeteer (`setCacheEnabled(false)`, `index.html?v=20260909i` + hash); measurements in `/tmp/pgre-verify-20260909i/chromium.json`.

Prior VERIFY.md (cache `20260909h`) was **FAIL** on 2 suites. TestFixer then landed `20260909i`. This pass re-runs the full contract.

---

## 1. Suites — every `tools/test-*.js` (12 files)

Run from repo root, sequential, 2026-09-09. Glob matched exactly these 12; no extras. All exit 0.

| File | Exit | Passed | Failed | Notes |
|---|---|---|---|---|
| `tools/test-bank.js` | 0 | 23 | 0 | 0.02 s |
| `tools/test-exam-engine.js` | 0 | 47 | 0 | 0.02 s |
| `tools/test-file-structure.js` | 0 | 7 | 0 | `[PASS]` lines; "All canonical structure and placement checks passed successfully." 0.02 s |
| `tools/test-focus-sound.js` | 0 | 66 | 0 | ALL OK. 0.02 s |
| `tools/test-formula-checkin.js` | 0 | 71 | 0 | ALL GREEN. 0.02 s |
| `tools/test-mem-history.js` | 0 | 36 | 0 | ALL PASS. 0.02 s |
| `tools/test-mistakes-srs.js` | 0 | 36 | 0 | 0.02 s |
| `tools/test-oscillator-chrome.js` | 0 | (no numeric tally) | 0 | "Dynamic Chrome CDP testing completed successfully!" Own ephemeral HTTP + Chrome. 4.68 s |
| `tools/test-srs-anki-chrome.js` | 0 | (no numeric tally) | 0 | Was exit 1 in VERIFY.md. Now: "PASS — four Anki grades, no Mastered, screenshot inversion gone, Easy 4 d, young Hard 2 d, cap toggle works". Own ephemeral HTTP + Chrome. 5.42 s |
| `tools/test-srs-intervals.js` | 0 | 59 | 0 | 0.03 s |
| `tools/test-ux-interaction.js` | 0 | 108 | 0 | Was 107/1 flaky in VERIFY.md. Now 108 passed, 0 failed, ALL OK. 0.76 s |
| `tools/test-visualizer-aesthetics.js` | 0 | 1091 | 0 | ALL GREEN. 0.12 s |

**12 pass / 0 fail.**

`test-srs-anki-chrome.js` stdout (exit 0):

```
PASS — four Anki grades, no Mastered, screenshot inversion gone, Easy 4 d, young Hard 2 d, cap toggle works
  review (cap 13): { again: 'today', hard: '11 d', good: '12 d', easy: '13 d' }
  young review (uncapped): { again: 'today', hard: '2 d', good: '3 d', easy: '4 d' }
  new card: { again: 'today', hard: 'soon', good: 'soon', easy: '4 d' }
```

---

## 2. Seventeen routes (Chromium, cache disabled)

Base: `http://127.0.0.1:8766/index.html?v=20260909i` + hash.
Viewport 1280x800. Listeners: `console` (type=error), `pageerror`, `response` status >= 400.
`#view` content = element present and `innerText.trim().length > 0`.

Known (not a fail): `#/topic/mechanics` renders "Unknown topic."; `#/practice/mechanics` shows 0 available (id is not `mechanics`).

| Hash | `#view` content | viewLen | error count (console.error + pageerror + HTTP>=400) | view start |
|---|---|---|---|---|
| `#/` | yes | 3101 | 0 | Good morning. Level 1 · Quark 53 / 100 XP to Level 2 … |
| `#/plan` | yes | 1927 | 0 | Review plan July 13 → November 1, 2026 … |
| `#/practice` | yes | 293 | 0 | Practice — All topics (mixed) 366 questions available. … |
| `#/practice/mechanics` | yes | 251 | 0 | Practice — All topics (mixed) 0 questions available. … (known) |
| `#/history` | yes | 2025 | 0 | History Every answer you have ever given … |
| `#/analytics` | yes | 1397 | 0 | Analytics & trends Where your practice is going … |
| `#/build` | yes | 858 | 0 | Custom quiz Assemble a practice set … |
| `#/search` | yes | 394 | 0 | Search One box across questions … |
| `#/notes` | yes | 391 | 0 | Notes & bookmarks Everything you have starred … |
| `#/mistakes` | yes | 2130 | 0 | Mistake book Every question you have missed … |
| `#/formulas` | yes | 1032 | 0 | Study Match Type Quiz Cloze Lab Search Print formula sheet … (console *info* KaTeX slow-network fallbacks; not errors) |
| `#/focus` | yes | 461 | 0 | RUN 2026-09-09 STANDBY … |
| `#/study-time` | yes | 1503 | 0 | Study time A deeper look at how much you show up … |
| `#/achievements` | yes | 5346 | 0 | Achievements 1 of 80 unlocked … |
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
| selector | `div.hero.card.stagger-in` (className `hero card stagger-in`) |
| top | **115** px |
| bottom | 417.6875 px |
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
| innerWidth x innerHeight | 390 x 844 |

Layout AC holds.

---

## 4. Empty-profile `#/formulas` Study-N landing

`localStorage.clear()` + `sessionStorage.clear()`, then `goto` `#/formulas` with `?v=20260909i`.

| Measure | Value |
|---|---|
| `#fill-study-btn` | present, visible, text **"Study 10 today"** |
| `#study-btn` | absent (allowed: empty unseen deck uses fill-study, not due-review) |
| `hasLanding` | **true** |
| viewLen | 1032 |

Empty unseen deck still offers a Study-N landing. Contract allows `#fill-study-btn` or `#study-btn`; this profile hit `#fill-study-btn`.

---

## 5. Fail list

None.

---

## 6. Verdict

**PASS.**

- Suites: all 12 exit 0 (including the two that failed in VERIFY.md).
- 17 routes: all have `#view` content and 0 console errors / pageerrors / HTTP >= 400.
- 390 layout smoke: holds (closed overlay drawer left -280, `.hero.card` top 115 px above the fold, study-time `scrollWidth === clientWidth === 390`).
- Empty-profile formulas: `#fill-study-btn` "Study 10 today" present.
