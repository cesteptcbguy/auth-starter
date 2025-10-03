/**
 * scripts/screenshot.mjs
 * Starts dev server if needed, takes a screenshot, then shuts server down cleanly.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const ORIGIN = `http://${HOST}:${PORT}`;
const TARGET_PATH = '/dashboard';
const URL = `${ORIGIN}${TARGET_PATH}`;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function isServerUp() {
  return new Promise((resolve) => {
    const req = http.get(`${ORIGIN}`, { timeout: 1000 }, (res) => {
      res.resume(); resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function waitForServer(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerUp()) return true;
    await wait(500);
  }
  return false;
}

function stopProcess(proc, { timeoutMs = 10000 } = {}) {
  if (!proc) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const cleanup = () => { if (!done) { done = true; resolve(); } };
    const t = setTimeout(() => {
      try { process.kill(proc.pid, 'SIGKILL'); } catch (_) {}
      cleanup();
    }, timeoutMs);

    proc.once('exit', () => { clearTimeout(t); cleanup(); });
    try { proc.kill('SIGINT'); } catch (_) { clearTimeout(t); cleanup(); }
  });
}

async function main() {
  let serverProc = null;
  let startedServer = false;

  if (!(await isServerUp())) {
    serverProc = spawn('pnpm', ['start', '-p', String(PORT)], {
      stdio: 'inherit',
      env: {
        ...process.env,
        SCREENSHOT_MODE: process.env.SCREENSHOT_MODE || '1',
        NEXT_PUBLIC_SCREENSHOT_MODE: process.env.NEXT_PUBLIC_SCREENSHOT_MODE || '1',
        PORT: String(PORT),
      },
    });
    startedServer = true;

    const ready = await waitForServer(60000);
    if (!ready) {
      await stopProcess(serverProc, { timeoutMs: 3000 });
      throw new Error('Dev server failed to become ready on :3000 within 60s');
    }
  }

  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'public/desktop.png', fullPage: true });
    console.log('Saved screenshot to public/desktop.png');
  } finally {
    await browser.close();
  }

  if (startedServer) {
    await stopProcess(serverProc, { timeoutMs: 8000 });
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
