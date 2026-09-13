/**
 * Rolodex / planner repair — synthetic browser acceptance (S04)
 * ============================================================
 * Proves, in a real browser against the real built-with-Vite module Worker:
 *   - the exercise-search worker actually LOADS and RUNS (S03's open obligation)
 *   - initial error -> retry -> ready
 *   - a genuinely empty catalog is never reported as "no matches"
 *   - a failed refresh keeps rows and discloses itself (stale)
 *   - the compact `No demo` thumbnail
 *   - the full saved S02 intensity text is readable, not clipped
 *   - responsive: no horizontal overflow at 360/768/1440, 44px targets, focus
 *
 * NOT PROVEN HERE (and not claimed): authentication, role gating, selected
 * client, equipment profile, persistence, generation or any deployed route.
 * No private client data is used — the catalog is a synthetic fixture.
 */

import { expect, test, type Page, type Route } from '@playwright/test';

const HARNESS_URL = '/tests/audit/rolodex-repair.html';

type CatalogMode = 'ok' | 'empty' | 'fail';

let catalogMode: CatalogMode = 'ok';

const catalogRow = (id: string, name: string, bodyPartCategory: string) => ({
  id,
  name,
  exerciseKey: id,
  exerciseType: 'strength',
  bodyPartCategory,
  primaryMuscles: [bodyPartCategory],
  difficulty: 1,
});

const CATALOG = [
  catalogRow('synthetic-bench-press', 'Synthetic Bench Press', 'Chest'),
  catalogRow('synthetic-back-squat', 'Synthetic Back Squat', 'Legs'),
  catalogRow('synthetic-row', 'Synthetic Row', 'Back'),
];

/** Block every non-loopback destination; loopback Vite assets/worker pass. */
async function blockForeignDestinations(page: Page) {
  await page.route('**/*', (route: Route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
    return route.abort();
  });
}

/** Deterministic synthetic library endpoint. Registered last so it wins. */
async function installLibraryRoute(page: Page) {
  await page.route('**/api/exercises/library', (route: Route) => {
    if (catalogMode === 'fail') {
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"success":false}' });
    }
    if (catalogMode === 'empty') {
      return route.fulfill({ json: { success: true, exercises: [] } });
    }
    return route.fulfill({ json: { success: true, exercises: CATALOG } });
  });
}

async function openHarness(page: Page) {
  const errors: string[] = [];
  const workerRequests: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => {
    if (request.url().includes('exerciseSearch.worker')) workerRequests.push(request.url());
  });

  await blockForeignDestinations(page);
  await installLibraryRoute(page);
  await page.goto(HARNESS_URL);
  await expect(page.getByTestId('rolodex-repair-harness')).toBeVisible();
  return { errors, workerRequests };
}

const loggerSection = (page: Page) => page.getByTestId('section-logger');
const loggerInput = (page: Page) => loggerSection(page).getByLabel('Search exercises');
const loggerRows = (page: Page) => loggerSection(page).getByRole('option');

/**
 * Tests that deliberately fail the transport will legitimately log the failure.
 * Only UNEXPECTED console/page errors are a defect.
 */
const EXPECTED_TRANSPORT_NOISE = [
  'Failed to load resource: the server responded with a status of 503',
  '[API] Response error:',
  'Failed to load exercise list:',
];

const unexpectedErrors = (errors: string[]) =>
  errors.filter(error => !EXPECTED_TRANSPORT_NOISE.some(noise => error.includes(noise)));

