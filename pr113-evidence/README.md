# PR 113 evidence

Real page, isolated Chrome profile, throwaway `127.0.0.1` port, synthetic cards only. Every run refused the status bridge on port 4789 by a Content-Security-Policy header and printed `PASS: the status bridge on port 4789 received nothing`. "PR head" in the screenshots and the first log tables is `4d15e6b`, the last commit of this PR before `main` was merged in; the merge `14f0d56` and the current head `5f7fc73` (fix for review finding B1) have their own sections below. "main" is `6844d4e`, the code before this PR, unless a row names `df115ec`, `main` after #114 and #115. Stages that need a date move the page's clock (`h.setClock` in `tools/test-recall-schedule-chrome.js`); the clock shown in the screenshots is the test's, not the run's.

## Screenshots (1280x800)

| File | Code | What it shows |
| --- | --- | --- |
| recall-schedule-01-regrade-again-back-live.png | PR head | A card graded Good, then changed to Again from its numbered box, is on screen again at the end of the same session: box 1 red (Again), "Card 1 of 3 · 3 done · 1 left". |
| recall-schedule-02-failed-save-card-stays.png | PR head | The save after Good was refused: the same card stays on screen with its answer open and no grade marked, "0 done · 3 left", the "Saving failed" warning, and under it "That press was not recorded". |
| recall-schedule-03-stale-tab-again-kept.png | `e2062fd` | A tab that had missed the other tab's Again then Good pressed Again on the same card. This tab's Study shows the card as "Graded Again", due today, with review history Again, Good, Again (newest first). The same stage passes on the PR head (logs/after-recall-schedule-1.log). |
| recall-schedule-04-learning-pass-failed-save-stays.png | PR head | The save after a new card's first Good was refused: the card stays on screen with its answer open, no grade marked, box 1 not marked ("returns this session" under Hard and Good), and both red messages. |
| recall-schedule-05-resume-after-midnight.png | `e2062fd` | Study was left open past the day change after `ro-c` was graded Good; after leaving Recall and pressing Resume, the session reads "Card 2 of 4 · 1 done · 3 left": `ro-c` (box 1, Good) is not queued again. On the commit before the fix the same steps read "4 left", with the graded card appended (logs/before-resume-after-midnight-screenshot.log). The stage passes on the PR head (logs/after-recall-schedule-1.log). |
| recall-schedule-06-press-not-recorded.png | PR head | Storage still refuses the save when the next Good is pressed: the card stays on screen, "0 done · 3 left", and the second red message reads "That press was not recorded — saving failed. Free up browser storage, then press again." |
| recall-schedule-07-day-start-0030.png | PR head | 00:30 on November 11. `ds-a` and `ds-b` were graded Good at 23:55 on November 10 with a 1-day interval. Recall reads "Today's list is done", "Left today 0", "Reviewed today 2": the two cards, due November 11, are not due yet and Recall offers no session. |
| recall-schedule-08-day-start-0305.png | PR head | 03:05 on November 11: the new session holds `ds-a` and `ds-b` again ("Card 1 of 2 · 0 done · 2 left"). |
| recall-schedule-09-day-start-0100.png | PR head | 01:00 on November 13, after one Good in a session started at 01:00: "Left today 2", "Reviewed today 1", "Resume session — 2 left". The list is November 12's three cards; `dn-x`, due November 13, is not on it (checked by the test; the number after "/" on the tile is the daily target). |
| recall-schedule-10-exam-week-0305.png | PR head | 03:05 on October 25, exam November 1, after Good on the one card still due: "Today's list is done", "Left today 0", "Reviewed today 1" (the Good at 02:30 counted for October 24), and no "Final pass" banner. Before that Good the test checked that the list held only that card: `fp-z`, learned and due October 28, was not added. |
| recall-schedule-11-exam-in-5-days.png | PR head | October 27, exam November 1. Card 1, a new card, is in its learning pass (dashed box); card 2 is learned card `fw-a`, and its Good button reads "3 d" under the 4-day exam cap (Easy "4 d"), not 1 day. The session holds 4 cards: `fw-a`, `fw-b` and 2 new cards. |
| learning-pass-01-first-pass-buttons.png | PR head | A new card's first answer: Hard and Good read "returns this session"; Easy reads "4 d". |
| learning-pass-02-grid-learning-box.png | PR head | After the first Good on a new card, its box 1 is the dashed "Learning pass" box (legend on the right); the next card is on screen. |
| learning-pass-03-returned-learning-chip.png | PR head | The new card is back with the "learning 1/2" chip; its buttons now show real intervals (Good 1 d). |

