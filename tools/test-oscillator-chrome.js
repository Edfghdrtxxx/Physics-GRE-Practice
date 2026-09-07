// Chrome CDP test script for dynamic oscillator with KaTeX
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const { spawn } = require('child_process');

// Ports default to ephemeral (0) so restricted environments never collide;
// override with PGRE_TEST_PORT / PGRE_CDP_PORT to pin them.
const PORT = parseInt(process.env.PGRE_TEST_PORT || '0', 10);
const CDP_PORT = parseInt(process.env.PGRE_CDP_PORT || '0', 10);
// Screenshots land in a temp dir unless PGRE_ARTIFACT_DIR says otherwise.
const ARTIFACT_DIR = process.env.PGRE_ARTIFACT_DIR ||
  fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-oscillator-artifacts-'));

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
    srv.on('error', reject);
  });
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  for (const c of candidates) {
    try { fs.accessSync(c, fs.constants.X_OK); return c; } catch (e) {}
  }
  return candidates[0]; // let spawn fail with a clear error
}

// SIGTERM Chrome, wait (bounded) for it to exit so its profile dir is
// released before we rm it; escalate to SIGKILL if it hangs.
function stopChrome(proc) {
  return new Promise(resolve => {
    if (!proc || proc.exitCode !== null || proc.signalCode !== null) return resolve();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch (e) {}
      setTimeout(finish, 1000); // SIGKILL is uncatchable; brief grace then move on
    }, 5000);
    proc.once('exit', finish);
    try { proc.kill(); } catch (e) { finish(); }
  });
}

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/simulations/oscillator.html';
  const filePath = path.join(__dirname, '..', reqPath);
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.woff2': 'font/woff2',
      '.woff': 'font/woff',
      '.ttf': 'font/ttf',
      '.png': 'image/png',
      '.svg': 'image/svg+xml'
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
  }
});

async function main() {
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  const httpPort = server.address().port;
  console.log(`HTTP server listening on http://127.0.0.1:${httpPort}`);
  const cdpPort = CDP_PORT || await freePort();

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-dynamic-test-'));
  const chromeProc = spawn(findChrome(), [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--window-size=1280,1050',
    `http://127.0.0.1:${httpPort}/simulations/oscillator.html`
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      const list = await res.json();
      const target = list.find(t => t.type === 'page');
      if (target && target.webSocketDebuggerUrl) {
        wsUrl = target.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error('Failed to connect to Chrome CDP');
    chromeProc.kill();
    server.close();
    process.exit(1);
  }

  console.log('Connected to Chrome CDP:', wsUrl);

  const ws = new WebSocket(wsUrl);
  let idSeq = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idSeq++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result.value;
  }

  async function takeScreenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot: ${outPath}`);
  }

  // Allow fonts & KaTeX to initialize and let animation run for ~1.5s
  await new Promise(r => setTimeout(r, 1200));

  // Check KaTeX elements rendered
  const katexCount = await evaluate(`document.querySelectorAll('.katex').length`);
  console.log('Total KaTeX elements rendered on page:', katexCount);

  // 1. Dynamic light mode screenshot (showing moving spring-mass and tracer beads)
  console.log('Capturing Light Mode Dynamic Simulation...');
  await takeScreenshot('chrome_dynamic_light.png');

  // 2. Test Beats in Dynamic Mode
  console.log('Testing Beats Preset dynamically...');
  await evaluate(`document.querySelectorAll('.sim-presets .sim-btn')[1].click();`);
  await new Promise(r => setTimeout(r, 1500));
  await takeScreenshot('chrome_dynamic_beats.png');

  // 3. Test Dark Mode
  console.log('Testing Dark Mode dynamically...');
  await evaluate(`document.getElementById('sim-theme-toggle').click();`);
  await new Promise(r => setTimeout(r, 1000));
  await takeScreenshot('chrome_dynamic_dark.png');
  ws.close();
  await stopChrome(chromeProc);
  server.close();
  fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  console.log('Dynamic Chrome CDP testing completed successfully!');
}

main().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
