# REVIEW-Aesthetics — 2026-09-09

Adversarial review of unit Aesthetics (`Aesthetics.md`). Read-only on application code. Live audit at `?v=20260909c`; source re-check after LayoutFinisher done ping (`index.html` `?v=20260909d`). Layout drawer + study-time CSS landed; they do not undo this unit.

Verdict: **the two claimed cutovers hold.** Ambient particle FX is gone. `.btn` / `.btn-sm` compute to `--ctl-r` (8px) on the five named routes. Dark theme on those routes is token-driven, not a light-on-light / dark-on-dark leak. No emoji introduced by this unit. One **claim overreach** on `--ink-3` body copy (pre-existing done-challenge state the live empty-profile scan could not see). No concurrent undo by Performance `defer` or Layout sidebar.

---

## Method

- Repo grep: `ambient`, `PGRE.ambient`, `.ambient-fx`, `ambient.css`, `ambient-fx.js`, `--ink-3`, `.btn` radius, emoji ranges in `css/`, `js/`, `index.html`, `tools/`.
- Disk + git: `css/ambient.css` and `js/ambient-fx.js` absent on disk; `git status` shows unstaged ` D` (still in HEAD, not committed — as required).
- Live: hub process `pgre-reviewaes` = `python3 -m http.server 8017` at `/Users/Reid Hu/Physics GRE`. Headless Chromium 1440x900. `tab.evaluate` in the page world (Puppeteer `page.evaluate` inside `tab.run` does **not** see `window.PGRE`; that isolated-world miss is why an early `setTheme('dark')` appeared to no-op).
- Routes: `#/`, `#/topic/cm`, `#/practice`, `#/formulas`, `#/achievements`. Themes via `PGRE.setTheme('light'|'dark')` after confirming `document.documentElement.dataset.theme` and computed `--bg` / `--ink`.
- Computed: `getComputedStyle` on every `.btn`; tree-walk of visible `#main` / `#view` for own-text color vs ancestor background (WCAG relative luminance), `--ink-3` hits (≥25 chars, ≥14px), emoji.
- Dark screenshots of all five routes (pre-`20260909c` reload). Post-reload computed re-check on dashboard dark (`?v=20260909c`): no light-on-light / dark-on-dark in `#view`.
- Did **not** run formatters, linters, or `node tools/test-*.js`.

Confidence tags: **high** = live + source agree; **medium** = source or one theme/route only; **low** = inferred / state not on screen.

---

## Confirmed claims

### 1. Ambient fully gone — **high**

| Check | Result |
|---|---|
| `css/ambient.css`, `js/ambient-fx.js` on disk | missing (`ls` ENOENT) |
| git | unstaged ` D css/ambient.css`, ` D js/ambient-fx.js` |
| `index.html` stylesheets | `fonts.css`, `style.css`, `visualizer.css`, `print.css`, `motion.css`, `katex.min.css` only. No `ambient.css`. |
| `index.html` scripts | 52 `defer` tags, last is `js/motion.js`. Comment at `index.html:152` is the motion/boot contract, no ambient mention. No `ambient-fx.js`. |
| `js/app.js` | no `PGRE.ambient`, no `setIntensity`. `grep ambient` on `js/app.js` is empty. |
| Live | `document.querySelector('.ambient-fx') === null`; `typeof PGRE.ambient === 'undefined'` on all five routes, both themes. |
| Network | `performance.getEntriesByType('resource')` has zero URLs matching `/ambient/i`. No HTTP ≥400 in the captured run. |
| `tools/` | no ambient test / reference. |

`.focus-ambient` (`css/style.css:3148`, markup in `js/view-focus.js:279`) is the focus-page paper backdrop. Unrelated. Not flagged.

### 2. Button radius is `--ctl-r` (8px) — **high** (five named routes)

Source:

- `--ctl-r: 8px` at `css/style.css:112`
- `.btn { border-radius: var(--ctl-r); }` at `css/style.css:477`
- `.btn-sm { border-radius: var(--ctl-r); }` at `css/style.css:881`
- `.btn-primary` / `.btn-ghost` do not override radius (`css/style.css:484-488`)

Live computed `border-radius` on every `button.btn` / `a.btn` on the five routes, light and dark: **`8px` only**. Sample after `20260909c` reload: Dark mode/Light mode (ghost sm), Practice, Study 10, Open, Start a simulation, 5 questions, All 366, Pick cards myself — all `8px`. Token `--ctl-r` computed `8px`.

Known exception **outside the claimed routes:** `.focus-page .focus-controls .btn { border-radius: 0 }` (`css/style.css` ~3337). Instrument sheet, not a `.btn` token regression on dashboard/topic/practice/formulas/achievements.

### 3. Dark theme, five routes — **high** for first-screen chrome; **medium** for below-fold / in-session practice

`[data-theme="dark"]` (`css/style.css` ~4182) inverts the ladder: `--bg #181715`, `--surface #252320`, `--ink #faf9f5`, `--ink-2 #a09d96`, `--ink-3 #807d76`. Live after `PGRE.setTheme('dark')`: `data-theme="dark"`, `body` background `rgb(24, 23, 21)`, h1 `rgb(250, 249, 245)`.

Tree-walk of visible own-text on all five dark routes: **no light-on-light, no dark-on-dark** (after waiting out `motion.css` `.btn { transition: color }`; an in-transition sample of `#theme-toggle` at light `--ink-2` was a false positive — settled value is `rgb(160, 157, 150)` = dark `--ink-2`, ~6.2:1 on `--panel`).

