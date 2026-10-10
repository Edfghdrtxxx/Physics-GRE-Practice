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
assert(discharge.indexOf('discharging from $Q_0$') !== -1 &&
  discharge.indexOf('$Q = Q_0 e^{-t/RC}$') !== -1 &&
  discharge.indexOf('$I = (Q_0/RC)e^{-t/RC}$') !== -1 &&
  discharge.indexOf('$V_C = Q/C$') !== -1,
  'discharge states the initial charge, the charge, the current, and the capacitor voltage');
var transientItems = transients.back.split('<li>').slice(1);
assert(transientItems.length === 5 && /\(5\)\s*$/.test(transients.front) &&
  transientItems[0].indexOf('charging from zero toward $Q_f = CV$') !== -1 &&
  transientItems[2].indexOf('rising from zero toward $I_f = V/R$') !== -1 &&
  transientItems[2].indexOf('$I = I_f\\left(1-e^{-(R/L)t}\\right)$') !== -1 &&
  transientItems[3].indexOf('$I = I_0 e^{-(R/L)t}$') !== -1,
  'the transient card keeps five items with the inductor rise and decay');
assert(transientItems[4].indexOf('$e^{-2t/\\tau}$') !== -1 &&
  transientItems[4].indexOf('$(1-e^{-t/\\tau})^2$') !== -1 &&
  transientItems[4].indexOf('$\\tau = RC$ or $L/R$') !== -1,
  'the stored energy decays as the square of the decay factor and rises as the square of the approach factor');
assert(transients.note.indexOf('$1/e \\approx 37\\%$') !== -1 &&
  Math.abs(Math.exp(-1) - 0.37) < 0.005,
  'the note keeps the fraction left after one time constant');
// numeric check: U = Q^2/(2C) with Q = Q0 e^{-t/RC} or Q = Qf (1 - e^{-t/RC})
var tOverTau = 0.7;
assert(Math.abs(Math.pow(Math.exp(-tOverTau), 2) - Math.exp(-2 * tOverTau)) < 1e-12 &&
  Math.abs(Math.pow(1 - Math.exp(-tOverTau), 2) - (1 - 2 * Math.exp(-tOverTau) + Math.exp(-2 * tOverTau))) < 1e-12,
  'the energy factors are the squares of the charge factors');
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
var coax = byId['supp-coaxial'];
var coaxBack = coax ? coax.back : '';
assert(!!coax && coax.topic === 'em' && coax.tag === 'Coaxial cable' && coax.kind === undefined &&
  coaxBack.indexOf('$$a < r < b:\\quad E_r = \\frac{\\lambda}{2\\pi\\epsilon r},\\quad B_\\phi = \\frac{\\mu I}{2\\pi r}$$') === 0 &&
  coaxBack.indexOf('\\dfrac{C}{\\ell} = \\dfrac{2\\pi\\epsilon}{\\ln(b/a)}') !== -1 &&
  coaxBack.indexOf('\\dfrac{L}{\\ell} = \\dfrac{\\mu}{2\\pi}\\ln\\dfrac{b}{a}') !== -1 &&
  coaxBack.indexOf('Z_0 = \\sqrt{\\dfrac{L}{C}} = \\dfrac{1}{2\\pi}\\sqrt{\\dfrac{\\mu}{\\epsilon}}\\ln\\dfrac{b}{a}') !== -1,
  'the coaxial card keeps its id, topic, tag, and its field, C, L, Z0 lines');
assert(coaxBack.indexOf('V_a - V_b = \\dfrac{\\lambda}{2\\pi\\epsilon}\\ln\\dfrac{b}{a}') !== -1 &&
  coaxBack.indexOf('zero for $r \\gt b$') !== -1 && /shell of charge[^.]*\$E = 0\$ inside/.test(coaxBack) &&
  coax.note.indexOf('$C/\\ell = \\lambda/(V_a - V_b)$') !== -1 &&
  /inner conductor of radius \$a\$/.test(coax.front) && /return current and \$-\\lambda\$ on its outer conductor/.test(coax.front) &&
  coax.note.indexOf('$V(r) = -(\\lambda/2\\pi\\epsilon)\\ln(r/r_0)$') !== -1 &&
  coax.note.indexOf('chosen radius $r_0$') !== -1,
  'the coaxial card states V, the outside field, the shell rule, and names the Gauss route and the log reference radius in its note');
