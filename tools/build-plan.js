#!/usr/bin/env node
/* Compiles js/data-plan.js from the OrbitOS vault syllabus + topic-set titles.
   Carries no copyrighted exam content. Run: node tools/build-plan.js */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SYLLABUS = '/Users/Reid Hu/OrbitOS/20_Project/GRE_Physics_Prep/01_Syllabus_&_Plan/8-Week-Syllabus.md';
const SETS_DIR = '/Users/Reid Hu/OrbitOS/20_Project/GRE_Physics_Prep/03_Topic_Sets';
const TOPICS_JS = path.join(ROOT, 'js', 'data-topics.js');
const OUT = path.join(ROOT, 'js', 'data-plan.js');

const MONTHS = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
};

/* Presentation-only (title, hours). topics are derived from the ETS focus
   cell via FOCUS_MAP; checkpoint/review/replay flags come from table text. */
const WEEK_META = {
  0: { title: 'Classical Mechanics (historical)', hours: 9 },
  1: { title: 'Classical Mechanics', hours: 16 },
  2: { title: 'Electromagnetism + Optics', hours: 16 },
  3: { title: 'EM + Optics — diagnostic week', hours: 16 },
  4: { title: 'Thermodynamics', hours: 16 },
  5: { title: 'Quantum Mechanics', hours: 16 },
  6: { title: 'Atomic + Relativity — rehearsal week', hours: 16 },
  7: { title: 'Lab + Specialized — taper & exam', hours: 8 }
};

const FOCUS_MAP = [
  { name: 'Specialized', id: 'sp', titleBits: ['Specialized'] },
  { name: 'Optics', id: 'ow', titleBits: ['Optics'] },
  { name: 'Thermo', id: 'th', titleBits: ['Thermo'] },
  { name: 'Atomic', id: 'at', titleBits: ['Atomic'] },
  { name: 'Lab', id: 'lb', titleBits: ['Lab'] },
  { name: 'CM', id: 'cm', titleBits: ['CM', 'Classical', 'Mechanics'] },
  { name: 'EM', id: 'em', titleBits: ['EM', 'Electromagnetism'] },
  { name: 'QM', id: 'qm', titleBits: ['QM', 'Quantum'] },
  { name: 'SR', id: 'sr', titleBits: ['SR', 'Relativity'] }
];

function fail(msg) {
  console.error('BUILD FAILED: ' + msg);
  process.exit(1);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function ymd(year, month, day) {
  return year + '-' + pad2(month) + '-' + pad2(day);
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) fail('bad date: ' + iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function parseRange(raw, year) {
  const s = String(raw).replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  let m = s.match(/^([A-Z][a-z]{2}) (\d{1,2})-([A-Z][a-z]{2}) (\d{1,2})$/);
  if (m) {
    const a = MONTHS[m[1]], b = MONTHS[m[3]];
    if (!a || !b) fail('unknown month in range: ' + raw);
    return { start: ymd(year, a, +m[2]), end: ymd(year, b, +m[4]) };
  }
  m = s.match(/^([A-Z][a-z]{2}) (\d{1,2})-(\d{1,2})$/);
  if (m) {
    const a = MONTHS[m[1]];
    if (!a) fail('unknown month in range: ' + raw);
    return { start: ymd(year, a, +m[2]), end: ymd(year, a, +m[3]) };
  }
  fail('unparseable date range: ' + raw);
}

function stripBold(s) {
  return String(s).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\s+/g, ' ').trim();
}

function isSunday(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) fail('bad mock date: ' + iso);
  return d.getUTCDay() === 0;
}

