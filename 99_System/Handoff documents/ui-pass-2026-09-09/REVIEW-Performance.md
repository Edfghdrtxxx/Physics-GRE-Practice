# REVIEW-Performance

Adversarial review of unit Performance (`Performance2.md`; `Performance.md` is byte-identical). Reviewer is read-only on application code. Live cold-load was against `?v=20260909a` while LayoutFinisher was still writing. Final disk snapshot after LayoutFinisher declared stable: `?v=20260909d`, boot guard at `js/app.js:764-767`.

**Verdict:** Pass. The owned change does what it claims. No production boot race. No blocking defect in `index.html` / the boot guard / the widened test regex.

---

## Method

- Read `Performance2.md`, `HANDOFF-brief.md`, `Aesthetics.md`, `LayoutShell.md`.
- Parsed every `<link>` / `<script>` in `index.html` (counts, `?v=`, `defer` / `async` / `type="module"`, document order).
- Read `js/app.js` boot guard (then re-read after LayoutFinisher shifted it), `PGRE.route` motion calls, `js/motion.js` export, `tools/test-visualizer-aesthetics.js:730,740`.
- Exercised regexes against the live tags and against synthetic `type="module"` / `defer`-first / `async` tags.
- Served `http://127.0.0.1:8047/` (`python3 -m http.server`, hub name `review-perf-http`; stopped after). Headless Chromium 1440x900, cache disabled via CDP.
- Installed a capture-phase `DOMContentLoaded` probe with `evaluateOnNewDocument` (runs before any page script).
- One cold load of `#/`; then the same 17 hashes listed in the unit report. Console / pageerror / HTTP >= 400 / requestfailed collected.
- `new Function` parse benches in-page for `view-formulas.js`, `ets-exams.js`, `cpg-exams.js` (5 iterations each).
- `wc -c` on those files. Grep for `ambient.css` / `ambient-fx.js` / `PGRE.ambient`.
- Did **not** run `node tools/test-*.js` (out of scope). Regex checked statically.

---

## Confirmed claims

### 1. One cache-buster on every stylesheet and script in `index.html`

**Confirmed (high).** 6 stylesheets, 52 `<script src>` tags, 0 inline scripts. Every one carries a single `?v=` token. No `async`, no `type="module"`. Favicon is a data URI (not in the claim).

Performance shipped `?v=20260909a`. LayoutFinisher later search-replaced the one token (allowed this wave) through `20260909b` to **`20260909d`**. Final `index.html` grep: every stylesheet and script tag is `?v=20260909d`; no leftover `20260909a`/`b`/`c`. Count still 6 CSS + 52 scripts, all `defer`, same document order.

### 2. All 52 scripts `defer`; document order preserved

**Confirmed (high).** Order in `index.html:90-153`:

`marked.min.js` → `katex.min.js` → `auto-render.min.js` → `data-*` (5) → `content/bank/*` (4) → engine (`store` … `formula-checkin`) → views (dashboard … `view-exam` + `visualizer-engine` + `trio-g1`…`g10`) → `js/app.js` → `js/motion.js`.

That is the stated contract (marked → katex → auto-render; data → bank → engine → views → app.js → motion.js). Classic deferred scripts keep that order.

### 3. Boot waits for `DOMContentLoaded` unless `readyState === 'complete'`

**Confirmed (high).** Current code `js/app.js:764-767` (Performance2.md cited 671-674; LayoutFinisher grew `boot()` and shifted the block twice; the `if/else` is unchanged):

```
if (document.readyState === 'complete') {
  PGRE.boot();
} else {
  document.addEventListener('DOMContentLoaded', PGRE.boot);
}
```

Deferred scripts run at `readyState === 'interactive'`, before DCL, so this waits. `js/motion.js:219-220` assigns `window.PGRE.motion` synchronously in its IIFE, not on DCL.

Capture-phase DCL probe (before `PGRE.boot`, which is bubble-phase): `readyState: 'interactive'`, `PGRE.motion` present with `loader.start`, `PGRE.views` has 16 keys, `renderMathInElement` is a function, `#view` innerHTML empty / 0 children, no `.motion-loader` yet. After boot, dashboard HTML is in `#view` and `.motion-loader` exists. So boot does **not** run before deferred scripts, and motion exists at first route.