`e2062fd` is the label commit before the branch was rebuilt; its code for screenshots 03 and 05 is unchanged on the PR head. The sidebar "Recall N left" count refreshes when a page opens, not after each grade, on main and on the PR head; it is not part of this PR.

## Logs (folder `logs/`)

### PR head

| File | Code | Result |
| --- | --- | --- |
| after-recall-schedule-1.log, -2.log | PR head | ALL OK, 24 stages, 117 checks each |
| after-recall-schedule-without-label-commit.log | `be51232`, the PR head without its last commit | ALL OK, 117 checks |
| after-learning-pass-1.log, -2.log | PR head | ALL OK, 29 checks each |
| after-anki-public-deck.log | PR head | `test-srs-anki-chrome.js` with its two checks on the size of the gitignored book deck turned off, run on the public cards: PASS, including the exam-week block (no final pass) |
| per-commit.tsv | each commit of the PR before the PR head, at that commit | the commit's own schedule test and the store, interval, session and interaction tests; at `3f996b0`, `d90a67d` and `be51232` also the mistake-book and status tests, each unit test in local time and again in a time zone where it was 01:xx; all pass. The learning-pass test is added by the last commit and runs on the PR head (above) |
| per-commit-units.txt | `3f996b0`, `d90a67d`, `be51232`, PR head | every non-browser `tools/test-*.js` (33 files) at that commit, local time and a time zone where it was 01:xx: only `test-packs` fails, on the gitignored `content/bank/` file it needs, as on main |
| suite-pr-head.tsv, suite-main.tsv | PR head, main | every `tools/test-*.js`, one run: name, exit code, seconds, last line. 51 of 55 pass on the PR head, 49 of 53 on main; the same four fail on both with the same first error (`test-packs` names the gitignored `content/bank/cpg-questions.js` and `test-srs-anki-chrome` finds the book deck from gitignored `content/bank/` missing, both absent from this checkout; `test-pack-launch-chrome` and `test-sidebar-search-chrome` fail on main the same way) |

### Merge of main (#114, #115), `14f0d56`

| File | Code | Result |
| --- | --- | --- |
| merge-recall-schedule-1.log, -2.log | `14f0d56` | ALL OK, 117 checks each |
| merge-learning-pass-1.log, -2.log | `14f0d56` | ALL OK, 29 checks each |
| per-commit-units.txt, last line | `14f0d56` | the 33 non-browser test files, local time and 01:xx: only `test-packs` fails, as on main |
| suite-merge.tsv, suite-main-df115ec.tsv | `14f0d56`; `df115ec` | every `tools/test-*.js`, one run. 51 of 56 pass on the merge, 50 of 54 on `df115ec` (it lacks the two Recall real-page tests). The four that fail on `df115ec` fail on the merge with the same first error. The fifth, `test-drill-review-keys-chrome`, passed all 24 of its page checks and then failed while deleting its temporary Chrome profile (`ENOTEMPTY` from `fs.rmSync`, merge-suite-drill-review-keys.log) |
| merge-drill-review-keys-rerun-1.log to -3.log | `14f0d56` | `test-drill-review-keys-chrome` again, 3 runs: ALL OK, 25 checks each |

### Refused learning-pass Undo (review finding B1), PR head `5f7fc73`

| File | Code | Result |
| --- | --- | --- |
| head-recall-schedule-1.log, -2.log | `5f7fc73` | ALL OK, 25 stages, 124 checks each, including the new stage "a learning-pass Undo whose save fails keeps the stored pass" |
| head-learning-pass-1.log, -2.log | `5f7fc73` | ALL OK, 29 checks each |
| before-learning-pass-undo-on-f7d38ab-1.log, -2.log | `f7d38ab`, the commit before the fix, with the new stage alone | the stage fails at "the undo did not reach storage, and memory keeps learning step 1 too", after its check that the first Good was saved passes |
| per-commit-units.txt, last line | `5f7fc73` | the 33 non-browser test files, local time and 01:xx: only `test-packs` fails, as on main |
| suite-head-5f7fc73.tsv | `5f7fc73` | every `tools/test-*.js`, one run: 52 of 56 pass; the four that fail are the four that fail on `df115ec` (suite-main-df115ec.tsv), with the same first error |

### Dropping one of the last four commits

