# InteractionA — answering surfaces + plan hero (2026-09-09)

Owner: InteractionA2. Files: `js/view-practice.js`, `js/view-exam.js`, `js/view-plan.js`, practice/exam sections of `css/style.css`. With Main's approval, two behaviour-neutral touches outside the list: `js/view-dashboard.js` (exposes `PGRE.nextMockPointer`, now returns `{ id, title }`) and `js/exam-engine.js` (single `drawPool()` shared by `buildWeighted` and `canStart`; exports `poolSize()`).

## What changed

1. **Sticky action rows.** Practice feedback's Next/Finish row (`.practice-actions`) and the exam room's Back / Flag / Next row (`.exam-navrow`) are `position: sticky; bottom: 0` on `--surface` with a `--line` top rule and the system `--shadow`. Bottom padding moved off `.exam-main` into the row so choice E always clears it. Next is focused with `preventScroll` so the solution is not skipped past. Mobile: nav buttons flex to fill the row.
2. **Pace trainer.** `paceMark` returns nothing for the first 5 s of a question (`PACE_GRACE_MS`); the live chip and mark were otherwise correct. The question-stage key hint now lists only A–E / 1–5; K/G/T/F ride on the assess chips (already the case) and "Enter next" sits beside the Next button after answering.
3. **Exam heading focus ring.** `#exam-q-heading:focus { outline: none; }` — `heading.focus()` retained.
4. **Practice queue persistence.** `sessionStorage['pgre-practice-session']` (same transient pattern as the builder's `pgre-quiz-config`) snapshots ids, position, answered rows, correct/XP totals and the gamify `sid` on every question render and answer. Revisiting the same `#/practice/<id>[/new|/done]` (or `#/practice/custom` with an unchanged builder handoff) shows "Resume session (N of M left)" / "Start over". Cleared on summary, start over, or any fresh set. Attempts live in the saved profile already, so resume double-counts nothing.
5. **`#/exam` landing.** Primary card "Your next mock" = `PGRE.nextMockPointer()` (same pointer as the dashboard Today card; currently ETS 2024) with a `btn-primary` Start. Remaining ETS replays listed under "Other released ETS exams". The weighted 70-draw is demoted to a `btn-ghost` "Practice set in the current format" and its copy reads the true pool: `poolSize()` = 666 (intact ETS exams excluded), not the 1135 whole-bank figure.
6. **Plan countdown.** `.countdown-num` no longer tweens via `countUp`; the task-count note and meters still animate.
7. **No-glyph rule.** Removed ⏱ ✓ ✗ ⚑ ⚠ ⌛ ★-adjacent text glyphs from practice/exam copy (review cards say Right/Wrong; timer warning is the text note + tint; palette flag marker is a coral dot via `::after`). Orphaned `.exam-empty-icon` / `.exam-timer-warn` rules deleted.

## Verification (headless Chromium, screenshots in `/tmp/pgre-interactionA/`)

- 1440x900: started 20-question mixed practice, answered 2, went to `#/`, returned → "Resume session (18 of 20 left)"; Resume landed on Question 3 of 20. First-click feedback shows no pace mark; question-stage hint is A–E / 1–5 only. `practice-feedback-1440.png`, `practice-resume-1440.png`.
- 390x844 long stem (528 chars): choice E bottom 1606px in a 1736px page; after answering, action row sticky at 781–844 with no overlap of choice E when scrolled to it. `practice-long-390.png`.
- Exam room 390x844 and 1440x900 (longest stem in the sitting, 664 chars): `.exam-navrow` sticky at viewport bottom; at full scroll choice E bottom 274/803 vs nav top 292/825 — never covered. Heading focused, `outline-style: none`. `exam-room-390-*.png`, `exam-room-1440.png`.
- `#/exam` card order: Resume (if any) → Your next mock [primary: Start ETS Official Practice Test (2024)] → Other released ETS exams → Practice set in the current format [ghost, "draws from 666 questions"] → Legacy → Past simulations. `exam-setup-1440.png`, `exam-setup-390.png`.
- `#/plan`: `.countdown-num` sampled 6 times over ~500 ms after mount: `53` every time. `plan-1440.png`.
- `node tools/test-exam-engine.js` 47/47; `node tools/test-ux-interaction.js` 108/108.

## Not done / notes

- The `hist-mark` Right/Wrong label in the exam review inherits the old 14px-min-width glyph styling; legible, but Aesthetics may want to restyle it as a small chip.
- Practice resume is per-tab (sessionStorage), matching the builder handoff; a closed tab forgets the queue, which is intended for a transient set.