Precision, not a bug: `PGRE.route` (`js/app.js` ~504, 518, 526, 530) already guards `PGRE.motion && …`. The old `loading ? wait : boot()` race would have skipped first-paint motion (loader / viewEnter / stagger), not thrown. The new guard still matches the stated contract.

### 4. Test regex accepts optional ` defer` and still rejects `type="module"`

**Confirmed (high)** for `tools/test-visualizer-aesthetics.js:730` and `:740`.

| tag | positive match | module asserts fire |
|---|---|---|
| current (`src="…js?v=…" defer>`) | yes | no |
| no `defer` | yes (optional group) | no |
| `type="module"` before `src` | no | yes |
| `type="module"` after `src` | no | yes |

Live tags match. `[^"]*` still matches after LayoutFinisher’s `20260909d` bump.

### 5. 17 hash routes render into `#view`, 0 console errors

**Confirmed (high)** on the listed set, one session, cache disabled:

| hash | `#view` | notes |
|---|---|---|
| `#/` | 36k HTML, 11 `.katex` | dashboard |
| `#/plan` | 30k | |
| `#/practice` | setup, 366 available | |
| `#/practice/mechanics` | setup, **0** available | still content, not an error |
| `#/history` `#/analytics` `#/build` `#/search` `#/notes` `#/mistakes` | content | |
| `#/formulas` | 1.9M HTML, 1322 `.katex` | visit cost, not a load-order failure |
| `#/focus` `#/study-time` `#/achievements` `#/library` `#/exam` | content | |
| `#/topic/mechanics` | `Unknown topic.` | pre-existing; topic ids are `cm`/`em`/… (`js/data-topics.js`). Not a load bug. |

Totals: 0 `console.error`, 0 `pageerror`, 0 HTTP >= 400, 0 `requestfailed`. `PGRE.ambient` undefined, `.ambient-fx` absent.

`#/practice/mechanics` showing 0 questions is because `mechanics` is not a topic id (same class of mistake as `#/topic/mechanics`). Pre-existing routing/data, not this pass. **Medium** confidence it predates Performance (did not diff `view-practice.js`).

### 6. `ambient.css` / `ambient-fx.js` absent

**Confirmed (high).** No files on disk. No tags in `index.html`. No `PGRE.ambient`. No 404s for those names. `.focus-ambient` is a different backdrop (`css/style.css` / `js/view-focus.js`) and is supposed to stay.

### 7. Cold-load timings (one run, not their 3-run table)

**Consistent with their “after” column (high on this run; their “before” unverified).** Cache-disabled `#/`: 52 script resources, decoded JS ~3.55 MB (they said 3.56 MB), `domInteractive` 14.7 ms, `domContentLoadedEventEnd` 83 ms, 0 console errors, 11 KaTeX nodes on the dashboard. I did not keep a pre-defer tree, so I cannot confirm the 4–5× `domInteractive` speedup or the classic-vs-defer A/B. **Unchecked:** their 3-run before/after table.

Caveat on interpretation (not a code bug): measurement used `python3 -m http.server` (HTTP/1.1, ~6 connections/origin). “Parallel fetch of 52 scripts” is capped here. The parser-unblock (`domInteractive` while scripts still compile) is the real, observed win. DCL still waits on the same bytes; they said that.

---

## Bugs / nits

None blocking. Listed with file:line.

### N1 — Test does not require `defer` (nit)

`tools/test-visualizer-aesthetics.js:730,740`. `(?: defer)?` means a future author can drop `defer` and the aesthetics suite still passes. The module rejects still work. The regex also requires `src` before `defer`; `<script defer src="…">` would fail the positive assert even though it is valid HTML. Current tags are `src` then `defer`, so no production miss.

### N2 — Single-token policy does not cover dynamic injects (low, not owned by this unit)

The new `index.html` comment says bump the one value whenever **any** asset changes. That search-replace only sees tags in `index.html`. Runtime injects still live elsewhere:

| file:line | URL | buster |
|---|---|---|
| `js/view-formulas.js:185` | `js/flashmodes.js?v=20260907a` | stale token |
| `js/view-formulas.js:201` | `js/formula-search.js` | none |
| `js/view-search.js:26` | `js/search.js` | none |
| `js/view-exam.js:21` | `js/exam-engine.js` | none; **dead**. Guard `if (PGRE.examEngine) return` at `:17` — engine already loaded from `index.html`. |

