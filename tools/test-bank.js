#!/usr/bin/env node
/* Unit tests for js/bank.js — question partitioning and spoiler protection.
   Loads the shipped bank.js (no re-implementation) against a fabricated bank.
   Run: node tools/test-bank.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var bankSrc = fs.readFileSync(path.join(root, 'js', 'bank.js'), 'utf8');

var window = { PGRE: {} };
var sandbox = {
  window: window,
  PGRE: window.PGRE,
  console: console,
  Array: Array,
  Object: Object
};
vm.createContext(sandbox);
vm.runInContext(bankSrc, sandbox);

var PGRE = sandbox.PGRE;
if (typeof PGRE.allQuestions !== 'function' || typeof PGRE.questionById !== 'function') {
  console.error('FAIL: shipped bank.js did not export allQuestions/questionById');
  process.exit(1);
}

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

function q(id, topic) { return { id: id, topic: topic || 'cm', answer: 0, choices: ['a', 'b', 'c', 'd', 'e'] }; }

/* Fabricated bank. Note: 'dup' appears in BOTH the default pool (preview) and
   the released-exam bank, to prove dedup keeps the first occurrence. */
PGRE.QUESTIONS = [q('p1', 'cm'), q('p2', 'em'), q('dup', 'qm')];
PGRE.BOOK_QUESTIONS = [q('b1', 'th'), q('b2', 'cm')];
PGRE.ETS_DRILLS = [
  { id: 'drill-8677', questions: [q('d1', 'cm'), q('d2', 'em')] },
  { id: 'drill-9277', questions: [q('d3', 'qm')] }
];
PGRE.BOOK_EXAMS = [
  { id: 'x1', title: 'Book sample exam', format: '70x120', questions: [q('e1', 'at'), q('e2', 'sp')] }
];
PGRE.ETS_EXAMS = [
  { id: 'gr8677', title: 'GR8677', format: '100x170', questions: [q('dup', 'sr'), q('g2', 'ow'), q('g3', 'lb')] }
];

var EXAM_SRCS = ['cpg-exam', 'ets-exam'];

function srcs(pool) {
  var out = {};
  pool.forEach(function (x) { out[x.src] = (out[x.src] || 0) + 1; });
  return out;
}

console.log('default practice pool (spoiler protection)');
var def = PGRE.allQuestions();
assert(def.length === 8, 'default pool = preview(3) + cpg(2) + drills(3) = 8, got ' + def.length);
assert(def.every(function (x) { return EXAM_SRCS.indexOf(x.src) === -1; }),
  'default pool contains no cpg-exam / ets-exam questions');
assert(def.some(function (x) { return x.id === 'd1' && x.src === 'ets-drill'; }),
  'default pool includes ets-drill questions (GR8677/GR9277 exemption)');
assert(def.some(function (x) { return x.id === 'b1' && x.src === 'cpg'; }),
  'default pool includes book chapter problems tagged cpg');
assert(def.some(function (x) { return x.id === 'p1' && x.src === 'preview'; }),
  'default pool includes preview questions tagged preview');

console.log('\nincludeExam flattens the intact exams');
var full = PGRE.allQuestions({ includeExam: true });
assert(full.length === 12, 'includeExam pool = 13 entries minus the deduped id = 12, got ' + full.length);
var s = srcs(full);
assert(s['cpg-exam'] === 2 && s['ets-exam'] === 2,
  'includeExam tags book exams cpg-exam and ETS exams ets-exam (dup id keeps preview, so ets-exam = 2)');
assert(full.some(function (x) { return x.id === 'e1' && x.src === 'cpg-exam'; }),
  'book sample-exam questions present under includeExam');
assert(full.some(function (x) { return x.id === 'g2' && x.src === 'ets-exam'; }),
  'released ETS exam questions present under includeExam');

console.log('\nallQuestions memoizes per includeExam');
assert(PGRE.allQuestions() === def, 'allQuestions() returns the same array');
assert(PGRE.allQuestions({ includeExam: true }) === full, 'includeExam returns the same array');
assert(full !== def, 'includeExam cache is distinct from the default pool');
assert(full.length > def.length, 'includeExam pool is longer than default');

console.log('\nno duplicate ids across the pool');
var ids = {};
var dupes = 0;
full.forEach(function (x) { if (ids[x.id]) dupes++; else ids[x.id] = true; });
assert(dupes === 0, 'no duplicate ids in the includeExam pool');
var defIds = {};
var defDupes = 0;
def.forEach(function (x) { if (defIds[x.id]) defDupes++; else defIds[x.id] = true; });
assert(defDupes === 0, 'no duplicate ids in the default pool');
var dup = full.filter(function (x) { return x.id === 'dup'; });
assert(dup.length === 1 && dup[0].src === 'preview',
  'id present in two banks merges once, first occurrence (preview) wins');

console.log('\nby-id lookup reaches exam questions');
assert(PGRE.questionById('g3') && PGRE.questionById('g3').src === 'ets-exam',
  'questionById resolves released ETS exam questions');