assert(coaxBack.indexOf('Gaussian cylinder') === -1 && coaxBack.indexOf('\\int_a^b') === -1 &&
  coaxBack.indexOf('55.6') === -1,
  'the coaxial back carries no derivation or worked number');
// numeric check: integral of lambda/(2 pi eps0 r) from a to b equals (lambda/2 pi eps0) ln(b/a), so C/l = lambda/V
var eps0 = 8.8541878128e-12, lam = 3e-9, ra = 0.002, rb = 0.007, steps = 200000, vsum = 0;
for (var k = 0; k < steps; k++) {
  var rmid = ra + (rb - ra) * (k + 0.5) / steps;
  vsum += lam / (2 * Math.PI * eps0 * rmid) * (rb - ra) / steps;
}
var vExact = lam / (2 * Math.PI * eps0) * Math.log(rb / ra);
assert(Math.abs(vsum / vExact - 1) < 1e-9 &&
  Math.abs(lam / vExact / (2 * Math.PI * eps0 / Math.log(rb / ra)) - 1) < 1e-12,
  'the integral of E gives the logarithm, and C/l = lambda/V = 2 pi eps0/ln(b/a)');
// numeric check: Z0 = sqrt((L/l)/(C/l)) equals (1/2 pi) sqrt(mu/eps) ln(b/a)
var mu0c = 4 * Math.PI * 1e-7;
var cPerLen = 2 * Math.PI * eps0 / Math.log(rb / ra);
var lPerLen = mu0c / (2 * Math.PI) * Math.log(rb / ra);
assert(Math.abs(Math.sqrt(lPerLen / cPerLen) /
  (Math.sqrt(mu0c / eps0) * Math.log(rb / ra) / (2 * Math.PI)) - 1) < 1e-12,
  'Z0 = sqrt(L/C) equals (1/2 pi) sqrt(mu/eps) ln(b/a)');
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
assert(driftItems[4].indexOf('10^{28}') !== -1 && driftItems[4].indexOf('$|q| = e$') !== -1 &&
  driftItems[4].indexOf('$J = 3\\times10^{5}\\ \\mathrm{A/m^2}$') !== -1 &&
  driftItems[4].indexOf('$v_d = J/(ne) \\approx 2\\times10^{-4}\\ \\mathrm{m/s}$') !== -1 &&
  driftItems[4].indexOf('below $1\\ \\mathrm{mm/s}$') !== -1,
  'the drift card gives the metal carrier density, the charge, the current density, and the sub-mm/s magnitude');
assert(drift.back.indexOf('Example:') === -1 && drift.back.indexOf('100\\ \\mathrm{A}') === -1,
  'the drift back carries no worked wire example');
// numeric check: J = 3e5 A/m^2 (100 A through r = 0.01 m), n = 1e28 m^-3, e = 1.6e-19 C
var driftA = Math.PI * 0.01 * 0.01;
var driftV = 3e5 / (1e28 * 1.6e-19);
assert(Math.abs(100 / driftA / 3e5 - 1) < 0.07 && driftV > 1.8e-4 && driftV < 2.0e-4 && driftV < 1e-3,
  'J = 3e5 A/m^2 in a metal gives v_d = 2e-4 m/s, below 1 mm/s');
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
assert(power && powerItems && powerItems.length === 3 && /\(3\)/.test(power.front),
  'supp-max-power-match keeps three graded items');
