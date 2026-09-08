# F1 review — Review queue Formula Open (fill-then-Study)

Role: ReviewF1 (grok-4.6). Skeptical auditor. No application-code edits.

Binding: `09-lock.md` AC4 spirit (formula start without the 334-row picker) + product F1 from `12-review-product.md`. This pass does **not** re-litigate AC1–3/5–7, does not demand an exam-page rewrite, a sidebar/Kahn/persistence pass, or a 23-link rethink.

Claimed fix: Review queue Formula `Open →` is fill-then-Study. File: `js/view-dashboard.js` only.

Live origin: `http://127.0.0.1:51651/` (`pgre-liveui`). Isolated headless Chromium (not the user’s Chrome). Viewport `innerWidth=1440`, `innerHeight=900`. Calendar day of review: 2026-09-08. Cold `pgre-state-v1` via `localStorage.clear` in this profile. Cache-bust navigation used `?f1review=<ts>#/` plus a prior cold `#/` session.

SHA-256 at review time:

| File | sha256 | vs `10-review-live-ac.md` |
|---|---|---|
| `js/view-dashboard.js` | `3c29cda6fa8a5bea10ff6ac9960c7b6ed67de3d7d18cddd8200db81ece6d6682` | **changed** (was `62a45f39…`) |
| `js/srs.js` | `8af7390c027234a62f8c88e5593fa31b4bce74e999e0daa196e592a631ab1fa4` | unchanged |
| `js/view-formulas.js` | `6c2a36cd394c32c66108299d64abc28274b69200c48be904ba6a4e814ce4ab28` | unchanged |

---

## Verdict

**SHIP.**

Cold `#/`, unseen 334-card deck, empty `formulaDay`: a real click on Review queue Formula `Open →` fills `newIds` to 10 and lands on a Study flip card. `renderPicker` is not shown. A user-picked 4-card Optics batch is not overwritten by that same control, nor by Today `Study →`. Today `Study 10 →` on a re-emptied deck still fills 10 and starts Study. Sidebar still 23 destinations; no extra Today item.

Product F1 (first-screen Review queue dumping an unseen deck into the picker) is closed. Remaining copy difference (`Open →` vs Today `Study 10 →` on the empty batch) is a nit, not a stall.

---

## Method (what was actually clicked)

Isolated profile. `localStorage.clear`. Opened `#/`. Waited until `#rq-formulas` left `…`. Clicked Review queue Formula `Open →` (`#rq-formulas-btn`, observed button id 37 — not the mock `Open →` link, not Mistake book). Photographed the resulting Study card.

Emptied `formulaDay` through `store.save()`, remounted `#/`. Clicked Today `Study 10 →` (`#today-formulas-btn`, id 34).

Wrote a user batch `cpgf-3.1`–`cpgf-3.4` (Optics, all present in `formulaDeck()`), remounted `#/`. Clicked Review queue `Study →` (id 37; label is `Study →` once remaining > 0). Returned to `#/`. Clicked Today `Study →` (id 34). Called `fillFormulaDayIfEmpty` on that nonempty batch.

Second cold path: `localStorage.clear`, cache-bust `goto` `/?f1review=1788882708988#/`, clicked `#rq-formulas-btn` again.

Did not sit a mock. Did not grade a card. Did not click sidebar Formula recall (parked N4). Did not inspect the user’s real Chrome. Did not edit application files.

---

## Attack results

### 1. Cold Review queue Open still dumps into the picker

**No.** After clear: `#rq-formulas` = `334 not yet introduced`, button `Open →` (`button#rq-formulas-btn`, `btn-ghost`). `formulaDay` = `{ date: '2026-09-08', reviewIds: [], newIds: [] }`. Deck 334. Review queue box top 616 / bottom 795, fully in the 900 px fold.

Click id 37: hash `#/formulas`. `#pick-btn` null. Body does not contain `Nothing picked yet` or `Pick today’s cards`. Study chrome: `Card 1 · 10 left`, Classical Mechanics, `Show answer` / Rebuild hints / Skip / Put away. Trail `Home · Formula recall · Study`. `state.formulaDay.newIds` = `cpgf-1.1` … `cpgf-1.10` (length 10). `reviewIds` empty.

