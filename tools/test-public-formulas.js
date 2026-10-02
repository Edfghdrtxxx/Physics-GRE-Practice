#!/usr/bin/env node
/* Public supplemental formula cards in js/data-formulas.js.
   Locks the signed 45-id write set, list markup, the pendulum correction,
   the radiation-field direction card, and KaTeX on every public front, back, and note.
   Run: node tools/test-public-formulas.js */
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
  var sandbox = {
    window: window,
    PGRE: window.PGRE,
    console: console,
    Math: Math,
    JSON: JSON,
    Object: Object,
    Array: Array,
    String: String,
    Number: Number
  };
  vm.createContext(sandbox);
  files.forEach(function (rel) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
  });
  return sandbox.window.PGRE;
}

var PGRE = load(['js/data-topics.js', 'js/data-formulas.js']);
var cards = PGRE.FORMULAS;
var topics = {};
PGRE.TOPICS.forEach(function (t) { topics[t.id] = true; });

var EXPECTED = [
  'supp-infinite-well',
  'supp-newton-momentum',
  'supp-friction',
  'supp-rocket',
  'supp-driven-response',
  'supp-small-oscillation',
  'supp-gravity-orbits',
  'supp-hydrostatics',
  'supp-drift-current',
  'supp-material-aux-fields',
  'supp-image-plane',
  'supp-rc-rl-transients',
  'supp-lorentz-fields',
  'supp-max-power-match',
  'supp-optical-magnification',
  'supp-acoustic-modes',
  'supp-beats',
  'supp-michelson-double-pass',
  'supp-equipartition',
  'supp-lattice-heat-capacity',
  'supp-van-der-waals',
  'supp-fourier-conduction',
  'supp-heat-pump-cop',
  'supp-qm-probability-current',
  'supp-step-barrier',
  'supp-adiabatic-condition',
  'supp-dipole-selection-extra',
  'supp-term-hund',
  'supp-hydrogenic-z-scaling',
  'supp-xray-edges',
  'supp-rigid-rotor',
  'supp-hall',
  'supp-band-mass',
  'supp-scattering-rate',
  'supp-nuclear-q',
  'supp-magnetons',
  'supp-fourier-series',
  'supp-residues',
  'supp-matrix-det-trace',
  'supp-binomial-counting',
  'supp-thin-film',
  'supp-maxwell-speeds',
  'supp-radiation-pressure',
  'supp-grating-power',
  'supp-mean-free-path'
];
var SINGLES = {
  'supp-small-oscillation': 1,
  'supp-beats': 1,
  'supp-fourier-conduction': 1,
  'supp-qm-probability-current': 1,
  'supp-hall': 1
};
var DROPPED = [
  'supp-standard-error',
  'supp-elastic-velocities',
  'supp-mechanical-power',
  'supp-dipole-field',
  'supp-nuclear-radius',
  'supp-torsional-oscillator',
  'supp-thermo-potentials',
  'supp-thermal-expansion',
  'supp-latent-heat',
  'supp-semf',
  'supp-chi-squared',
  'supp-regression',
  'supp-rlc-transients'
];

var byId = {};
var seen = {};
cards.forEach(function (c) {
  if (!c || !c.id) {
    assert(false, 'every card has an id');
    return;
  }
  assert(!seen[c.id], 'id is unique: ' + c.id);
  seen[c.id] = true;
  byId[c.id] = c;
  ['topic', 'tag', 'name', 'front', 'back'].forEach(function (k) {
    assert(typeof c[k] === 'string' && c[k].length > 0, c.id + ' has ' + k);
  });
  assert(topics[c.topic], c.id + ' topic ' + c.topic + ' is a PGRE.TOPICS id');
  if (String(c.id).indexOf('supp-') === 0) {
    assert(c.eq === 'supp', c.id + ' has eq supp');
  }
});

var order = cards.map(function (c) { return c.id; });
var at = order.indexOf(EXPECTED[0]);
assert(at > 0 && order[at - 1] === 'supp-virial', 'the new block follows supp-virial');
assert(order.slice(at, at + EXPECTED.length).join() === EXPECTED.join(),
  'the 45 ids sit together in verdict order');
