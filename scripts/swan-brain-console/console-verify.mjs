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
 *   - the page boots with no console errors — and raises none during the run either
 *   - the engine is shown BLOCKED and no write control exists anywhere
 *   - the tab strip MATCHES THE REGISTRY, and every tab is reachable by keyboard alone
 *   - every panel renders CONTENT, not an empty shell
 *   - the layout holds at 320/375/414/768/1280/2560, on EVERY tab, without h-overflow
 *
 * EVERY CHECK RUNS INSIDE `step`, and that is load-bearing — an uncaught throw aborts the
 * run and the checks written to catch the failure never execute. `step`, the viewport
 * matrix and the per-tab overflow measurement live in `browserHarness.mjs`; nothing in this
 * file may touch a locator outside a `step`.
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
import { reportResults } from './verifyReport.mjs';
import { createRecorder, checkResponsiveAcrossTabs } from './browserHarness.mjs';
import { PANEL_POPULATION, comparePopulations } from './panelPopulation.mjs';

// No default port: measured 2026-09-19 a leftover pre-S3 console owned 4599 and passed every probe.
const URL = process.argv[2];
if (!URL) { console.error('[console-verify] pass a URL, e.g. node console-verify.mjs http://127.0.0.1:<port>/'); process.exit(2); }

/*
 * The viewport matrix and the isolating `step` live in `browserHarness.mjs` — see that
 * module's header for why every check must run inside `step` rather than inline. Nothing in
 * this file may call a locator outside one, or a single broken panel aborts the run and the
 * checks written to catch it never execute.
 */