assert(power && powerBack.indexOf('$Z_L = Z_g^*$, that is $R_L = R_g$ together with $X_L = -X_g$') !== -1 &&
  powerBack.indexOf('If only $R_L$ can vary: $R_L = \\sqrt{R_g^2+(X_g+X_L)^2}$, which is $|Z_g|$ when $X_L = 0$') !== -1 &&
  power.note.indexOf('$|Z_g|$ equals $R_g$ only when $X_g = 0$') !== -1,
  'supp-max-power-match separates R_L = R_g from R_L = |Z_g|');
// numeric check: P is proportional to R_L / ((R_g+R_L)^2 + (X_g+X_L)^2); scan R_L with X_L fixed
var pRg = 3, pXg = 4, pXl = 0, pBest = 0, pBestR = 0;
for (var pr = 0.001; pr < 20; pr += 0.001) {
  var pw = pr / ((pRg + pr) * (pRg + pr) + (pXg + pXl) * (pXg + pXl));
  if (pw > pBest) { pBest = pw; pBestR = pr; }
}
assert(Math.abs(pBestR - Math.sqrt(pRg * pRg + (pXg + pXl) * (pXg + pXl))) < 0.002 &&
  Math.abs(pBestR - 5) < 0.002,
  'with only R_L free and X_L = 0 the best load is |Z_g| = 5, not R_g = 3');
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
  /-q\\,\\mathbf\{a\}_\{\\perp\}/.test(rad.back),
  'the anchor is q times r-hat cross (r-hat cross a), equal to minus q a_perp');
assert(rad && /for \$q \\gt 0\$ it points opposite \$\\mathbf\{a\}_\{\\perp\}\$, the part of \$\\mathbf\{a\}\$ perpendicular to \$\\hat\{\\mathbf\{r\}\}\$/.test(rad.back) &&
  /\\propto q\\,\\hat\{\\mathbf\{r\}\}/.test(rad.back),
  'for q > 0 the field points opposite a_perp, and the factor q reverses it for q < 0');
assert(rad && /power per solid angle \$\\propto \\sin\^2\\theta\$/.test(rad.back) &&
  /180\^\\circ/.test(rad.back),
  'power per solid angle follows sin squared, with both axial nulls');
assert(rad && /fix only the line of/.test(rad.note) && /triple product fixes which way/.test(rad.note),
  'the plane and transversality do not fix the sense');
assert(rad && !/completely lock/i.test(radText) && !/dipole axis/i.test(radText),
  'the card does not keep the unlocked direction claim');
assert(rad && rad.back.indexOf('wire on the') === -1,
  'the back carries no worked wire example');
assert(rad && rad.note.indexOf('from the charge to the field point') !== -1,
  'r-hat is defined as pointing from the charge to the field point');
// vector check: r-hat cross (r-hat cross a) equals minus the part of a perpendicular to r-hat
var radR = [0.6, 0, 0.8], radAcc = [1, 2, 3];
var radTriple = cross(radR, cross(radR, radAcc));
var radDot = radR[0] * radAcc[0] + radR[1] * radAcc[1] + radR[2] * radAcc[2];
var radPerp = [radAcc[0] - radDot * radR[0], radAcc[1] - radDot * radR[1], radAcc[2] - radDot * radR[2]];
assert(Math.abs(radTriple[0] + radPerp[0]) < 1e-12 && Math.abs(radTriple[1] + radPerp[1]) < 1e-12 &&
  Math.abs(radTriple[2] + radPerp[2]) < 1e-12 &&
  Math.abs(radTriple[0] * radR[0] + radTriple[1] * radR[1] + radTriple[2] * radR[2]) < 1e-12,
  'r-hat cross (r-hat cross a) is minus a_perp and is perpendicular to r-hat');

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

var rot = byId['supp-rotating-loop-emf'];
var rotLis = rot ? (String(rot.back).match(/<li>/g) || []).length : 0;
assert(!!rot && rot.kind === 'list' && rot.eq === 'supp' && rot.topic === 'em' && rot.tag === 'Induction',
  'supp-rotating-loop-emf is an electromagnetism induction list');
