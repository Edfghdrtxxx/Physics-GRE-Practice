#!/usr/bin/env python3
"""Spoiler guard for the GR8677/GR9277 drill conversion.

ETS reuses questions across forms. A drill question that also appears on a
kept, intact mock (any non-drill exam in content/ets-src/, or one of the
book's sample exams in content/bank/cpg-exams.js) would spoil that mock the
moment it surfaces in daily practice — so such drill questions must be
quarantined (meta.json -> quarantine) instead of built.

Compares every drill question against every kept-mock question by token
Jaccard similarity over normalized stem+choices text. Prints pairs at or
above --threshold (default 0.5), strongest first, as JSON. Review the list,
then record the drill n's in the drill exam's meta.json quarantine array and
rebuild.

Usage: python3 tools/check-drill-overlap.py [--threshold 0.5]
"""
import json, glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'content', 'ets-src')
CPG = os.path.join(ROOT, 'content', 'bank', 'cpg-exams.js')

THRESHOLD = 0.5
if '--threshold' in sys.argv:
    THRESHOLD = float(sys.argv[sys.argv.index('--threshold') + 1])

TAG = re.compile(r'<[^>]+>')
MATH = re.compile(r'\$\$?.*?\$\$?', re.S)
NONWORD = re.compile(r'[^a-z0-9 ]+')

def tokens(q, choices):
    text = q + ' ' + ' '.join(choices or [])
    text = MATH.sub(' ', TAG.sub(' ', text)).lower()
    return set(t for t in NONWORD.sub(' ', text).split() if len(t) > 2)

def jaccard(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)

drill_qs, mock_qs = [], []

for md in sorted(glob.glob(os.path.join(SRC, '*', 'meta.json'))):
    meta = json.load(open(md))
    side = drill_qs if meta.get('drill') else mock_qs
    for cf in sorted(glob.glob(os.path.join(os.path.dirname(md), 'chunk-*.json'))):
        for r in json.load(open(cf)):
            side.append({'exam': meta['id'], 'n': r['n'], 'q': r['q'],
                         'tok': tokens(r['q'], r.get('choices'))})

if os.path.isfile(CPG):
    s = open(CPG).read()
    data = json.loads(s[s.index('['):s.rindex(';')])
    for ex in data:
        for q in ex.get('questions', []):
            mock_qs.append({'exam': ex.get('id', 'cpg'), 'n': q.get('id'),
                            'q': q.get('q', ''), 'tok': tokens(q.get('q', ''), q.get('choices'))})

pairs = []
for d in drill_qs:
    best = None
    for m in mock_qs:
        s = jaccard(d['tok'], m['tok'])
        if s >= THRESHOLD and (best is None or s > best['similarity']):
            best = {'similarity': round(s, 3), 'drill': d['exam'] + ' n=' + str(d['n']),
                    'mock': str(m['exam']) + ' ' + str(m['n']),
                    'drillText': TAG.sub('', d['q'])[:90], 'mockText': TAG.sub('', m['q'])[:90]}
    if best:
        pairs.append(best)

pairs.sort(key=lambda p: -p['similarity'])
print(json.dumps({'drills': len(drill_qs), 'mocks': len(mock_qs),
                  'threshold': THRESHOLD, 'flagged': pairs}, indent=1))
