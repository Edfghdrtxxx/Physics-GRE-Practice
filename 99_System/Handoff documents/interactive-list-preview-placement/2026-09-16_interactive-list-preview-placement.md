---
title: Interactive list preview — placement (analysis only)
type: handoff-brief
created: 2026-09-16
repo: "/Users/Reid Hu/Physics GRE"
related_vault: "/Users/Reid Hu/OrbitOS/20_Project/GRE_Physics_Prep"
status: analysis — do not implement from this note
---

# Interactive list preview — where it belongs (and where it does not)

Prep Studio is a study tool, not a portfolio site. The Hyperiux Vault `InteractiveListPreview` pattern (pointer-following image, sliding highlight, row emphasis) is only worth porting where a **real figure already exists** and the list **currently hides it**. Fake thumbnails, formula-as-screenshot, and motion on timed surfaces are rejected.

## 1. Effect summary

- A **compact vertical list** (title / subtitle / meta). The row itself does not show the picture.
- On row hover, a **floating preview image** tracks the pointer with lerp smoothing.
- A **sliding highlight bar** and stronger row type mark the active item.
- Reveal/scale duration is tunable; leave and reduced-motion hide or freeze it.
- Original demo data is client / platform / services + a hero still. That mapping does not exist here.

## 2. Stack gap

| Vault demo | Prep Studio |
|---|---|
| React + GSAP + Tailwind / shadcn | Offline vanilla SPA: `index.html` hash router (`PGRE.route` in `js/app.js`), views `js/view-*.js`, `css/style.css` + `css/motion.css` |
| Component drop-in | **Do not install React, Tailwind, or GSAP.** Vendor is only `vendor/katex/` + `vendor/marked.min.js`. |

Implication: reimplement the *interaction* with CSS + a small pointer loop. Natural homes: `js/motion.js` (`PGRE.motion.reduced` already tracks `prefers-reduced-motion`) and the existing single-popover idea in `js/chart-tip.js` (one `position: fixed` node, delegated mouseover). Do not drop the React component as-is.

## 3. Inventory — list / table UIs

Figure facts (this machine, 2026-09-16; gitignored `content/`):

- `content/ets-assets/`: **205** PNGs (all referenced from `content/bank/ets-exams.js`). Drill forms GR8677+GR9277 = **62** figures; intact ETS forms = **143**.
- `content/book-assets/`: **107** JPEGs. `cpg-questions.js`: **27** chapter questions with `<img class="q-fig">` (**24** unique files). `cpg-exams.js`: **86** sample-exam figures (**83** unique).
- `cpg-formulas.js`: **334** cards, **0** `<img>` / `q-fig` / asset refs.
- Markup: book questions use `<img class="q-fig" src="content/book-assets/…">`; ETS uses `<p class="q-fig"><img src="content/ets-assets/…"></p>` (`tools/build-ets-exams.js`). CSS: `css/style.css` `.q-fig img`.
- Default practice pool (`PGRE.allQuestions()` in `js/bank.js`) can show figures for **chapter + ets-drill** only. Intact `ets-exam` is excluded from search (`js/search.js` `buildQuestions`). Sample exams (`cpg-exam`) remain searchable under kind `exam`.

