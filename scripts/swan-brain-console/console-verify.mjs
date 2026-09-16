/**
 * console-verify — real-browser verification of the Swan Brain Console.
 * @module scripts/swan-brain-console/console-verify.mjs
 *
 * WHY A BROWSER AND NOT A UNIT TEST
 * The console's whole job is to be a surface a human reads. Asserting that a
 * function returns HTML would not catch a tab that cannot be reached by keyboard,
 * a panel that overlaps at 375px, or JS that throws on boot. So this drives a
 * real Chromium against the running server.
 *
 * It checks the things the blueprint promised (T8, T10, T11):
 *   - the page boots with no console errors
 *   - the engine is shown BLOCKED and no write control exists anywhere
 *   - all 8 tabs are reachable by keyboard alone and switch panels
 *   - the layout holds at 320/375/414/768/1280/2560 without horizontal overflow
 *
 * Run (server must be up): node scripts/swan-brain-console/console-verify.mjs [url]
 * Exits non-zero when any check fails, so it can gate a merge.
 */
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const require = createRequire(resolve(REPO, 'frontend', 'noop.cjs'));
const { chromium } = require('playwright');

const URL = process.argv[2] ?? 'http://127.0.0.1:4599/';
const VIEWPORTS = [
  { w: 320, h: 720, label: 'phone-320' },
  { w: 375, h: 812, label: 'phone-375' },
  { w: 414, h: 896, label: 'phone-414' },
  { w: 768, h: 1024, label: 'tablet-768' },
  { w: 1280, h: 800, label: 'laptop-1280' },
  { w: 2560, h: 1440, label: 'qhd-2560' },
];

const results = [];
const pass = (name, detail = '') => results.push({ ok: true, name, detail });
const fail = (name, detail = '') => results.push({ ok: false, name, detail });

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e.message)));

  await page.goto(URL, { waitUntil: 'networkidle' });

  // 1. Boots clean.
  if (consoleErrors.length === 0) pass('boot: no console errors');
  else fail('boot: no console errors', consoleErrors.join(' | ').slice(0, 300));

  // 2. Title and identity.
  const title = await page.title();
  title.includes('Swan Brain Console')
    ? pass('boot: title', title)
    : fail('boot: title', title);

  // 3. Engine honesty: BLOCKED is visible, and nothing offers a write.
  const engineText = await page.locator('#stat-engine').innerText();
  engineText.trim() === 'DECLARED_BLOCKED'
    ? pass('engine: status reads BLOCKED', engineText)
    : fail('engine: status reads BLOCKED', engineText);

  const writeish = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('button, a, input, [role="button"]')) {
      const t = (el.textContent || el.getAttribute('aria-label') || '').toLowerCase();
      if (/apply|save|write|commit|approve|adjudicate|promote|delete|submit/.test(t)) {
        bad.push(t.trim().slice(0, 40));
      }
    }
    return bad;
  });
  writeish.length === 0
    ? pass('engine: no write control anywhere')
    : fail('engine: no write control anywhere', writeish.join(', '));

  // 4. Fleet rendered with all 20 rows.
  await page.locator('#tab-fleet').click();
  const rowCount = await page.locator('#fleet-rows tr').count();
  rowCount === 20
    ? pass('fleet: 20 rows rendered', String(rowCount))
    : fail('fleet: 20 rows rendered', String(rowCount));

  const collisionCard = await page.locator('#fleet-summary .card').nth(2).innerText();
  collisionCard.includes('0')
    ? pass('fleet: zero fingerprint collisions')
    : fail('fleet: zero fingerprint collisions', collisionCard.replace(/\n/g, ' '));

  // 5. Keyboard-only tab navigation across all 8 tabs.
  await page.locator('#tab-doctrine').click();
  await page.locator('#tab-doctrine').focus();
  const seen = ['doctrine'];
  for (let i = 0; i < 7; i += 1) {
    await page.keyboard.press('ArrowRight');
    const id = await page.evaluate(() => document.activeElement?.id ?? '');
    seen.push(id.replace('tab-', ''));
  }
  const expected = ['doctrine', 'fleet', 'canvas', 'copy', 'engine', 'seats', 'memory', 'ship'];
  JSON.stringify(seen) === JSON.stringify(expected)
    ? pass('a11y: arrow keys traverse all 8 tabs in order')
    : fail('a11y: arrow keys traverse all 8 tabs in order', seen.join(' > '));

  // Every tab selection must actually reveal its panel.
  let panelsOk = true;
  const panelNotes = [];
  for (const id of expected) {
    await page.locator(`#tab-${id}`).click();
    const hidden = await page.locator(`#panel-${id}`).isHidden();
    if (hidden) { panelsOk = false; panelNotes.push(id); }
  }
  panelsOk
    ? pass('a11y: every tab reveals its panel')
    : fail('a11y: every tab reveals its panel', `still hidden: ${panelNotes.join(', ')}`);

  // 6. Touch-target floor: every visible control >= 44px tall.
  await page.locator('#tab-fleet').click();
  const tooSmall = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('button, a, input')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.height < 44) {
        bad.push(`${el.id || el.className || el.tagName}:${Math.round(r.height)}px`);
      }
    }
    return bad;
  });
  tooSmall.length === 0
    ? pass('a11y: every control >= 44px tall')
    : fail('a11y: every control >= 44px tall', tooSmall.slice(0, 8).join(', '));

  // 7. Responsive matrix: no horizontal overflow at any width.
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.waitForTimeout(120);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    // A couple of px of rounding is not a layout failure; a real overflow is.
    if (overflow <= 2) pass(`responsive ${vp.label}: no h-overflow`, `${overflow}px`);
    else fail(`responsive ${vp.label}: no h-overflow`, `${overflow}px over`);
  }

  // 8. Copy tab actually rendered content (not an empty placeholder).
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('#tab-copy').click();
  const copyItems = await page.locator('#copy-body .copy-item').count();
  copyItems === 20
    ? pass('copy: 20 copy entries rendered', String(copyItems))
    : fail('copy: 20 copy entries rendered', String(copyItems));

  const slopVisible = await page.locator('#copy-body').innerText();
  const banned = ['unlock your', 'elevate your', 'seamless', 'world-class', 'game-changing'];
  const found = banned.filter((b) => slopVisible.toLowerCase().includes(b));
  found.length === 0
    ? pass('copy: no banned phrases visible')
    : fail('copy: no banned phrases visible', found.join(', '));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  — ${r.detail}` : ''}`);
}
console.log(`\n[browser] ${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
