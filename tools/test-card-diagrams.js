#!/usr/bin/env node
/* Node checks for inline recall-card diagrams (js/card-diagrams.js).
   Registry keys must name a real card. Physics of supp-radiation-field
   vectors is checked here so the picture cannot drift from the formula.
   Run: node tools/test-card-diagrams.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  ok  — ' + msg);
  } else {
    failed++;
    console.log('  FAIL — ' + msg);
  }
}

function load(files) {
  var window = { PGRE: {} };
  var document = {
    readyState: 'complete',
    addEventListener: function () {}
  };
  window.document = document;
  var sandbox = {
    window: window,
    document: document,
    PGRE: window.PGRE,
    console: console,
    Math: Math,
    JSON: JSON,
    String: String,
    Number: Number,
    Array: Array,
    Object: Object,
    Error: Error,
    parseInt: parseInt,
    isFinite: isFinite
  };
  vm.createContext(sandbox);
  files.forEach(function (rel) {
    var src = fs.readFileSync(path.join(root, rel), 'utf8');
    vm.runInContext(src, sandbox, { filename: rel });
  });
  sandbox.PGRE = sandbox.window.PGRE;
  return sandbox;
}

console.log('registry keys are existing card ids');
var box = load(['js/data-formulas.js', 'js/card-diagrams.js']);
var PGRE = box.PGRE;
var byId = Object.create(null);
(PGRE.FORMULAS || []).forEach(function (c) { if (c && c.id) byId[c.id] = c; });
var keys = Object.keys(PGRE.cardDiagrams || {});
assert(keys.length >= 1, 'the diagram registry is not empty');
keys.forEach(function (id) {
  assert(!!byId[id], 'registry key ' + id + ' is a PGRE.FORMULAS card id');
  assert(typeof PGRE.cardDiagrams[id] === 'function',
    'registry[' + id + '] is a mount function');
});
assert(!!byId['supp-radiation-field'] && byId['supp-radiation-field'].kind === 'list',
  'supp-radiation-field is still a list card in data-formulas.js');
assert(String(byId['supp-radiation-field'].back).indexOf('<ul class="recall-list">') === 0,
  'the card back text in data-formulas.js is still the four-bullet list');

console.log('\nreplaceRecallListWithDiagram');
var raw = byId['supp-radiation-field'].back;
var replaced = PGRE.replaceRecallListWithDiagram(raw, 'supp-radiation-field');
assert(replaced.indexOf('recall-list') === -1,
  'the registered card drops .recall-list in the rendered back');
assert(/data-card-diagram="supp-radiation-field"/.test(replaced),
  'the registered card gets a diagram host keyed by id');
var other = byId['supp-drift-current'];
assert(!!other, 'supp-drift-current exists as a control list card');
var otherHtml = PGRE.replaceRecallListWithDiagram(other.back, 'supp-drift-current');
assert(otherHtml === other.back && otherHtml.indexOf('recall-list') !== -1,
  'an unregistered list card keeps its bullets');

console.log('\nnonrelativistic radiation-field vectors');
var v = PGRE.radiationFieldDiagramVectors();
function almost(a, b, eps) { return Math.abs(a - b) < (eps || 1e-9); }
function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function vlen(a) { return Math.sqrt(vdot(a, a)); }
function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vcross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
assert(almost(vlen(v.rHat), 1, 1e-9), 'r-hat is a unit vector');
assert(almost(vdot(v.aPerp, v.rHat), 0, 1e-9),
  'a_perp is perpendicular to r-hat');
assert(almost(vdot(v.eRad, v.rHat), 0, 1e-9),
  'E_rad is perpendicular to r-hat (the line of sight)');
assert(vdot(v.eRad, v.aPerp) < -1e-9,
  'for q > 0, E_rad points opposite a_perp');
var reconstructed = [v.aPar[0] + v.aPerp[0], v.aPar[1] + v.aPerp[1], v.aPar[2] + v.aPerp[2]];
assert(almost(reconstructed[0], v.a[0], 1e-9) &&
  almost(reconstructed[1], v.a[1], 1e-9) &&
  almost(reconstructed[2], v.a[2], 1e-9),
  'a = a_parallel + a_perp');
assert(almost(vlen(v.aPerp) / vlen(v.a), Math.sin(v.theta), 1e-9),
  '|a_perp| = |a| sin theta, so |E_rad| ∝ sin theta');
var nPlane = vcross(v.rHat, v.a);
assert(almost(vdot(nPlane, v.eRad), 0, 1e-9) &&
  almost(vdot(nPlane, v.aPerp), 0, 1e-9),
  'E_rad and a_perp lie in the plane of r-hat and a');
var parallel = Math.abs(vdot(v.eRad, v.a)) / (vlen(v.eRad) * vlen(v.a));
assert(parallel < 0.9, 'E_rad is not drawn parallel to a (got |cos| = ' + parallel + ')');
assert(almost(vdot(v.rHat, v.a) / vlen(v.a), Math.cos(v.theta), 1e-9),
  'theta is the angle between a and r-hat');
assert(v.field[1] === 0 && v.a[0] === 0 && v.a[1] === 0,
  'a is along +z and the field point is in the xz plane');
assert(v.theta > 0.3 && v.theta < 1.2,
  'theta is an oblique angle so a_parallel and a_perp are both visible');

console.log('\nshell wiring');
var index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(/<script src="js\/card-diagrams\.js\?v=\d{8}[a-z]" defer><\/script>/.test(index),
  'index.html loads card-diagrams.js with a cache token');
function scriptAt(file) {
  return index.indexOf('<script src="' + file);
}
var checkinAt = scriptAt('js/formula-checkin.js');
var diagramsAt = scriptAt('js/card-diagrams.js');
var viewsAt = scriptAt('js/view-formulas.js');
assert(checkinAt >= 0 && diagramsAt > checkinAt && viewsAt > diagramsAt,
  'card-diagrams.js loads after formula-checkin.js and before view-formulas.js');
var view = fs.readFileSync(path.join(root, 'js', 'view-formulas.js'), 'utf8');
assert(view.indexOf('replaceRecallListWithDiagram') !== -1 &&
  view.indexOf('function taggedBackHTML') !== -1,
  'Study backHTML swaps in the diagram; reverse question keeps tagged text');
var flash = fs.readFileSync(path.join(root, 'js', 'flashmodes.js'), 'utf8');
assert(flash.indexOf('replaceRecallListWithDiagram') !== -1,
  'flashmodes backHTML swaps in the diagram when a list back is shown');
assert(!/js\/visualizers\/.*radiation/.test(fs.readFileSync(path.join(root, 'js', 'card-diagrams.js'), 'utf8')),
  'the diagram module does not register a visualizer');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
