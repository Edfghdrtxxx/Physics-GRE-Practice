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
  'supp-capacitor-energy-halving',
  'supp-parallel-wire-force',
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
var transients = byId['supp-rc-rl-transients'];
var discharge = transients.back.split('<li>')[2].split('</li>')[0];
assert(transients.kind === 'list' && transients.topic === 'em' && transients.tag === 'Transients',
  'the transient card keeps its list kind, topic, and tag');
assert(discharge.indexOf('from charge $Q_0$ at $t=0$') !== -1 &&
  discharge.indexOf('$Q$ is charge, $Q_0$ initial charge, $R$ resistance, $C$ capacitance, and $t$ elapsed time') !== -1,
  'discharge defines the initial condition and every variable');
assert(discharge.indexOf('$Q(t) = Q_0 e^{-t/RC}$.') !== -1 &&
  discharge.indexOf('$I(t) = |dQ/dt| = (Q_0/RC)e^{-t/RC}$') !== -1 &&
  discharge.indexOf('$V(t) = Q(t)/C = (Q_0/C)e^{-t/RC}$') !== -1,
  'discharge states charge, current magnitude, and capacitor voltage without a trailing comma');
assert(discharge.indexOf('$\\tau = RC$') !== -1 &&
  discharge.indexOf('$Q(\\tau) = Q_0/e \\approx 0.37Q_0$') !== -1 &&
  discharge.indexOf('$37\\%$') !== -1 && discharge.indexOf('$e^{-2t/RC}$') !== -1,
  'discharge keeps the time constant, remaining charge, and energy decay');
assert((transients.back.match(/Q_f\(1-e\^\{-t\/RC\}\)/g) || []).length === 1,
  'the charging relation appears once');
var halving = byId['supp-capacitor-energy-halving'];
var halvingItems = halving ? halving.back.split('<li>').slice(1) : [];
assert(!!halving && halving.kind === 'list' && halving.topic === 'em' && halving.tag === 'Transients' &&
  halvingItems.length === 4 && /\(4\)\s*$/.test(halving.front),
  'the capacitor half-time card is a four-item em list');
assert(halvingItems[0].indexOf('$U = Q^2/(2C) = \\tfrac{1}{2}CV^2 = \\tfrac{1}{2}QV$') !== -1 &&
  halvingItems[1].indexOf('$U = U_0 e^{-2t/RC}$') !== -1 &&
  halvingItems[2].indexOf('$t = RC\\ln 2 \\approx 0.69\\,RC$') !== -1 &&
  halvingItems[3].indexOf('$t = (RC\\ln 2)/2 \\approx 0.35\\,RC$') !== -1,
  'the capacitor half-time card states the energy forms and both half-times');
// numeric check: at t = RC ln2 the charge is 1/2, at t = RC ln2 / 2 the energy is 1/2
assert(Math.abs(Math.exp(-Math.LN2) - 0.5) < 1e-12 && Math.abs(Math.exp(-2 * Math.LN2 / 2) - 0.5) < 1e-12 &&
  Math.abs(Math.LN2 - 0.69) < 0.005 && Math.abs(Math.LN2 / 2 - 0.35) < 0.005,
  'the half-times satisfy their defining equations and the 0.69 and 0.35 coefficients');
var wire = byId['supp-parallel-wire-force'];
var wireItems = wire ? wire.back.split('<li>').slice(1) : [];
assert(!!wire && wire.kind === 'list' && wire.topic === 'em' && wire.tag === 'Magnetic force' &&
  wireItems.length === 4 && /\(4\)\s*$/.test(wire.front),
  'the parallel-wire card is a four-item em list');
assert(wireItems[0].indexOf('$B = \\mu_0 I/(2\\pi r)$') !== -1 &&
  wireItems[1].indexOf('$\\mathbf{F} = I\\mathbf{L}\\times\\mathbf{B}$') !== -1 &&
  wireItems[2].indexOf('$F/L = \\mu_0 I_1 I_2/(2\\pi d)$') !== -1 &&
  wireItems[2].indexOf('$\\mu_0 I^2/(2\\pi d)$') !== -1 &&
  /same direction attract/.test(wireItems[3]) && /opposite directions repel/.test(wireItems[3]),
  'the parallel-wire card states the wire field, F = I L x B, the force per length, and attract versus repel');
// numeric check: mu_0/(2 pi) = 2e-7 N/A^2, so 1 A and 1 A at 1 m give 2e-7 N/m
var mu0 = 4 * Math.PI * 1e-7;
assert(Math.abs(mu0 * 1 * 1 / (2 * Math.PI * 1) - 2e-7) < 1e-19 &&
  Math.abs(mu0 / (2 * Math.PI) - 2e-7) < 1e-19,
  'the parallel-wire coefficient mu_0/(2 pi) is 2e-7 N/A^2');