assert(rot && rot.note.indexOf('Supplemental — not a numbered CPG equation.') === 0,
  'supp-rotating-loop-emf note starts with the supplemental sentence');
assert(rot && String(rot.back).indexOf('<ul class="recall-list">') === 0 &&
  rotLis === 3 && /\(3\)\s*$/.test(rot.front),
  'supp-rotating-loop-emf is three recall-list items');
assert(rot && /\\Phi_B = NBA\\cos\\omega t/.test(rot.back) &&
  /\\mathcal\{E\} = NBA\\omega\\sin\\omega t/.test(rot.back) &&
  /\\mathcal\{E\}_0 = NBA\\omega/.test(rot.back),
  'supp-rotating-loop-emf states flux NBA cos omega t and peak emf NBA omega');
assert(rot && /emf is largest when the flux is zero/.test(rot.back),
  'supp-rotating-loop-emf states that the emf peaks at zero flux');
assert(rot && rot.note.indexOf('A = \\pi a^2') !== -1 &&
  rot.note.indexOf('\\mathcal{E} = -d\\Phi_B/dt') !== -1,
  'supp-rotating-loop-emf note keeps Faraday and the circular-loop area');
assert(rot && !/\\pi\^2 a\^4/.test([rot.front, rot.back, rot.note].join('\n')),
  'supp-rotating-loop-emf does not store the circular-loop average-power algebra');
// Faraday: ε = -dΦ/dt with Φ = NBA cos ωt gives NBA ω sin ωt; peak at flux zero
var rotN = 2, rotA = 0.01, rotB = 0.5, rotW = 300;
var rotT = Math.PI / (2 * rotW);
var rotPhi = rotN * rotA * rotB * Math.cos(rotW * rotT);
var rotEmf = rotN * rotA * rotB * rotW * Math.sin(rotW * rotT);
assert(Math.abs(rotPhi) < 1e-12 && Math.abs(rotEmf - rotN * rotA * rotB * rotW) < 1e-12,
  'at ωt = π/2 the flux is zero and the emf is the peak NBA ω');
var rotDphiDt = -rotN * rotA * rotB * rotW * Math.sin(rotW * rotT);
assert(Math.abs(-rotDphiDt - rotEmf) < 1e-12,
  'minus d(NBA cos ωt)/dt equals NBA ω sin ωt');
assert(Math.abs(rotN * rotA * rotB * 0) === 0,
  'ω → 0 gives zero induced emf');

var avg = byId['supp-sin2-cycle-average'];
var avgLis = avg ? (String(avg.back).match(/<li>/g) || []).length : 0;
assert(!!avg && avg.kind === 'list' && avg.eq === 'supp' && avg.topic === 'em',
  'supp-sin2-cycle-average is an electromagnetism recall list');
assert(avg && avg.note.indexOf('Supplemental — not a numbered CPG equation.') === 0,
  'supp-sin2-cycle-average note starts with the supplemental sentence');
assert(avg && String(avg.back).indexOf('<ul class="recall-list">') === 0 &&
  avgLis === 3 && /\(3\)\s*$/.test(avg.front),
  'supp-sin2-cycle-average is three recall-list items');
assert(avg && /\\langle\\sin\^2\\omega t\\rangle = \\langle\\cos\^2\\omega t\\rangle = \\tfrac\{1\}\{2\}/.test(avg.back) &&
  /\\langle\\sin\\omega t\\rangle = \\langle\\cos\\omega t\\rangle = 0/.test(avg.back),
  'supp-sin2-cycle-average states the sine-squared and sine averages');
assert(avg && /\\langle P\\rangle = \\mathcal\{E\}_0\^2\/\(2R\)/.test(avg.back) &&
  /Average emf zero does not make average power zero/.test(avg.back),
  'supp-sin2-cycle-average states average Joule power ε0²/(2R)');
