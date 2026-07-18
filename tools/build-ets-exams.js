#!/usr/bin/env node
/* Builds content/bank/ets-exams.js (gitignored) from extracted ETS exam data.
   The extracted data lives in content/ets-src/<exam>/chunk-*.json + meta.json
   (also gitignored — it is ETS-copyrighted content; this tool is just the
   transformation and carries none of it, so the tool itself is committable).

   Usage:  node tools/build-ets-exams.js
   Reads:  content/ets-src/<examDir>/meta.json
             { id, idPrefix, title, format, link, expectedCount, scale: [{raw,scaled}],
               drill?: true, quarantine?: [n, ...] }
           content/ets-src/<examDir>/chunk-*.json
             [ { n, q, choices[5], topic, subtopic, figure, answer 'A'-'E',
                 pplus, sol, solverAgreed, cause, notes } ]
   Writes: content/bank/ets-exams.js  (PGRE.ETS_EXAMS + PGRE.ETS_DRILLS)

   drill: true  — user-approved spoiler-rule exception (GR8677/GR9277): the
   exam's questions are emitted under PGRE.ETS_DRILLS with src 'ets-drill' and
   join the DEFAULT practice pool via js/bank.js; the exam is NOT listed in
   the simulator. quarantine lists question numbers excluded from the build
   (e.g. drill questions near-identical to a kept mock's question, which would
   spoil that mock).
   Figures: a question whose record has figure != null gets
            content/ets-assets/<idPrefix>-q<n>.png appended to its q HTML —
            but only if that PNG exists on disk at build time; missing ones
            are listed in the build report so the figure pass can fill them. */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'content', 'ets-src');
const OUT = path.join(ROOT, 'content', 'bank', 'ets-exams.js');
const ASSETS = path.join(ROOT, 'content', 'ets-assets');

const LETTER_IDX = { A: 0, B: 1, C: 2, D: 3, E: 4 };

function difficultyFromPplus(pplus) {
  if (pplus == null) return 2;
  if (pplus >= 70) return 1;
  if (pplus >= 40) return 2;
  return 3;
}

function balancedDollars(s) {
  return ((s || '').match(/\$/g) || []).length % 2 === 0;
}

function fail(msg) { console.error('BUILD FAILED: ' + msg); process.exit(1); }

if (!fs.existsSync(SRC)) fail('no ' + SRC + ' directory');

const examDirs = fs.readdirSync(SRC).filter(d =>
  fs.existsSync(path.join(SRC, d, 'meta.json')));
if (!examDirs.length) fail('no exam dirs with meta.json under ' + SRC);

const exams = [];
const drills = [];
const report = { exams: [], warnings: [] };