assert(order[at + EXPECTED.length] === 'cpgl-1.02', 'cpgl-1.02 still closes the public array');

EXPECTED.forEach(function (id) {
  var c = byId[id];
  assert(!!c, id + ' exists');
  if (!c) return;
  assert(c.note && c.note.indexOf('Supplemental — not a numbered CPG equation.') === 0,
    id + ' note starts with the supplemental sentence');
  var lis = (String(c.back).match(/<li>/g) || []).length;
  if (SINGLES[id]) {
    assert(c.kind !== 'list', id + ' is one relation, not a list');
    assert(String(c.back).indexOf('<ul') !== 0, id + ' back is not a recall list');
  } else {
    assert(c.kind === 'list', id + ' is kind list');
    assert(String(c.back).indexOf('<ul class="recall-list">') === 0,
      id + ' back starts with the recall-list markup');
    var count = /\((\d+)\)\s*$/.exec(c.front);
    assert(!!count && Number(count[1]) === lis && lis >= 2,
      id + ' front count matches its list items (' + lis + ')');
  }
});

DROPPED.forEach(function (id) {
  assert(!byId[id], 'dropped id is absent: ' + id);
});

var conductor = byId['cpgf-2.15a'];
assert(!!conductor && conductor.kind !== 'list', 'cpgf-2.15a is still a formula card');
assert(!!conductor && conductor.back.indexOf('D = \\sigma') !== -1,
  'cpgf-2.15a still states the conductor surface result');

var pend = byId['supp-pendulum-mass-shift-shortcut'];
var pendText = pend ? [pend.front, pend.back, pend.note].join('\n') : '';
assert(!!pend && pend.kind !== 'list', 'the pendulum correction keeps its id and is not a list');
assert(pend && pend.note.indexOf('Supplemental — not a numbered CPG equation.') === 0,
  'the pendulum note starts with the supplemental sentence');
assert(!/eliminate all/i.test(pendText) && !/immediately eliminate/i.test(pendText),
  'the pendulum card no longer tells the student to eliminate options');
assert(/does not always/i.test(pendText),
  'the pendulum card says an inward move does not always raise the frequency');
assert(/\\sum_i m_i x_i/.test(pendText) && /1\.089/.test(pendText) && /1\.047/.test(pendText),
  'the pendulum card keeps the moment ratio and the counterexample');

