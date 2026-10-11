#!/usr/bin/env node
/* Official Table of Information: every printed entry is in the data module,
   and the HTML builder emits each name, value and unit. No extra constants.
   Run: node tools/test-exam-table.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var ROOT = path.resolve(__dirname, '..');
var src = fs.readFileSync(path.join(ROOT, 'js', 'data-exam-table.js'), 'utf8');
var sandbox = { window: {} };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'js/data-exam-table.js' });
var PGRE = sandbox.PGRE;
assert(PGRE && PGRE.EXAM_TABLE && typeof PGRE.examTableHTML === 'function',
  'data-exam-table.js exposes PGRE.EXAM_TABLE and examTableHTML');

var html = PGRE.examTableHTML();
var passed = 0;
var failed = 0;
function check(cond, msg) {
  if (cond) { passed++; console.log('  ok  — ' + msg); }
  else { failed++; console.log('  FAIL — ' + msg); }
}

/* Source list transcribed from GRE Physics Test Practice Book (ETS current
   practice book) page 8; same printing on GR1777 page 8 and GR0877 page 10. */
var ENTRIES = [
  { name: 'Rest mass of the electron', bits: ['9.11', '10^{-31}', 'kg'] },
  { name: 'Magnitude of the electron charge', bits: ['1.60', '10^{-19}', 'C'] },
  { name: "Avogadro's number", bits: ['6.02', '10^{23}'] },
  { name: 'Universal gas constant', bits: ['8.31', 'J/(mol', 'K'] },
  { name: "Boltzmann's constant", bits: ['1.38', '10^{-23}', 'J/K'] },
  { name: 'Speed of light', bits: ['3.00', '10^{8}', 'm/s'] },
  { name: "Planck's constant", bits: ['6.63', '10^{-34}', 'J', 's', '4.14', '10^{-15}', 'eV'] },
  { name: 'hbar', bits: ['\\hbar', 'h/2\\pi'] },
  { name: 'hc', bits: ['hc = 1240', 'eV', 'nm'] },
  { name: 'Vacuum permittivity', bits: ['8.85', '10^{-12}', 'C^{2}', 'N', 'm^{2}'] },
  { name: 'Vacuum permeability', bits: ['4\\pi', '10^{-7}', 'T', 'm/A'] },
  { name: 'Universal gravitational constant', bits: ['6.67', '10^{-11}', 'm^{3}', 'kg', 's^{2}'] },
  { name: 'Acceleration due to gravity', bits: ['9.80', 'm/s^{2}'] },
  { name: '1 atmosphere pressure', bits: ['1.0', '10^{5}', 'N/m^{2}', 'Pa'] },
  { name: '1 angstrom', bits: ['10^{-10}', '0.1', 'nm'] }
];
var PREFIXES = [
  ['10^{-15}', 'femto', 'f'],
  ['10^{-12}', 'pico', 'p'],
  ['10^{-9}', 'nano', 'n'],
  ['10^{-6}', 'micro', '\\mu'],
  ['10^{-3}', 'milli', 'm'],
  ['10^{-2}', 'centi', 'c'],
  ['10^{3}', 'kilo', 'k'],
  ['10^{6}', 'mega', 'M'],
  ['10^{9}', 'giga', 'G'],
  ['10^{12}', 'tera', 'T'],
  ['10^{15}', 'peta', 'P']
];
var INERTIA = [
  ['Rod', '1}{12', 'M\\ell'],
  ['Disc', '1}{2', 'MR'],
  ['Sphere', '2}{5', 'MR']
];

console.log('source entries in HTML');
ENTRIES.forEach(function (row) {
  if (row.name !== 'hbar' && row.name !== 'hc') {
    check(html.indexOf(row.name) !== -1, 'name: ' + row.name);
  }
  row.bits.forEach(function (bit) {
    check(html.indexOf(bit) !== -1, row.name + ' has ' + bit);
  });
});

console.log('prefixes and inertia');
check(html.indexOf('Prefixes for Powers of 10') !== -1, 'prefixes heading');
check(html.indexOf('Rotational inertia about center of mass') !== -1, 'inertia heading');
PREFIXES.forEach(function (row) {
  check(html.indexOf(row[0]) !== -1 && html.indexOf(row[1]) !== -1 && html.indexOf(row[2]) !== -1,
    'prefix ' + row[1] + ' ' + row[0] + ' ' + row[2]);
});
INERTIA.forEach(function (row) {
  check(html.indexOf(row[0]) !== -1 && html.indexOf(row[1]) !== -1 && html.indexOf(row[2]) !== -1,
    'inertia ' + row[0]);
});

console.log('scope');
check(html.indexOf('Table of Information') !== -1, 'panel title');
['proton', 'neutron', 'Bohr', 'CODATA', '9.109', '1.602176', '6.626', 'formula card', 'mistake']
  .forEach(function (extra) {
    check(html.toLowerCase().indexOf(extra.toLowerCase()) === -1, 'does not add ' + extra);
  });
check(PGRE.EXAM_TABLE.constants.length === 15, '15 constant rows (Planck has two follow-on lines)');
check(PGRE.EXAM_TABLE.prefixes.length === 11, '11 SI prefixes');
check(PGRE.EXAM_TABLE.inertia.length === 3, '3 moments of inertia');

var indexSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
check(/js\/data-exam-table\.js\?v=/.test(indexSrc), 'index.html loads data-exam-table.js with a cache token');
check(/js\/view-exam\.js\?v=20261011b/.test(indexSrc), 'index.html cache-busts view-exam.js');
check(/css\/style\.css\?v=20261011b/.test(indexSrc), 'index.html cache-busts style.css');

var viewSrc = fs.readFileSync(path.join(ROOT, 'js', 'view-exam.js'), 'utf8');
check(viewSrc.indexOf('exam-table-btn') !== -1, 'exam room has the table button');
check(viewSrc.indexOf('k === \'t\' || k === \'T\'') !== -1, 'T opens or closes the table');
check(/showPauseOverlay[\s\S]*exam-overlay is-pause/.test(viewSrc), 'pause overlay markup is unchanged');

if (failed) {
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(1);
}
console.log('\n' + passed + ' passed, 0 failed');