| Route | View | What each row shows today | Preview image? | Density / scroll |
|---|---|---|---|---|
| `#/` | `js/view-dashboard.js` | `.rq-row` Today agenda (label / count / button); `.topic-card` grid; `.mini-list` achievements; `.activity-list` log | None | 4 agenda rows; 9 topic cards; 8 activity lines |
| `#/plan` | `js/view-plan.js` | `.task` checkboxes in `.task-list` inside week `<details>` | None | One week open; rest collapsed |
| `#/history` | `js/view-history.js` `attemptRow` | `.hist-row`: mark, topic mono, **full `q.q` HTML** in `.hist-q`, pick, time | Figures **are in the HTML** but `.hist-q` is `nowrap` + ellipsis (`css/style.css`) — clipped, still decoded | Sessions page 20; attempts page **50** |
| `#/analytics` | `js/view-analytics.js` | `.an-topic-row`, heatmap, `.an-table` mock results | Charts, not photos | Short |
| `#/build` | `js/view-build.js` | Filter chips + match-count | None | Not a question list |
| `#/search` | `js/view-search.js` `hitHtml` | `.srch-hit`: topic mono, **plain-text** title + snippet (`js/search.js` `plain()`) | Not shown; recoverable via `PGRE.questionById` + first `img[src]` | **40 hits/group** |
| `#/notes` | `js/view-notes.js` `entryCard` | `.nb-entry` cards; `.nb-stem` is `q.q` (line-clamped) | Figure may sit inside clamped stem | Card stack, not a dense index |
| `#/mistakes` | `js/view-mistakes.js` `missCard` | Full `.miss-card`: stem, five choices, gated solution | **Already visible** in `.q-text` | One tall card per miss |
| `#/formulas` Browse | `js/view-formulas.js` `browseBodyHTML` | `.browse-row`: name, grade/due chips, +today; click → `.browse-peek` (front+back) | **No card images.** Peek already reveals the formula | 334 cards, topic groups |
| `#/formulas` picker | same, `rowHTML` | `.picker-row` + inline `.picker-preview` of `c.back` | Same — LaTeX, not raster | Lazy chapter bodies |
| `#/formulas` Search | `searchCardHTML` | `.fs-card`: name, prompt, Show formula | LaTeX on the card | Paged |
| `#/formulas` Lab | `renderLabContent` | `.viz-thumb-card` grid: title, KaTeX, story | Live canvas on open; **no static thumbs in-app** (handoff PNGs under `formula-visualizer-aesthetics/shots/` are review artifacts, not product assets) | Grid |
| `#/concepts` | `js/view-concepts.js` | Door cards; `#/concepts/search` `.cv-hit`; `#/concepts/visualizers` same thumb grid | No raster catalog | Small set |
| `#/focus` | `js/view-focus.js` | `.focus-sess` duration / tag / when | None | Few |
| `#/study-time` | `js/view-study-time.js` | Charts + target editor | None | n/a |
| `#/achievements` | `js/view-achievements.js` | `.ach-card` grid | None (AGENTS.md: no decorative icons) | 80 |
| `#/library` | `js/view-content.js` | File cards + chapter map table | PDF iframe, not hover stills | Few |
| `#/exam` lobby | `js/view-exam.js` `historyCard` | `.exam-hist-row`: date, format, raw, scaled | Scores only | Few sittings |
| `#/exam/run` | `renderRoom` | One question + palette | Figures in the live item | **Timed. No.** |
| `#/exam/review/:id` | `reviewCard` | Full question cards | Figures already in `.q-text` | 70–100 tall cards |
| `#/practice…` | `js/view-practice.js` | Count picker; live item; summary `<details>` | Figures in the live item | Answering surface |
| `#/topic/:id` | `js/view-topic.js` | Subtopic chips, new/done split, notes | No question index | n/a |
| Packs 01–35 | `js/packs.js` + `js/data-packs.js` | **No in-app list.** Launch writes `pgre-quiz-config` → `#/practice/custom` | n/a | External (OrbitOS skill) |

## 4. Recommended placements

### Strong fit

Hover-preview earns its keep only as **“which circuit / setup is this?”** on a **compact** row.

1. **Global search — Questions (and Mistakes) groups**  
   `#/search` · `js/view-search.js` · `.srch-hit`  
   Rows are title + snippet; figures are stripped by `plain()`. ~89 default-pool items have figures (27 book + 62 drill). Hovering the still lets you confirm identity without opening a portal.  
   **Spoiler:** do **not** attach to kind `exam` (book sample exams, 86 figures). Intact `ets-exam` is already omitted from the index.

2. **History attempt log**  
   `#/history` · `js/view-history.js` `attemptRow` · `.hist-row`  
   Same compact geometry the Vault pattern wants, except today it dumps full `q.q` (including `<img>`) into an ellipsis flex child. Hovering the figure is useful **and** a chance to **stop decoding clipped images** in a 50-row page. Attempts are things the user already sat — no fresh-exam spoil.

Do not invent a dense mistake **index** just to host this effect. The current mistake book is a stack of full cards (`missCard`); a floating still on top of the same figure is noise.

### Weak / cosmetic only

| Surface | Why not |
|---|---|
| Formula Browse / picker / Search / Lab | **Zero** formula rasters. Click-peek / flip already shows the equation. Hovering the back of an **Upcoming** card would **spoil recall**. Lab cards are a grid, not a list; sims are canvas. |
| `#/concepts/search` `.cv-hit` | Compact list, but no stills — only live widgets. |
| `#/concepts/visualizers` / Lab `.viz-thumb-card` | Already a gallery. Pointer-follow image would duplicate the card. |
| Dashboard Today `.rq-row`, plan `.task`, activity log, achievements, focus sessions, exam lobby `.exam-hist-row`, analytics tables | Text/meta only. A highlight bar without a real image is a different, cheaper effect — not this pattern. |
| `#/notes` `.nb-entry` | Stem already contains `q.q` (clamped) + “Show more”. Card, not index. |
| `#/mistakes` book page | Figure already on the card. |
| Topic portal, custom quiz builder, packs | No compact question list. |

