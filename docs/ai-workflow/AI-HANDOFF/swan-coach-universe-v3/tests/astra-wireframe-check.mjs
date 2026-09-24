/** Synthetic HTML reference QA, not the production Coach or authenticated tabs.
 * Uses a caller-supplied installed Playwright package; no downloads/app boot.
 * Checks layouts, terminal-state controls, keyboard tabs and zero network egress.
 * Screenshots/JSON stay in packet/evidence. Throws on any failed assertion.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');
const packet = fileURLToPath(new URL('../', import.meta.url));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const cases = [], requests = [], errors = [];
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:/, route => { requests.push(route.request().url()); return route.abort(); });
  await page.goto(pathToFileURL(path.join(packet, 'session-desk-review.html')).href);
  for (const [width, height] of [[320, 800], [414, 896], [768, 1024], [1440, 900], [2560, 1440], [3840, 2160]]) {
    await page.setViewportSize({ width, height });
    for (const state of ['draft', 'review', 'saving', 'unknown', 'verified', 'denied', 'offline']) {
      await page.selectOption('#state', state);
      for (const view of width < 1024 ? ['talk', 'workout', 'results'] : ['desktop']) {
        if (view !== 'desktop') await page.locator(`[data-view="${view}"]`).click();
        const layout = await page.evaluate(() => ({
          viewport: innerWidth, width: document.documentElement.scrollWidth,
          composerTop: document.querySelector('.composer').getBoundingClientRect().top,
          panelsBottom: Math.max(...['talk', 'workout', 'results'].map(id => {
            const el = document.getElementById(id); return el.hidden ? 0 : el.getBoundingClientRect().bottom;
          })),
          smallTargets: [...document.querySelectorAll('button,select')].filter(el => {
            const r = el.getBoundingClientRect();
            return r.width && r.height && (r.width < 44 || r.height < 44);
          }).map(el => el.textContent),
        }));
        assert.ok(layout.width <= layout.viewport + 1, `${width}/${state}/${view}: horizontal overflow`);
        assert.deepEqual(layout.smallTargets, [], `${width}/${state}: undersized controls`);
        assert.ok(layout.composerTop >= layout.panelsBottom, `${width}/${state}/${view}: composer covers task content`);
        cases.push({ width, height, state, view, passed: true });
      }
    }
    await page.selectOption('#state', 'draft');
    if (width < 1024) await page.locator('[data-view="workout"]').click();
    await page.screenshot({ path: path.join(packet, `evidence/astra-wireframe-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.selectOption('#state', 'unknown');
  assert.deepEqual(await page.locator('#workactions button').allTextContents(), ['Check result', 'Close task view']);
  await page.selectOption('#state', 'denied');
  for (const selector of ['#talk .chat', '#workout h3', '#workout .sets', '#workout .metrics'])
    assert.equal(await page.locator(selector).isVisible(), false, `Denied record leak: ${selector}`);
  await page.selectOption('#state', 'draft');
  await page.getByRole('button', { name: 'Review and save', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm save', exact: true }).click();
  assert.equal(await page.locator('#state').inputValue(), 'saving');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.setViewportSize({ width: 414, height: 896 });
  await page.locator('[data-view="talk"]').click();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('[data-view="workout"]').getAttribute('aria-selected'), 'true');
  await page.keyboard.press('End');
  assert.equal(await page.locator('[data-view="results"]').getAttribute('aria-selected'), 'true');
  assert.deepEqual(requests, [], 'Wireframe requested external resources');
  assert.deepEqual(errors, [], 'Browser errors');
  fs.writeFileSync(path.join(packet, 'evidence/astra-wireframe-check.json'), JSON.stringify({
    scope: 'synthetic wireframe only', browser: await browser.version(), cases,
    terminalControls: 'pass', deniedRecordVisibility: 'pass', keyboardTabs: 'pass',
    networkRequests: requests.length, browserErrors: errors,
  }, null, 2) + '\n');
  console.log(JSON.stringify({ passedLayoutCases: cases.length, terminalControls: 'pass', keyboardTabs: 'pass', networkRequests: 0 }));
} finally { await browser.close(); }
