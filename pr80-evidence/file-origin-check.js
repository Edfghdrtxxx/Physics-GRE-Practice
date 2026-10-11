// Hand check of the sidebar search box on the file:// origin, the way the owner opens the Studio.
// Run with `chrome-devtools-axi run < file-origin-check.js` in an isolated session and profile
// (never the owner's Chrome profile or the primary checkout).
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL0 = 'file://<worktree>/index.html';
let failed = 0;
const check = (ok, what) => { if (!ok) failed++; console.log((ok ? 'PASS: ' : 'FAIL: ') + what); };
const ui = async () => JSON.parse(await page.eval(function () {
  var p = document.getElementById('sbs-panel'), i = document.getElementById('sbs-input');
  var on = document.querySelector('#sbs-panel .sbs-row[aria-selected=true]');
  return JSON.stringify({
    origin: location.protocol, hash: location.hash, engine: !!PGRE.search, open: !p.hidden, q: i.value,
    focus: document.activeElement.id, home: i.closest('#sidebar') ? 'sidebar' : 'panel',
    groups: Array.from(p.querySelectorAll('.sbs-results:not([hidden]) .sbs-group-head span:first-child')).map(function (h) { return h.textContent; }),
    selected: on ? on.getAttribute('href') : null,
    button: getComputedStyle(document.getElementById('sbs-open')).display !== 'none',
    state: localStorage.getItem('pgre-state-v1')
  });
}));

await page.open(URL0); await sleep(1200);
await page.eval(function () {
  if (document.documentElement.dataset.theme === 'dark') document.getElementById('theme-toggle').click();
  if (document.body.classList.contains('sidebar-folded')) PGRE.toggleSidebar();
  return 1;
});
await sleep(500);
let u = await ui();
const stateAtLoad = u.state;
check(u.origin === 'file:' && !u.engine && !u.open, 'file:// page loaded; the search engine is not loaded and the panel is closed');

await page.press('/'); await sleep(500);
u = await ui();
check(u.open && u.focus === 'sbs-input' && u.home === 'sidebar', '"/" focuses the box in the sidebar and opens the panel');
await page.type('wave'); await sleep(800);
u = await ui();
check(u.engine && u.groups.join(',') === 'Pages,Questions,Formula cards', 'typing "wave" loads the engine and shows groups: ' + u.groups.join(', '));
await page.press('ArrowDown'); await sleep(100);
const target = (await ui()).selected;
await page.press('Enter'); await sleep(700);
u = await ui();
check(u.hash === target && !u.open && u.q === '' && u.focus === 'main', 'ArrowDown then Enter opens ' + target + ', closes the panel, empties the box');

await page.press('Meta+k'); await sleep(400);
await page.type('energy'); await sleep(800);
await page.press('ArrowUp'); await page.press('Enter'); await sleep(1000);
const page2 = JSON.parse(await page.eval(function () {
  return JSON.stringify({ hash: location.hash, value: document.getElementById('srch-input').value,
    hits: document.querySelectorAll('.srch-hit').length, status: document.getElementById('srch-status').textContent });
}));
check(page2.hash === '#/search/energy' && page2.value === 'energy' && page2.hits > 0,
  'Cmd+K, "energy", last row: the Search page opens at ' + page2.hash + ' with ' + page2.hits + ' hits (' + page2.status + ')');

await page.eval(function () { document.activeElement.blur(); PGRE.toggleSidebar(); return 1; }); await sleep(600);
await page.press('/'); await sleep(400);
u = await ui();
check(u.button && u.open && u.home === 'panel' && u.focus === 'sbs-input', 'sidebar folded: the top-bar button shows and "/" opens the panel with the box in its head');
await page.press('Escape'); await sleep(200);
await page.eval(function () { PGRE.toggleSidebar(); return 1; }); await sleep(500);
u = await ui();
check(!u.open && u.home === 'sidebar' && !u.button, 'Escape closes it; unfolded, the box is back in the sidebar');

check(JSON.stringify(Object.keys(JSON.parse(u.state || '{}')).sort()) === JSON.stringify(Object.keys(JSON.parse(stateAtLoad || '{}')).sort()),
  'localStorage["pgre-state-v1"] holds the same top-level keys as at load (the box adds none)');
console.log(failed ? 'FAILED: ' + failed : 'ALL OK');
