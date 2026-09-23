/**
 * Screenshot every blit-experiment cell: one full-page capture plus the integer
 * boxes, same reliable path the component harness uses.
 *
 * Usage:  node shoot-blit.mjs
 */
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../../');
const require = createRequire(path.join(root, 'frontend', 'package.json'));
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.join(here, 'blit.html')).href;
const out = path.join(here, '..');

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--no-sandbox',
    '--hide-scrollbars',
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 900, deviceScaleFactor: 1 });
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

  await page.goto(pageUrl, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', { timeout: 40000 });

  const cells = await page.evaluate(() =>
    Array.from(document.querySelectorAll('canvas[id^="blit-"]')).map((c) => {
      const r = c.getBoundingClientRect();
      const [, n, k] = c.id.split('-');
      return {
        n: Number(n),
        k: Number(k),
        x: Math.round(r.x + window.scrollX),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    }),
  );

  await page.screenshot({ path: path.join(out, 'shot-blit-fullpage.png'), fullPage: true });
  fs.writeFileSync(path.join(out, 'shot-blit-boxes.json'), JSON.stringify(cells, null, 2));
  console.log(`wrote shot-blit-fullpage.png + shot-blit-boxes.json (${cells.length} cells)`);

  console.log(problems.length ? '--- diagnostics ---' : 'no console errors or warnings');
  for (const p of [...new Set(problems)].slice(0, 15)) console.log(' ', p);
} finally {
  await browser.close();
}
