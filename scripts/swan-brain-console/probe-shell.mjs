/**
 * Probe: does the registry actually drive the tab strip in a real browser?
 * Prints the DOM tab ids, the count, and whether app-shell.js loaded.
 *
 * STATUS — read this before trusting the output (round 22, 2026-09-25).
 * This is an unreachable diagnostic: nothing imports it, the gate does not run it, and no test
 * names it. Its subject is covered by `console-verify.mjs`'s browser checks, which DO prove the
 * target's identity. It is kept because it is a fast way to ask one narrow question by hand, and
 * it is fixed rather than deleted because deletion is a judgement about intent that its header
 * cannot settle. If its author confirms it was scratch, deleting it is the better end state.
 *
 * Two defects lived here and both were fixes applied elsewhere and never swept here (round 22):
 *
 *  D1 — the readiness probe tested `r.ok` alone. Vite serves an SPA fallback, so ANY dev server on
 *       the port answers 200 for ANY path: a foreign app holding it satisfied the probe and every
 *       number printed below then described that app. `verify-all.mjs` fixed this class in round 5
 *       by requiring a body substring; this file did not get the fix. It now requires one too, and
 *       the port is an argument rather than a literal — the fixed port was half the problem.
 *
 *  D2 — the child was spawned with `stdio: 'ignore'`, which destroys its stderr, and the failure
 *       then threw `server did not start` — a CAUSE asserted from an observation that only
 *       supports "did not answer in 8 s". The child's own words are carried now.
 *
 * Usage: node scripts/swan-brain-console/probe-shell.mjs [port]
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { firstLines } from './stageReport.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const require = createRequire(join(REPO, 'frontend', 'noop.cjs'));
const { chromium } = require('playwright');

/**
 * The port to probe. An ARGUMENT, not a literal (round 22 D1) — a fixed port is what let a foreign
 * server satisfy the old probe, and it is what made the probe unusable while anything else held it.
 */
const PORT = Number(process.argv[2] ?? 4761);

/**
 * The identity marker only the console's own `/api/state` produces.
 *
 * `"generatedAt"` is a key on the snapshot the console server serialises; an SPA fallback serving
 * index.html for `/api/state` will not contain it. Requiring it in the body is what makes this
 * probe prove IDENTITY rather than mere liveness — the round-5 contract, applied here.
 */
const STATE_MARKER = '"generatedAt"';

const child = spawn(process.execPath, [join(REPO, 'scripts/swan-brain-console/server.mjs'), '--port', String(PORT)], {
  /*
   * stdin MUST stay 'ignore'. A PIPED stdin is the configuration that returns `EBUSY` in this
   * sandbox (measured; see `stageReport.mjs`), so "capture everything" would reintroduce the
   * blocker this probe exists to diagnose. stdout stays ignored too — stderr is the channel that
   * carries a startup failure.
   */
  stdio: ['ignore', 'ignore', 'pipe'],
});

/** The child's own explanation, kept rather than destroyed (round 22 D2). */
const childErr = [];
child.stderr.on('data', (d) => childErr.push(String(d)));

async function up() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/api/state`);
      if (r.ok && (await r.text()).includes(STATE_MARKER)) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

const browser = await chromium.launch();
try {
  if (!(await up())) {
    throw new Error(
      `nothing answered on :${PORT} with the console snapshot (the marker ${STATE_MARKER} was not `
      + `found in /api/state — a foreign app on that port answers 200 too). The child said: `
      + firstLines(childErr.join('')),
    );
  }
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

  console.log('port            :', PORT);
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