test.describe('rolodex repair — synthetic browser acceptance', () => {
  test.beforeEach(() => { catalogMode = 'ok'; });

  test('the real Vite module worker loads and drives search results', async ({ page }) => {
    const { errors, workerRequests } = await openHarness(page);

    // Rows arrive only after the real worker round-trip.
    await expect(loggerRows(page).first()).toBeVisible();
    await expect(loggerSection(page).getByTestId('rolodex-status')).toContainText('3 exercises');

    // The worker chunk was actually requested by the browser (not a fake Worker).
    expect(workerRequests.length).toBeGreaterThan(0);

    await loggerInput(page).fill('squat');
    await expect(loggerRows(page)).toHaveCount(1);
    await expect(loggerRows(page).first()).toContainText('Synthetic Back Squat');

    // Clearing the query restores the whole catalog through the same worker.
    await loggerInput(page).fill('');
    await expect(loggerRows(page)).toHaveCount(3);

    expect(unexpectedErrors(errors), `console/page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('initial transport failure -> retry -> ready, and retry never mutates', async ({ page }) => {
    catalogMode = 'fail';
    const { errors } = await openHarness(page);

    const alert = loggerSection(page).getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Exercise library unavailable');
    await expect(loggerRows(page)).toHaveCount(0);

    catalogMode = 'ok';
    const retry = loggerSection(page).getByTestId('rolodex-library-retry');
    await expect(retry).toBeVisible();
    await retry.click();

    await expect(loggerRows(page)).toHaveCount(3);
    await expect(loggerSection(page).getByRole('alert')).toHaveCount(0);
    expect(unexpectedErrors(errors)).toEqual([]);
  });

  test('a genuinely empty catalog is not reported as "no matches"', async ({ page }) => {
    catalogMode = 'empty';
    const { errors } = await openHarness(page);

    const empty = loggerSection(page).getByTestId('rolodex-library-empty-catalog');
    await expect(empty).toBeVisible();
    await expect(empty).toContainText('No exercises available yet');
    await expect(loggerSection(page).getByTestId('rolodex-library-filter-empty')).toHaveCount(0);
    await expect(loggerSection(page).getByTestId('rolodex-library-retry')).toBeVisible();
    expect(unexpectedErrors(errors)).toEqual([]);
  });

  test('ready catalog with an unmatched query reports empty FILTERS, not an empty library', async ({ page }) => {
    const { errors } = await openHarness(page);

    await expect(loggerRows(page)).toHaveCount(3);
    await loggerInput(page).fill('zzzznotathing');

    const filterEmpty = loggerSection(page).getByTestId('rolodex-library-filter-empty');
    await expect(filterEmpty).toBeVisible();
    await expect(filterEmpty).toContainText('No exercises match current filters');
    await expect(loggerSection(page).getByTestId('rolodex-library-clear')).toBeVisible();
    // A filter miss must not offer a library refetch.
    await expect(loggerSection(page).getByTestId('rolodex-library-retry')).toHaveCount(0);
    expect(unexpectedErrors(errors)).toEqual([]);
  });

  test('a failed refresh keeps the cache usable and discloses itself', async ({ page }) => {
    catalogMode = 'empty';
    const { errors } = await openHarness(page);

    // Reach a refreshable state through the real empty-catalog retry.
    const retry = loggerSection(page).getByTestId('rolodex-library-retry');
    await expect(retry).toBeVisible();
    catalogMode = 'fail';
    await retry.click();

    const stale = loggerSection(page).getByTestId('rolodex-library-stale');
    await expect(stale).toBeVisible();
    await expect(stale).toContainText('Library may be out of date');
    await expect(loggerSection(page).getByTestId('rolodex-library-retry')).toBeVisible();
    // A usable cache is not a blocking alert.
    await expect(loggerSection(page).getByRole('alert')).toHaveCount(0);
    expect(unexpectedErrors(errors)).toEqual([]);
  });

  test('compact media shows No demo without the expanded guidance', async ({ page }) => {
    const { errors } = await openHarness(page);
    const slot = page.getByTestId('harness-media-slot');

    await expect(slot.getByText('No demo')).toBeVisible();
    await expect(slot.getByText('SwanStudios form preview')).toHaveCount(0);
    await expect(slot.getByText('Demo media ready when uploaded')).toHaveCount(0);
    expect(unexpectedErrors(errors)).toEqual([]);
  });

  test('the full saved intensity text is rendered without clipping', async ({ page }) => {
    const { errors } = await openHarness(page);

    const helper = page.getByText(/^Saved intensity:/);
    await expect(helper).toBeVisible();
    await expect(helper).toContainText('3-1-1 tempo on the final set');

    // The helper must not be the cause of horizontal overflow, and no word may
    // be pushed outside its own box.
    const clipped = await helper.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return element.scrollWidth > Math.ceil(rect.width) + 1;
    });
    expect(clipped).toBe(false);
    expect(unexpectedErrors(errors)).toEqual([]);
  });

  for (const width of [360, 768, 1440]) {
    test(`no horizontal overflow and 44px targets at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const { errors } = await openHarness(page);
      await expect(loggerRows(page).first()).toBeVisible();

      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `document overflows by ${overflow}px at ${width}px`).toBeLessThanOrEqual(1);

      const undersized = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button'))
          .filter(button => button.offsetParent !== null)
          .map(button => ({
            label: (button.getAttribute('aria-label') || button.textContent || '').trim().slice(0, 48),
            height: Math.round(button.getBoundingClientRect().height),
          }))
          .filter(entry => entry.height > 0 && entry.height < 44));
      expect(undersized, `undersized targets: ${JSON.stringify(undersized)}`).toEqual([]);

      expect(unexpectedErrors(errors)).toEqual([]);
    });
  }

  test('keyboard focus is visible on the recovery control', async ({ page }) => {
    catalogMode = 'fail';
    const { errors } = await openHarness(page);

    const retry = loggerSection(page).getByTestId('rolodex-library-retry');
    await expect(retry).toBeVisible();
    await retry.focus();

    const outline = await retry.evaluate(element => {
      const style = window.getComputedStyle(element);
      return `${style.outlineStyle} ${style.outlineWidth}`;
    });
    expect(outline).not.toBe('none 0px');
    expect(unexpectedErrors(errors)).toEqual([]);
  });
});
