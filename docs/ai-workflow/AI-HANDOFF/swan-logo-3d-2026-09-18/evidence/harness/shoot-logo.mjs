/**
 * Integration check for the header Logo swap.
 *
 * For each header breakpoint: assert the mark is sized as the <img> used to be,
 * that it went live (3-D), and that the click/keyboard contract still works.
 *
 * Usage:  node shoot-logo.mjs
 */
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../../');
const require = createRequire(path.join(root, 'frontend', 'package.json'));
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.join(here, 'logo.html')).href;
const out = path.join(here, '..');

// width -> the size Logo.tsx's ladder should produce.
// The text hides at max-width 430, NOT at 480: 480 only shrinks the mark and the
// type. (The first version of this test asserted 480 hid the text and failed -
// the component was right and the expectation was wrong.)
const BREAKPOINTS = [
  { width: 375, expect: 28, text: false },
  { width: 430, expect: 28, text: false },
  { width: 480, expect: 28, text: true },
  { width: 768, expect: 32, text: true },
  { width: 1440, expect: 36, text: true },
  { width: 2560, expect: 44, text: true },
  { width: 3840, expect: 52, text: true },
];

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

let failed = false;

try {
  const page = await browser.newPage();
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

  console.log('--- size ladder per breakpoint ---');
  for (const bp of BREAKPOINTS) {
    await page.setViewport({ width: bp.width, height: 200, deviceScaleFactor: 1 });
    await page.goto(pageUrl, { waitUntil: 'load' });
    await page.waitForFunction('window.__ready === true', { timeout: 40000 });

    const s = await page.evaluate(() => window.__logo.size());
    const okSize = s.w === bp.expect && s.h === bp.expect;
    const okLive = s.mode === 'live';
    const okText = s.textShown === bp.text;
    if (!okSize || !okLive || !okText) failed = true;
    console.log(
      `  ${okSize && okLive && okText ? 'ok  ' : 'FAIL'} ${String(bp.width).padStart(4)}px -> ` +
        `mark ${s.w}x${s.h} (want ${bp.expect})  mode=${s.mode}  ` +
        `text=${s.textShown ? 'shown' : 'hidden'} (want ${bp.text ? 'shown' : 'hidden'})  ` +
        `canvas=${s.canvas ?? '-'}`,
    );

    await page.screenshot({
      path: path.join(out, `shot-logo-${bp.width}.png`),
      clip: { x: 0, y: 0, width: Math.min(bp.width, 600), height: 80 },
    });
  }

  console.log('--- interaction contract ---');
  await page.setViewport({ width: 1440, height: 200, deviceScaleFactor: 1 });
  await page.goto(pageUrl, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', { timeout: 40000 });

  const before = await page.evaluate(() => window.__logo.clicks);
  await page.click('[role="button"]');
  const afterClick = await page.evaluate(() => window.__logo.clicks);
  const clickOk = afterClick === before + 1;
  if (!clickOk) failed = true;
  console.log(`  ${clickOk ? 'ok  ' : 'FAIL'} click -> onLogoClick fired (${before} -> ${afterClick})`);

  // Focus the control and press Enter, then Space.
  await page.evaluate(() => {
    const el = document.querySelector('[role="button"]');
    if (el) el.focus();
  });
  await page.keyboard.press('Enter');
  const afterEnter = await page.evaluate(() => window.__logo.clicks);
  const enterOk = afterEnter === afterClick + 1;
  if (!enterOk) failed = true;
  console.log(`  ${enterOk ? 'ok  ' : 'FAIL'} Enter -> onLogoClick fired (${afterClick} -> ${afterEnter})`);

  await page.keyboard.press(' ');
  const afterSpace = await page.evaluate(() => window.__logo.clicks);
  const spaceOk = afterSpace === afterEnter + 1;
  if (!spaceOk) failed = true;
  console.log(`  ${spaceOk ? 'ok  ' : 'FAIL'} Space -> onLogoClick fired (${afterEnter} -> ${afterSpace})`);

  const role = await page.evaluate(() => {
    const el = document.querySelector('[role="button"]');
    return {
      role: el?.getAttribute('role'),
      label: el?.getAttribute('aria-label'),
      tab: el?.getAttribute('tabindex'),
    };
  });
  const roleOk = role.role === 'button' && role.label === 'Go to homepage';
  if (!roleOk) failed = true;
  console.log(`  ${roleOk ? 'ok  ' : 'FAIL'} a11y -> ${JSON.stringify(role)}`);

  console.log('--- reduced motion ---');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(pageUrl, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', { timeout: 40000 });
  const anim = await page.evaluate(() => window.__logo.anim());
  const animOk = anim === 'none';
  if (!animOk) failed = true;
  console.log(`  ${animOk ? 'ok  ' : 'FAIL'} float animation-name under reduced motion = ${anim}`);

  console.log('');
  if (problems.length) {
    console.log('--- page diagnostics ---');
    for (const p of [...new Set(problems)].slice(0, 20)) console.log(' ', p);
    failed = true;
  } else {
    console.log('no console errors or warnings');
  }
} finally {
  await browser.close();
}

console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS');
process.exit(failed ? 1 : 0);
