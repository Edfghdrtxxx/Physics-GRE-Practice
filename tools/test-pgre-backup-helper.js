#!/usr/bin/env node
/* Disk snapshot helper: auth, atomic write, checksum, retention, modes.
   Uses a temporary directory; never ~/.orbitos or the live Studio.
   Run: node tools/test-pgre-backup-helper.js */
'use strict';

var crypto = require('crypto');
var fs = require('fs');
var http = require('http');
var os = require('os');
var path = require('path');
var spawn = require('child_process').spawn;

var ROOT = path.resolve(__dirname, '..');
var HELPER = path.join(ROOT, 'tools', 'pgre-backup-helper.py');
var ORBITOS = path.join(os.homedir(), '.orbitos');

var passed = 0;
var failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ok  — ' + msg); }
  else { failed++; console.log('  FAIL — ' + msg); }
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function stateBlob(overrides) {
  var state = {
    xp: 10,
    today: { date: '2026-10-20', answered: 1, correct: 1 },
    attempts: [{ qid: 'q1' }],
    cards: { 'c1': { reviews: 1 } },
    cardReviews: [{ id: 'r1' }],
    mistakes: {},
    exams: [],
    _epoch: 3,
    _rev: 20
  };
  Object.keys(overrides || {}).forEach(function (k) { state[k] = overrides[k]; });
  return JSON.stringify(state);
}