function parseMockDate(raw, year) {
  const s = stripBold(raw);
  let m = s.match(/(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  m = s.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/);
  if (!m) fail('unparseable mock date: ' + raw);
  const month = MONTHS[m[1]];
  if (!month) fail('unknown month in mock date: ' + raw);
  return ymd(year, month, +m[2]);
}

function mockHours(format, id) {
  const f = String(format || '');
  if (id === 'ets2024' || /70\s*Q\s*\/\s*120/i.test(f)) return 2;
  if (/(?:99|100)\s*Q\s*\/\s*170/i.test(f)) return 2.8;
  return 2;
}


function focusHas(text, name) {
  if (name.length <= 3) {
    return new RegExp('(^|[^A-Za-z])' + name + '([^A-Za-z]|$)').test(text);
  }
  return text.indexOf(name) !== -1;
}

function deriveTopics(focus, title, weekId) {
  const topics = [];
  const found = [];
  FOCUS_MAP.forEach(function (row) {
    if (!focusHas(focus, row.name)) return;
    if (topics.indexOf(row.id) === -1) topics.push(row.id);
    found.push(row);
  });
  if (!topics.length) fail(weekId + ' focus mapped to zero topics: ' + focus);
  const TOPIC_ORDER = ['cm', 'em', 'ow', 'th', 'qm', 'at', 'sr', 'lb', 'sp'];
  topics.sort(function (a, b) {
    return TOPIC_ORDER.indexOf(a) - TOPIC_ORDER.indexOf(b);
  });
  const titleHit = found.some(function (row) {
    return row.titleBits.some(function (bit) { return title.indexOf(bit) !== -1; });
  });
  if (!titleHit) {
    fail(weekId + ' title "' + title + '" shares no focus-name token with "' + focus + '"');
  }
  return topics;
}

function parseBoldSets(text) {
  const out = [];
  const seen = new Set();
  const re = /\*\*([^*]+)\*\*/g;
  let m;
  while ((m = re.exec(text))) {
    const inner = m[1].trim();
    const range = inner.match(/^(\d{2})\s*[–-]\s*(\d{2})$/);
    let nums = [];
    if (range) {
      const a = +range[1], b = +range[2];
      if (a > b) fail('bad set range ' + inner);
      for (let i = a; i <= b; i++) nums.push(i);
    } else {
      const parts = inner.split(/[,\s]+/).filter(Boolean);
      if (!parts.length || !parts.every(function (p) { return /^\d{2}$/.test(p); })) continue;
      nums = parts.map(Number);
    }
    nums.forEach(function (n) {
      if (!seen.has(n)) { seen.add(n); out.push(n); }
    });
  }
  return out;
}

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) fail('syllabus missing YAML frontmatter');
  const fm = {};
  m[1].split('\n').forEach(function (line) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) return;
    fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  });
  return fm;
}

