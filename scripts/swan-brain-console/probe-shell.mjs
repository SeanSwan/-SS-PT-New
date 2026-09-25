/**
 * Probe: does the registry actually drive the tab strip in a real browser?
 * Prints the DOM tab ids, the count, and whether app-shell.js loaded.
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const require = createRequire(join(REPO, 'frontend', 'noop.cjs'));
const { chromium } = require('playwright');

const PORT = 4761;
const child = spawn(process.execPath, [join(REPO, 'scripts/swan-brain-console/server.mjs'), '--port', String(PORT)], { stdio: 'ignore' });

async function up() {
  for (let i = 0; i < 80; i += 1) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/api/state`); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

const browser = await chromium.launch();
try {
  if (!(await up())) throw new Error('server did not start');
  const page = await browser.newPage();
  const errors = [];
  const failed = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', (r) => failed.push(`REQFAIL ${r.url()} — ${r.failure()?.errorText}`));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const tabIds = await page.$$eval('#tabs [role="tab"]', (els) => els.map((e) => e.id));
  const panelIds = await page.$$eval('main .panel', (els) => els.map((e) => e.id));
  const judgePresent = await page.$('#panel-judge') !== null;
  const judgeHasContent = judgePresent
    ? await page.$eval('#panel-judge', (e) => e.textContent.trim().slice(0, 120))
    : null;
  const judgePairs = judgePresent ? (await page.$$('#panel-judge .judge-pair')).length : 0;
  const judgeCssLoaded = await page.$$eval('link[rel="stylesheet"]', (els) => els.map((e) => e.getAttribute('href')));

  console.log('DOM tabs        :', tabIds.length, tabIds.join(', '));
  console.log('DOM panels      :', panelIds.length, panelIds.join(', '));
  console.log('#panel-judge    :', judgePresent);
  console.log('judge .judge-pair count:', judgePairs);
  console.log('judge text      :', JSON.stringify(judgeHasContent));
  console.log('stylesheets     :', judgeCssLoaded.join(', '));
  console.log('HTTP >=400      :', failed.length ? failed : '(none)');
  console.log('console errors  :', errors.length ? errors : '(none)');
} finally {
  await browser.close();
  child.kill();
}
