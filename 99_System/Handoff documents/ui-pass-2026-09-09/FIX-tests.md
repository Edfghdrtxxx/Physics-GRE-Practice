# Test fixes — 2026-09-09

Repo: `/Users/Reid Hu/Physics GRE`
Cache-buster: `20260909h` → `20260909i` (view-formulas.js change).
No commit. Did not touch sidebar/drawer CSS or `js/app.js`. `srs.js` unchanged.

---

## 1. `tools/test-srs-anki-chrome.js` — product (due reviews) + test (new-card CTA)

**Reproduced fail**

```
FAIL Error: Study button missing (card not in today batch?) {"toggle":"Capped to exam day","examDate":true}
    at main (tools/test-srs-anki-chrome.js:204)
```

Seeded `srs-test-1` due today, `formulaDay = null`. Exam-cap chrome rendered. `#study-btn` missing.

**Cause (product hole)**

InteractionB landing only offers `#fill-study-btn` when unseen cards exist (`fillN > 0`). A learned card due today with nothing picked is `M === 0`, `fillN === 0`, `postponed > 0` — home showed “Nothing picked yet” + picker only. Due reviews were not studyable without going through the picker.

**Fix (product)** — `js/view-formulas.js`

- When `M === 0` and `postponed > 0`, render `#study-btn` (“Study N due”).
- Click adds those due ids via `addFormulaDaySoft` (fallback: study the due list) then `startStudy`.
- `#study-btn` → `#flip-btn` → Anki grades still the path for due cards.

**Second hole (test)**

After the due-card phases passed, the new-card phase (`delete cards['srs-test-1']`) landed on `#fill-study-btn`, not `#study-btn`. That id is the real landing Study control for unseen cards. Test now clicks `#fill-study-btn` || `#study-btn`. Exam-cap coverage on the due-card path is unchanged.

**Reproduced pass**

```
PASS — four Anki grades, no Mastered, screenshot inversion gone, Easy 4 d, young Hard 2 d, cap toggle works
  review (cap 13): { again: 'today', hard: '11 d', good: '12 d', easy: '13 d' }
  young review (uncapped): { again: 'today', hard: '2 d', good: '3 d', easy: '4 d' }
  new card: { again: 'today', hard: 'soon', good: 'soon', easy: '4 d' }
```

`node tools/test-srs-anki-chrome.js` exit 0 (twice).

---

## 2. `tools/test-ux-interaction.js` — test flake, not a broken Ctrl+Z listener

**Reproduced fail**

107/1, flaky. 20 pre-fix runs: 15 pass / 5 fail.

- Sometimes: `click undoLast restored SRS (trailing review for that card is gone)`
- Sometimes: `keyboard undoLast restored the same SRS state the click path restored`

Preceding asserts in the same block still passed: `#flash-undo` gone, `cardReviews.length` decremented. Ctrl+Z while `#flash-input` focused **did** reach `undoLast`.

**Cause (test)**

Cloze earlier in the same `loadShipped` env calls `reviewCard` → `gradeCard` on a shuffled queue. Type undo then compared **trailing `.id`**, not the row just written. When shuffle reused a cloze-graded card, leftover `[A, A]` made “last.id !== undone id” fail after a correct one-level pop. Keyboard dispatch was not the bug.

**Fix (test)** — `tools/test-ux-interaction.js`

- Clear `cardReviews` before the Type undo block (isolate from Cloze).
- Assert `indexOf(the row object just written) === -1` for click and Ctrl+Z. Coverage kept; no product listener change.

**Reproduced pass**

20 post-fix runs: 20/20. Final `node tools/test-ux-interaction.js`: **108 passed, 0 failed**, exit 0.

---

## Verdict

| Suite | Was | Now | Kind |
|---|---|---|---|
| `test-srs-anki-chrome.js` | exit 1 | exit 0 | product (due `#study-btn`) + test (new-card `#fill-study-btn`) |
| `test-ux-interaction.js` | 107/1 flaky | 108/0 | test (leftover same-id reviews) |

Did not regress 390 drawer / study-time overflow (no CSS/shell edits).