### Do not apply

Motion, extra paint, or a floating plate on these surfaces **hurts speed, accuracy, or exam integrity**:

- **Timed mock:** `#/exam/run` (`js/view-exam.js` `renderRoom`) — countdown, palette, no feedback until submit.
- **Live practice / QOTD / mistake drill answering:** `js/view-practice.js`, dashboard QOTD, `view-mistakes.js` drill renderer.
- **Focus timer:** `#/focus` (`js/view-focus.js`, `js/focus-fx.js`) — already a motion-heavy instrument; pointer-follow would fight it.
- **Formula Study / Match / Type / Quiz / Cloze:** `js/view-formulas.js`, `js/flashmodes.js` — grading surfaces.
- **Any forced image** (gradient cards, visualizer screenshots generated for the effect, stock physics art). AGENTS.md also forbids decorative icons/emojis.

## 5. Data / asset prerequisites (strong-fit only)

| Surface | Image source | How to resolve | Gate |
|---|---|---|---|
| Search question hits | `q.q` first `<img src>` | `PGRE.questionById(hit.entry.id)` after index match | `src` in `{preview, cpg, ets-drill}` **and** `img` present. Skip `cpg-exam` / `ets-exam`. |
| Search mistake hits | same | `e.q` already in mistake index build; or `questionById` | User already missed it; still skip intact-exam ids if they appear via by-id. |
| History rows | same | `PGRE.questionById(a.qid)` | Attempt implies seen. Optional: only bind when `q.q` matches `/<img\b/i`. |

No new asset pipeline. Do not copy `99_System/Handoff documents/formula-visualizer-aesthetics/shots/` into the product. Do not rasterize KaTeX for this.

Helper (when implementing, not now): one `figureSrc(q)` that returns the first `content/book-assets/…` or `content/ets-assets/…` URL, else `null`. Bind preview **only** when non-null so most rows stay still.

## 6. Adaptation sketch (no implementation)

- **One** `position: fixed` preview node (reuse the `chart-tip.js` “single el, delegated events” shape). Set `img.src` on enter; clear on leave. Do **not** put an `<img>` in every row.
- Highlight: a single absolutely positioned bar inside the list, `transform: translateY(...)` to the active row. CSS transition using existing `--dur` / `--ease-spring` in `css/motion.css`.
- Pointer follow: `requestAnimationFrame` lerp in `js/motion.js`, or CSS only if lerp is dropped. **No GSAP.**
- **`PGRE.motion.reduced` / `prefers-reduced-motion`:** no follow, no scale; either skip preview or show a static plate at a fixed offset (like `chart-tip`).
- **Touch / narrow (`PGRE.isNarrow`, 860px):** no hover — skip. Do not invent long-press.
- **Keyboard:** preview is decorative; focus styles stay as they are. Do not move focus into the floating image.
- **Performance:** 50 history rows must not decode 50 JPEGs. Strip `<img>` from `.hist-q` (keep `plain()`-like stem or existing ellipsis text) and load **one** image on hover. Search already has no images in the DOM.
- **Spoiler:** preview helper must honor `js/search.js` / AGENTS.md Content Rules. Sample-exam hits stay text-only.
- **A11y:** `aria-hidden` on the floating plate; `alt` from the existing ETS `alt=` when present, else empty. `pointer-events: none` on the plate so it cannot eat the click through to the hit.

## 7. Top experiments (exact files)

**1. `#/search` question hits — first, and the only one that must work to justify the pattern.**  
`js/view-search.js` (`hitHtml`, `.srch-hit`) + `js/search.js` (id/kind already on the entry) + a tiny helper beside `js/motion.js` or `js/chart-tip.js`.  
Why: compact list, real figures, no spoil if `exam` kind is skipped, 40-row pages, zero images in the DOM today.

**2. `#/history` attempt log — same helper, second.**  
`js/view-history.js` `attemptRow` + `.hist-q` CSS.  
Why: same user question (“which figure was that?”) on a true row list; also fixes clipped-but-still-loading images. Only rows with `figureSrc(q)`.

**3. Same search helper on mistake **hits** (kind `mistake` in `#/search`), not on `#/mistakes` cards.**  
Why: search mistakes are compact; the book page is not. Cheap once (1) exists. Stop there.

If (1) feels gimmicky in actual study (most hits are text-only; figures are ~1/4 of the default pool), **ship nothing else.** Do not “complete the pattern” on formulas, dashboard, or the exam room.