function sectionAfter(md, headingRe, nextRe) {
  const m = md.match(headingRe);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = md.slice(start);
  const n = rest.search(nextRe || /\n## /);
  return n === -1 ? rest : rest.slice(0, n);
}

if (!fs.existsSync(SYLLABUS)) fail('no syllabus at ' + SYLLABUS);
const md = fs.readFileSync(SYLLABUS, 'utf8').replace(/\r\n/g, '\n');

const fm = parseFrontmatter(md);
if (fm.start !== '2026-09-07') fail('frontmatter start expected 2026-09-07, got ' + fm.start);
if (fm.due !== '2026-11-01') fail('frontmatter due expected 2026-11-01, got ' + fm.due);
if (!fm.updated) fail('frontmatter missing updated:');

const warning = md.match(/> \[!warning\][\s\S]*?(?=\n> \[!|\n## )/);
if (!warning) fail('missing warning callout');
['5× ~100 min', '6× ~50 min', '2× ~50 min'].forEach(function (tok) {
  if (!warning[0].includes(tok)) fail('warning callout missing hedge token: ' + tok);
});

const info = md.match(/> \[!info\][\s\S]*?(?=\n> \[!|\n## )/);
if (!info) fail('missing info callout');
if (!info[0].includes('2026-11-01')) fail('info callout missing exam 2026-11-01');

if (!fs.existsSync(TOPICS_JS)) fail('no ' + TOPICS_JS);
const topicsSrc = fs.readFileSync(TOPICS_JS, 'utf8');
const examLit = topicsSrc.match(/PGRE\.EXAM_DATE\s*=\s*'([^']+)'/);
if (!examLit) fail('could not regex PGRE.EXAM_DATE in js/data-topics.js');
if (examLit[1] !== '2026-11-01') {
  fail('PGRE.EXAM_DATE is ' + examLit[1] + ', syllabus exam is 2026-11-01');
}

const w0Head = md.match(/^## Week 0 \(historical,\s*([^)]+)\)\s*$/m);
if (!w0Head) fail('missing "## Week 0 (historical, Sep 7–13)" section');
const w0Dates = parseRange(w0Head[1], 2026);
const w0Body = sectionAfter(md, /^## Week 0 \(historical,[^\n]*\n/m, /\n## /);
if (!w0Body) fail('Week 0 section empty');
const assigned = w0Body.match(/Assigned:\s*CM Sets\s+(\d{2})\s*[–-]\s*(\d{2})/);
if (!assigned) fail('Week 0 missing "Assigned: CM Sets 01–05"');
const w0From = +assigned[1], w0To = +assigned[2];
if (w0From !== 1 || w0To !== 5) fail('Week 0 assigned sets expected 01–05, got ' + assigned[1] + '–' + assigned[2]);
const w0Sets = [];
for (let i = w0From; i <= w0To; i++) w0Sets.push(i);

const carryBody = sectionAfter(md, /^## Carry rule \(Set 02\)/m, /\n## /);
if (!carryBody) fail('missing "## Carry rule (Set 02)" section');
if (!/\*\*02\s*[–-]\s*06\*\*/.test(carryBody)) fail('carry rule missing 02–06 branch');
if (!/\*\*03\s*[–-]\s*07\*\*/.test(carryBody)) fail('carry rule missing 03–07 branch');
if (!/\bW1\b/.test(carryBody) || !/\bW2\b/.test(carryBody)) {
  fail('carry rule must mention W1 and W2 extra-rows');
}
const carryDate = carryBody.match(/\*\*(\d{4}-\d{2}-\d{2})\*\*/);
if (!carryDate) fail('carry rule missing bolded **YYYY-MM-DD** deadline');
const carryDeadline = carryDate[1];

const liveHead = md.match(/^## Live schedule\b.*$/m);
if (!liveHead) fail('missing "## Live schedule" section');
const liveStart = md.indexOf(liveHead[0]);
const liveBlock = md.slice(liveStart);
const tableMatch = liveBlock.match(/\|[^\n]+\|\n\|[-:\s|]+\|\n((?:\|[^\n]+\|\n?)+)/);
if (!tableMatch) fail('Live schedule table not found');
const rows = tableMatch[1].trim().split('\n').filter(Boolean);
if (rows.length !== 7) fail('Live schedule expected 7 rows, got ' + rows.length);

function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) {
    return c.trim();
  });
}

const liveWeeks = rows.map(function (line, idx) {
  const c = cells(line);
  if (c.length < 5) fail('Live schedule row ' + (idx + 1) + ' has ' + c.length + ' cells');
  const num = +(c[0].replace(/\*/g, '').trim());
  if (num !== idx + 1) fail('Live schedule row expected week ' + (idx + 1) + ', got ' + c[0]);
  const dates = parseRange(c[1], 2026);
  const focus = stripBold(c[2]);
  const timedCell = c[3];
  const notesCell = c[4];
  const withoutCarryParen = timedCell.replace(/\([^)]*if\s+02\s+carried[^)]*\)/gi, '');
  const timedSets = parseBoldSets(withoutCarryParen);
  if (!timedSets.length) fail('week ' + num + ' has no timed-set numbers');
  const week = {
    id: 'w' + num,
    start: dates.start,
    end: dates.end,
    title: WEEK_META[num].title,
    focus: focus,
    topics: deriveTopics(focus, WEEK_META[num].title, 'w' + num),
    hours: WEEK_META[num].hours,
    notes: stripBold(notesCell),
    timedSets: timedSets
  };
  if (num === 1) {
    const paren = timedCell.match(/\(([^)]*if\s+02\s+carried[^)]*)\)/i);
    if (!paren) fail('week 1 missing carry parenthetical');
    const carryTimed = parseBoldSets(paren[1]);
    if (carryTimed.join(',') !== '2,3,4,5,6') fail('week 1 carry timed expected 02–06, got ' + carryTimed);
    week.carry = {
      set: 2,
      deadline: carryDeadline,
      timed: carryTimed,
      extras: [7]
    };
  }
  if (num === 1 || num === 2) week.carryExtras = [7];
  if (num === 3) {
    if (!/GR0177|GR0877/.test(notesCell)) fail('week 3 notes missing GR0177/GR0877');
    week.checkpoint = {
      id: 'w3-checkpoint',
      label: 'Sun Oct 4 — paper diagnostic GR0177/GR0877 (replaces the 5th timed)'
    };
  }
  if (num === 4) {
    if (!/review slot/i.test(timedCell)) fail('week 4 missing thermo review slot');
    week.reviewSlot = true;
  }
  if (num === 6) {
    if (!/GR9677/.test(notesCell)) fail('week 6 notes missing GR9677');
    week.checkpoint = {
      id: 'w6-checkpoint',
      label: 'Sun Oct 25 — GR9677 100q intact mock (replaces the 5th timed)'
    };
  }
  if (num === 7) {
    if (!/replay/i.test(timedCell)) fail('week 7 timed cell missing replay');
    if (!/Fri logistics/.test(week.notes)) fail('week 7 notes missing Fri logistics');
    if (!/\bSat\b/.test(week.notes)) fail('week 7 notes missing Sat');
    if (!/Sun exam/.test(week.notes)) fail('week 7 notes missing Sun exam');
    const deferred = parseBoldSets(notesCell);
    if (deferred.join(',') !== '30,31,34,35') {
      fail('week 7 deferred expected 30,31,34,35 got ' + deferred);
    }
    week.deferred = deferred;
    week.replay = true;
    week.examDay = true;
    if (timedSets.join(',') !== '32,33') fail('week 7 timed expected 32,33 got ' + timedSets);
  }
  return week;
});

const w0Notes = w0Body.split('\n').map(function (l) {
  return stripBold(l.replace(/^\s*-\s*/, ''));
}).filter(Boolean).join(' ');

const week0 = {
  id: 'w0',
  start: w0Dates.start,
  end: w0Dates.end,
  title: WEEK_META[0].title,
  focus: 'CM',
  topics: deriveTopics('CM', WEEK_META[0].title, 'w0'),
  hours: WEEK_META[0].hours,
  notes: w0Notes,
  timedSets: w0Sets,
  historical: true
};

const weeks = [week0].concat(liveWeeks);
if (weeks.length !== 8) fail('expected 8 weeks, got ' + weeks.length);
if (weeks[0].start !== '2026-09-07') fail('first week must start 2026-09-07');
if (weeks[weeks.length - 1].end !== '2026-11-01') fail('last week must end 2026-11-01');
if (weeks[1].start !== carryDeadline) {
  fail('carry deadline ' + carryDeadline + ' !== w1.start ' + weeks[1].start);
}
for (let i = 0; i < weeks.length; i++) {
  const w = weeks[i];
  ['id', 'start', 'end', 'title', 'focus', 'topics', 'hours', 'notes', 'timedSets'].forEach(function (k) {
    if (w[k] == null || w[k] === '' || (Array.isArray(w[k]) && !w[k].length && k !== 'notes')) {
      fail('week ' + w.id + ' missing field ' + k);
    }
  });
  if (w.tasks) fail('week ' + w.id + ' must not emit .tasks');
  if (addDays(w.start, 6) !== w.end) fail(w.id + ' is not a 7-day span ' + w.start + '–' + w.end);
  if (i > 0 && addDays(weeks[i - 1].end, 1) !== w.start) {
    fail('gap between ' + weeks[i - 1].id + ' and ' + w.id);
  }
}

const mockHead = md.match(/^## Mock schedule\b.*$/m);
if (!mockHead) fail('missing "## Mock schedule" section');
const mockBody = sectionAfter(md, /^## Mock schedule\b[^\n]*\n/m, /\n## /);
if (!mockBody || !mockBody.trim()) fail('Mock schedule section empty');
if (!/Book Sample Exams/i.test(mockBody) || !/optional extras/i.test(mockBody)) {
  fail('Mock schedule must document Book Sample Exams as optional extras');
}

const mockTableMatch = mockBody.match(/\|[^\n]+\|\n\|[-:\s|]+\|\n((?:\|[^\n]+\|\n?)+)/);
if (!mockTableMatch) fail('Mock schedule table not found');
const mockRows = mockTableMatch[1].trim().split('\n').filter(Boolean);
if (mockRows.length < 3) fail('Mock schedule expected at least 3 rows, got ' + mockRows.length);
if (/\bGR8677\b|\bGR9277\b/i.test(mockTableMatch[0])) {
  fail('Mock schedule must not list GR8677/GR9277 as mocks');
}


const REQUIRED_MOCKS = {
  ets2024: '2026-10-11',
  gr1777: '2026-10-18',
  gr9677: '2026-10-25'
};
const FORBIDDEN_MOCKS = { gr8677: 1, gr9277: 1 };
const seenMockIds = {};
const seenMockDates = {};

mockRows.forEach(function (line, idx) {
  const c = cells(line);
  if (c.length < 3) fail('Mock schedule row ' + (idx + 1) + ' has ' + c.length + ' cells');
  const date = parseMockDate(c[0], 2026);
  const formRaw = stripBold(c[1]);
  const format = stripBold(c[2]);
  const idMatch = formRaw.match(/\b(ets2024|GR\d{4}|gr\d{4})\b/i);
  if (!idMatch) fail('Mock schedule row ' + (idx + 1) + ' missing exam id in Form cell: ' + c[1]);
  const id = idMatch[1].toLowerCase();
  if (FORBIDDEN_MOCKS[id]) fail('Mock schedule lists forbidden drill form ' + id);
  if (!REQUIRED_MOCKS[id]) fail('Mock schedule unexpected exam id ' + id);
  if (seenMockIds[id]) fail('Mock schedule duplicates ' + id);
  if (seenMockDates[date]) fail('Mock schedule duplicate date ' + date);
  if (date >= '2026-11-01') fail('mock ' + id + ' date ' + date + ' is not before 2026-11-01');
  if (!isSunday(date)) fail('mock ' + id + ' date ' + date + ' is not a Sunday');
  if (REQUIRED_MOCKS[id] !== date) {
    fail('mock ' + id + ' expected ' + REQUIRED_MOCKS[id] + ', got ' + date);
  }
  seenMockIds[id] = true;
  seenMockDates[date] = true;

  let host = null;
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i].start <= date && date <= weeks[i].end) {
      host = weeks[i];
      break;
    }
  }
  if (!host) fail('mock ' + id + ' date ' + date + ' is not inside a plan week');
  if (host.historical) fail('mock ' + id + ' landed on historical week ' + host.id);
  const task = {
    id: id,
    date: date,
    label: stripBold(c[0]) + ' — ' + formRaw + ' ' + format + ' intact mock',
    hours: mockHours(format, id),
    xp: 50,
    kind: 'mock'
  };
  if (!host.mocks) host.mocks = [];
  host.mocks.push(task);
});

Object.keys(REQUIRED_MOCKS).forEach(function (id) {
  if (!seenMockIds[id]) fail('Mock schedule missing required exam id ' + id);
});


if (!fs.existsSync(SETS_DIR)) fail('no topic-set dir ' + SETS_DIR);
const setFiles = fs.readdirSync(SETS_DIR).filter(function (f) { return f.endsWith('.md'); });
if (setFiles.length !== 7) fail('expected 7 topic-set files, got ' + setFiles.length);

const planSets = {};
const setHeadRe = /^### Set (\d{2}):\s+(.+?)\s*\(\d+\s*Qs?\)\s*$/gm;
setFiles.forEach(function (f) {
  const body = fs.readFileSync(path.join(SETS_DIR, f), 'utf8');
  setHeadRe.lastIndex = 0;
  let m, found = 0;
  while ((m = setHeadRe.exec(body))) {
    planSets[m[1]] = m[2].trim();
    found++;
  }
  if (!found) fail('no ### Set NN headings in ' + f);
});
if (Object.keys(planSets).length !== 35) {
  fail('expected 35 set titles, got ' + Object.keys(planSets).length);
}

const referenced = new Set();
weeks.forEach(function (w) {
  (w.timedSets || []).forEach(function (n) { referenced.add(n); });
  if (w.carry) {
    referenced.add(w.carry.set);
    (w.carry.timed || []).forEach(function (n) { referenced.add(n); });
    (w.carry.extras || []).forEach(function (n) { referenced.add(n); });
  }
  (w.carryExtras || []).forEach(function (n) { referenced.add(n); });
  (w.deferred || []).forEach(function (n) { referenced.add(n); });
});
referenced.forEach(function (n) {
  const id = pad2(n);
  if (!planSets[id]) fail('calendar references Set ' + id + ' but no title was parsed');
});

const plan = [
  {
    id: 'p0',
    name: 'Week 0 · Historical',
    desc: 'Sep 7–13 — pre-rewrite week. Kept so the Set 02 carry rule resolves; not replayed.',
    weeks: [weeks[0]]
  },
  {
    id: 'p1',
    name: 'Live calendar · Sep 14 – Oct 25',
    desc: '5+6+2 weekly load (~16 h): timed sets, formula recall, misses-first extras. Checkpoints Oct 4 and Oct 25. Intact mocks Oct 11 (ets2024), Oct 18 (GR1777), Oct 25 (GR9677).',
    weeks: weeks.slice(1, 7)
  },
  {
    id: 'p2',
    name: 'Exam week · Oct 26 – Nov 1',
    desc: 'Taper: Sets 32–33 new only, replays, logistics, rest. Exam Sun Nov 1, 14:00.',
    weeks: [weeks[7]]
  }
];

const meta = {
  source: SYLLABUS,
  version: fm.updated,
  examDate: '2026-11-01'
};

const setKeys = [];
for (let i = 1; i <= 35; i++) setKeys.push(pad2(i));

function emitKeyedObject(name, keys, obj) {
  const lines = ['PGRE.' + name + ' = {'];
  keys.forEach(function (k, i) {
    const comma = i === keys.length - 1 ? '' : ',';
    lines.push('  ' + JSON.stringify(k) + ': ' + JSON.stringify(obj[k]) + comma);
  });
  lines.push('};');
  return lines.join('\n') + '\n';
}

const header =
  '/* GENERATED by tools/build-plan.js from ' + SYLLABUS + '\n' +
  '   do not hand-edit; regenerate after syllabus changes\n' +
  '   source updated: ' + fm.updated + ' */\n';
const body =
  'window.PGRE = window.PGRE || {};\n\n' +
  'PGRE.PLAN_META = ' + JSON.stringify(meta, null, 2) + ';\n\n' +
  emitKeyedObject('PLAN_SETS', setKeys, planSets) + '\n' +
  'PGRE.PLAN = ' + JSON.stringify(plan, null, 2) + ';\n';

fs.writeFileSync(OUT, header + body);

const report = {
  version: fm.updated,
  examDate: meta.examDate,
  phases: plan.length,
  weeks: weeks.map(function (w) {
    return {
      id: w.id,
      start: w.start,
      end: w.end,
      timedSets: w.timedSets,
      carry: w.carry || null,
      checkpoint: w.checkpoint ? w.checkpoint.id : null,
      mocks: (w.mocks || []).map(function (t) { return t.id; }),
      deferred: w.deferred || null
    };
  }),
  sets: setKeys.length,
  out: OUT
};
console.log(JSON.stringify(report, null, 2));
console.log('Wrote ' + OUT + ' (' + plan.length + ' phase(s), ' + weeks.length +
  ' week(s), ' + setKeys.length + ' set titles)');