Screenshots (dark, 1440x900): dashboard, `#/topic/cm`, `#/practice` config, `#/formulas` home, `#/achievements`. Cards step up from the floor; primary buttons are cream fill / dark type (`background: var(--ink); color: var(--bg)` — intended inversion, token-driven). Ghost buttons cream type on transparent. Active nav coral-on-ivory-dark. Locked achievement cards `opacity: 0.78` still ~9.5:1 cream-on-surface. No `#fff` / `#fafafa` slabs in these views.

Literal light colours left in `style.css` (not this unit, documented): `.q-fig img { background:#fff }` (ETS plates), `.fci-badge { color:#fff }` on coral (`--on-accent`). Neither appeared as body chrome on the five routes.

### 4. `--ink-3` as body copy — **high** on empty-profile five routes; see Finding 1 for done-state

Empty-profile walk of the five routes: **zero** elements with computed colour `rgb(142, 139, 130)` (light) or `rgb(128, 125, 118)` (dark `--ink-3`) carrying ≥25 characters of **own** text at ≥14px.

`--ink-3` is otherwise captions/meta/chips/placeholders as claimed (`css/style.css:46-50` documents 3.2:1 caption use).

### 5. No emoji introduced by this unit — **high**

Aesthetics touched: delete ambient files; unlink in `index.html`; drop `PGRE.ambient` calls in `js/app.js`; `.btn` / `.btn-sm` radius in `css/style.css`. None of those add emoji.

`index.html:42` `&#9776;` (hamburger) is Layout top-bar chrome, not this unit. Comments mentioning that glyph in `css/style.css` / `js/app.js` are comments, not UI. Pre-existing `✓` `✗` `★` `☆` in views are not this unit.

---

## Findings

### F1. `--ink-3` body-copy claim overreach (done challenges) — **low**

- **Where:** `css/style.css:434` `.challenge-top { font-size: 14px }`; `css/style.css:440` `.challenge.done .challenge-top { color: var(--ink-3); }`. Labels in `js/gamify.js:538-543` (e.g. "Complete a study-plan task today", 32 chars; "Practice in 2 different topics today", 36 chars).
- **Evidence:** empty profile has no `.challenge.done`, so the unit's 23-route live scan could not see this. Forcing `.done` on `#/`: inner span own-text 32 chars, 14px, colour `rgb(128, 125, 118)` (dark `--ink-3`) / would be `rgb(142, 139, 130)` in light. Matches the ≥25 / ≥14 rule exactly.
- **Contrast:** dark `--ink-3` `#807d76` on `--surface` `#252320` is **3.82:1** (below AA for 14px). Light `--ink-3` on cream is the documented 3.2:1 caption ratio, now sitting on 14px sentence-length labels.
- **Not introduced this wave.** Receding completed items is the same idea as `.task.done .task-label` (`css/style.css:735`, struck-through; the unit treated that as allowed). Challenge-done is **not** struck-through.
- **Do not treat as a ship-blocker for ambient / radius.** It is a hole in the unit's "zero hits / nothing to fix" sentence.

`.picker-row.is-locked { color: var(--ink-3); font-size: 14px }` (`css/style.css` ~2123) is the same pattern for long formula names. **Unchecked** on this profile (picker not opened). **uncertain**.

---

## Concurrent damage (Performance defer, Layout sidebar)

Checked against `index.html` / `js/app.js` / `css/style.css` after LayoutFinisher's done ping (`?v=20260909d`):

- Performance `defer` + single `?v=`: **does not re-link ambient.** Stylesheets remain fonts/style/visualizer/print/motion/katex. `grep ambient` on `index.html` and `js/app.js` empty. Ambient files still missing on disk. **high**
- Layout drawer / `PGRE.applySidebarDrawer` / scrim / `isNarrow` in `js/app.js`: **does not restore `PGRE.ambient`.** **high**
- `.btn` (`css/style.css:477`) / `.btn-sm` (`css/style.css:881`) still `border-radius: var(--ctl-r)` (`--ctl-r: 8px` at `:112`). Live 8px at `20260909c`; source unchanged at `20260909d`. **high**
- Dark token block still at file end; no Layout override of `--ink` / `--bg`. **high**

---

## Uncertain / not checked

- In-session `#/practice/...` question card (choices, solution, figure plate `#fff`) — only the mixed-practice **config** card was live.
- Formula picker locked rows (`F1` related) — not opened.
- `#/plan` done tasks at 16px `--ink-3` — unit allowed struck-through; not re-audited as a bug.
- 390px / folded sidebar / drawer open — out of Aesthetics scope; Layout-owned. Not used to pass or fail this unit.
- Print CSS `--ink-3` (`css/print.css:35`) — not exercised via `window.print`.
- Whether HEAD still contains ambient blobs (yes) until someone commits the deletes — runtime is what matters; commit is forbidden this wave.

---

## Not bugs

- `.focus-ambient` leftover — unrelated focus backdrop.
- Mid-transition `#theme-toggle` colour matching light `--ink-2` — `motion.css` transitions `color` on `.btn`; settled dark value is token-correct.
- `.portal-group` 10px radius, flash-tabs 10/7 — unit left them; out of this review's pass/fail.
- Sidebar footer overlap — flagged in `Aesthetics.md` as Layout's; not re-litigated here.