Cache-bust repeat (`/?f1review=1788882708988#/`): same empty copy, same click, same `Card 1 · 10 left`, same 10 ids, picker still absent. First painted prompt on that run was CM Energy (rotational KE), not the picker.

Again / Hard / Good / Easy were not on the first paint (existing flip). Not a fail — same nit as product F5.

### 2. Today Study 10 no longer works

**No.** Re-emptied batch, remount `#/`: Today `334 not yet introduced` / `Study 10 →`. Click id 34: `#/formulas`, `Card 1 · 10 left`, `Show answer`, picker absent, `newIds` = `cpgf-1.1` … `cpgf-1.10`.

### 3. User-picked nonempty batch overwritten

**No.** Saved `{ newIds: ['cpgf-3.1','cpgf-3.2','cpgf-3.3','cpgf-3.4'] }`. Dashboard: `4 left today`. Today button `Study →`. Review queue button promoted to primary `Study →`.

Click Review queue id 37: `Card 1 · 4 left`, Optics & Wave Phenomena, `newIds` unchanged. Click Today id 34 on the same batch: `Card 1 · 4 left`, Optics, `newIds` unchanged.

Direct `fillFormulaDayIfEmpty(deck)` on that batch returned the same four ids (`same: true`). Early-return when `reviewIds + newIds > 0` held on the live heap.

### 4. Extra Today sidebar item

**No.** `#sidebar-nav` still 14 app links + 9 topic portals = 23. Destinations unchanged (Dashboard `#/` … Mock exam `#/exam`, then CM…ST). Filter `/today/i` on label or href: **empty**. Top-bar `TODAY 1 min` is still `#/study-time`, not a 15th nav item.

---

## Findings

### F1-closed. Review queue Formula Open is now the same morning as Today Study 10

- **AC / scope:** AC4 spirit + product F1. Letter of AC4 named the Today control; the first-screen stall was this second row.
- **Evidence:** Two cold clicks on `#rq-formulas-btn` (plain `#/` and cache-bust). Both filled 10 and opened Study. Source: `rqOpen.addEventListener('click', startFormulaFromToday)` which `fillFormulaDayIfEmpty` then `armStudyFromFill` then `#/formulas`. `srs.js` / `view-formulas.js` hashes match the prior live-AC review; only `view-dashboard.js` moved.
- **Severity:** was should-fix; **fixed**.
- **Fails lock §4?** No. Product hole on the first screen is gone.

### N1. Empty-batch Review queue still says `Open →`

- **Evidence:** On the unseen empty deck, Today is `Study 10 →` (primary); Review queue is still ghost `Open →`. After a filled batch both say `Study →`. The empty-batch Review click does the fill anyway.
- **Severity:** nit
- **Fails this ticket?** No. The assigned attack was the picker dump, not the label.

### N2. Grades after Show answer

- **Evidence:** First Study paint is `Show answer`, not Again/Hard/Good/Easy. Same Anki chrome as Today Study 10.
- **Severity:** nit (product F5). Not reopened.

---

## Ticket scorecard

| Check | Result |
|---|---|
| Cold Review queue Open → Study flip | **Pass** |
| Picker not shown | **Pass** |
| `newIds` length 10 | **Pass** (`cpgf-1.1`–`cpgf-1.10`) |
| User-picked nonempty batch not overwritten | **Pass** (4 Optics ids survived Review Open and Today Study) |
| Today Study 10 still works | **Pass** |
| Sidebar has no extra Today item | **Pass** (23 links) |
| No exam / Kahn / sidebar / persist scope creep demanded | held |

---

## Uncertainties (do not assert absence)

- User’s real Chrome `pgre-state-v1` (already-picked `formulaDay`, already-graded cards). Rankings assume the cold/sparse isolated profile.
- Sidebar Formula recall (`#/formulas` with no fill) still reaches the picker when the batch is empty. Out of this ticket.
- Shared origin `51651`: this profile was mutated (cleared, filled, 4-card overlay). Sibling reviewers should not treat post-review `formulaDay` as the survey baseline.
- `tab.click("#rq-formulas-btn")` CSS click timed out once after cache-bust; the observed-handle click on the same visible button succeeded. Not an app bug.

---

SHIP
