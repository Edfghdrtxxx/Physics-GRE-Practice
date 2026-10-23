#!/usr/bin/env node
/* PGRE.formulaTextHTML: the standalone-symbol pass (js/app.js) that turns a
   bare single letter in card prose into inline math. Three kinds of prose it
   used to italicize stay prose: a page reference "p.43" / "p. 43", the X of
   "X-ray", and the article "A" at a sentence start (after a tag or a display
   block, before an acronym, a name, "3D", or inline math). The symbols it is
   meant to catch still become math. Synthetic strings only — nothing from the
   book.
   Run: node tools/test-formula-text.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var passed = 0;
var failed = 0;

function noop() {}
var window = { PGRE: {}, addEventListener: noop };
var sandbox = {
  window: window,
  PGRE: window.PGRE,
  document: { addEventListener: noop, readyState: 'loading' },
  console: console
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sandbox, { filename: 'js/app.js' });
var f = sandbox.window.PGRE.formulaTextHTML;

function check(kind, input, want) {
  var got = f(input);
  var ok = got === want;
  if (ok) passed++; else failed++;
  console.log((ok ? '  ok  ' : '  FAIL') + ' | ' + kind + ' | ' + JSON.stringify(input) +
    ' -> ' + JSON.stringify(got) + (ok ? '' : ' (wanted ' + JSON.stringify(want) + ')'));
}

console.log('prose that stays prose');
check('page ref', 'Kahn, eq. (4.26), p.84.', 'Kahn, eq. (4.26), p.84.');
check('page ref', 'See p. 43 for the derivation.', 'See p. 43 for the derivation.');
check('page ref', 'Book §2.1, pp.43–44 and p.45–46.', 'Book §2.1, pp.43–44 and p.45–46.');
check('X-ray', 'Bragg: X-rays reflect from planes.', 'Bragg: X-rays reflect from planes.');
check('X-ray', 'an X-ray tube; soft x-rays', 'an X-ray tube; soft x-rays');
check('article A', 'A DC source is switched on.', 'A DC source is switched on.');
check('article A', 'A Michelson interferometer.', 'A Michelson interferometer.');
check('article A', 'A 3D wavefunction separates.', 'A 3D wavefunction separates.');
check('article A', 'A $\\nu_e$ from the Sun.', 'A $\\nu_e$ from the Sun.');
check('article A', 'A $p$-$n$ junction.', 'A $p$-$n$ junction.');
check('article A', '$$f = R/2$$ A concave mirror.', '$$f = R/2$$ A concave mirror.');
check('article A', '<li>A DC source</li>', '<li>A DC source</li>');
check('article A', '<li><strong>A point</strong> mass</li>', '<li><strong>A point</strong> mass</li>');
check('article A', 'A particle with charge q.', 'A particle with charge $q$.');
check('pronoun I', 'I still forget the sign.', 'I still forget the sign.');
check('pronoun I', '$$V = IR$$ I still forget it.', '$$V = IR$$ I still forget it.');

console.log('\nsymbols that still become math');
check('symbol p', 'momentum p and energy E', 'momentum $p$ and energy $E$');
check('symbol p', 'conserve momentum p.', 'conserve momentum $p$.');
check('symbol X', 'the best value X lies between', 'the best value $X$ lies between');
check('symbol X', 'X = 3 is the mean.', '$X$ = 3 is the mean.');
check('symbol X', 'X-hat and X-dagger', '$\\hat{X}$ and $X^{\\dagger}$');
check('symbol A', 'plate area A and gap L', 'plate area $A$ and gap $L$');
check('symbol A', 'amplitude A.', 'amplitude $A$.');
check('symbol A', 'A = pi r^2 for a disc.', '$A$ = $\\pi$ $r^2$ for a disc.');
check('symbol A', 'They commute: A B = B A.', 'They commute: $A$ $B$ = $B$ $A$.');
check('symbol A', '<strong>Current through A:</strong>', '<strong>Current through $A$:</strong>');
check('symbol A', 'For A Hermitian, eigenvalues are real.', 'For $A$ Hermitian, eigenvalues are real.');
check('symbol A', '$$x$$ A = 2.', '$$x$$ $A$ = 2.');
check('symbol I', 'current I through R', 'current $I$ through $R$');
check('symbol I', 'I = V/R holds.', '$I$ = $V$/$R$ holds.');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
