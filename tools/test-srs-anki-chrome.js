#!/usr/bin/env node
/* Headless Chrome check: Anki SM-2 grade buttons + exam-cap toggle.
   Run: node tools/test-srs-anki-chrome.js
   Isolated profile + ephemeral ports (override with PGRE_TEST_PORT /
   PGRE_CDP_PORT) so it never touches the user's browser or pinned services. */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var os = require('os');
var net = require('net');
var { spawn } = require('child_process');

var PORT = parseInt(process.env.PGRE_TEST_PORT || '0', 10);
var CDP_PORT = parseInt(process.env.PGRE_CDP_PORT || '0', 10);
var ROOT = path.resolve(__dirname, '..');
var MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function freePort() {
  return new Promise(function (resolve, reject) {
    var srv = net.createServer();
    srv.listen(0, '127.0.0.1', function () {
      var p = srv.address().port;
      srv.close(function () { resolve(p); });
    });
    srv.on('error', reject);
  });
}

function findChrome() {
  var candidates = [
    process.env.CHROME_BIN,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  for (var i = 0; i < candidates.length; i++) {
    try { fs.accessSync(candidates[i], fs.constants.X_OK); return candidates[i]; } catch (e) {}
  }
  return candidates[0]; // let spawn fail with a clear error
}

var server = http.createServer(function (req, res) {
  var reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  var filePath = path.join(ROOT, reqPath);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

// SIGTERM Chrome, wait (bounded) for it to exit so its profile dir is
// released before we rm it; escalate to SIGKILL if it hangs.
function stopChrome(proc) {
  return new Promise(function (resolve) {
    if (!proc || proc.exitCode !== null || proc.signalCode !== null) return resolve();
    var settled = false;
    var finish = function () {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    var timer = setTimeout(function () {
      try { proc.kill('SIGKILL'); } catch (e) {}
      setTimeout(finish, 1000); // SIGKILL is uncatchable; brief grace then move on
    }, 5000);
    proc.once('exit', finish);
    try { proc.kill(); } catch (e) { finish(); }
  });
}

async function main() {
  await new Promise(function (r) { server.listen(PORT, '127.0.0.1', r); });
  var httpPort = server.address().port;
  var cdpPort = CDP_PORT || await freePort();
  var userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-srs-anki-'));
  var chrome = null;
  var ws = null;
  var secondTargetId = null;
  try {
  chrome = spawn(findChrome(), [
    '--headless=new',
    '--remote-debugging-port=' + cdpPort,
    '--user-data-dir=' + userDataDir,
    '--no-first-run',
    '--window-size=1280,900',
    'http://127.0.0.1:' + httpPort + '/'
  ], { stdio: 'ignore' });

  var wsUrl = null;
  for (var i = 0; i < 40; i++) {
    await sleep(200);
    try {
      var list = await (await fetch('http://127.0.0.1:' + cdpPort + '/json/list')).json();
      var page = list.find(function (t) { return t.type === 'page'; });
      if (page && page.webSocketDebuggerUrl) { wsUrl = page.webSocketDebuggerUrl; break; }
    } catch (e) { /* chrome not up yet */ }
  }
  if (!wsUrl) throw new Error('no CDP page target');

  ws = new WebSocket(wsUrl);
  var idSeq = 1;
  var pending = new Map();
  ws.onmessage = function (ev) {
    var msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      var p = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) p.reject(msg.error); else p.resolve(msg.result);
    }
  };
  await new Promise(function (res, rej) { ws.onopen = res; ws.onerror = rej; });

  function send(method, params, sessionId) {
    return new Promise(function (resolve, reject) {
      var id = idSeq++;
      pending.set(id, { resolve: resolve, reject: reject });
      var msg = { id: id, method: method, params: params || {} };
      if (sessionId) msg.sessionId = sessionId;
      ws.send(JSON.stringify(msg));
    });
  }
  async function evaluate(expression) {
    var res = await send('Runtime.evaluate', {
      expression: expression, returnByValue: true, awaitPromise: true
    });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result.value;
  }

  async function evaluateInSession(sessionId, expression) {
    var res = await send('Runtime.evaluate', {
      expression: expression, returnByValue: true, awaitPromise: true
    }, sessionId);
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result.value;
  }

  for (var w = 0; w < 40; w++) {
    var ready = await evaluate("typeof PGRE !== 'undefined' && !!(PGRE.srs && PGRE.store && PGRE.contentDB)");
    if (ready) break;
    await sleep(100);
  }

  /* Real-deck smoke: prove the shipped browser path loads the generated
     Conquering the Physics GRE formula bank before the isolated mechanics
     fixtures below replace it. This is intentionally a user-visible check:
     the upcoming browse pane must expose real book cards, not only synthetic
     ids such as fp-a/fp-b. */
  var realDeck = await evaluate("PGRE.formulaDeck()");
  if (!realDeck || realDeck.length < 300 ||
      !realDeck.some(function (c) { return /^cpgf-/.test(c.id); })) {
    throw new Error('real Physics GRE formula deck missing or too small: ' +
      JSON.stringify({ count: realDeck && realDeck.length,
        first: realDeck && realDeck.slice(0, 3).map(function (c) { return c.id; }) }));
  }
  await evaluate("location.hash = '#/'; PGRE.route();");
  await sleep(250);
  await evaluate("location.hash = '#/formulas'");
  await sleep(500);
  for (var realWait = 0; realWait < 30; realWait++) {
    if (await evaluate("!!document.querySelector('[data-btab=\\\"upcoming\\\"]')")) break;
    await sleep(150);
  }
  await evaluate("document.querySelector('[data-btab=\\\"upcoming\\\"]').click()");
  await sleep(250);
  var realUi = await evaluate(`({
    visibleCards: document.querySelectorAll('#browse-body .browse-row').length,
    names: Array.prototype.slice.call(document.querySelectorAll('#browse-body .deck-name')).slice(0, 5).map(function (e) { return e.textContent; }),
    body: (document.getElementById('formulas-root') || document.body).innerText.slice(0, 1200)
  })`);
  if (realUi.visibleCards < 300 || !realUi.names.some(function (n) {
    return /Kinematics|Circular Motion|Dielectrics|Conductors/.test(n);
  })) {
    throw new Error('real formula deck did not render in Formula Recall: ' + JSON.stringify(realUi));
  }

  /* Real-deck pickup: run the final-pass allocator against actual cpgf-* cards
     and traverse the user path Dashboard → Today → Formula Recall → Study. */
  var realIds = realDeck.slice(0, 3).map(function (c) { return c.id; });
  var realPickup = await evaluate(`(function () {
    var s = PGRE.store.state, today = PGRE.srs.today(), d = new Date();
    d.setDate(d.getDate() + 7);
    s.settings.examDate = PGRE.srs.dayStr(d);
    s.settings.formulaDailyTarget = 1;
    s.cards = {};
    ${JSON.stringify(realIds)}.forEach(function (id, i) {
      s.cards[id] = { reps: 2, lapses: 0, interval: 10 + i, ease: 2.5,
        due: PGRE.srs.addDaysTo(today, 2 + i), reviews: 2,
        lastReviewedDay: PGRE.srs.addDaysTo(today, -1) };
    });
    s.formulaSuspended = {};
    s.formulaDay = { date: today, reviewIds: [], newIds: [] };
    s.formulaStudy = null;
    PGRE.store.save();
    location.hash = '#/'; PGRE.route();
    return ${JSON.stringify(realIds)};
  })()`);
  await sleep(500);
  for (var realPickupWait = 0; realPickupWait < 30; realPickupWait++) {
    if (await evaluate("document.getElementById('today-formulas') && document.getElementById('today-formulas').textContent !== '…'")) break;
    await sleep(150);
  }
  var realPickupUi = await evaluate(`({
    text: (document.getElementById('today-formulas') || {}).textContent || '',
    batch: PGRE.store.state.formulaDay
  })`);
  if (realPickupUi.text !== '3 left today' ||
      realPickupUi.batch.reviewIds.join(',') !== realIds.join(',')) {
    throw new Error('real formula pickup did not allocate the real cards: ' + JSON.stringify(realPickupUi));
  }
  await evaluate("document.getElementById('today-formulas-btn').click()");
  await sleep(500);
  var realStudy = await evaluate(`({
    hash: location.hash,
    queue: (PGRE.store.state.formulaStudy || {}).queueIds || []
  })`);
  if (realStudy.hash !== '#/formulas' || realStudy.queue.slice().sort().join(',') !== realIds.slice().sort().join(',')) {
    throw new Error('real formula cards did not reach Study: ' + JSON.stringify(realStudy));
  }
  await evaluate("PGRE.store.state.cards = {}; PGRE.store.state.formulaDay = null; PGRE.store.state.formulaStudy = null; PGRE.store.save(); location.hash = '#/'; PGRE.route();");
  await sleep(250);

  var seeded = await evaluate(`(async function () {
    PGRE.BOOK_FORMULAS = [];
    PGRE.FORMULAS = [];
    await PGRE.contentDB.put({
      id: 'formula-deck', kind: 'formula-deck',
      cards: [{ id: 'srs-test-1', topic: 'cm', name: 'Test card',
                front: 'front prompt', back: '$E = mc^2$', note: '' }]
    });
    var s = PGRE.store.state;
    s.settings.formulaExamCap = true;
    s.settings.formulaDailyTarget = 1;
    var d = new Date(); d.setDate(d.getDate() + 14);
    s.settings.examDate = PGRE.srs.dayStr(d);
    s.cards['srs-test-1'] = {
      reps: 1, lapses: 0, interval: 10, ease: 2.5,
      due: PGRE.srs.today(), reviews: 1
    };
    s.formulaDay = null;
    s.formulaStudy = null;
    PGRE.store.save();
    return { cap: PGRE.srs.examCap(), iv: PGRE.srs.nextIntervals(s.cards['srs-test-1']) };
  })()`);
  if (seeded.cap !== 13) throw new Error('expected cap 13, got ' + seeded.cap);
  if (!(seeded.iv.hard <= seeded.iv.good && seeded.iv.good <= seeded.iv.easy)) {
    throw new Error('scheduler inversion in nextIntervals: ' + JSON.stringify(seeded.iv));
  }

  await evaluate("location.hash = '#/'; PGRE.route();");
  await sleep(250);
  await evaluate("location.hash = '#/formulas'");
  await sleep(800);
  var homeReady = false;
  for (var h = 0; h < 30; h++) {
    homeReady = await evaluate("!!document.getElementById('exam-cap-toggle') || !!document.getElementById('study-btn')");
    if (homeReady) break;
    await sleep(150);
  }
  var diag = await evaluate(`({
    hash: location.hash,
    toggle: !!(document.getElementById('exam-cap-toggle')),
    examDate: !!(document.getElementById('exam-date')),
    study: (document.getElementById('study-btn') || {}).textContent || null,
    bodyStart: (document.getElementById('formulas-root') || document.body).innerText.slice(0, 400),
    deckN: (window.PGRE && PGRE.store) ? 'store-ok' : 'no-store'
  })`);
  if (!diag.examDate) throw new Error('exam date input missing ' + JSON.stringify(diag));

  var homeUi = await evaluate(`({
    toggle: (document.getElementById('exam-cap-toggle') || {}).textContent,
    examDate: !!document.getElementById('exam-date'),
    study: (document.getElementById('study-btn') || {}).textContent
  })`);
  if (!homeUi.examDate) throw new Error('exam date input missing');
  if (homeUi.toggle !== 'Capped to exam day') {
    throw new Error('toggle default text: ' + JSON.stringify(homeUi.toggle));
  }
  if (!homeUi.study) throw new Error('Study button missing (card not in today batch?) ' + JSON.stringify(homeUi));

  await evaluate("document.getElementById('exam-cap-toggle').click()");
  await sleep(400);
  var toggled = await evaluate(`({
    toggle: (document.getElementById('exam-cap-toggle') || {}).textContent,
    capOn: PGRE.store.state.settings.formulaExamCap
  })`);
  if (toggled.capOn !== false) throw new Error('toggle did not turn cap off');
  if (toggled.toggle !== 'Classic Anki (uncapped)') {
    throw new Error('toggle off text: ' + JSON.stringify(toggled.toggle));
  }
  await evaluate("document.getElementById('exam-cap-toggle').click()");
  await sleep(400);
  var retoggled = await evaluate("PGRE.store.state.settings.formulaExamCap");
  if (retoggled !== true) throw new Error('toggle did not restore cap on');

  await evaluate("document.getElementById('study-btn').click()");
  await sleep(300);
  await evaluate("document.getElementById('flip-btn') && document.getElementById('flip-btn').click()");
  await sleep(200);

  var grades = await evaluate(`(function () {
    var btns = Array.prototype.slice.call(document.querySelectorAll('[data-grade]'));
    return btns.map(function (b) {
      var ivl = b.querySelector('.grade-ivl');
      return { grade: b.getAttribute('data-grade'), ivl: ivl ? ivl.textContent : '',
               text: b.textContent };
    });
  })()`);
  var keys = grades.map(function (g) { return g.grade; });
  if (keys.join(',') !== 'again,hard,good,easy') {
    throw new Error('expected four Anki grades, got ' + JSON.stringify(keys));
  }
  var by = {};
  grades.forEach(function (g) { by[g.grade] = g.ivl; });
  if (by.good === '3 d') throw new Error('Good still hardcoded to 3 d: ' + JSON.stringify(by));
  function days(lbl) {
    if (lbl === 'today') return 0;
    var m = /^(\d+)\s*d$/.exec(lbl);
    return m ? +m[1] : NaN;
  }
  if (!(days(by.hard) <= days(by.good) && days(by.good) <= days(by.easy))) {
    throw new Error('button inversion: ' + JSON.stringify(by));
  }
  if (days(by.hard) !== 11 || days(by.good) !== 12 || days(by.easy) !== 13) {
    throw new Error('expected Hard 11 / Good 12 / Easy 13 under cap, got ' + JSON.stringify(by));
  }

  await evaluate(`(function () {
    PGRE.store.state.formulaStudy = null;
    PGRE.store.state.cards['srs-test-1'] = {
      reps: 1, lapses: 0, interval: 1, ease: 2.5,
      due: PGRE.srs.today(), reviews: 1
    };
    PGRE.store.state.settings.formulaExamCap = false;
    PGRE.store.state.formulaDay = null;
    PGRE.store.save();
    location.hash = '#/';
    PGRE.route();
  })()`);
  await sleep(300);
  await evaluate("location.hash = '#/formulas'");
  await sleep(500);
  for (var y = 0; y < 20; y++) {
    if (await evaluate("!!document.getElementById('study-btn')")) break;
    await sleep(150);
  }
  await evaluate("document.getElementById('study-btn').click()");
  await sleep(300);
  await evaluate("document.getElementById('flip-btn') && document.getElementById('flip-btn').click()");
  await sleep(200);
  var youngBtns = await evaluate(`(function () {
    var by = {};
    Array.prototype.slice.call(document.querySelectorAll('[data-grade]')).forEach(function (b) {
      var ivl = b.querySelector('.grade-ivl');
      by[b.getAttribute('data-grade')] = ivl ? ivl.textContent : '';
    });
    return by;
  })()`);
  if (youngBtns.hard !== '2 d' || youngBtns.good !== '3 d' || youngBtns.easy !== '4 d') {
    throw new Error('young review should be Hard 2 d / Good 3 d / Easy 4 d, got ' + JSON.stringify(youngBtns));
  }

  await evaluate(`(async function () {
    PGRE.store.state.formulaStudy = null;
    delete PGRE.store.state.cards['srs-test-1'];
    PGRE.store.state.formulaDay = null;
    PGRE.store.save();
    location.hash = '#/';
    PGRE.route();
  })()`);
  await sleep(300);
  await evaluate("location.hash = '#/formulas'");
  await sleep(500);
  for (var n = 0; n < 20; n++) {
    if (await evaluate("!!document.getElementById('fill-study-btn') || !!document.getElementById('study-btn')")) break;
    await sleep(150);
  }
  await evaluate(`(function () {
    var b = document.getElementById('fill-study-btn') || document.getElementById('study-btn');
    if (!b) throw new Error('Study control missing for new card (expected #fill-study-btn landing CTA)');
    b.click();
  })()`);
  await sleep(300);
  await evaluate("document.getElementById('flip-btn') && document.getElementById('flip-btn').click()");
  await sleep(200);
  var fresh = await evaluate(`(function () {
    var btns = Array.prototype.slice.call(document.querySelectorAll('[data-grade]'));
    return btns.map(function (b) {
      var ivl = b.querySelector('.grade-ivl');
      return { grade: b.getAttribute('data-grade'), ivl: ivl ? ivl.textContent : '' };
    });
  })()`);
  var fby = {};
  fresh.forEach(function (g) { fby[g.grade] = g.ivl; });
  if (fby.hard !== 'soon' || fby.good !== 'soon') {
    throw new Error('new-card Hard/Good should be soon, got ' + JSON.stringify(fby));
  }
  if (fby.easy !== '4 d') {
    throw new Error('new-card Easy should be 4 d, got ' + JSON.stringify(fby));
  }

  /* End-to-end Today pickup: due reviews get the first explicit action, the
     picker is bypassed, persistence survives a route reload, and a deliberate
     non-empty batch is not replaced. */
  var dueToday = await evaluate(`(async function () {
    var today = PGRE.srs.today();
    var older = PGRE.srs.addDaysTo(today, -2);
    await PGRE.contentDB.put({
      id: 'formula-deck', kind: 'formula-deck',
      cards: [
        { id: 'due-old', topic: 'cm', name: 'Due old', front: 'old', back: '$x$', note: '' },
        { id: 'due-today', topic: 'em', name: 'Due today', front: 'today', back: '$y$', note: '' },
        { id: 'due-later', topic: 'lb', name: 'Due later', front: 'later', back: '$w$', note: '' },
        { id: 'due-suspended', topic: 'qm', name: 'Suspended due', front: 'suspended', back: '$z$', note: '' },
        { id: 'new-a', topic: 'cm', name: 'New A', front: 'new a', back: '$a$', note: '' },
        { id: 'new-b', topic: 'em', name: 'New B', front: 'new b', back: '$b$', note: '' }
      ]
    });
    var s = PGRE.store.state;
    s.settings.formulaDailyTarget = 2;
    s.cards = {
      'due-old': { reps: 2, lapses: 0, interval: 3, ease: 2.5, due: older, reviews: 2 },
      'due-today': { reps: 1, lapses: 0, interval: 1, ease: 2.5, due: today, reviews: 1 },
      'due-later': { reps: 1, lapses: 0, interval: 1, ease: 2.5, due: today, reviews: 1 },
      'due-suspended': { reps: 1, lapses: 0, interval: 1, ease: 2.5, due: today, reviews: 1 }
    };
    s.formulaSuspended = { 'due-suspended': today };
    s.formulaDay = { date: today, reviewIds: [], newIds: [] };
    s.formulaStudy = null;
    PGRE.store.save();
    location.hash = '#/';
    PGRE.route();
    return { today: today, older: older };
  })()`);
  await sleep(500);
  for (var da = 0; da < 30; da++) {
    if (await evaluate("document.getElementById('today-formulas') && document.getElementById('today-formulas').textContent !== '…'")) break;
    await sleep(150);
  }
  var dueUi = await evaluate(`({
    text: (document.getElementById('today-formulas') || {}).textContent || '',
    button: (document.getElementById('today-formulas-btn') || {}).textContent || '',
    hash: location.hash
  })`);
  if (dueUi.text !== '3 due now · study 2' || dueUi.button !== 'Study 2 due →') {
    throw new Error('Today due UI mismatch: ' + JSON.stringify(dueUi));
  }
  await evaluate("document.getElementById('today-formulas-btn').click()");
  await sleep(500);
  var dueStudy = await evaluate(`({
    hash: location.hash,
    flip: !!document.getElementById('flip-btn'),
    pickerRows: document.querySelectorAll('.picker-row').length,
    batch: PGRE.store.state.formulaDay
  })`);
  if (dueStudy.hash !== '#/formulas' || !dueStudy.flip || dueStudy.pickerRows !== 0) {
    throw new Error('Today due click did not open Study without picker: ' + JSON.stringify(dueStudy));
  }
  if (dueStudy.batch.reviewIds.join(',') !== 'due-old,due-today' || dueStudy.batch.newIds.length !== 0) {
    throw new Error('Today due batch mismatch: ' + JSON.stringify(dueStudy.batch));
  }
  await evaluate("location.hash = '#/'; PGRE.route()");
  await sleep(400);
  var persistedDue = await evaluate("PGRE.store.state.formulaDay.reviewIds.join(',')");
  if (persistedDue !== 'due-old,due-today') {
    throw new Error('due batch did not persist across route reload: ' + persistedDue);
  }

  /* A second Today click must reuse the same due batch rather than replacing
     it with the remaining due card or unseen cards. */
  await evaluate("document.getElementById('today-formulas-btn').click()");
  await sleep(500);
  var repeatedDue = await evaluate("PGRE.store.state.formulaDay.reviewIds.join(',') + '|' + PGRE.store.state.formulaDay.newIds.join(',')");
  if (repeatedDue !== 'due-old,due-today|') {
    throw new Error('repeated Today click changed the due batch: ' + repeatedDue);
  }

  /* Direct Formula Recall entry uses the same capped due path as Today. */
  await evaluate(`(function () {
    PGRE.store.state.formulaStudy = null;
    PGRE.store.state.formulaDay = { date: PGRE.srs.today(), reviewIds: [], newIds: [] };
    PGRE.store.save();
    location.hash = '#/';
    PGRE.route();
  })()`);
  await sleep(300);
  await evaluate("location.hash = '#/formulas'");
  await sleep(500);
  for (var direct = 0; direct < 30; direct++) {
    if (await evaluate("document.getElementById('study-btn')")) break;
    await sleep(150);
  }
  var directUi = await evaluate(`(async function () {
    var deck = await PGRE.formulaDeck();
    return {
    button: (document.getElementById('study-btn') || {}).textContent || '',
    hash: location.hash,
    body: (document.getElementById('formulas-root') || document.body).innerText.slice(0, 500),
    batch: PGRE.store.state.formulaDay,
    cards: Object.keys(PGRE.store.state.cards || {}),
    deck: deck.map(function (c) { var st = PGRE.srs.cardState(c.id); return { id: c.id, due: st && st.due, suspended: PGRE.srs.isSuspended(c.id) }; }),
    postponed: PGRE.srs.formulaDayPostponed(deck)
    };
  })()`);
  if (directUi.button !== 'Study → 2 due') {
    throw new Error('direct Formula Recall due label mismatch: ' + JSON.stringify(directUi));
  }
  await evaluate("document.getElementById('study-btn').click()");
  await sleep(400);
  var directBatch = await evaluate("PGRE.store.state.formulaDay.reviewIds.join(',') + '|' + PGRE.store.state.formulaDay.newIds.join(',')");
  if (directBatch !== 'due-old,due-today|') {
    throw new Error('direct Formula Recall selected the wrong due batch: ' + directBatch);
  }

  /* A batch may retain a card completed earlier today for picker locking. It
     must still admit postponed due work when no active cards remain. */
  await evaluate(`(function () {
    var s = PGRE.store.state, today = PGRE.srs.today();
    var tomorrow = PGRE.srs.addDaysTo(today, 1);
    s.formulaStudy = null;
    s.cards['new-a'] = {
      reps: 1, lapses: 0, interval: 1, ease: 2.5,
      due: tomorrow, lastReviewedDay: today, reviews: 1
    };
    s.cards['due-old'].due = today;
    s.cards['due-today'].due = today;
    s.cards['due-later'].due = today;
    s.formulaDay = { date: today, reviewIds: ['new-a'], newIds: [] };
    PGRE.store.save();
    location.hash = '#/';
    PGRE.route();
  })()`);
  await sleep(500);
  for (var completedOnly = 0; completedOnly < 30; completedOnly++) {
    if (await evaluate("document.getElementById('today-formulas') && document.getElementById('today-formulas').textContent !== '…'")) break;
    await sleep(150);
  }
  await evaluate("document.getElementById('today-formulas-btn').click()");
  await sleep(500);
  var completedOnlyStudy = await evaluate(`(async function () {
    var deck = await PGRE.formulaDeck();
    return {
      hash: location.hash,
      flip: !!document.getElementById('flip-btn'),
      batch: PGRE.store.state.formulaDay,
      remaining: PGRE.srs.formulaDayRemaining(deck).map(function (c) { return c.id; })
    };
  })()`);
  if (completedOnlyStudy.hash !== '#/formulas' || !completedOnlyStudy.flip ||
      completedOnlyStudy.remaining.join(',') !== 'due-old,due-today') {
    throw new Error('completed-only batch blocked due pickup: ' + JSON.stringify(completedOnlyStudy));
  }

  await evaluate(`(function () {
    var s = PGRE.store.state;
    s.formulaStudy = null;
    delete s.cards['new-a'];
    s.formulaDay = { date: PGRE.srs.today(), reviewIds: [], newIds: ['new-a'] };
    PGRE.store.save();
    location.hash = '#/';
    PGRE.route();
  })()`);
  await sleep(500);
  for (var db = 0; db < 30; db++) {
    if (await evaluate("document.getElementById('today-formulas') && document.getElementById('today-formulas').textContent !== '…'")) break;
    await sleep(150);
  }
  var activeDueCopy = await evaluate("(document.getElementById('today-formulas') || {}).textContent || ''");
  if (activeDueCopy !== '1 left today · 3 due not picked') {
    throw new Error('Today hid due overflow beside an active carry-over: ' + activeDueCopy);
  }
  await evaluate("document.getElementById('today-formulas-btn').click()");
  await sleep(500);
  var deliberate = await evaluate(`({
    hash: location.hash,
    batch: PGRE.store.state.formulaDay,
    flip: !!document.getElementById('flip-btn')
  })`);
  if (deliberate.hash !== '#/formulas' || !deliberate.flip ||
      deliberate.batch.reviewIds.length !== 0 || deliberate.batch.newIds.join(',') !== 'new-a') {
    throw new Error('deliberate batch was replaced: ' + JSON.stringify(deliberate));
  }

  /* An unfinished new-card pick carries across a simulated day boundary. */
  await evaluate(`(function () {
    var realToday = PGRE.srs.today;
    PGRE.__testRealToday = realToday;
    PGRE.srs.today = function () {
      return PGRE.srs.addDaysTo(realToday.call(PGRE.srs), 1);
    };
    PGRE.store.state.formulaStudy = null;
    PGRE.store.state.formulaDay = {
      date: realToday.call(PGRE.srs), reviewIds: [], newIds: ['new-a']
    };
    PGRE.store.save();
    location.hash = '#/';
    PGRE.route();
  })()`);
  await sleep(500);
  for (var roll = 0; roll < 30; roll++) {
    if (await evaluate("document.getElementById('today-formulas') && document.getElementById('today-formulas').textContent !== '…'")) break;
    await sleep(150);
  }
  var rollover = await evaluate(`({
    today: PGRE.srs.today(),
    text: (document.getElementById('today-formulas') || {}).textContent || '',
    batch: PGRE.store.state.formulaDay
  })`);
  if (rollover.text !== '1 left today · 3 due not picked' || rollover.batch.newIds.join(',') !== 'new-a') {
    throw new Error('unfinished pick did not carry across day boundary: ' + JSON.stringify(rollover));
  }
  await evaluate("PGRE.srs.today = PGRE.__testRealToday; delete PGRE.__testRealToday");

  /* An empty batch shell from yesterday must be stamped with today's date when
     the explicit unseen-card fallback populates it. */
  await evaluate(`(async function () {
    var deck = await PGRE.formulaDeck();
    var today = PGRE.srs.today();
    var yesterday = PGRE.srs.addDaysTo(today, -1);
    var tomorrow = PGRE.srs.addDaysTo(today, 1);
    var s = PGRE.store.state;
    Object.keys(s.cards || {}).forEach(function (id) { s.cards[id].due = tomorrow; });
    s.formulaStudy = null;
    s.formulaDay = { date: yesterday, reviewIds: [], newIds: [] };
    PGRE.store.save();
    location.hash = '#/';
    PGRE.route();
    return { today: today, yesterday: yesterday, deck: deck.length };
  })()`);
  await sleep(500);
  for (var fill = 0; fill < 30; fill++) {
    if (await evaluate("document.getElementById('today-formulas') && document.getElementById('today-formulas').textContent !== '…'")) break;
    await sleep(150);
  }
  await evaluate("document.getElementById('today-formulas-btn').click()");
  await sleep(500);
  var stampedFill = await evaluate(`({
    hash: location.hash,
    flip: !!document.getElementById('flip-btn'),
    today: PGRE.srs.today(),
    batch: PGRE.store.state.formulaDay
  })`);
  if (stampedFill.hash !== '#/formulas' || !stampedFill.flip ||
      stampedFill.batch.date !== stampedFill.today ||
      stampedFill.batch.newIds.join(',') !== 'new-a,new-b') {
    throw new Error('unseen fallback did not stamp today\'s batch: ' + JSON.stringify(stampedFill));
  }

  /* Cross-tab persistence: a stale empty shell cannot erase a newly filled
     current-day batch, and a stale same-day heap cannot resurrect a card the
     user explicitly removed. */
  var target = await send('Target.createTarget', { url: 'http://127.0.0.1:' + httpPort + '/' });
  secondTargetId = target.targetId;
  var attached = await send('Target.attachToTarget', { targetId: secondTargetId, flatten: true });
  var secondSessionId = attached.sessionId;
  for (var peerReady = 0; peerReady < 40; peerReady++) {
    if (await evaluateInSession(secondSessionId, "typeof PGRE !== 'undefined' && !!(PGRE.srs && PGRE.store && PGRE.store.state && PGRE.contentDB)")) break;
    await sleep(100);
  }
  await sleep(300);

  await evaluate(`(async function () {
    var deck = await PGRE.formulaDeck();
    PGRE.srs.setFormulaDayPicks(deck, ['new-b']);
    return PGRE.store.state.formulaDay;
  })()`);
  await evaluateInSession(secondSessionId, `(function () {
    var s = PGRE.store.state;
    s.formulaDay = { date: PGRE.srs.addDaysTo(PGRE.srs.today(), -1), reviewIds: [], newIds: [] };
    s._rev = Math.max(0, (s._rev || 0) - 1); // simulate a missed storage event
    s.xp = (s.xp || 0) + 1;
    PGRE.store.save();
  })()`);
  var crossDateBatch = await evaluate("JSON.parse(localStorage.getItem(PGRE.store.KEY)).formulaDay");
  var crossDateToday = await evaluate("PGRE.srs.today()");
  if (crossDateBatch.date !== crossDateToday || crossDateBatch.newIds.join(',') !== 'new-b') {
    throw new Error('stale peer erased the current-day formula batch: ' + JSON.stringify(crossDateBatch));
  }

  await evaluate(`(async function () {
    var deck = await PGRE.formulaDeck();
    PGRE.srs.setFormulaDayPicks(deck, ['new-a', 'new-b']);
  })()`);
  await evaluateInSession(secondSessionId, `(function () {
    var s = PGRE.store.state, today = PGRE.srs.today();
    s.formulaDay = { date: today, reviewIds: [], newIds: ['new-a', 'new-b'] };
    s._rev = Math.max(0, (s._rev || 0) - 1); // simulate a missed storage event
  })()`);
  await evaluate(`(async function () {
    var deck = await PGRE.formulaDeck();
    PGRE.srs.setFormulaDayPicks(deck, ['new-a']);
  })()`);
  await evaluateInSession(secondSessionId, "PGRE.store.state._rev = Math.max(0, (PGRE.store.state._rev || 0) - 1); PGRE.store.state.xp = (PGRE.store.state.xp || 0) + 1; PGRE.store.save()");
  var sameDayBatch = await evaluate("JSON.parse(localStorage.getItem(PGRE.store.KEY)).formulaDay");
  if (sameDayBatch.newIds.join(',') !== 'new-a' || sameDayBatch.newIds.indexOf('new-b') !== -1) {
    throw new Error('stale peer resurrected a removed formula pick: ' + JSON.stringify(sameDayBatch));
  }
  await send('Target.closeTarget', { targetId: secondTargetId });
  secondTargetId = null;

  /* Final-pass policy: once the exam is within seven days, a resolved deck
     automatically persists every unsuspended learned card, including cards
     whose ordinary due date is still in the future. The daily target is only
     advisory; new and suspended cards stay out, deliberate IDs/order survive,
     repeat mounts are idempotent, and passing grades are held to one day. */
  var finalPass = await evaluate(`(async function () {
    var today = PGRE.srs.today();
    var tomorrow = PGRE.srs.addDaysTo(today, 1);
    await PGRE.contentDB.put({
      id: 'formula-deck', kind: 'formula-deck',
      cards: [
        { id: 'fp-a', topic: 'cm', name: 'FP A', front: 'a', back: '$a$', note: '' },
        { id: 'fp-b', topic: 'em', name: 'FP B', front: 'b', back: '$b$', note: '' },
        { id: 'fp-c', topic: 'lb', name: 'FP C', front: 'c', back: '$c$', note: '' },
        { id: 'fp-d', topic: 'qm', name: 'FP D', front: 'd', back: '$d$', note: '' },
        { id: 'fp-e', topic: 'cm', name: 'FP E', front: 'e', back: '$e$', note: '' },
        { id: 'fp-s', topic: 'em', name: 'FP suspended', front: 's', back: '$s$', note: '' },
        { id: 'fp-new-a', topic: 'lb', name: 'FP new A', front: 'na', back: '$na$', note: '' },
        { id: 'fp-new-b', topic: 'qm', name: 'FP new B', front: 'nb', back: '$nb$', note: '' },
        { id: 'fp-new-c', topic: 'cm', name: 'FP new C', front: 'nc', back: '$nc$', note: '' }
      ]
    });
    var s = PGRE.store.state, d = new Date(); d.setDate(d.getDate() + 7);
    s.settings.formulaDailyTarget = 2;
    s.settings.formulaExamCap = true;
    s.settings.examDate = PGRE.srs.dayStr(d);
    s.cards = {};
    ['fp-a', 'fp-b', 'fp-c', 'fp-d', 'fp-e', 'fp-s'].forEach(function (id, i) {
      s.cards[id] = { reps: 3, lapses: 0, interval: 20 + i,
        ease: 2.5, due: PGRE.srs.addDaysTo(today, 3 + i), reviews: 3,
        lastReviewedDay: PGRE.srs.addDaysTo(today, -1) };
    });
    s.formulaSuspended = { 'fp-s': today };
    s.formulaDay = { date: today, reviewIds: [], newIds: [] };
    s.formulaStudy = null;
    PGRE.store.save();
    location.hash = '#/'; PGRE.route();
    return { today: today, exam: s.settings.examDate };
  })()`);
  await sleep(500);
  for (var fpWait = 0; fpWait < 30; fpWait++) {
    if (await evaluate("document.getElementById('today-formulas') && document.getElementById('today-formulas').textContent !== '…'")) break;
    await sleep(150);
  }
  var fpUi = await evaluate(`({
    text: (document.getElementById('today-formulas') || {}).textContent || '',
    batch: PGRE.store.state.formulaDay,
    due: PGRE.srs.nextIntervals(PGRE.store.state.cards['fp-a'])
  })`);
  if (fpUi.batch.reviewIds.join(',') !== 'fp-a,fp-b,fp-c,fp-d,fp-e' || fpUi.batch.newIds.length ||
      fpUi.batch.reviewIds.indexOf('fp-s') !== -1 || fpUi.batch.reviewIds.indexOf('fp-new-a') !== -1) {
    throw new Error('final-pass allocator mismatch: ' + JSON.stringify(fpUi));
  }
  if (fpUi.text !== '5 left today') throw new Error('final-pass dashboard count mismatch: ' + fpUi.text);
  if (fpUi.due.hard !== 1 || fpUi.due.good !== 1 || fpUi.due.easy !== 1) {
    throw new Error('final-pass intervals did not suspend growth: ' + JSON.stringify(fpUi.due));
  }
  await evaluate("document.getElementById('today-formulas-btn').click()");
  await sleep(500);
  var fpStudy = await evaluate(`(async function () { return {
    hash: location.hash,
    picker: document.querySelectorAll('.picker-row').length,
    queue: (PGRE.store.state.formulaStudy || {}).queueIds || [],
    remaining: PGRE.srs.formulaDayRemaining((await PGRE.formulaDeck())).map(function (c) { return c.id; })
  }; })()`);
  var fpQueue = fpStudy.queue.slice().sort().join(',');
  if (fpStudy.hash !== '#/formulas' || fpStudy.picker !== 0 || fpQueue !== 'fp-a,fp-b,fp-c,fp-d,fp-e' ||
      fpStudy.remaining.join(',') !== 'fp-a,fp-b,fp-c,fp-d,fp-e') {
    throw new Error('final-pass Study pool mismatch: ' + JSON.stringify(fpStudy));
  }
  var fpRepeat = await evaluate(`(async function () {
    var d = await PGRE.formulaDeck();
    PGRE.srs.fillFormulaDayFinalPass(d);
    PGRE.srs.fillFormulaDayFinalPass(d);
    return PGRE.store.state.formulaDay;
  })()`);
  if (fpRepeat.reviewIds.join(',') !== 'fp-a,fp-b,fp-c,fp-d,fp-e') {
    throw new Error('final-pass repeat was not idempotent: ' + JSON.stringify(fpRepeat));
  }
  var fpDeliberate = await evaluate(`(async function () {
    var s = PGRE.store.state, d = await PGRE.formulaDeck();
    s.formulaStudy = null;
    s.formulaDay = { date: PGRE.srs.today(), reviewIds: ['fp-a'], newIds: ['fp-new-a'] };
    PGRE.store.save();
    PGRE.srs.fillFormulaDayFinalPass(d);
    return s.formulaDay;
  })()`);
  if (fpDeliberate.reviewIds.join(',') !== 'fp-a,fp-b,fp-c,fp-d,fp-e' ||
      fpDeliberate.newIds.join(',') !== 'fp-new-a') {
    throw new Error('final-pass did not preserve deliberate picks: ' + JSON.stringify(fpDeliberate));
  }
  var fpBoundaries = await evaluate(`(async function () {
    var s = PGRE.store.state, today = PGRE.srs.today(), d = new Date();
    d.setDate(d.getDate() + 8); s.settings.examDate = PGRE.srs.dayStr(d);
    s.formulaDay = { date: today, reviewIds: [], newIds: [] }; PGRE.store.save();
    var deck = await PGRE.formulaDeck();
    var filled = PGRE.srs.fillFormulaDayFinalPass(deck);
    return { off: PGRE.srs.finalPassActive(), empty: !filled.reviewIds.length };
  })()`);
  if (fpBoundaries.off !== false || !fpBoundaries.empty) {
    throw new Error('final-pass day-8 boundary mismatch: ' + JSON.stringify(fpBoundaries));
  }
  var fpNewOnly = await evaluate(`(function () {
    var s = PGRE.store.state, keep = s.cards, d = new Date(); d.setDate(d.getDate() + 7);
    s.cards = {}; s.settings.examDate = PGRE.srs.dayStr(d);
    s.formulaDay = { date: PGRE.srs.today(), reviewIds: [], newIds: [] };
    PGRE.store.save(); location.hash = '#/'; PGRE.route();
    s.__finalPassCards = keep;
    return true;
  })()`);
  await sleep(500);
  for (var fpNewWait = 0; fpNewWait < 30; fpNewWait++) {
    if (await evaluate("document.getElementById('today-formulas') && document.getElementById('today-formulas').textContent !== '…'")) break;
    await sleep(150);
  }
  var fpNewOnlyUi = await evaluate(`({
    text: (document.getElementById('today-formulas') || {}).textContent || '',
    button: (document.getElementById('today-formulas-btn') || {}).textContent || ''
  })`);
  if (fpNewOnlyUi.text !== '9 not yet introduced' || fpNewOnlyUi.button !== 'Open →') {
    throw new Error('final-pass new-only UI mismatch: ' + JSON.stringify(fpNewOnlyUi));
  }
  await evaluate(`(function () {
    var s = PGRE.store.state;
    s.cards = s.__finalPassCards; delete s.__finalPassCards;
    PGRE.store.save();
  })()`);
  var fpDayOne = await evaluate(`(function () {
    var s = PGRE.store.state, d = new Date(); d.setDate(d.getDate() + 1);
    s.settings.examDate = PGRE.srs.dayStr(d);
    var st = s.cards['fp-a'];
    return { active: PGRE.srs.finalPassActive(), next: PGRE.srs.nextIntervals(st), mastered: PGRE.srs.masteredInterval(st) };
  })()`);
  if (!fpDayOne.active || fpDayOne.next.hard !== 1 || fpDayOne.next.good !== 1 ||
      fpDayOne.next.easy !== 1 || fpDayOne.mastered !== 1) {
    throw new Error('final-pass day-one boundary mismatch: ' + JSON.stringify(fpDayOne));
  }

  await evaluate("PGRE.contentDB.del('formula-deck')");
  console.log('PASS — Anki grades + end-to-end Today due pickup, backlog cap, repeat-click safety, persistence, deliberate-batch preservation, rollover, date stamping, overflow copy, cross-tab conflict safety, and automatic final-pass inclusion');
  console.log('  review (cap 13):', by);
  console.log('  young review (uncapped):', youngBtns);
  console.log('  new card:', fby);
  } finally {
    try { if (secondTargetId) await send('Target.closeTarget', { targetId: secondTargetId }); } catch (e) {}
    try { if (ws) ws.close(); } catch (e) {}
    try { await stopChrome(chrome); } catch (e) {}
    try { server.close(); } catch (e) {}
    try { fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch (e) {}
  }
}

main().catch(function (err) {
  console.error('FAIL', err);
  process.exit(1);
});
