#!/usr/bin/env node
/* Browser copy still refreshes every 20 saves until a verified disk snapshot;
   a bare {"ok":true} ack does not delete it. Run: node tools/test-store-backup.js */
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

function seedStore(tab) {
  tab.PGRE.store.load();
  tab.PGRE.store.state.today.date = todayStr();
  tab.PGRE.store.state.migrations = { ankiReset2026: 'x', planRebuild2026: 'x', easy10: 'x' };
}

function snapId(digest) {
  return 'snap-20261020T120000Z-rev-1-' + String(digest).slice(0, 12);
}

function waitUntil(pred, label) {
  var tries = 0;
  function step() {
    if (pred()) return Promise.resolve();
    tries += 1;
    if (tries > 50) return Promise.reject(new Error(label || 'timeout'));
    return new Promise(function (r) { setTimeout(r, 20); }).then(step);
  }
  return step();
}

function main() {
  console.log('\nwithout a verified disk snapshot, save still refreshes the browser copy');
  disk = {};
  var tab = makeSandbox(function () { return Promise.reject(new Error('no helper')); });
  seedStore(tab);
  tab.PGRE.backup.endpoint = 'http://127.0.0.1:1/pgre-backup';
  for (var i = 0; i < 25; i++) {
    tab.PGRE.store.state.xp = i;
    tab.PGRE.store.save();
  }
  assert(!!disk['pgre-state-v1-backup'],
    'twenty successful saves still write pgre-state-v1-backup before a verified snapshot');
  assert(typeof JSON.parse(disk['pgre-state-v1-backup']).xp === 'number',
    'the browser copy is valid JSON progress');
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

  console.log('\na bare ok:true reply does not delete the browser copy');
  disk = {};
  var fake = makeSandbox(function () {
    return Promise.resolve({
      ok: true,
      json: function () { return Promise.resolve({ ok: true }); }
    });
  });
  seedStore(fake);
  fake.PGRE.backup.setToken('unit-token');
  fake.PGRE.backup.endpoint = 'http://127.0.0.1:4790/pgre-backup';
  disk['pgre-state-v1-backup'] = JSON.stringify(fake.PGRE.store.state);
  fake.PGRE.store.state.xp = 5;
  fake.PGRE.store.save();
  return new Promise(function (r) { setTimeout(r, 80); }).then(function () {
    assert(!!disk['pgre-state-v1-backup'],
      'an {"ok":true} reply without a written snapshot leaves the browser copy');
    assert(!fake.PGRE.backup.hasVerifiedSnapshot(),
      'a bare ok:true reply is not a verified snapshot');

    console.log('\na verified snapshot removes the leftover copy');
    disk = {};
    var lastDigest = null;
    var ackSandbox = makeSandbox(function (url, opts) {
      if (opts && opts.method === 'POST') {
        var body = JSON.parse(opts.body);
        lastDigest = body.sha256;
        return Promise.resolve({
          ok: true,
          json: function () {
            return Promise.resolve({
              ok: true,
              id: snapId(body.sha256),
              savedAt: '2026-10-20T12:00:00Z',
              sha256: body.sha256,
              counts: { attempts: 0, cards: 0, cardReviews: 0, mistakes: 0, exams: 0 }
            });
          }
        });
      }
      return Promise.resolve({
        ok: true,
        json: function () {
          if (String(url).indexOf('id=') !== -1) {
            return Promise.resolve({
              sha256: lastDigest,
              blob: disk['pgre-state-v1'],
              writtenAt: '2026-10-20T12:00:00Z'
            });
          }
          return Promise.resolve({ ok: true, snapshots: [] });
        }
      });
    });
    seedStore(ackSandbox);
    ackSandbox.PGRE.backup.setToken('unit-token');
    ackSandbox.PGRE.backup.endpoint = 'http://127.0.0.1:4790/pgre-backup';
    disk['pgre-state-v1-backup'] = JSON.stringify(ackSandbox.PGRE.store.state);
    ackSandbox.PGRE.store.state.xp = 5;
    ackSandbox.PGRE.store.save();
    return waitUntil(function () {
      return ackSandbox.PGRE.backup.hasVerifiedSnapshot();
    }, 'no verified ack').then(function () {
      assert(!!ackSandbox.PGRE.backup.lastAck.verified, 'the client records a verified acknowledgement');
      assert(!('pgre-state-v1-backup' in disk),
        'the leftover browser copy is removed only after a verified snapshot');
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
        assert(ackSandbox.PGRE.backup.hasVerifiedSnapshot(),
          'the later copy is still a verified snapshot');
      });
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