const { results, step } = createRecorder();

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  // A local, in-process server needs no patience. 30s per missing element turns a
  // broken console into a two-minute hang; 5s still dwarfs any real render.
  page.setDefaultTimeout(5000);

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e.message)));

  await page.goto(URL, { waitUntil: 'networkidle' });

  // 1. Boots clean.
  await step('boot: no console errors', () => {
    if (consoleErrors.length) throw new Error(consoleErrors.join(' | ').slice(0, 300));
    return 'clean';
  });

  // 2. Title and identity.
  await step('boot: title', async () => {
    const title = await page.title();
    if (!title.includes('Swan Brain Console')) throw new Error(title);
    return title;
  });

  // 3. Engine honesty: BLOCKED is visible, and nothing offers a write.
  await step('engine: status reads BLOCKED', async () => {
    const text = (await page.locator('#stat-engine').innerText()).trim();
    // JSON.stringify so a blank or whitespace-only status is VISIBLE in the report
    // rather than rendering as an empty detail.
    if (text !== 'DECLARED_BLOCKED') throw new Error(`reads ${JSON.stringify(text)}`);
    return text;
  });

  await step('engine: no write control anywhere', async () => {
    const bad = await page.evaluate(() => {
      const hits = [];
      for (const el of document.querySelectorAll('button, a, input, [role="button"]')) {
        const t = (el.textContent || el.getAttribute('aria-label') || '').toLowerCase();
        if (/apply|save|write|commit|approve|adjudicate|promote|delete|submit/.test(t)) {
          hits.push(t.trim().slice(0, 40));
        }
      }
      return hits;
    });
    if (bad.length) throw new Error(bad.join(', '));
    return 'none found';
  });

  // 4. Fleet rendered with all 20 rows.
  await step('fleet: 20 rows rendered', async () => {
    await page.locator('#tab-fleet').click();
    const n = await page.locator('#fleet-rows tr').count();
    if (n !== 20) throw new Error(String(n));
    return String(n);
  });

  /*
   * Read the collision count by NAME and assert the NUMBER.
   *
   * This check previously read the card by position (`.nth(2)`) and then asserted
   * `cardText.includes('0')` — a substring test on a single character, which passes for
   * a collision count of 0, 10, 20, or any other value containing a zero digit. Astra
   * (gpt-6-astra) falsified it in round 2; a direct probe confirmed
   * `'Fingerprint collisions\n10'.includes('0') === true`. The guard could not fail for
   * the case it names, which is the defect class this workstream keeps re-encountering.
   *
   * `app.js` publishes the value under `data-card="collisions"`, so the assertion is on
   * the number itself and does not depend on card order.
   */
  await step('fleet: zero fingerprint collisions', async () => {
    const text = await page.locator('#fleet-summary [data-card="collisions"] .value').innerText();
    const n = Number(text.trim());
    if (!Number.isInteger(n)) throw new Error(`the card published a non-integer: ${JSON.stringify(text)}`);
    if (n !== 0) throw new Error(`${n} collision(s) — the divergence tuple is not unique`);
    return '0 collisions';
  });

  /*
   * 5. The tab strip must MATCH THE REGISTRY, then every tab must be keyboard-reachable.
   *
   * HISTORY — this is the check that let a dead console pass.
   * The expectation here used to be a hardcoded array of the eight ids that
   * `index.html`'s no-JS static fallback happens to contain. When `app-judge.js`
   * imported `./judge-export.mjs` and that asset had no route, the 404 killed
   * `app-judge.js`, which killed `app.js`, which meant NOTHING dynamic ever ran. The
   * static fallback rendered its eight buttons, the page looked plausible — and this
   * assertion, comparing the fallback against a hardcoded copy of the fallback,
   * PASSED. A green suite certified a console where no registry row was ever read.
   *
   * The fix is structural, not a bigger literal. The expected list is FETCHED from the
   * same registry the page is supposed to read, and cross-checked against the DOM
   * BEFORE it is used as an expectation. A served list that disagrees with what rendered
   * therefore fails loudly instead of silently defining its own answer.
   */
  let expected = [];
  await step('a11y: tab strip matches the registry', async () => {
    const registry = await page.evaluate(async () => {
      const res = await fetch('/registry/tabs.json');
      if (!res.ok) return { ok: false, status: res.status, ids: [] };
      const rows = await res.json();
      return { ok: true, status: res.status, ids: rows.map((t) => t.id) };
    });
    const domIds = await page.evaluate(
      () => [...document.querySelectorAll('[role="tab"]')].map((el) => (el.id || '').replace('tab-', '')),
    );
    // Assigned before any throw, so the later checks still have a list to walk.
    expected = registry.ids.length ? registry.ids : domIds;

    if (!registry.ok) throw new Error(`GET /registry/tabs.json -> ${registry.status}`);
    if (registry.ids.length === 0) throw new Error('the registry served zero tabs — this check would be vacuous');
    if (JSON.stringify(domIds) !== JSON.stringify(registry.ids)) {
      throw new Error(`registry [${registry.ids.join(',')}] vs DOM [${domIds.join(',')}]`);
    }
    return `${registry.ids.length} tabs, DOM identical`;
  });

  await step('a11y: arrow keys traverse every tab in order', async () => {
    if (expected.length === 0) throw new Error('no tabs rendered at all');
    await page.locator(`#tab-${expected[0]}`).click();
    await page.locator(`#tab-${expected[0]}`).focus();
    const seen = [expected[0]];
    for (let i = 0; i < expected.length - 1; i += 1) {
      await page.keyboard.press('ArrowRight');
      const id = await page.evaluate(() => document.activeElement?.id ?? '');
      seen.push(id.replace('tab-', ''));
    }
    if (JSON.stringify(seen) !== JSON.stringify(expected)) throw new Error(seen.join(' > '));
    return seen.join(' > ');
  });

  await step('a11y: every tab reveals its panel', async () => {
    if (expected.length === 0) throw new Error('no tabs rendered at all');
    const hidden = [];
    for (const id of expected) {
      await page.locator(`#tab-${id}`).click();
      if (await page.locator(`#panel-${id}`).isHidden()) hidden.push(id);
    }
    if (hidden.length) throw new Error(`still hidden: ${hidden.join(', ')}`);
    return `${expected.length} panels`;
  });

  /*
   * 6. Gate Health (S4.1) must actually RENDER, not merely exist.
   *
   * A panel that is present, visible and EMPTY satisfies every check above — the tab
   * appears in the strip, the panel is revealed, nothing overflows. That is the D2 defect
   * one level down: reachability is not identity, and "the tab is there" is not "the tab
   * shows you anything". So the row count is compared against the number of gates the
   * SNAPSHOT declares, fetched independently of the DOM.
   */
  await step('gates: the panel renders one row per declared gate', async () => {
    await page.locator('#tab-gate-health').click();
    const rendered = await page.locator('#panel-gate-health .gate-table tbody tr').count();
    const declared = await page.evaluate(async () => {
      const res = await fetch('/api/state');
      if (!res.ok) return -1;
      const state = await res.json();
      return Array.isArray(state.gates?.gates) ? state.gates.gates.length : -1;
    });
    if (declared < 0) throw new Error('the snapshot carried no gate list at all');
    if (declared === 0) throw new Error('the snapshot declared zero gates — this check would be vacuous');
    if (rendered !== declared) throw new Error(`${rendered} rows rendered for ${declared} declared gates`);
    return `${rendered} rows`;
  });

  // 6b. Touch-target floor: every visible control >= 44px tall.
  await step('a11y: every control >= 44px tall', async () => {
    await page.locator('#tab-fleet').click();
    const bad = await page.evaluate(() => {
      const hits = [];
      for (const el of document.querySelectorAll('button, a, input')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.height < 44) {
          hits.push(`${el.id || el.className || el.tagName}:${Math.round(r.height)}px`);
        }
      }
      return hits;
    });
    if (bad.length) throw new Error(bad.slice(0, 8).join(', '));
    return 'all >= 44px';
  });

  /*
   * 7. Responsive matrix: no horizontal overflow at any width, ON EVERY TAB.
   *
   * Round 7 measured this file reporting 6/6 green while the Gate Health panel overflowed
   * the document by 63px at 320px — because the loop measured one tab of ten. The story is
   * in `browserHarness.mjs`, which now owns both the matrix and the per-tab walk.
   */
  await checkResponsiveAcrossTabs({ page, step, tabs: expected });

  // 8. Copy tab actually rendered content (not an empty placeholder).
  await step('copy: 20 copy entries rendered', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('#tab-copy').click();
    const n = await page.locator('#copy-body .copy-item').count();
    if (n !== 20) throw new Error(String(n));
    return String(n);
  });

  await step('copy: no banned phrases visible', async () => {
    const visible = (await page.locator('#copy-body').innerText()).toLowerCase();
    const banned = ['unlock your', 'elevate your', 'seamless', 'world-class', 'game-changing'];
    const found = banned.filter((b) => visible.includes(b));
    if (found.length) throw new Error(found.join(', '));
    return 'none found';
  });

  /*
   * 9. Every RENDERED CONTAINER holds its independently-expected population.
   *
   * This used to measure each panel's `innerText` and call 20 characters "content". Every
   * authored panel carries PERMANENT intro copy — `#panel-judge` alone holds ~334 characters —
   * so Astra F14 (round 11) is right that a renderer replaced by a successful no-op passed. It
   * measured the prose. The container and the snapshot-derived table live in `panelPopulation.mjs`.
   */
  await step('panels: every rendered container holds its expected population', async () => {
    if (expected.length === 0) throw new Error('no tabs to check — this check would be vacuous');
    const state = await page.evaluate(async () => (await fetch('/api/state')).json());
    const measured = {};
    for (const entry of PANEL_POPULATION) {
      if (!expected.includes(entry.tab)) continue;
      await page.locator(`#tab-${entry.tab}`).click();
      measured[entry.selector] = await page.locator(entry.selector).count();
    }
    const problems = comparePopulations(state, measured);
    if (problems.length) throw new Error(problems.join(' | '));
    return `${PANEL_POPULATION.length} containers hold their expected population`;
  });

  /*
   * 10. Errors that arrived AFTER boot. `consoleErrors` is written by two listeners from the
   * moment the page is created, but was READ exactly once — in check 1, right after `goto`.
   * A panel module that throws on click produced a green "boot: no console errors" and
   * nothing else. This runs last on purpose: it is the only assertion here covering the
   * whole run rather than one moment of it.
   */
  await step('runtime: no console errors after boot', () => {
    if (consoleErrors.length) throw new Error(consoleErrors.join(' | ').slice(0, 300));
    return 'clean';
  });
} finally {
  await browser.close();
}

// The tally lives in `verifyReport` so its vacuity guard is testable — see that module.
process.exit(reportResults(results, '[browser]') ? 1 : 0);
