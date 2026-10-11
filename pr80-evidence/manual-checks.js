// Hand checks in an isolated session and profile (`chrome-devtools-axi run < manual-checks.js`).
// PG_URL chooses the origin (default: the file:// page).
// 1. Print: the tool cannot emulate print media, so every `@media print` rule of the loaded
//    stylesheets is re-inserted as a plain rule and the open panel's computed display is read.
//    Chrome hides the rules of file:// stylesheets from scripts, so this part needs an http origin.
// 2. A large bank: 3,000 synthetic questions (150 copies of the 20 public ones, page memory only),
//    then the time to build the index and to match, as the box does on open and on typing.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL0 = process.env.PG_URL || 'file://<worktree>/index.html';
console.log('origin: ' + URL0.split('/').slice(0, 3).join('/'));

await page.open(URL0); await sleep(1200);
await page.press('/'); await sleep(400);
await page.type('energy'); await sleep(900);
console.log('print rules applied as screen rules:', await page.eval(function () {
  var panel = document.getElementById('sbs-panel');
  var before = getComputedStyle(panel).display;
  var extra = document.createElement('style');
  document.head.appendChild(extra);
  var moved = 0;
  Array.prototype.forEach.call(document.styleSheets, function (sheet) {
    var rules; try { rules = sheet.cssRules; } catch (e) { return; }
    Array.prototype.forEach.call(rules, function (rule) {
      if (!rule.media || rule.media.mediaText !== 'print') return;
      Array.prototype.forEach.call(rule.cssRules, function (inner) {
        extra.sheet.insertRule(inner.cssText, extra.sheet.cssRules.length); moved++;
      });
    });
  });
  var after = getComputedStyle(panel).display;
  extra.remove();
  return JSON.stringify({ panelOpen: !panel.hidden, displayOnScreen: before, printRulesApplied: moved, displayWithPrintRules: after });
}));
await page.press('Escape'); await sleep(200);

console.log('large bank:', await page.eval(async function () {
  var base = PGRE.QUESTIONS.slice();
  for (var round = 1; round < 150; round++) base.forEach(function (q) {
    var copy = {}; for (var k in q) copy[k] = q[k]; copy.id = q.id + '-big' + round; PGRE.QUESTIONS.push(copy);
  });
  PGRE._resetBankCache();
  var builds = [];
  for (var i = 0; i < 5; i++) {
    PGRE.search.invalidate();
    var t0 = performance.now(); var idx = await PGRE.search.buildIndex(); builds.push(Math.round(performance.now() - t0));
  }
  var matches = ['energy', 'harmonic oscillator', 'wave', 'capacitor battery', 'zzqxv'].map(function (q) {
    var t1 = performance.now(); var r = PGRE.search.match(idx, q); return q + ': ' + r.total + ' hits in ' + (performance.now() - t1).toFixed(1) + ' ms';
  });
  return JSON.stringify({ questionsInPool: PGRE.allQuestions().length, indexEntries: PGRE.search.stats(idx).total, buildMs: builds, matches: matches });
}));
await page.eval(function () { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return 1; });
await page.press('/'); await sleep(600);
const t = Date.now();
await page.type('energy');
for (let i = 0; i < 100; i++) { if (await page.eval('document.querySelectorAll("#sbs-panel .sbs-results:not([hidden]) .sbs-row").length > 0')) break; await sleep(20); }
console.log('box with the large bank:', await page.eval(function () {
  return JSON.stringify({ groups: Array.from(document.querySelectorAll('#sbs-panel .sbs-group-head')).map(function (h) { return h.textContent; }), rows: document.querySelectorAll('#sbs-panel .sbs-row').length });
}), 'rows on screen', Date.now() - t, 'ms after typing began (includes the time the tool takes to type six keys and the 150 ms wait after the last key)');