Performance did not own those view files (InteractionB owns `view-formulas.js`). Index.html’s 52+6 tags are clean. This is a hole in the **policy they wrote**, not a failed edit of their exclusive file. A returning browser can still mix a fresh `view-formulas.js?v=20260909d` with stale `flashmodes.js?v=20260907a`.

### N3 — Late-inject hang if `readyState === 'interactive'` after DCL (residual, low)

`js/app.js:764-767`. `complete` → boot now; else wait for DCL. Correct for deferred parse. If `app.js` is injected after DCL but before `load` (`interactive`, DCL already fired), the listener never runs and boot never happens. Not the production path. Tests in `tools/test-ux-interaction.js` set `readyState = 'loading'` and eval `motion.js` then `app.js`; they do not appear to dispatch DCL (grep). **Unchecked:** whether any test relied on auto-boot at `interactive`. Production cold load boots.

The comment “`'complete'` only happens when app.js is injected late” is slightly overstated (`complete` also follows a normal `load`); the `if/else` is still right for defer.

---

## Lazy-load skip of `js/view-formulas.js`

**Agree with the skip (high).**

| | disk `wc -c` | in-page fetch bytes | first `new Function` | x5 mean (same isolate) |
|---|---|---|---|---|
| `js/view-formulas.js` | 123042 (~120 KiB) | 122438 | **1.4 ms** | 0.32 ms (V8 caches) |
| `content/bank/ets-exams.js` | 987145 (~964 KiB) | 986157 | **9.8 ms** | 2.6 ms |
| `content/bank/cpg-exams.js` | 501149 (~489 KiB) | 500649 | **5.2 ms** | 1.3 ms |

Their “~1.9 ms per parse (`new Function` x5 average)” is the same order as **first** compile on this M4, not the mean of five in one isolate (later iterations go to ~0). Bank files are ~5–7× the first-parse cost, matching their “first candidates” ranking (they said ~14 ms / ~6 ms; I saw 9.8 / 5.2 — same ballpark, different process).

With `defer`, this file does not block the HTML parser. It already lazy-loads `flashmodes.js` / `formula-search.js` on demand (`view-formulas.js:180-206`). Pulling the 120 KiB view off the critical path would still need router + `armStudyFromFill` / `PGRE.views.formulas.getCard` guards, as they said. 120 KiB is ~3.4% of the 3.56 MB JS payload; even the network argument is weak next to the banks.

Visiting `#/formulas` is expensive for another reason (1.9 MB of HTML, 1322 KaTeX nodes). That is render cost after the script has already run, not a reason to lazy-load the file on every other route.

I do not disagree.

---

## Unchecked / uncertain

- Full `node tools/test-visualizer-aesthetics.js` (they claimed 1091 passed) and `node tools/test-file-structure.js`. Regex vs `index.html` checked; suite not executed.
- Their 3-run before/after table and classic-vs-defer A/B. After-column shape reproduced once.
- Whether `tools/test-ux-interaction.js` auto-boot still fires under the new guard (harness `readyState = 'loading'`, no DCL dispatch found).
- `#/practice/mechanics` → 0 questions: treated as pre-existing; not git-blamed.
- 23 sidebar destinations were not all visited; only the 17 hashes in the unit report.
- Cache-buster token at commit time: LayoutFinisher declared stable at `20260909d`. Contract is “one token, search-replace”; final disk snapshot is one token.

---

## LayoutFinisher interference (not a Performance fail)

During this review:

- Boot guard moved `js/app.js:671-674` → `:751-754` → **`:764-767`**. Logic identical. `PGRE.boot` now also calls `ensureSidebarScrim` and a matchMedia listener (drawer work).
- `?v=20260909a` → `20260909b` → **`20260909d`** on every `index.html` asset tag.

Cold load and 17-route pass were run on `20260909a` (cache disabled). After LayoutFinisher’s `20260909b` bump, `#/` reload: 0 console/page errors, motion present at DCL, 16 views. Final `20260909d` tags were grepped on disk (6 CSS + 52 deferred scripts, one token, same order). 17 routes were **not** re-iterated on `20260909d` — **uncertain** at the last token, **high** that defer/order/boot `if/else` did not change.
