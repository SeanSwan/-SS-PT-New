/**
 * cdp.mjs — a minimal Chrome DevTools Protocol driver, for measuring the surface.
 *
 * WHY HAND-ROLLED. There is no `node_modules` in this worktree and Playwright is not
 * resolvable, but Playwright's Chromium IS cached on this machine and Node 22 has a
 * global `WebSocket`. So the browser tests drive a REAL Chromium over CDP with zero
 * new dependencies. The alternative — asserting on CSS text — would be an instrument
 * that cannot fail: `overflow-x: hidden` in a stylesheet would make a CSS-text check
 * pass while the layout overflowed, which is precisely the class of defect this
 * engagement has been fixing.
 *
 * `--no-sandbox` IS REQUIRED HERE. Without it the page target crashes immediately
 * after attach (`Inspector.targetCrashed`) and every session-scoped command times
 * out. Measured, not guessed: with `--no-sandbox` the same sequence completes.
 *
 * THE PAGE'S OWN WEBSOCKET IS USED, NOT A FLATTENED SESSION. `Target.attachToTarget`
 * with `flatten: true` also timed out in this environment. Connecting to the page
 * target's `webSocketDebuggerUrl` from `/json/list` needs no session management and
 * is what the probes that worked actually did.
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CANDIDATES = [
  'C:/Users/BigotSmasher/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

/** The first browser binary that exists, or null. Never throws — the caller decides. */
export function findBrowser() {
  return CANDIDATES.find((p) => existsSync(p)) ?? null;
}

const SEND_TIMEOUT_MS = 20_000;

/**
 * Launch a headless browser, hand a connected page to `fn`, and always tear down.
 *
 * The teardown is in a `finally`: a browser left running holds a profile directory
 * and a port, and the next test run would inherit both.
 */
export async function withPage(fn, { width = 1440, height = 900 } = {}) {
  const exe = findBrowser();
  if (!exe) throw new Error('E_NO_BROWSER: no Chromium/Chrome/Edge binary found');

  const profile = mkdtempSync(join(tmpdir(), 'astra-cdp-'));
  const child = spawn(exe, [
    '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    `--window-size=${width},${height}`,
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let log = '';
  const wsUrl = await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`E_BROWSER_TIMEOUT: ${log.slice(-400)}`)), 25_000);
    child.stderr.on('data', (d) => {
      log += d;
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(log);
      if (m) { clearTimeout(t); res(m[1]); }
    });
    child.on('exit', (code) => { clearTimeout(t); rej(new Error(`E_BROWSER_EXIT: code ${code}`)); });
  });

  const port = Number(/ws:\/\/127\.0\.0\.1:(\d+)\//.exec(wsUrl)[1]);
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = list.find((t) => t.type === 'page');
  if (!target) throw new Error('E_NO_PAGE_TARGET');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, rej) => {
    ws.onopen = r;
    ws.onerror = () => rej(new Error('E_WS_CONNECT'));
  });

  let seq = 0;
  const pending = new Map();
  const crashes = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Inspector.targetCrashed') crashes.push(msg);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };

  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, res);
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); rej(new Error(`E_CDP_TIMEOUT: ${method}`)); }
    }, SEND_TIMEOUT_MS);
  });

  const page = {
    send,
    crashes,
    /** Evaluate an expression and return its value. Throws on a page-side exception. */
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.result?.exceptionDetails) {
        throw new Error(`E_PAGE_EXCEPTION: ${r.result.exceptionDetails.text} `
          + `${r.result.exceptionDetails.exception?.description ?? ''}`);
      }
      return r.result?.result?.value;
    },
    /** Set the layout viewport. This is what makes the responsive test a measurement. */
    viewport: (w, h = 900) => send('Emulation.setDeviceMetricsOverride',
      { width: w, height: h, deviceScaleFactor: 1, mobile: false }),
    /** Emulate the OS motion preference. `T-A-05` depends on this. */
    reducedMotion: (value) => send('Emulation.setEmulatedMedia',
      { features: [{ name: 'prefers-reduced-motion', value }] }),
    async goto(url, settleMs = 350) {
      await send('Page.navigate', { url });
      await new Promise((r) => setTimeout(r, settleMs));
    },
    /** A real key press. `Input.dispatchKeyEvent` is why T-A-03 is a traversal. */
    async pressTab() {
      const k = { windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, key: 'Tab', code: 'Tab' };
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...k });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
      await new Promise((r) => setTimeout(r, 40));
    },
    async screenshot(path) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      const { writeFileSync } = await import('node:fs');
      writeFileSync(path, Buffer.from(r.result.data, 'base64'));
      return path;
    },
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await page.viewport(width, height);

  try {
    return await fn(page);
  } finally {
    try { ws.close(); } catch { /* already gone */ }
    try { child.kill(); } catch { /* already gone */ }
    await new Promise((r) => setTimeout(r, 120));
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* windows lock */ }
  }
}