var adia = byId['supp-adiabatic-condition'];
var adiaText = adia ? [adia.front, adia.back, adia.note].join('\n') : '';
assert(adia && !/slow compared/i.test(adiaText) && !/\\hbar\s*\/\s*\(?\\Delta E/.test(adiaText),
  'the adiabatic card does not print the dimensionally wrong time');
assert(adia && /\\partial H/.test(adiaText) && /\(E_n-E_m\)\^2/.test(adiaText),
  'the adiabatic card prints the nondegenerate condition');

var film = byId['supp-thin-film'];
var filmBack = film ? film.back : '';
var filmItems = filmBack.match(/<li>/g);
assert(film && filmItems && filmItems.length === 3 && /\(3\)/.test(film.front),
  'supp-thin-film keeps three graded items');
assert(film && /2nt = \\left\(m\+\\tfrac\{1\}\{2\}\\right\)\\lambda/.test(filmBack),
  'supp-thin-film keeps the one-flip constructive condition');
assert(film && filmBack.indexOf('2nt \\to 0') !== -1 && /2nt = m\\lambda/.test(filmBack),
  'a very thin soap film is m = 0 of 2nt = m lambda');
assert(film && filmBack.indexOf('one flip and $m = 0$, is dark') === -1,
  'supp-thin-film does not call m = 0 of the half-integer condition dark');

var rad = byId['supp-radiation-field'];
var radText = rad ? [rad.front, rad.back, rad.note].join('\n') : '';
var radLis = rad ? (String(rad.back).match(/<li>/g) || []).length : 0;
assert(!!rad && rad.kind === 'list' && rad.eq === 'supp' && rad.topic === 'em',
  'supp-radiation-field is an electromagnetism recall list');
assert(rad && rad.note.indexOf('Supplemental — not a numbered CPG equation.') === 0,
  'supp-radiation-field note starts with the supplemental sentence');
assert(rad && String(rad.back).indexOf('<ul class="recall-list">') === 0 &&
  radLis === 4 && /\(4\)\s*$/.test(rad.front),
  'supp-radiation-field is four recall-list items');
assert(rad && /\\hat\{\\mathbf\{r\}\}\\times\(\\hat\{\\mathbf\{r\}\}\\times\\mathbf\{a\}\)/.test(rad.back) &&
  /-\\mathbf\{a\}_\{\\perp\}/.test(rad.back),
  'the anchor is r-hat cross (r-hat cross a), equal to minus a_perp');
assert(rad && /points opposite the sideways acceleration \$\\mathbf\{a\}_\{\\perp\}\$ \(the part of \$\\mathbf\{a\}\$ perpendicular to \$\\hat\{\\mathbf\{r\}\}\$\)/.test(rad.back) &&
  /negative charge reverses/.test(rad.back),
  'for q > 0 the field points opposite a_perp, reversed for q < 0');
assert(rad && /power per solid angle \$\\propto \\sin\^2\\theta\$/.test(rad.back) &&
  /180\^\\circ/.test(rad.back),
  'power per solid angle follows sin squared, with both axial nulls');
assert(rad && /leave both directions along that line open/.test(rad.back),
  'the plane and transversality do not fix the sense');
assert(rad && !/completely lock/i.test(radText) && !/dipole axis/i.test(radText),
  'the card does not keep the unlocked direction claim');
assert(rad && rad.back.indexOf('accelerating along') !== -1,
  'the wire bullet says the charge is accelerating along the wire');
assert(rad && rad.back.indexOf('from the charge') !== -1,
  'r-hat is defined as pointing from the charge to the field point');

EXPECTED.forEach(function (id) {
  var c = byId[id];
  if (!c) return;
  var blob = [c.front, c.back, c.note].join('\n');
  assert(!/Gaussian/i.test(blob), id + ' has no Gaussian density');
  assert(!/\b(gr\d{4}-\d+|ets\d{2}-\d+)\b/.test(blob), id + ' has no exam-question id');
});

var katex = require(path.join(root, 'vendor/katex/katex.min.js'));
var DELIMS = [['$$', '$$', true], ['\\[', '\\]', true], ['$', '$', false], ['\\(', '\\)', false]];

function extractMath(text) {
  var out = [];
  var i = 0;
  var n = text.length;
  while (i < n) {
    var best = -1;
    var bestIdx = -1;
    for (var d = 0; d < DELIMS.length; d++) {
      var idx = text.indexOf(DELIMS[d][0], i);
      if (idx === -1) continue;
      if (bestIdx === -1 || idx < bestIdx ||
          (idx === bestIdx && DELIMS[d][0].length > DELIMS[best][0].length)) {
        best = d;
        bestIdx = idx;
      }
    }
    if (best === -1) break;
    var left = DELIMS[best][0];
    var right = DELIMS[best][1];
    var end = text.indexOf(right, bestIdx + left.length);
    if (end === -1) return null;
    out.push({ tex: text.slice(bestIdx + left.length, end), display: DELIMS[best][2] });
    i = end + right.length;
  }
  return out;
}

var katexFail = 0;
cards.forEach(function (c) {
  ['front', 'back', 'note'].forEach(function (k) {
    if (!c[k]) return;
    var segs = extractMath(String(c[k]));
    if (!segs) {
      katexFail++;
      console.log('  FAIL — ' + c.id + ' ' + k + ' has an unclosed math delimiter');
      return;
    }
    segs.forEach(function (seg) {
      try {
        katex.renderToString(seg.tex, { throwOnError: true, displayMode: seg.display });
      } catch (err) {
        katexFail++;
        console.log('  FAIL — ' + c.id + ' ' + k + ': ' + String(err.message).split('\n')[0]);
      }
    });
  });
});
assert(katexFail === 0, 'every public formula math segment parses in KaTeX (' + katexFail + ' failures)');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed || katexFail ? 1 : 0);
