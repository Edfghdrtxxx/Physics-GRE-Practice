#!/usr/bin/env node
/* Unit checks for the mock-exam results pick bands (js/view-exam.js):
   wrong, correct, unanswered, and that the helper stays a closed details.miss
   shell with the verdict label in the summary and the choice HTML in the
   body. Flagged is a chip on the card head, not a pick-band change.
   Loads the shipped view against a stubbed DOM. Run:
     node tools/test-exam-review-bands.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var src = fs.readFileSync(path.join(root, 'js', 'view-exam.js'), 'utf8');

var documentStub = {
  getElementById: function () { return null; },
  querySelector: function () { return null; },
  addEventListener: function () {},
  body: { classList: { contains: function () { return false; }, toggle: function () {} } }
};
var windowStub = {
  PGRE: { views: {}, ui: {} },
  addEventListener: function () {},
  document: documentStub
};
windowStub.PGRE.examEngine = {};

var sandbox = {
  window: windowStub,
  document: documentStub,
  PGRE: windowStub.PGRE,
  location: { hash: '#/exam/review/ex-bands' },
  console: console,
  Date: Date,
  Math: Math,
  JSON: JSON,
  String: String,
  Number: Number,
  Array: Array,
  Object: Object,
  parseInt: parseInt,
  isFinite: isFinite
};
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

var view = sandbox.PGRE.views.exam;
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

function q() {
  return {
    id: 'bands-q1',
    topic: 'cm',
    q: 'A particle of charge $q$ moves in a field.',
    choices: [
      '$2Q$',
      '$Q/2$',
      '$5/3\\,Q$',
      '$Q$',
      '$0$'
    ],
    answer: 2,
    sol: 'The potential is $V$.'
  };
}

function bands(html) {
  var re = /<details class="miss exam-review-pick is-(bad|good)">([\s\S]*?)<\/details>/g;
  var out = [];
  var m;
  while ((m = re.exec(html))) {
    var inner = m[2];
    var label = (inner.match(/<summary><strong>([\s\S]*?)<\/strong><\/summary>/) || [])[1] || '';
    var body = (inner.match(/<div class="exam-review-pick-body">([\s\S]*?)<\/div>/) || [])[1];
    out.push({ kind: m[1], label: label, body: body == null ? '' : body, open: / open/.test(m[0]) });
  }
  return out;
}

assert(typeof view.reviewPickBandsHTML === 'function',
  'the exam view exports reviewPickBandsHTML');

var wrong = view.reviewPickBandsHTML(q(), 0);
var wrongBands = bands(wrong);
assert(wrong.indexOf('miss-picks') === -1 && wrong.indexOf('miss-pick is-') === -1,
  'wrong pick uses details bands, not the always-open miss-pick rows');
assert(wrongBands.length === 2 && !wrongBands[0].open && !wrongBands[1].open,
  'wrong pick is two closed bands');
assert(wrongBands[0].kind === 'bad' && wrongBands[0].label === 'You picked A' &&
  wrongBands[0].body === '$2Q$',
  'wrong pick band is red-tinted "You picked A" with the picked choice in the body');
assert(wrongBands[1].kind === 'good' && wrongBands[1].label === 'Correct: C' &&
  wrongBands[1].body === '$5/3\\,Q$',
  'correct band is green-tinted "Correct: C" with the key in the body');

var right = view.reviewPickBandsHTML(q(), 2);
var rightBands = bands(right);
assert(rightBands.length === 1 && !rightBands[0].open && rightBands[0].kind === 'good',
  'a correct pick is one closed green band');
assert(rightBands[0].label === 'You picked C' && rightBands[0].body === '$5/3\\,Q$',
  'correct pick keeps the "You picked C" label and the key as the body');
assert(right.indexOf('Correct:') === -1 && right.indexOf('Left blank') === -1,
  'a correct pick does not add a Correct or Left blank band');

var blank = view.reviewPickBandsHTML(q(), null);
var blankBands = bands(blank);
assert(blankBands.length === 2 && !blankBands[0].open && !blankBands[1].open,
  'an unanswered question is two closed bands');
assert(blankBands[0].kind === 'bad' && blankBands[0].label === 'Left blank' &&
  blankBands[0].body === '',
  'unanswered first band is red-tinted "Left blank" with no choice body');
assert(blankBands[1].kind === 'good' && blankBands[1].label === 'Correct: C' &&
  blankBands[1].body === '$5/3\\,Q$',
  'unanswered second band is green-tinted "Correct: C" with the key in the body');

assert(wrong.indexOf('<details class="miss exam-review-pick') !== -1 &&
  wrong.indexOf('<summary><strong>') !== -1,
  'bands reuse the details.miss summary shell');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