Each folder `drop-<commit>/` holds a rehearsal: the PR head with that one commit removed (`git rebase --onto <commit>^ <commit>`), every conflict resolved by taking the later commit's side, then the tests. `drop.log` lists the conflicts and the resulting commits; `schedule.log` and `learning-pass.log` are the real-page tests on the result.

| Commit removed | Conflicts | Result |
| --- | --- | --- |
| `3f996b0` save retry | the cache-version lines in `index.html` and `tools/test-session-park.js` | 33 unit files pass except `test-packs`; schedule test ALL OK (112 checks: the save-retry checks leave with the commit); learning-pass ALL OK |
| `d90a67d` day start | the cache-version lines in `index.html` and `tools/test-session-park.js`, and `tools/test-recall-schedule-chrome.js` (the final-pass commit edits a day-start stage); the test file was rebuilt without its day-start stages | units as above; schedule test ALL OK (96 checks); learning-pass ALL OK |
| `be51232` final pass off | the cache-version line in `index.html` | units as above; schedule test ALL OK (112 checks, with the day-start commit's final-pass stage); learning-pass ALL OK |
| `4d15e6b` label | none | units as above; schedule test ALL OK (117 checks) |

### Before each fix

| File | Code | Result |
| --- | --- | --- |
| before-save-retry-on-b9800d1-1.log, -2.log | `b9800d1`, the commit before the save retry, with `3f996b0`'s schedule test | 4 stages fail: the next Good and the next Undo after storage has room are still refused, and the "That press was not recorded" message never shows |
| before-day-start-on-3f996b0-1.log, -2.log | `3f996b0`, the commit before the day start, with `d90a67d`'s day-start stages | the cards due November 11 are due at 00:30; at 01:00 the card due that day is due; at 02:30 on October 25 the final pass has begun |
| before-final-pass-off-on-d90a67d-1.log, -2.log | `d90a67d`, the commit before the final pass was turned off, with `be51232`'s exam-week stages | on October 25 the list holds every learned card; five days before the exam the list holds the learned card due two days later and no new card; the last stage, which continues that session, stops |
| before-anki-public-deck-on-d90a67d-1.log, -2.log | `d90a67d`, with `be51232`'s public-deck run of `test-srs-anki-chrome.js` | fails at its first exam-week check, the pickup of three due cards a week before the exam: the Today card reads "3 left today" (the final-pass list) instead of "3 due now" |
| before-recall-schedule.log | main | 15 of 17 stages of the schedule test at `e2062fd` fail; the two "once saving works" stages pass |
| before-resume-after-midnight-1.log, -2.log | `3be83d5`, the commit before the Resume fix | the midnight stage fails at Resume: the graded card is appended |
| before-learning-pass-failed-save-1.log, -2.log | `e8fae3d`, the commit before the learning-pass save fix | the new card does not stay on screen |
| resume-after-midnight-screenshot.log, before-resume-after-midnight-screenshot.log | `e2062fd`; `3be83d5` | the steps behind recall-schedule-05: "3 left" without the graded card; "4 left" with it |
| before-learning-pass-1.log, -2.log | main | the repeat reproduces in 4 of 4 trials; the label checks fail |
| before-storage-full-then-reload-1.log, -2.log | main | after a refused save the screen moves on; after a reload the graded card is first again |
| before-failed-save-then-working-save-1.log, -2.log | main | after a refused save and a later working save, the remembered grade is stored and the card does not come back after a reload |
| before-regrade-save-fails-1.log, -2.log | main | after a refused regrade to Again, the check that storage and memory both keep Good fails |
| before-two-tab-add-add-1.log to -3.log | main | one of two Adds is lost |
| midnight-on-main-1.log, -2.log | main | the midnight stage without its Resume step passes |
| midnight-with-day-change-reset-1.log, -2.log | an earlier version of this branch that reset knownIds at the day change (dropped) | the midnight stage without its Resume step fails: the graded card rejoins the open session |
| after-stale-tab-screenshot.log | `e2062fd` | the stale-tab stage again, then the screenshot |
| before-unit-srs-intervals.log | main | the review log stays at 8005 rows after a grade |
| before-unit-store-persist-on-main.log | main | the merged review log holds 8010 rows; the run then stops at the write-counter test, which needs `adoptDisk` from this PR |
| before-unit-store-persist-write-counter-1.log, -2.log | `6fcdfe8`, the commit before the write-counter fix | the write-counter checks fail |
