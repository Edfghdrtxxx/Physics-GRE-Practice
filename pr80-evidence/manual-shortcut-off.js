// Hand check on the file:// origin, isolated session and profile (`chrome-devtools-axi run < manual-shortcut-off.js`).
// The four places where the shortcut must do nothing and that the committed test does not enter:
// the focus timer's zen mode, Recall's Match stopwatch, the visualizer window, a mistake-drill question.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL0 = 'file://<worktree>/index.html';
let failed = 0;
const tryKeys = async (label, stateJs) => {
  await page.eval(function () { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return 1; });
  const state = await page.eval(stateJs);
  await page.press('/'); await sleep(150);
  await page.press('Meta+k'); await sleep(250);
  const after = JSON.parse(await page.eval(function () {
    return JSON.stringify({ open: !document.getElementById('sbs-panel').hidden, focus: document.activeElement.id });
  }));
  const ok = state === true && !after.open && after.focus !== 'sbs-input';
  if (!ok) failed++;
  console.log((ok ? 'PASS: ' : 'FAIL: ') + label + ' | state reached: ' + state + ' | after "/" and Cmd+K: panel open ' + after.open + ', focus "' + after.focus + '"');
};
const works = async (label) => {
  await page.eval(function () { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return 1; });
  await page.press('/'); await sleep(300);
  const open = await page.eval('!document.getElementById("sbs-panel").hidden && document.activeElement.id === "sbs-input"');
  if (!open) failed++;
  console.log((open ? 'PASS: ' : 'FAIL: ') + label);
  await page.press('Escape'); await sleep(150);
};

await page.open(URL0 + '#/focus'); await sleep(1200);
await works('on the focus page before zen mode, "/" opens the box');
await page.eval(function () { document.getElementById('focus-zen-btn').click(); return 1; }); await sleep(600);
await tryKeys('focus timer, zen mode', 'document.body.classList.contains("focus-zen")');
await page.eval(function () { var x = document.getElementById('focus-zen-exit'); if (x) x.click(); document.body.classList.remove('focus-zen'); return 1; }); await sleep(400);

// Match draws its pairs from today's study list, so start a study round first (scratch profile)
await page.eval(function () { location.hash = '#/formulas'; return 1; }); await sleep(1000);
await page.eval(function () { var t = document.querySelector('[data-mode="study"]'); if (t) t.click(); return 1; }); await sleep(900);
await page.eval(function () { var s = document.getElementById('study-btn'); if (s) s.click(); return 1; }); await sleep(1200);
await page.eval(function () { var t = document.querySelector('[data-mode="match"]'); if (t) t.click(); return 1; }); await sleep(1200);
await page.eval(function () { var s = document.getElementById('game-start'); if (s) s.click(); return 1; }); await sleep(900);
await tryKeys('Recall, Match with its stopwatch', '!!document.getElementById("flash-timer")');
await page.eval(function () { var x = document.getElementById('flash-exit'); if (x) x.click(); return 1; }); await sleep(400);

await page.eval(function () { location.hash = '#/'; return 1; }); await sleep(600);
await page.eval(function () { PGRE.openVisualizerModal(Object.keys(PGRE.visualizers)[0]); return 1; }); await sleep(900);
await tryKeys('visualizer window', '!!document.getElementById("viz-modal-backdrop")');
await page.eval(function () { var b = document.getElementById('viz-modal-backdrop'); if (b) b.remove(); return 1; }); await sleep(300);

await page.eval(function () {
  var q = PGRE.allQuestions()[2];
  PGRE.gamify.recordAnswer(q, false, 30000, { mode: 'practice', picked: (q.answer + 1) % q.choices.length });
  location.hash = '#/mistakes';
  return 1;
}); await sleep(900);
await page.eval(function () { var d = document.getElementById('drill-all'); if (d) d.click(); return 1; }); await sleep(1000);
await tryKeys('mistake-drill question before Confirm', '!!document.querySelector("#mistakes-root #confirm-btn")');
console.log(failed ? 'FAILED: ' + failed : 'ALL OK');