assert(PGRE.questionById('e2') && PGRE.questionById('e2').src === 'cpg-exam',
  'questionById resolves book sample-exam questions');
assert(PGRE.questionById('d1') && PGRE.questionById('d1').src === 'ets-drill',
  'questionById resolves drill questions');
assert(PGRE.questionById('p2') && PGRE.questionById('p2').src === 'preview',
  'questionById resolves default-pool questions');
assert(PGRE.questionById('no-such-id') === null, 'questionById returns null for unknown ids');

console.log('\ntopic slice stays inside the default pool');
var cm = PGRE.questionsForTopic('cm');
assert(cm.every(function (x) { return EXAM_SRCS.indexOf(x.src) === -1; }),
  'questionsForTopic never leaks exam questions');
assert(cm.some(function (x) { return x.id === 'p1'; }) && cm.some(function (x) { return x.id === 'b2'; }),
  'questionsForTopic("cm") returns preview + cpg matches');
assert(PGRE.questionsForTopic('ow').length === 0,
  'topic that only exists in an exam is empty in the default pool');
assert(PGRE.questionsForTopic('all').length === def.length, 'questionsForTopic("all") == default pool');
assert(PGRE.questionsForTopic('all') === def, 'questionsForTopic("all") is the cached default pool');
assert(PGRE.questionsForTopic('cm') === cm, 'questionsForTopic memoizes per topic id');

console.log('\nguarded reads when bank files are absent');
(function () {
  var window2 = { PGRE: {} };
  var sandbox2 = {
    window: window2,
    PGRE: window2.PGRE,
    console: console,
    Array: Array,
    Object: Object
  };
  vm.createContext(sandbox2);
  vm.runInContext(bankSrc, sandbox2);
  var P = sandbox2.PGRE;
  P.QUESTIONS = [q('p1', 'cm'), q('p2', 'em'), q('dup', 'qm')];
  P.BOOK_EXAMS = null;
  P.ETS_EXAMS = null;
  P.ETS_DRILLS = null;
  P.BOOK_QUESTIONS = null;
  var bare = P.allQuestions({ includeExam: true });
  assert(bare.length === 3 && bare.every(function (x) { return x.src === 'preview'; }),
    'missing banks are skipped without throwing');
  assert(P.questionById('p1') !== null, 'questionById still works with missing banks');
})();

console.log('\ngraph choices');
var graphHeading = '<em>Graph of $v$ vs $t$:</em> ';
var graphDescriptions = [
  'decays exponentially to zero; at $t_1$ it dips to a small negative value',
  'decays exponentially to zero; at $t_1$ it drops sharply to a large negative value',
  'rises rapidly to a positive plateau; at $t_1$ it decays gradually back toward zero',
  'rises gradually to a positive plateau; at $t_1$ it drops steeply back to zero',
  'rises with a damped oscillation to a positive plateau; at $t_1$ it drops with a damped oscillation to a negative value'
];
var graphOutputs = graphDescriptions.map(function (description) {
  var original = graphHeading + description;
  var output = PGRE.graphChoiceHTML(original);
  assert(output.indexOf('<svg ') >= 0, 'recognized curve has an SVG');
  assert(output.endsWith(original), 'graph preserves the original choice text');
  assert(PGRE.graphChoiceHTML(output) === output, 'graph augmentation is idempotent');
  assert(output.indexOf('NaN') < 0 && output.indexOf('Infinity') < 0, 'curve coordinates are finite');
  return output;
});
var graphPaths = graphOutputs.map(function (output) {
  return output.match(/class="choice-graph-curve" d="([^"]+)"/)[1];
});
assert(new Set(graphPaths).size === 5, 'five descriptions produce distinct curve geometry');
var graphPoints = graphPaths.map(function (curve) {
  return curve.split(' ').reduce(function (points, coordinate, index, coordinates) {
    if (index % 2 === 0) points.push([Number(coordinate.slice(1)), Number(coordinates[index + 1])]);
    return points;
  }, []);
});
assert(graphPoints[0][0][1] < graphPoints[1][0][1], 'large initial voltage exceeds moderate initial voltage');
assert(graphPoints[0][148][1] > 70 && graphPoints[1][148][1] > graphPoints[0][148][1],
  'both decays jump negative at the switch time, with a larger dip for the second curve');
assert(graphPoints[2][0][1] === 70 && graphPoints[3][0][1] === 70 && graphPoints[4][0][1] === 70,
  'rising curves begin at zero');
assert(graphPoints[3].slice(148).every(function (point) { return point[1] === 70; }),
  'abrupt-end curve remains zero after the switch time');
assert(PGRE.graphChoiceHTML(graphHeading + 'an unsupported shape at $t_1$') ===
  graphHeading + 'an unsupported shape at $t_1$', 'unknown shapes remain unchanged');
assert(PGRE.graphChoiceHTML('ordinary choice') === 'ordinary choice', 'ordinary choices remain unchanged');
assert(PGRE.graphChoiceHTML(null) === null, 'non-string choices remain unchanged');
PGRE.QUESTIONS = [{ id: 'graph-test', answer: 1, choices: graphDescriptions.map(function (description) {
  return graphHeading + description;
}) }];
PGRE._resetBankCache();
var graphQuestion = PGRE.questionById('graph-test');
assert(graphQuestion.choices.every(function (choice) { return choice.indexOf('<svg ') >= 0; }),
  'question lookup delivers graphs to every view');