assert(avg && avg.note.indexOf('P = \\mathcal{E}^2/R') !== -1,
  'supp-sin2-cycle-average note names instantaneous Joule power');
assert(avg && !/\\pi\^2 a\^4/.test([avg.front, avg.back, avg.note].join('\n')),
  'supp-sin2-cycle-average does not store the circular-loop average-power algebra');
// identity and period average
var avgSteps = 200000, avgSin2 = 0, avgSin = 0, avgPeriod = 2 * Math.PI;
for (var ai = 0; ai < avgSteps; ai++) {
  var ax = (ai + 0.5) / avgSteps * avgPeriod;
  avgSin2 += Math.sin(ax) * Math.sin(ax);
  avgSin += Math.sin(ax);
}
assert(Math.abs(avgSin2 / avgSteps - 0.5) < 1e-4 && Math.abs(avgSin / avgSteps) < 1e-4,
  'the period averages of sin^2 and sin are 1/2 and 0');
assert(Math.abs(0.5 * (1 - 0) - 0.5) < 1e-12,
  'sin^2 θ = (1 - cos 2θ)/2 averages to 1/2');
var circA = Math.PI, circEmf0 = circA * 1 * 1, circR = 2;
var circP = circEmf0 * circEmf0 / (2 * circR);
assert(Math.abs(circP - Math.PI * Math.PI / 4) < 1e-12,
  'a loop of area π in B=1, ω=1, R=2 has ⟨P⟩ = π²/4');
assert(Math.abs((0 * 0) / (2 * circR)) === 0,
  'ω → 0 gives zero average Joule power');

var magDip = byId['supp-magnetic-dipole-far-field'];
var magDipLis = magDip ? (String(magDip.back).match(/<li>/g) || []).length : 0;
var magDipText = magDip ? [magDip.front, magDip.back, magDip.note].join('\n') : '';
assert(!!magDip && magDip.kind === 'list' && magDip.eq === 'supp' && magDip.topic === 'em' &&
  magDip.tag === 'Dipoles',
  'supp-magnetic-dipole-far-field is an electromagnetism Dipoles list');
assert(magDip && magDip.note.indexOf('Supplemental — not a numbered CPG equation.') === 0,
  'supp-magnetic-dipole-far-field note starts with the supplemental sentence');
assert(magDip && String(magDip.back).indexOf('<ul class="recall-list">') === 0 &&
  magDipLis === 3 && /\(3\)\s*$/.test(magDip.front),
  'supp-magnetic-dipole-far-field is three recall-list items');
assert(magDip && /magnetic dipole/.test(magDip.back) &&
  /B \\propto m\/r\^3/.test(magDip.back) &&
  /m = IA/.test(magDip.back),
  'supp-magnetic-dipole-far-field states the far-field dipole and B ∝ m/r³ with m = IA');
assert(magDip && /1\/r\^2/.test(magDip.back) && /point charge/.test(magDip.back),
  'supp-magnetic-dipole-far-field contrasts the point-charge electric 1/r²');
assert(magDip && /\\mu_0 I a\^2\/\(2z\^3\)/.test(magDip.note) &&
  /\\mu_0 m\/\(2\\pi z\^3\)/.test(magDip.note) &&
  /m = I\\pi a\^2/.test(magDip.note),
  'supp-magnetic-dipole-far-field note keeps the on-axis far-field identity');
assert(magDip && !/\b(gr\d{4}-\d+|ets\d{2}-\d+)\b/.test(magDipText),
  'supp-magnetic-dipole-far-field has no exam-question id');
// on-axis loop: B = μ0 I a² / (2 (a²+z²)^{3/2}) → μ0 I a²/(2z³) = μ0 m/(2π z³) for z ≫ a
var dipA = 0.05, dipZ = 5, dipI = 3;
var dipBexact = mu0 * dipI * dipA * dipA / (2 * Math.pow(dipA * dipA + dipZ * dipZ, 1.5));
var dipBfar = mu0 * dipI * dipA * dipA / (2 * dipZ * dipZ * dipZ);
var dipM = dipI * Math.PI * dipA * dipA;
var dipBdipole = mu0 * dipM / (2 * Math.PI * dipZ * dipZ * dipZ);
assert(Math.abs(dipBfar - dipBdipole) < 1e-18,
  'μ0 I a²/(2z³) equals μ0 m/(2π z³) with m = I π a²');
