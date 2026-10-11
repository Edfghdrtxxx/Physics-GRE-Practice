// Hand check on the file:// origin, isolated session and profile (`chrome-devtools-axi run < manual-sealed-drill.js`).
// A sample-exam question (src 'cpg-exam') is written into page memory and a mistake is recorded on it.
// The box must show its two title-only rows on the dashboard, no row during a mistake drill,
// and the two rows again once the drill page is left.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL0 = 'file://<worktree>/index.html';
let failed = 0;
const check = (ok, label) => { if (!ok) failed++; console.log((ok ? 'PASS: ' : 'FAIL: ') + label); };
const ask = async () => {
  await page.eval(function () { var i = document.getElementById('sbs-input'); i.focus(); i.select(); return 1; });
  await sleep(700);
  await page.type('frictionless incline'); await sleep(900);
  const out = JSON.parse(await page.eval(function () {
    var p = document.getElementById('sbs-panel');
    var shown = !p.querySelector('.sbs-results').hidden;
    return JSON.stringify({
      hash: location.hash,
      groups: shown ? Array.from(p.querySelectorAll('.sbs-group-head')).map(function (h) { return h.textContent; }) : [],
      rows: shown ? Array.from(p.querySelectorAll('.sbs-scroll .sbs-row')).map(function (r) { return r.textContent; }) : [],
      note: p.querySelector('.sbs-note').hidden ? '' : p.querySelector('.sbs-note').textContent
    });
  }));
  await page.press('Escape'); await sleep(200);
  return out;
};

await page.open(URL0); await sleep(1200);
console.log('fixture:', await page.eval(function () {
  var act = PGRE.examEngine.active(); if (act) PGRE.examEngine.discard(act);
  PGRE.BOOK_EXAMS = (PGRE.BOOK_EXAMS || []).concat([{ id: 'sbs-shot-exam', title: 'Scratch sample exam', questions: [{
    id: 'sbs-shot-exam-q1', topic: 'cm', difficulty: 1,
    q: '<p>A block is released from rest at the top of a frictionless incline of height h. Its speed at the bottom of the incline is</p>',
    choices: ['the square root of g h', 'the square root of 2 g h', '2 g h', 'g h / 2', 'the square root of g h / 2'], answer: 1,
    sol: '<p>Energy conservation gives m g h = m v squared / 2, so v is the square root of 2 g h.</p>' }] }]);
  PGRE._resetBankCache();
  var q = PGRE.questionById('sbs-shot-exam-q1');
  if (!PGRE.srs.mistakeEntries().some(function (e) { return e.q.id === q.id; })) {
    PGRE.gamify.recordAnswer(q, false, 30000, { mode: 'practice', picked: 0 });
  }
  return JSON.stringify({ src: q.src, mistakeOnIt: PGRE.srs.mistakeEntries().some(function (e) { return e.q.id === q.id; }), mockExamUnfinished: !!PGRE.examEngine.active() });
}));

let r = await ask();
check(r.hash === '' && r.groups.join(', ') === 'Sample-exam questions1, Mistakes1' &&
  r.rows.every(function (t) { return !/square root|Energy conservation|wrong picks/.test(t); }),
  'dashboard: two rows, question text only | groups: ' + r.groups.join(', '));

await page.eval(function () { location.hash = '#/mistakes'; return 1; }); await sleep(900);
await page.eval(function () { var d = document.getElementById('drill-all'); if (d) d.click(); return 1; }); await sleep(1000);
const inDrill = await page.eval('location.hash === "#/mistakes/drill" && !!document.querySelector("#mistakes-root #confirm-btn")');
r = await ask();
check(inDrill === true && r.rows.length === 0 && /^No matches/.test(r.note),
  'mistake drill on screen (' + r.hash + ', question before Confirm: ' + inDrill + '): no row | note: ' + r.note.slice(0, 40));

await page.eval(function () { location.hash = '#/'; return 1; }); await sleep(900);
r = await ask();
check(r.groups.join(', ') === 'Sample-exam questions1, Mistakes1',
  'drill page left (' + (r.hash || '#/') + '): the two rows are back | groups: ' + r.groups.join(', '));
console.log(failed ? 'FAILED: ' + failed : 'ALL OK');