// sign check: z-hat cross phi-hat = -r-hat (force on wire 2 points toward wire 1)
function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
// wire 1 on the z axis, wire 2 at x = d: r-hat = +x, phi-hat = +y there
var zphi = cross([0, 0, 1], [0, 1, 0]);
assert(zphi[0] === -1 && zphi[1] === 0 && zphi[2] === 0,
  'z-hat cross phi-hat is minus r-hat, so parallel currents attract');
var drift = byId['supp-drift-current'];
var driftItems = drift ? drift.back.split('<li>').slice(1) : [];
assert(!!drift && drift.kind === 'list' && drift.topic === 'em' && drift.tag === 'Current density' &&
  driftItems.length === 5 && /\(5\)\s*$/.test(drift.front),
  'the drift card keeps its list kind, topic, and tag, and holds five items');
assert(driftItems[0].indexOf('$\\mathbf{J} = n q \\mathbf{v}_d$') !== -1 &&
  driftItems[1].indexOf('$I = n|q| A v_d$') !== -1,
  'the drift card keeps the current density and the current through an area');
assert(driftItems[2].indexOf('$v_d = I/(n|q|A)$') !== -1 && driftItems[2].indexOf('$A = \\pi r^2$') !== -1,
  'the drift card states the drift speed and the round-wire area');
assert(driftItems[3].indexOf('$\\mathbf{J} = \\sigma\\mathbf{E}$') !== -1 &&
  driftItems[3].indexOf('$\\rho = 1/\\sigma$') !== -1,
  'the drift card states the microscopic Ohm law with resistivity');
assert(driftItems[4].indexOf('10^{28}') !== -1 && driftItems[4].indexOf('1.6\\times10^{-19}') !== -1 &&
  driftItems[4].indexOf('2\\times10^{-4}') !== -1 && driftItems[4].indexOf('below $1\\ \\mathrm{mm/s}$') !== -1,
  'the drift card gives the metal carrier density, the charge, and the sub-mm/s magnitude');
// the worked example: 100 A, r = 0.01 m, n = 1e28 m^-3, e = 1.6e-19 C
var driftA = Math.PI * 0.01 * 0.01;
var driftV = 100 / (1e28 * 1.6e-19 * driftA);
assert(Math.abs(driftA - 3.1e-4) < 0.05e-4 && driftV > 1.9e-4 && driftV < 2.1e-4,
  'the worked drift example reproduces A = 3.1e-4 m^2 and v_d = 2e-4 m/s');
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

var power = byId['supp-max-power-match'];
var powerBack = power ? power.back : '';
var powerItems = powerBack.match(/<li>/g);
var powerResist = 'If $R_g > 0$ and the loop reactance is zero, $R_L = R_g$. ' +
  'If only $R_L$ can vary, the best value is $\\sqrt{R_g^2+(X_g+X_L)^2}$; ' +
  'when $X_L = 0$ that is $|Z_g|$, which is not $R_g$ unless $X_g = 0$.';
assert(power && powerItems && powerItems.length === 3 && /\(3\)/.test(power.front),
  'supp-max-power-match keeps three graded items');
assert(power && powerBack.indexOf(powerResist) !== -1,
  'supp-max-power-match separates R_L = R_g from R_L = |Z_g|');
assert(power && powerBack.indexOf('the resistive match is $R_L = R_g$') === -1,
  'supp-max-power-match does not state R_L = R_g for every positive source resistance');

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

var ham = byId['supp-hamilton-principle'];
var hamText = ham ? [ham.front, ham.back, ham.note].join('\n') : '';
assert(!!ham && ham.eq === 'supp' && ham.topic === 'cm' && ham.tag === 'Lagrangian',
  'supp-hamilton-principle is a classical mechanics Lagrangian card');
assert(ham && ham.note.indexOf('Supplemental — not a numbered CPG equation.') === 0,
  'supp-hamilton-principle note starts with the supplemental sentence');
assert(ham && /\\delta S = 0/.test(ham.back) && /S = \\int_\{t_1\}\^\{t_2\} L\\,dt/.test(ham.back),
  'supp-hamilton-principle states stationary action and the action integral');
assert(ham && /L = T - U/.test(ham.back) && /time \$dt\$/.test(ham.back),
  'supp-hamilton-principle defines L = T - U and integration variable dt');
assert(ham && /T - U/.test(ham.note) && /never \$T \+ U\$/.test(ham.note) &&
  /time \$dt\$/.test(ham.note) && /never spatial coordinate \$dx\$/.test(ham.note),
  'supp-hamilton-principle note highlights T - U and dt traps');

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