for (const dir of examDirs.sort()) {
  const base = path.join(SRC, dir);
  const meta = JSON.parse(fs.readFileSync(path.join(base, 'meta.json'), 'utf8'));
  const chunkFiles = fs.readdirSync(base).filter(f => /^chunk-.*\.json$/.test(f)).sort();
  if (!chunkFiles.length) fail(dir + ': no chunk files');

  const byN = new Map();
  for (const cf of chunkFiles) {
    const rows = JSON.parse(fs.readFileSync(path.join(base, cf), 'utf8'));
    for (const r of rows) {
      if (byN.has(r.n)) fail(dir + ': duplicate question n=' + r.n + ' (in ' + cf + ')');
      byN.set(r.n, r);
    }
  }

  const quarantine = new Set(meta.quarantine || []);
  const ns = [...byN.keys()].sort((a, b) => a - b);
  const missing = [];
  for (let n = 1; n <= (meta.expectedCount || ns[ns.length - 1]); n++) {
    if (!byN.has(n) && !quarantine.has(n)) missing.push(n);
  }
  if (missing.length) fail(dir + ': missing questions: ' + missing.join(', '));

  const figuresMissing = [];
  let disagreed = 0;
  const outNs = ns.filter(n => !quarantine.has(n));
  // quarantined questions may be present (excluded here) or never transcribed
  // at all (e.g. gr9677 q90, unscored on the original form) — either way the
  // emitted count must be expectedCount minus the quarantine list
  if (meta.expectedCount && outNs.length !== meta.expectedCount - quarantine.size) {
    fail(dir + ': emitting ' + outNs.length + ' questions, expected ' +
      (meta.expectedCount - quarantine.size));
  }
  const questions = outNs.map(n => {
    const r = byN.get(n);
    if (!Array.isArray(r.choices) || r.choices.length !== 5) {
      fail(dir + ' q' + n + ': needs exactly 5 choices');
    }
    const answer = LETTER_IDX[r.answer];
    if (answer == null) fail(dir + ' q' + n + ': bad answer letter "' + r.answer + '"');
    for (const s of [r.q, r.sol, ...r.choices]) {
      if (!balancedDollars(s)) report.warnings.push(dir + ' q' + n + ': unbalanced $ delimiters');
    }
    if (r.solverAgreed === false) disagreed++;

    let qHtml = r.q;
    if (r.figure) {
      const asset = meta.idPrefix + '-q' + n + '.png';
      if (fs.existsSync(path.join(ASSETS, asset))) {
        qHtml += '<p class="q-fig"><img src="content/ets-assets/' + asset +
          '" alt="' + String(r.figure.desc || 'question figure').replace(/"/g, '&quot;') + '"></p>';
      } else {
        figuresMissing.push(n);
      }
    }

    return {
      id: meta.idPrefix + '-' + n,
      topic: r.topic,
      subtopic: r.subtopic || '',
      difficulty: difficultyFromPplus(r.pplus),
      q: qHtml,
      choices: r.choices,
      answer,
      sol: r.sol || '',
      pplus: r.pplus != null ? r.pplus : null,
      fig: r.figure ? { page: r.figure.page, bbox: r.figure.bbox || null } : null,
      images: [],
      src: meta.drill ? 'ets-drill' : 'ets-exam'
    };
  });

  if (meta.drill) {
    drills.push({
      id: meta.id,
      title: meta.title,
      link: meta.link || '',
      questions
    });
  } else {
    exams.push({
      id: meta.id,
      title: meta.title,
      format: meta.format,
      link: meta.link || '',
      scale: meta.scale || [],
      order: meta.order,   // picker position (newest exam first); stripped before emit
      questions
    });
  }
  report.exams.push({
    id: meta.id, count: questions.length,
    drill: !!meta.drill,
    quarantined: [...quarantine],
    scaleRows: (meta.scale || []).length,
    solverDisagreed: disagreed,
    figuresMissing
  });
}

exams.sort((a, b) => (a.order || 999) - (b.order || 999) || a.id.localeCompare(b.id));
exams.forEach(e => delete e.order);

const header =
  '/* Released ETS GRE Physics exams — REAL exam content, ETS copyright.\n' +
  '   GENERATED by tools/build-ets-exams.js from local PDFs; gitignored, never commit.\n' +
  '   Answer keys and raw→scaled tables are the official published ones.\n' +
  '   ETS_EXAMS replay verbatim in the simulator (spoiler-protected: excluded\n' +
  '   from the default practice pool); ETS_DRILLS (GR8677/GR9277, user-approved\n' +
  '   exception) join daily/topic practice via js/bank.js. */\n';
const body = 'window.PGRE = window.PGRE || {};\nPGRE.ETS_EXAMS = ' +
  JSON.stringify(exams, null, 1) + ';\nPGRE.ETS_DRILLS = ' +
  JSON.stringify(drills, null, 1) + ';\n';
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, header + body);

console.log(JSON.stringify(report, null, 2));
console.log('Wrote ' + OUT + ' (' + exams.length + ' exam(s), ' +
  exams.reduce((s, e) => s + e.questions.length, 0) + ' exam questions; ' +
  drills.length + ' drill set(s), ' +
  drills.reduce((s, e) => s + e.questions.length, 0) + ' drill questions)');
