#!/usr/bin/env node
/* KaTeX parse checker: extracts every $...$ / $$...$$ / \(...\) / \[...\]
   math segment from ETS source chunks and generated bank files and
   parse-checks each with the vendored KaTeX (throwOnError: true).

   Usage:  node tools/check-katex-latex.js
   Exit 0 = all segments parse; exit 1 = failures listed above.

   Mirrors the delimiter config of PGRE.typesetMath (js/app.js). HTML tags
   are stripped first, the way auto-render only sees text nodes. */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const katex = require(path.join(ROOT, 'vendor', 'katex', 'katex.min.js'));

const DELIMS = [
  ['$$', '$$', true],
  ['\\[', '\\]', true],
  ['$', '$', false],
  ['\\(', '\\)', false]
];

/* Extract math segments the way KaTeX auto-render's splitAtDelimiters does. */
function extractMath(text) {
  const out = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    /* Find the LEFT delimiter that occurs nearest after i; at the same
       position the longer opener wins ($$ before $), matching auto-render. */
    let best = -1, bestIdx = -1;
    for (let d = 0; d < DELIMS.length; d++) {
      const idx = text.indexOf(DELIMS[d][0], i);
      if (idx === -1) continue;
      if (bestIdx === -1 || idx < bestIdx ||
          (idx === bestIdx && DELIMS[d][0].length > DELIMS[best][0].length)) {
        best = d; bestIdx = idx;
      }
    }
    if (best === -1) break;
    const l = DELIMS[best][0], r = DELIMS[best][1], display = DELIMS[best][2];
    const end = text.indexOf(r, bestIdx + l.length);
    if (end === -1) { i = bestIdx + l.length; continue; }
    out.push({ tex: text.slice(bestIdx + l.length, end), display });
    i = end + r.length;
  }
  return out;
}
function stripTags(html) {
  /* Mirror the HTML tokenizer: only '<' followed by a letter, '/', '!', or '?'
     opens a tag. A bare '<' followed by whitespace or a digit (e.g. 'x < L/2')
     is literal text in a browser, and auto-render must see it inside math. */
  return String(html == null ? '' : html).replace(/<[a-zA-Z/!?][^>]*>/g, ' ');
}

const failures = [];
let checked = 0;

function check(label, html) {
  const text = stripTags(html);
  for (const seg of extractMath(text)) {
    checked++;
    try {
      katex.renderToString(seg.tex, {
        displayMode: seg.display,
        throwOnError: true,
        strict: false,
        trust: false
      });
    } catch (e) {
      failures.push({ where: label, tex: seg.tex, error: String(e.message).split('\n')[0] });
    }
  }
}

/* --- content/ets-src/<exam>/chunk-*.json ------------------------------- */
const SRC = path.join(ROOT, 'content', 'ets-src');
if (fs.existsSync(SRC)) {
  for (const dir of fs.readdirSync(SRC).sort()) {
    const base = path.join(SRC, dir);
    if (!fs.existsSync(path.join(base, 'meta.json'))) continue;
    for (const f of fs.readdirSync(base).sort()) {
      if (!/^chunk-.*\.json$/.test(f)) continue;
      const rows = JSON.parse(fs.readFileSync(path.join(base, f), 'utf8'));
      for (const r of rows) {
        const tag = dir + ' q' + r.n;
        check(tag + ' q', r.q);
        check(tag + ' sol', r.sol);
        (r.choices || []).forEach((c, i) => check(tag + ' choice ' + 'ABCDE'[i], c));
      }
    }
  }
}

/* --- content/bank/*.js (generated outputs) ------------------------------ */
const BANK = path.join(ROOT, 'content', 'bank');
if (fs.existsSync(BANK)) {
  const sandbox = { window: {} };
  const vm = require('vm');
  vm.createContext(sandbox);
  /* bank files do `window.PGRE = ...` then use bare `PGRE`; in a browser
     window IS the global, so alias it the same way here. */
  vm.runInContext('this.window = this;', sandbox);
  for (const f of fs.readdirSync(BANK).sort()) {
    if (!/\.js$/.test(f)) continue;
    const code = fs.readFileSync(path.join(BANK, f), 'utf8');
    /* Scan every pool this file actually defines (BOOK_EXAMS, BOOK_FORMULAS,
       BOOK_QUESTIONS, ETS_EXAMS, ETS_DRILLS, ...). Snapshot the keys before
       running the file so each pool is scanned once, under its own file's
       label, regardless of the global name it is assigned to. */
    const before = new Set(Object.keys(sandbox.window.PGRE || {}));
    try {
      vm.runInContext(code, sandbox);
    } catch (e) {
      failures.push({ where: 'bank/' + f, tex: '(file load)', error: e.message });
      continue;
    }
    const PGRE = sandbox.window.PGRE || {};
    for (const pool of Object.keys(PGRE)) {
      if (before.has(pool)) continue;
      const arr = PGRE[pool];
      if (!Array.isArray(arr)) continue;
      for (const ex of arr) {
        const qs = Array.isArray(ex) ? [ex] : (ex.questions || [ex]);
        for (const q of qs) {
          const tag = 'bank/' + f + ' ' + pool + ' ' + (q.id || ex.id || '?');
          check(tag + ' q', q.q);
          check(tag + ' sol', q.sol);
          (q.choices || []).forEach((c, i) => check(tag + ' choice ' + 'ABCDE'[i], c));
          if (q.front) check(tag + ' front', q.front);
          if (q.back) check(tag + ' back', q.back);
        }
      }
    }
  }
}

console.log('Checked ' + checked + ' math segment(s).');
if (failures.length) {
  console.log('\n' + failures.length + ' KaTeX parse failure(s):');
  for (const f of failures) {
    console.log('  [' + f.where + ']');
    console.log('    tex:   ' + JSON.stringify(f.tex));
    console.log('    error: ' + f.error);
  }
  process.exit(1);
}
console.log('All math parses cleanly.');
