# Wave C adversarial review — 2026-09-18 (code-traced, swe-2)

VERDICT: FIX — one real data-loss regression (mistake drill re-answer deletes an unrelated attempt row and decrements counters that were never incremented) plus one merge-protocol break (failed save() consumes _rev, letting a recovering tab clobber a sibling's write). Both have code-level repros below.

## Method

This subagent's tool inventory is read/grep/glob only — no shell, no CDP/browser driver, no file write. No server was started and no profile created (nothing to clean up). Every attack was therefore traced through the actual code paths in js/store.js, js/app.js, js/gamify.js, js/srs.js, js/exam-engine.js, js/view-exam.js, js/view-practice.js, js/view-mistakes.js, js/view-formulas.js, js/view-dashboard.js, js/view-content.js, index.html, css/style.css, and tools/test-store-persist.js. Verdicts marked 'code-traced' are deterministic from the source; items that still need a live click-through are listed under Uncertainties. The two FIX findings are provable from code alone — they do not depend on unverified runtime behavior.

## Attacks

1. Fail-closed exam room (persistAnswer / submit) — PASS (code-traced).
   - Click a choice while setItem throws: save() catches, sets _persistFailed, persistWarning(true) shows the sticky 'Saving failed' toast (store.js:506-535, app.js:358-373). Next persistAnswer call hits the canWrite guard (exam-engine.js:254-257), returns false without touching exam.answers; selectAnswer returns before toggling is-picked (view-exam.js:423-434). exams[0].answers unchanged. PASS.
   - Next/Back (goTo, view-exam.js:456-463): cursor mutates in RAM and save() fails — cursor moves on screen, reverts on reload if the outage is permanent. Sane.
   - Flag (toggleFlag, view-exam.js:436-454): UNGUARDED — mutates exam.flags and calls save() directly. See Finding F3.
   - Pause/Resume (togglePause, view-exam.js:567-575): UNGUARDED, same class as flag.
   - Submit: submit() guard returns exam unsubmitted (exam-engine.js:270-273) — exam stays in progress, toast present. PASS on the acceptance criteria, BUT doSubmit then unconditionally stopTimer/hideModal/setFullscreen(false)/navigates to '#/exam/review/<id>' (view-exam.js:614-621), which falls back to renderSetup — the user is ejected from the room. See Finding F2.
   - Recovery: restoring setItem lets the next save() succeed; _persistFailed clears and persistWarning(false) dismisses the sticky toast with 'Saving works again' (store.js:524-527, app.js:367-371). No reload needed. PASS.
   - Previously refused pick: persistAnswer refused before mutating, so exam.answers[qid] is absent; nothing is staged, so the pick must be re-clicked. PASS (matches expected semantics).

2. Fail-closed formula grading through the UI — PASS on state, UX inconsistency noted.
   - gradeCard guard returns PGRE.store.state.cards[id] unchanged (srs.js:278-281); state.cards untouched. PASS.
   - But view-formulas grade() advances study.queue/study.done/study.xp/study.history and persists formulaStudy regardless (view-formulas.js:2011-2071). The card is consumed in-session; on reload the failed persistStudy save means the session resumes from the last good snapshot, so the card is NOT lost — it re-enters the queue. In-session the summary counts a card that was never graded. UX inconsistency, no data loss. Nit.
   - Same for flashmodes reviewCard (flashmodes.js:268-272): gradeCard refused, UI still advances.

3. Fail-closed mixed practice through the UI — PASS on state, UX inconsistencies noted.
   - recordAnswer guard returns 0 before any mutation (gamify.js:80-83); state.attempts unchanged. PASS.
   - User sees: full verdict + solution painted, '+0 XP' (view-practice.js:518-545). XP shown is honest (0), but the session advances and session.answers grows while the sessions record's answered counter does not — summary 'N/M' counts unrecorded answers. Should-fix UX.
   - QOTD: answerQotd writes s.today.qotd and saves even after refusal (view-dashboard.js:136-149) — RAM-only 'done' state, lost on reload mid-outage, self-heals on recovery. Same class as F3.

4. Backup mechanics — PASS with one deviation.
   - Fires at state._rev % 20 === 0 after the primary setItem succeeds, copying the just-written blob (store.js:516-523). Backup failure is caught inside save() and cannot flip _persistFailed. PASS.
   - DEVIATION: _rev increments BEFORE setItem (store.js:516-518), so a failed save consumes a rev — the backup fires on every 20th save ATTEMPT, not every 20th successful write. See Finding F4.
   - restoreBackup() on malformed backup: importJSON throws (JSON.parse or the shape check, store.js:648-659), caught, returns false; state untouched (importJSON validates before assigning this.state, and rolls back on migrate failure). PASS.
   - restoreBackup delegates to importJSON (store.js:691-705) — no duplicated logic; _epoch bump via _maxEpoch and tombstone handling inherited. A backup from a different _epoch restores correctly (epoch = max(live, disk, blob)+1). PASS.
   - Edge: restoreBackup returns true even when the trailing save() inside importJSON fails — 'Backup restored.' toast while _persistFailed is set. RAM state is restored and persists on recovery; confusing but not data loss. Nit.

5. Corruption toast — PASS (code-traced).
   - load() catch → _stashCorrupt copies raw to pgre-state-v1-corrupt-<ts>, sets _corruptKey, state = defaults (store.js:419-481). Boot shows sticky toast naming the key and pointing at Library (app.js:730-734). Studio boots on defaults (Level 1 data-wise, but the toast says exactly that happened — meets AC2's 'not silently Level 1').
   - Toast is sticky and lives in #toasts outside #view (index.html:82) — survives route changes. PASS.
   - Second corrupt boot in the same origin cannot stack two toasts: the first boot's rollDay/save overwrites the corrupt blob with defaults, so the next document parses cleanly. Two simultaneous fresh documents each get their own toast — correct.
   - Edge: if _stashCorrupt's own setItem throws (storage full), _corruptKey stays null and the toast falls back to naming 'pgre-state-v1-corrupt-' — claims a copy was kept when none was. Harmless wording nit.
   - The known pagehide trap is real and by design: reload after writing '{not json' flushes a valid heap over it (view-exam.js:57-60 plus the general save paths). Fresh-document test required — noted, not a defect.

6. Origin line — PASS (code-traced).
   - app.js:735-739 writes 'Progress stored for ' + protocol//host → 'Progress stored for http://localhost:8141'; file: → 'file://'. PASS.
   - #origin-line is a plain muted div in #sidebar-footer (index.html:35): not focusable, no aria-live, announced once as static text. PASS.
   - Dark mode: inherits .muted token color; no hard-coded color. 390px: sidebar becomes a drawer; the line is inside the footer, wraps normally, no fixed width. No clip expected — visual confirm pending (Uncertainties).

7. Library 'Restore last automatic backup' — PASS (code-traced).
   - No backup → restoreBackup returns false → 'No automatic backup found.' toast (view-content.js:297-307, store.js:698). PASS.
   - Valid backup → importJSON → applyTheme + 'Backup restored.' + location.hash='#/' → route() → refreshNavBadges() (app.js:547) — sidebar badge and Today card repaint from restored state, no stale counts. PASS.
   - Different-_epoch backup → importJSON bumps epoch past max(live, disk, blob); sibling tabs adopt wholesale. PASS.
   - Copy: 'Export writes attempts, formula cards and intervals, the mistake book, mock sittings, and notes. Imported files … are not included.' (view-content.js:224) — matches the lock wording. PASS.

8. Regression — NOT RUN (no shell in this subagent).
   - Static check: the backup write is additive inside save() and the storage listener filters e.key !== KEY (store.js:414), so backup writes neither fire adopt nor disturb the two-tab merge tests. tools/test-store-persist.js's stub tolerates extra keys. Mechanically safe; must still be executed — see Uncertainties.

## Findings

F1 — DATA LOSS (regression introduced by the guard contract). js/view-mistakes.js:718-726 + js/gamify.js:199-230.
   commitAnswer stores `row: s.attempts[s.attempts.length - 1]` as 'the row recordAnswer just pushed'. When recordAnswer is refused (canWrite false → returns 0, pushes nothing), that slot captures the PRE-EXISTING last attempt — an unrelated, valid row. The drill keeps choices clickable after answering (view-mistakes.js:654-658), so re-answering the same question with a different pick calls revertAnswer(prev), which does s.attempts.splice(indexOf(rec.row), 1) — deleting that unrelated attempt — and decrements topics/today/session counters that the refused answer never incremented (gamify.js:208-230). Net effect: one real attempt record erased plus counters under-counted; permanent once any later save() succeeds.
   Repro: seed >=1 attempt; make setItem throw; start a mistake drill; answer Q (refused, xp=0, stale row captured); click a different choice on the same question; restore setItem; answer anything → the pre-existing attempt is gone from state.attempts and disk.
   Fix direction: recordAnswer needs a distinguishable refusal (null/false) and commitAnswer must bail without populating drill.st — or capture the row by identity only when recordAnswer actually ran.

F2 — UX (should-fix). js/view-exam.js:614-621.
   doSubmit ignores submit()'s refusal: stopTimer, hideModal, setFullscreen(false), location.hash='#/exam/review/<id>' → renderResults sees no submittedAt → renderSetup. A refused submit ejects the user from the room to the setup screen (exam still resumable via 'Resume your sitting'). Worse, the auto-submit path (tick at time limit, view-exam.js:541-546) additionally toasts 'Time — your exam was submitted automatically.' when nothing was submitted. Fix direction: doSubmit should check whether exam.submittedAt was set before tearing down the room.

F3 — INCONSISTENT FAIL-OPEN (should-fix). js/view-exam.js:436-463, 567-575; js/gamify.js:342-361; js/view-dashboard.js:148; js/view-formulas.js:2204-2231.
   toggleFlag, goTo (cursor), togglePause mutate the exam record unguarded; gamify.toggleTask, QOTD's today.qotd write, settleStudy's addXP/log/formulaCheckIn likewise. During an outage these RAM mutations self-heal on the next successful save — so flags/cursor survive a transient outage while answers are refused outright, and are silently lost only if the tab dies mid-outage. That is arguably the better behavior, but it is undocumented and inconsistent: AGENTS.md:37 now claims 'Every state-mutating entry that a user action reaches … checks it first', which is false. Either guard these too or fix the doc claim.

F4 — MERGE-PROTOCOL BREAK (should-fix; likely pre-existing, surfaced by Wave C). js/store.js:516-518.
   state._rev increments before setItem, so a failed save consumes a rev. Two consequences: (a) the backup fires on every 20th save ATTEMPT, not every 20th successful write — deviates from the lock's 'after every 20th successful write'; (b) worse: tab A fails a save (live _rev 5→6, disk stays 5); tab B saves (disk _rev 6); A's storage-event _adopt sees disk._rev(6) not > live._rev(6) and skips the merge (store.js:398-399); A's next save reads disk, same result, then overwrites with _rev 7 — B's write is absent from disk until B saves again. If B's tab dies in that window (crash, or a failed pagehide flush during the same outage), B's work is permanently lost. Fix direction: roll _rev back in the catch (this.state._rev -= 1) so only successful writes consume revs.

F5 — MINOR CORRUPTION (nit). js/app.js:78-93 (srs.setLastAssess) via PGRE.assess.
   After a refused practice answer, tapping Knew it/Guessed/Too slow/Forgot stamps confidence/tags onto the user's PREVIOUS attempt for that qid — silently editing a historical record. Same root cause as F1 (callers assume recordAnswer pushed a row).

F6 — Nit. js/view-content.js:299-303 + js/store.js:688.
   'Backup restored.' toast fires even when the post-import save() failed (_persistFailed set). Also the corruption toast's fallback names 'pgre-state-v1-corrupt-' when no stash was written (app.js:731).

## Uncertainties

- All PASS verdicts are code-traced, not click-verified: this subagent has no shell or browser tool. A live pass on an isolated origin should confirm: the sticky toast text/dismissal, exam-room ejection behavior (F2), the F1 drill repro end-to-end, origin-line rendering at 390px/dark, and node tools/test-store-persist.js (expected pass — backup write is additive and key-filtered).
- Whether _rev-increment-on-failed-save (F4) predates Wave C could not be confirmed (no git); it interacts with the new backup cadence and the new fail-closed surface either way.
- restoreBackup's true-on-failed-save edge (F6) assumes save() can fail after a successful importJSON mutation — plausible under quota exhaustion, unverified live.