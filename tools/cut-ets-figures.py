#!/usr/bin/env python3
"""Cuts question-figure PNGs for extracted ETS exams.

Reads content/ets-src/<exam>/chunk-*.json records whose figure != null and
crops each figure region out of a Ghostscript page render into
content/ets-assets/<idPrefix>-q<n>.png (gitignored — ETS copyright).

Bboxes are [x0, y0, x1, y1] as fractions of the page, origin top-left, as
recorded by the transcription agents; a --patch file of corrected bboxes
(JSON: {"<n>": [x0,y0,x1,y1], ...}) from the verification pass wins over the
chunk data. A small margin is added around every crop so axis labels survive.

Usage: python3 tools/cut-ets-figures.py <examDir> [--only 1,3,24] [--patch fixes.json]
"""
import json, glob, os, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DPI = 200
MARGIN = 0.02  # fraction of page added on each side

def main():
    exam_dir = sys.argv[1]
    only = None
    patch = {}
    if '--only' in sys.argv:
        only = {int(x) for x in sys.argv[sys.argv.index('--only') + 1].split(',')}
    if '--patch' in sys.argv:
        with open(sys.argv[sys.argv.index('--patch') + 1]) as f:
            patch = {int(k): v for k, v in json.load(f).items()}

    src = os.path.join(ROOT, 'content', 'ets-src', exam_dir)
    meta = json.load(open(os.path.join(src, 'meta.json')))
    pdf = meta['pdf'] if 'pdf' in meta else os.path.join(
        ROOT, 'docs', 'ETS Released Exams', meta.get('pdfName', ''))
    if not os.path.isfile(pdf):
        sys.exit('PDF not found: ' + pdf + ' (set "pdf" or "pdfName" in meta.json)')
    assets = os.path.join(ROOT, 'content', 'ets-assets')
    os.makedirs(assets, exist_ok=True)

    figs = []
    for cf in sorted(glob.glob(os.path.join(src, 'chunk-*.json'))):
        for r in json.load(open(cf)):
            if r.get('figure'):
                figs.append(r)
    if only is not None:
        figs = [r for r in figs if r['n'] in only]

    from PIL import Image
    pages = sorted({r['figure']['page'] for r in figs})
    renders = {}
    with tempfile.TemporaryDirectory() as td:
        for p in pages:
            out = os.path.join(td, f'p{p}.png')
            subprocess.run(['gs', '-q', '-sDEVICE=png16m', f'-r{DPI}',
                            f'-dFirstPage={p}', f'-dLastPage={p}', '-o', out, pdf],
                           check=True)
            renders[p] = Image.open(out).copy()

    report = []
    for r in figs:
        f = r['figure']
        bbox = patch.get(r['n']) or f.get('bbox')
        if not bbox:
            report.append({'n': r['n'], 'status': 'no-bbox'})
            continue
        im = renders[f['page']]
        w, h = im.size
        x0 = max(0, min(bbox[0], bbox[2]) - MARGIN) * w
        x1 = min(1, max(bbox[0], bbox[2]) + MARGIN) * w
        y0 = max(0, min(bbox[1], bbox[3]) - MARGIN) * h
        y1 = min(1, max(bbox[1], bbox[3]) + MARGIN) * h
        name = f"{meta['idPrefix']}-q{r['n']}.png"
        im.crop((int(x0), int(y0), int(x1), int(y1))).save(os.path.join(assets, name))
        report.append({'n': r['n'], 'status': 'cut', 'file': 'content/ets-assets/' + name,
                       'page': f['page'], 'bbox': bbox, 'desc': f.get('desc', '')})
    print(json.dumps(report, indent=1))

if __name__ == '__main__':
    main()
