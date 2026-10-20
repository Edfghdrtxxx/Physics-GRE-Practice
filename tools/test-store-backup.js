#!/usr/bin/env node
/* Store no longer writes pgre-state-v1-backup; leftover copies still restore.
   Disk-backup client: ack drops the leftover; a helper failure does not
   flip _persistFailed. Run: node tools/test-store-backup.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var crypto = require('crypto');

var root = path.resolve(__dirname, '..');
var storeSrc = fs.readFileSync(path.join(root, 'js', 'store.js'), 'utf8');
var backupSrc = fs.readFileSync(path.join(root, 'js', 'backup.js'), 'utf8');

var passed = 0;
var failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ok  — ' + msg); }
  else { failed++; console.log('  FAIL — ' + msg); }
}

var disk = {};
function makeSandbox(fetchImpl) {
  var webcrypto = crypto.webcrypto;
  var sandbox = {
    console: console,
    localStorage: {
      getItem: function (k) { return k in disk ? disk[k] : null; },
      setItem: function (k, v) { disk[k] = String(v); },
      removeItem: function (k) { delete disk[k]; }
    },
    window: {
      addEventListener: function () {},
      fetch: fetchImpl,
      crypto: webcrypto,
      location: { origin: 'http://127.0.0.1:9', href: 'http://127.0.0.1:9/' }
    },
    document: { addEventListener: function () {}, visibilityState: 'visible' },
    crypto: webcrypto,
    TextEncoder: TextEncoder,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Promise: Promise,
    Date: Date,
    JSON: JSON,
    Uint8Array: Uint8Array
  };
  sandbox.window.PGRE = {};
  sandbox.PGRE = sandbox.window.PGRE;
  sandbox.window.document = sandbox.document;
  sandbox.window.localStorage = sandbox.localStorage;
  vm.createContext(sandbox);
  vm.runInContext(storeSrc, sandbox);
  vm.runInContext(backupSrc, sandbox);
  return sandbox;
}

function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function main() {
  console.log('\nstore.save no longer writes the twentieth-write browser copy');
  disk = {};
  var tab = makeSandbox(function () { return Promise.reject(new Error('no helper')); });
  tab.PGRE.store.load();
  tab.PGRE.store.state.today.date = todayStr();
  tab.PGRE.store.state.migrations = { ankiReset2026: 'x', planRebuild2026: 'x', easy10: 'x' };
  tab.PGRE.backup.endpoint = 'http://127.0.0.1:1/pgre-backup';
  for (var i = 0; i < 25; i++) {
    tab.PGRE.store.state.xp = i;
    tab.PGRE.store.save();
  }
  assert(!('pgre-state-v1-backup' in disk),
    'twenty successful saves do not write pgre-state-v1-backup');
  assert(!!disk['pgre-state-v1'], 'the primary key is still written');
  assert(tab.PGRE.store.canWrite(), 'a disk-backup failure leaves canWrite true');
  assert(tab.PGRE.store._persistFailed === false, '_persistFailed stays false');

  console.log('\nleftover browser copy still restores');
  var leftover = JSON.parse(disk['pgre-state-v1']);
  leftover.xp = 777;
  leftover.migrations = { ankiReset2026: 'x', planRebuild2026: 'x', easy10: 'x' };
  disk['pgre-state-v1-backup'] = JSON.stringify(leftover);
  tab.PGRE.store.state.xp = 1;
  var restored = tab.PGRE.store.restoreBackup();
  assert(restored === true, 'restoreBackup returns true for a leftover copy');
  assert(tab.PGRE.store.state.xp === 777, 'restoreBackup imports the leftover xp');

  console.log('\nan acknowledged snapshot removes the leftover copy');
  disk = {};
  var ackSandbox = makeSandbox(function (url, opts) {
    if (opts && opts.method === 'POST') {
      var body = JSON.parse(opts.body);
      return Promise.resolve({
        ok: true,
        json: function () {
          return Promise.resolve({
            ok: true,
            id: 'snap-test',
            savedAt: '2026-10-20T12:00:00Z',
            sha256: body.sha256,
            counts: { attempts: 0, cards: 0, cardReviews: 0, mistakes: 0, exams: 0 }
          });
        }
      });
    }
    return Promise.resolve({
      ok: true,
      json: function () { return Promise.resolve({ ok: true, snapshots: [] }); }
    });
  });
  ackSandbox.PGRE.store.load();
  ackSandbox.PGRE.store.state.today.date = todayStr();
  ackSandbox.PGRE.store.state.migrations = { ankiReset2026: 'x', planRebuild2026: 'x', easy10: 'x' };
  ackSandbox.PGRE.backup.setToken('unit-token');
  ackSandbox.PGRE.backup.endpoint = 'http://127.0.0.1:4790/pgre-backup';
  disk['pgre-state-v1-backup'] = JSON.stringify(ackSandbox.PGRE.store.state);
  ackSandbox.PGRE.store.state.xp = 5;
  ackSandbox.PGRE.store.save();
  var tries = 0;
  function waitAck() {
    if (ackSandbox.PGRE.backup.lastAck && ackSandbox.PGRE.backup.lastAck.sha256) return Promise.resolve();
    tries += 1;
    if (tries > 50) return Promise.reject(new Error('no ack'));
    return new Promise(function (r) { setTimeout(r, 20); }).then(waitAck);
  }
  return waitAck().then(function () {
    assert(!!ackSandbox.PGRE.backup.lastAck, 'the client records an acknowledgement');
    assert(!('pgre-state-v1-backup' in disk),
      'the leftover browser copy is removed only after the ack');
    assert(!!disk['pgre-state-v1'], 'the primary key remains');

    console.log('\na later save is copied within the five-minute window');
    ackSandbox.PGRE.backup.INTERVAL_MS = 40;
    var firstSha = ackSandbox.PGRE.backup.lastAck.sha256;
    ackSandbox.PGRE.store.state.xp = 9;
    ackSandbox.PGRE.store.save();
    assert(ackSandbox.PGRE.backup.lastAck.sha256 === firstSha,
      'the later save does not wait for a second ack on the same turn');
    return new Promise(function (r) { setTimeout(r, 120); }).then(function () {
      assert(ackSandbox.PGRE.backup.lastAck.sha256 !== firstSha,
        'a changed save is copied after the backup interval');
    });
  });
}

main().then(function () {
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}).catch(function (err) {
  console.error(err.stack || err);
  process.exit(1);
});