assert(graphQuestion.answer === 1, 'graph augmentation preserves the answer index');
assert(PGRE.QUESTIONS[0].choices[0].indexOf('<svg ') < 0, 'raw bank data remains unchanged');

console.log('\nwaveform graph choices');
var waveHeading = 'A graph of $\\varepsilon$ versus $t$: ';
var waveDescriptions = [
  'a square wave alternating between a constant positive value and a constant negative value.',
  'a triangular wave rising linearly to a positive peak, then falling linearly to a negative peak, then repeating.',
  'a series of identical positive humps (rectified-sine shape) that touch zero periodically, never going negative.',
  'a damped oscillation starting at a positive maximum and oscillating about zero with steadily decreasing amplitude.',
  'an exponential decay from a positive initial value asymptotically approaching zero.'
];
var waveOutputs = waveDescriptions.map(function (description) {
  var original = waveHeading + description;
  var output = PGRE.graphChoiceHTML(original);
  assert(output.indexOf(original) === 0, 'waveform graph follows the unchanged choice text');
  assert(output.indexOf('<svg ') > 0, 'recognized waveform has an SVG');
  assert(output.indexOf('>$\\varepsilon$</span>') > 0 && output.indexOf('$t$</span>') > 0,
    'axes carry the LaTeX labels from the choice text');
  assert(PGRE.graphChoiceHTML(output) === output, 'waveform augmentation is idempotent');
  assert(output.indexOf('NaN') < 0 && output.indexOf('Infinity') < 0, 'waveform coordinates are finite');
  return output;
});
var waveFrames = waveOutputs.map(function (output) {
  return output.slice(output.indexOf('<div class="choice-graph"'))
    .replace(/class="choice-graph-curve" d="[^"]+"/, '');
});
assert(new Set(waveFrames).size === 1, 'five waveforms share one frame, axes and scale');
var wavePoints = waveOutputs.map(function (output) {
  var coordinates = output.match(/class="choice-graph-curve" d="([^"]+)"/)[1].split(' ');
  return coordinates.reduce(function (points, coordinate, index) {
    if (index % 2 === 0) points.push([Number(coordinate.slice(1)), Number(coordinates[index + 1])]);
    return points;
  }, []);
});
function waveHeights(points) { return points.map(function (point) { return point[1]; }); }
assert(wavePoints.every(function (points) {
  return points[0][0] === 24 && points[points.length - 1][0] === 212;
}), 'five waveforms span the same time interval');
var squareHeights = waveHeights(wavePoints[0]);
assert(squareHeights[0] === 22 && squareHeights.every(function (y) { return y === 22 || y === 98; }),
  'square wave starts positive and holds only the two constant levels');
assert(wavePoints[0].filter(function (point, index, points) {
  return index && point[0] === points[index - 1][0] && point[1] !== points[index - 1][1];
}).length === 4, 'square wave switches level with four vertical edges');
var triangleHeights = waveHeights(wavePoints[1]);
assert(triangleHeights[0] === 60 && Math.min.apply(null, triangleHeights) === 22 &&
  Math.max.apply(null, triangleHeights) === 98, 'triangular wave starts at zero and reaches both peaks');
assert(triangleHeights[25] === 22 && triangleHeights[75] === 98,
  'triangular wave rises to the positive peak before the negative peak');
var humpHeights = waveHeights(wavePoints[2]);
assert(Math.max.apply(null, humpHeights) === 60 && Math.min.apply(null, humpHeights) === 22,
  'rectified humps never go negative and reach the common amplitude');
assert(humpHeights[50] === 60 && humpHeights[100] === 60, 'rectified humps touch zero periodically');
var dampedHeights = waveHeights(wavePoints[3]);
assert(dampedHeights[0] === 22 && dampedHeights[50] > 60 && dampedHeights[100] < 60,
  'damped oscillation starts at the positive maximum and crosses zero');
assert(60 - dampedHeights[100] < 38 && 60 - dampedHeights[200] < 60 - dampedHeights[100],
  'damped oscillation amplitude decreases');
var decayHeights = waveHeights(wavePoints[4]);
assert(decayHeights[0] === 22 && decayHeights.every(function (y, index) {
  return y <= 60 && (!index || y >= decayHeights[index - 1]);
}), 'exponential decay falls monotonically from the common amplitude and stays positive');
assert(PGRE.graphChoiceHTML(waveHeading + 'a sinusoid of constant amplitude.') ===
  waveHeading + 'a sinusoid of constant amplitude.', 'unknown waveform wording remains unchanged');
assert(PGRE.graphChoiceHTML('A plot of $V$ versus $t$: ' + waveDescriptions[0]) ===
  'A plot of $V$ versus $t$: ' + waveDescriptions[0], 'other graph-description headings remain unchanged');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
