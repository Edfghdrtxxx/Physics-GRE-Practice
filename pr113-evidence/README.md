# PR 113 evidence

Real page, isolated Chrome profile, throwaway `127.0.0.1` port, synthetic cards only. Every run refused the status bridge on port 4789 by a Content-Security-Policy header and printed `PASS: the status bridge on port 4789 received nothing`. "PR head" is `e2062fd`; "main" is `6844d4e`, the code before this PR.

## Screenshots (PR head, 1280x800)

| File | What it shows |
| --- | --- |
| recall-schedule-01-regrade-again-back-live.png | A card graded Good, then changed to Again from its numbered box, is on screen again at the end of the same session: box 1 red (Again), "Card 1 of 3 · 3 done · 1 left". |
| recall-schedule-02-failed-save-card-stays.png | The save after Good was refused: the same card stays on screen with its answer open and no grade marked, "0 done · 3 left", and the "Saving failed" warning. |
| recall-schedule-03-stale-tab-again-kept.png | A tab that had missed the other tab's Again then Good pressed Again on the same card. This tab's Study shows the card as "Graded Again", due today, with review history Again, Good, Again (newest first). |
| recall-schedule-04-learning-pass-failed-save-stays.png | The save after a new card's first Good was refused: the card stays on screen with its answer open, no grade marked, box 1 not marked, and the "Saving failed" warning. |
| recall-schedule-05-resume-after-midnight.png | Study was left open past midnight after `ro-c` was graded Good; after leaving Recall and pressing Resume, the session reads "Card 2 of 4 · 1 done · 3 left": `ro-c` (box 1, Good) is not queued again. On the commit before the fix the same steps read "4 left", with the graded card appended (logs/before-resume-after-midnight-screenshot.log). The sidebar "Recall 4 left" counts today's list on the new day, where `ro-c` is due again; it comes back in the next session. |
| learning-pass-01-first-pass-buttons.png | A new card's first answer: Hard and Good read "returns this session"; Easy reads "4 d". |
| learning-pass-02-grid-learning-box.png | After the first Good on a new card, its box 1 is the dashed "Learning pass" box (legend on the right); the next card is on screen. |
| learning-pass-03-returned-learning-chip.png | The new card is back with the "learning 1/2" chip; its buttons now show real intervals (Good 1 d). |

The sidebar "Recall N left" count refreshes when a page opens, not after each grade, on main and on the PR head; it is not part of this PR.

## Logs (folder `logs/`)

| File | Code | Result |
| --- | --- | --- |
| after-recall-schedule-1.log, -2.log | PR head | ALL OK, 17 stages, 85 checks each |
| after-recall-schedule-without-label-commit.log | PR head without its last commit (`b9800d1`) | ALL OK, 85 checks |
| after-learning-pass-1.log, -2.log | PR head | ALL OK, 29 checks each |
| after-stale-tab-screenshot.log | PR head | the stale-tab stage again, then the screenshot |
| before-recall-schedule.log | main | 15 of 17 stages fail; the two "once saving works" stages pass |
| before-resume-after-midnight-1.log, -2.log | `3be83d5`, the commit before the Resume fix | the midnight stage fails at Resume: the graded card is appended |
| before-learning-pass-failed-save-1.log, -2.log | `e8fae3d`, the commit before the learning-pass save fix | the new card does not stay on screen |
| resume-after-midnight-screenshot.log, before-resume-after-midnight-screenshot.log | PR head; `3be83d5` | the steps behind recall-schedule-05: "3 left" without the graded card; "4 left" with it |
| before-learning-pass-1.log, -2.log | main | the repeat reproduces in 4 of 4 trials; the label checks fail |
| before-storage-full-then-reload-1.log, -2.log | main | after a refused save the screen moves on; after a reload the graded card is first again |
| before-failed-save-then-working-save-1.log, -2.log | main | after a refused save and a later working save, the remembered grade is stored and the card does not come back after a reload |
| before-regrade-save-fails-1.log, -2.log | main | after a refused regrade to Again, the check that storage and memory both keep Good fails |
| before-two-tab-add-add-1.log to -3.log | main | one of two Adds is lost |
| midnight-on-main-1.log, -2.log | main | the midnight stage without its Resume step passes |
| midnight-with-day-change-reset-1.log, -2.log | an earlier version of this branch that reset knownIds at the day change (dropped) | the midnight stage without its Resume step fails: the graded card rejoins the open session |
| before-unit-srs-intervals.log | main | the review log stays at 8005 rows after a grade |
| before-unit-store-persist-on-main.log | main | the merged review log holds 8010 rows; the run then stops at the write-counter test, which needs `adoptDisk` from this PR |
| before-unit-store-persist-write-counter-1.log, -2.log | `6fcdfe8`, the commit before the write-counter fix | the write-counter checks fail |
| per-commit.tsv | each commit of the PR except the last, at that commit | the commit's own schedule test and the store, interval, session and interaction tests; all pass (the last commit is the PR head, covered above) |
| suite-pr-head.tsv, suite-main.tsv | PR head, main | every `tools/test-*.js`, one run: name, exit code, seconds, last line. 51 of 55 pass on the PR head, 49 of 53 on main; the same four fail on both with the same message (`test-packs` and `test-srs-anki-chrome` name the gitignored `content/bank/` files that this checkout lacks) |