function request(port, method, urlPath, headers, body) {
  return new Promise(function (resolve, reject) {
    var payload = body == null ? null : Buffer.from(body);
    var opts = {
      host: '127.0.0.1',
      port: port,
      path: urlPath,
      method: method,
      headers: Object.assign({}, headers || {})
    };
    if (payload) opts.headers['Content-Length'] = payload.length;
    var req = http.request(opts, function (res) {
      var chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () {
        var text = Buffer.concat(chunks).toString('utf8');
        var json = null;
        try { json = JSON.parse(text); } catch (e) { json = null; }
        resolve({ status: res.statusCode, text: text, json: json });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function startHelper(dir, port, token) {
  return new Promise(function (resolve, reject) {
    var child = spawn('python3', [HELPER], {
      env: Object.assign({}, process.env, {
        PGRE_BACKUP_DIR: dir,
        PGRE_BACKUP_PORT: String(port),
        PGRE_BACKUP_TOKEN: token,
        PYTHONDONTWRITEBYTECODE: '1'
      }),
      stdio: ['ignore', 'ignore', 'pipe']
    });
    var err = '';
    child.stderr.on('data', function (c) { err += c; });
    var tries = 0;
    function ping() {
      request(port, 'OPTIONS', '/pgre-backup', {}, null).then(function () {
        resolve(child);
      }, function () {
        tries += 1;
        if (tries > 50) {
          child.kill('SIGTERM');
          reject(new Error('helper did not start: ' + err));
          return;
        }
        setTimeout(ping, 50);
      });
    }
    child.on('exit', function (code) {
      if (code && tries <= 50) reject(new Error('helper exited ' + code + ' ' + err));
    });
    setTimeout(ping, 80);
  });
}

function postSnap(port, token, blob, extra, clientHeaders) {
  var digest = sha256(blob);
  var parsed = JSON.parse(blob);
  var body = Object.assign({
    schema: 1,
    kind: 'pgre-progress-snapshot',
    client: 'physics-gre-prep-studio',
    savedAt: '2026-10-20T12:00:00Z',
    origin: 'http://127.0.0.1:9',
    epoch: parsed._epoch,
    rev: parsed._rev,
    sha256: digest,
    blob: blob
  }, extra || {});
  var headers = Object.assign({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
    'X-PGRE-Client': 'physics-gre-prep-studio'
  }, clientHeaders || {});
  return request(port, 'POST', '/pgre-backup', headers, JSON.stringify(body));
}

async function main() {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-backup-helper-'));
  var token = 'test-token-' + crypto.randomBytes(8).toString('hex');
  var server = http.createServer();
  await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
  var port = server.address().port;
  await new Promise(function (resolve) { server.close(resolve); });
  var child = await startHelper(dir, port, token);
  try {
    console.log('\nauth distinguishes the Studio from other local pages');
    var noAuth = await request(port, 'GET', '/pgre-backup', {
      Origin: 'null'
    }, null);
    assert(noAuth.status === 401, 'Origin null without a token is refused, got ' + noAuth.status);
    var originOnly = await postSnap(port, '', stateBlob(), null, {
      Authorization: '',
      'X-PGRE-Client': 'physics-gre-prep-studio',
      Origin: 'null'
    });
    assert(originOnly.status === 401, 'a token-less Studio-shaped POST is refused');
    var otherPage = await postSnap(port, token, stateBlob(), null, {
      'X-PGRE-Client': 'some-other-local-file'
    });
    assert(otherPage.status === 401, 'the same token from a non-Studio client is refused');
    var wrongToken = await postSnap(port, 'nope', stateBlob());
    assert(wrongToken.status === 401, 'a wrong token is refused');

    console.log('\nPOST writes an envelope after fsync and acks');
    var blob = stateBlob({ _rev: 21, xp: 99 });
    var posted = await postSnap(port, token, blob, { savedAt: '2026-10-20T12:00:01Z' });
    assert(posted.status === 200 && posted.json && posted.json.ok === true,
      'a valid Studio POST is acknowledged');
    assert(posted.json.sha256 === sha256(blob), 'the ack sha256 matches the committed blob');
    var files = fs.readdirSync(dir).filter(function (n) { return n.startsWith('snap-'); });
    assert(files.length === 1, 'one snapshot file exists, got ' + files.length);
    var snapPath = path.join(dir, files[0]);
    var st = fs.statSync(snapPath);
    var dst = fs.statSync(dir);
    assert((dst.mode & 0o777) === 0o700, 'directory mode is 0700, got ' + (dst.mode & 0o777).toString(8));
    assert((st.mode & 0o777) === 0o600, 'file mode is 0600, got ' + (st.mode & 0o777).toString(8));
    var leftoverTmp = fs.readdirSync(dir).filter(function (n) { return n.charAt(0) === '.' && n !== '.token'; });
    assert(leftoverTmp.length === 0, 'no temporary files remain');
    var envelope = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
    assert(envelope.blob === blob, 'the file stores the exact committed JSON');
    assert(envelope.schema === 1 && envelope.kind === 'pgre-progress-snapshot',
      'the envelope names schema 1');
    assert(envelope.counts.attempts === 1 && envelope.counts.cards === 1,
      'preview counts are stored');

    console.log('\nchecksum mismatch is refused and writes nothing extra');
    var before = fs.readdirSync(dir).filter(function (n) { return n.startsWith('snap-'); }).length;
    var bad = await postSnap(port, token, blob, { sha256: sha256('nope') });
    assert(bad.status === 400, 'a checksum mismatch is HTTP 400, got ' + bad.status);
    var after = fs.readdirSync(dir).filter(function (n) { return n.startsWith('snap-'); }).length;
    assert(after === before, 'a refused POST does not add a snapshot');

    console.log('\nGET list is metadata only; GET by id is authenticated');
    var listed = await request(port, 'GET', '/pgre-backup', {
      Authorization: 'Bearer ' + token,
      'X-PGRE-Client': 'physics-gre-prep-studio'
    }, null);
    assert(listed.status === 200 && listed.json.snapshots.length >= 1, 'list returns snapshots');
    assert(listed.json.snapshots[0].blob === undefined, 'the list does not include the progress blob');
    var anonGet = await request(port, 'GET', '/pgre-backup?id=' + listed.json.snapshots[0].id, {
      Origin: 'null'
    }, null);
    assert(anonGet.status === 401, 'full-state GET without a token is refused');
    var full = await request(port, 'GET', '/pgre-backup?id=' + listed.json.snapshots[0].id, {
      Authorization: 'Bearer ' + token,
      'X-PGRE-Client': 'physics-gre-prep-studio'
    }, null);
    assert(full.status === 200 && full.json.blob === blob, 'an authenticated GET returns the blob');

    var traversal = await request(port, 'GET', '/pgre-backup?id=../../etc/passwd', {
      Authorization: 'Bearer ' + token,
      'X-PGRE-Client': 'physics-gre-prep-studio'
    }, null);
    assert(traversal.status === 400, 'a path-like id is refused');

    console.log('\npage savedAt does not escape the backup folder');
    var parentDir = path.dirname(dir);
    var parentModeBefore = fs.statSync(parentDir).mode;
    var escapeBlob = stateBlob({ _rev: 8, xp: 8 });
    var escaped = await postSnap(port, token, escapeBlob, {
      savedAt: 'x/..-/.-./Taa:bb:cc',
      rev: 8
    });
    assert(escaped.status === 200, 'a slash-filled savedAt is still accepted as data');
    assert(escaped.json && escaped.json.id && escaped.json.id.indexOf('/') === -1
      && escaped.json.id.indexOf('..') === -1,
      'the snapshot id has no path separators, got ' + (escaped.json && escaped.json.id));
    assert(!fs.existsSync(path.join(parentDir, 'snap-x')),
      'no snap-x folder is created beside the backup dir');
    assert((fs.statSync(parentDir).mode) === parentModeBefore,
      'the parent folder mode is unchanged');

    console.log('\nretention uses the helper clock, not the page date');
    for (var i = 0; i < 14; i++) {
      var dayBlob = stateBlob({ _rev: 100 + i, xp: 100 + i });
      var res = await postSnap(port, token, dayBlob, {
        savedAt: '2099-01-01T12:' + String(i).padStart(2, '0') + ':00Z',
        rev: 100 + i
      });
      assert(res.status === 200, 'retention POST ' + i + ' acked');
      assert(res.json.id.indexOf('2099') === -1,
        'a far-future page savedAt does not name the file, got ' + res.json.id);
    }
    var oldBlob = stateBlob({ _rev: 5, xp: 1 });
    var oldName = 'snap-20260901T120000Z-rev-5-aaaaaaaaaaaa.json';
    fs.writeFileSync(path.join(dir, oldName), JSON.stringify({
      schema: 1,
      kind: 'pgre-progress-snapshot',
      savedAt: '2099-01-01T00:00:00Z',
      writtenAt: '2026-09-01T12:00:00Z',
      sha256: sha256(oldBlob),
      blob: oldBlob,
      epoch: 1,
      rev: 5,
      counts: {}
    }));
    var trigger = await postSnap(port, token, stateBlob({ _rev: 200, xp: 200 }), {
      savedAt: '2099-12-31T23:59:59Z',
      rev: 200
    });
    assert(trigger.status === 200, 'a prune-trigger POST is acknowledged');
    var kept = fs.readdirSync(dir).filter(function (n) { return n.startsWith('snap-'); });
    assert(kept.length <= 14, 'retention pruned extra same-day files, kept ' + kept.length);
    assert(kept.every(function (n) { return n.indexOf('20260901') === -1; }),
      'a snapshot older than 30 helper-clock days is pruned after a newer validated snapshot');
    assert(kept.every(function (n) { return n.indexOf('2099') === -1; }),
      'page-supplied future dates do not appear in file names');

    console.log('\nhelper stays inside the temp directory');
    assert(dir.indexOf(ORBITOS) === -1, 'the test directory is not ~/.orbitos');
    var walked = fs.readdirSync(dir);
    walked.forEach(function (name) {
      assert(path.resolve(dir, name).indexOf(dir) === 0, 'file stays under the temp dir: ' + name);
    });
  } finally {
    child.kill('SIGTERM');
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  }

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch(function (err) {
  console.error(err.stack || err);
  process.exit(1);
});
