/**
 * test-file-structure.js
 * Verifies repository file placement against the canonical rules in AGENTS.md.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

function checkRepoStructure() {
  console.log('Running repository structure and placement audit...');

  // 1. Check allowed top-level entries
  const canonicalTopLevel = new Set([
    '.DS_Store',
    '.git',
    '.gitignore',
    '.agents',
    '99_System',
    'AGENTS.md',
    'README.md',
    'content',
    'css',
    'docs',
    'fonts',
    'index.html',
    'js',
    'simulations',
    'tools',
    'vendor'
  ]);

  const rootEntries = fs.readdirSync(ROOT);
  for (const entry of rootEntries) {
    assert(canonicalTopLevel.has(entry), `Unexpected top-level entry found: ${entry}`);
  }
  console.log('  [PASS] All root-level files and directories match canonical list.');

  // 2. Check simulations folder
  const simEntries = fs.readdirSync(path.join(ROOT, 'simulations'));
  for (const file of simEntries) {
    if (file === '.DS_Store') continue;
    assert(file.endsWith('.html') || file.endsWith('.md'), `Invalid file in simulations/: ${file}`);
  }
  console.log('  [PASS] simulations/ contains only standalone HTML visualizers and markdown.');

  // 3. Check css folder
  const cssEntries = fs.readdirSync(path.join(ROOT, 'css'));
  for (const file of cssEntries) {
    if (file === '.DS_Store') continue;
    assert(file.endsWith('.css'), `Non-CSS file found in css/: ${file}`);
  }
  console.log('  [PASS] css/ contains only stylesheets.');

  // 4. Check js folder
  const jsEntries = fs.readdirSync(path.join(ROOT, 'js'));
  for (const file of jsEntries) {
    if (file === '.DS_Store') continue;
    const fullPath = path.join(ROOT, 'js', file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      assert(file === 'visualizers', `Unexpected directory in js/: ${file}`);
      const subEntries = fs.readdirSync(fullPath);
      for (const sub of subEntries) {
        if (sub === '.DS_Store') continue;
        assert(sub.endsWith('.js'), `Non-JS file found in js/visualizers/: ${sub}`);
      }
    } else {
      assert(file.endsWith('.js'), `Non-JS file found in js/: ${file}`);
    }
  }
  console.log('  [PASS] js/ contains only JavaScript source files.');

  // 5. Check tools folder
  const toolEntries = fs.readdirSync(path.join(ROOT, 'tools'));
  for (const file of toolEntries) {
    if (file === '.DS_Store') continue;
    assert(file.endsWith('.js') || file.endsWith('.py') || file.endsWith('.sh') || file.endsWith('.md'), `Unexpected file in tools/: ${file}`);
  }
  console.log('  [PASS] tools/ contains only scripts and test utilities.');

  // 6. Check 99_System folder
  const sysEntries = fs.readdirSync(path.join(ROOT, '99_System'));
  for (const entry of sysEntries) {
    if (entry === '.DS_Store') continue;
    const stat = fs.statSync(path.join(ROOT, '99_System', entry));
    assert(stat.isDirectory() || entry.endsWith('.md'), `Unexpected entry in 99_System/: ${entry}`);
  }
  console.log('  [PASS] 99_System/ contains only structured handoffs and markdown documents.');

  // 7. Check AGENTS.md and README.md for zero emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
  const agentsContent = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf-8');
  const readmeContent = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf-8');

  assert(!emojiRegex.test(agentsContent), 'Emoji found in AGENTS.md');
  assert(!emojiRegex.test(readmeContent), 'Emoji found in README.md');
  console.log('  [PASS] No emojis found in AGENTS.md or README.md.');

  console.log('All canonical structure and placement checks passed successfully.');
}

checkRepoStructure();