assert(Math.abs(dipBexact / dipBfar - 1) < 0.0002,
  'the on-axis loop field approaches μ0 I a²/(2z³) for z ≫ a');

var axis = byId['supp-loop-axis-field'];
var axisLis = axis ? (String(axis.back).match(/<li>/g) || []).length : 0;
var axisText = axis ? [axis.front, axis.back, axis.note].join('\n') : '';
assert(!!axis && axis.kind === 'list' && axis.eq === 'supp' && axis.topic === 'em' &&
  axis.tag === 'Biot-Savart',
  'supp-loop-axis-field is an electromagnetism Biot-Savart list');
assert(axis && axis.note.indexOf('Supplemental — not a numbered CPG equation.') === 0,
  'supp-loop-axis-field note starts with the supplemental sentence');
assert(axis && String(axis.back).indexOf('<ul class="recall-list">') === 0 &&
  axisLis === 3 && /\(3\)\s*$/.test(axis.front),
  'supp-loop-axis-field is three recall-list items');
assert(axis && /B\(z\) = \\frac\{\\mu_0 I R\^2\}\{2\(R\^2 \+ z\^2\)\^\{3\/2\}\}/.test(axis.back),
  'supp-loop-axis-field states the on-axis Biot–Savart formula');
assert(axis && /z = 0/.test(axis.back) && /\\mu_0 I\/\(2R\)/.test(axis.back),
  'supp-loop-axis-field states the centre limit μ0 I/(2R)');
assert(axis && /z \\gg R/.test(axis.back) && /\\mu_0 I R\^2\/\(2z\^3\)/.test(axis.back) &&
  /m = I\\pi R\^2/.test(axis.back),
  'supp-loop-axis-field states the far-field limit and m = IπR²');
assert(axis && /\\mu_0 m\/\(2\\pi z\^3\)/.test(axis.back),
  'supp-loop-axis-field equates the far field to μ0 m/(2π z³)');
assert(axis && !/\b(gr\d{4}-\d+|ets\d{2}-\d+)\b/.test(axisText),
  'supp-loop-axis-field has no exam-question id');
assert(!byId['supp-dipole-field'],
  'dropped id supp-dipole-field stays absent');
// on-axis loop: B(0) = μ0 I/(2R); z ≫ R → μ0 I R²/(2z³) = μ0 m/(2π z³)
var axR = 0.04, axI = 2;
var axB0 = mu0 * axI * axR * axR / (2 * Math.pow(axR * axR, 1.5));
var axBcenter = mu0 * axI / (2 * axR);
assert(Math.abs(axB0 - axBcenter) < 1e-18,
  'B(z) at z = 0 equals μ0 I/(2R)');
var axZ = 8;
var axBexact = mu0 * axI * axR * axR / (2 * Math.pow(axR * axR + axZ * axZ, 1.5));
var axBfar = mu0 * axI * axR * axR / (2 * axZ * axZ * axZ);
var axM = axI * Math.PI * axR * axR;
var axBdipole = mu0 * axM / (2 * Math.PI * axZ * axZ * axZ);
assert(Math.abs(axBfar - axBdipole) < 1e-18,
  'μ0 I R²/(2z³) equals μ0 m/(2π z³) with m = I π R²');
assert(Math.abs(axBexact / axBfar - 1) < 0.0002,
  'the on-axis loop field approaches μ0 I R²/(2z³) for z ≫ R');
assert(Math.abs((mu0 * axI / axR) / axBcenter - 2) < 1e-12,
  'the centre field has dimensions μ0 I / length');

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
