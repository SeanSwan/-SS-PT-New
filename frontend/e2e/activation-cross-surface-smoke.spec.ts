/**
 * LANE-A ACTIVATION — cross-surface smoke (FLAG-LIFECYCLE-DOCTRINE §BLOCKER item 4: "one cross-surface
 * smoke test proving a flag flip produces a visible change"). With runtime flags mocked ON and NO harness
 * injection of any kind, a SECOND surface (Store V4) must mount its vNext shell and resolve the world
 * contract — proving the activation is generic to every SurfaceLensGate surface, not gallery-specific.
 * Backend data APIs are 404-mocked: shells must mount into their own error/skeleton states regardless.
 */
import { expect, test } from '@playwright/test';

test('flag flip produces a visible change: StoreV4 shell mounts with a resolving world contract', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p.endsWith('/api/config/public-flags'))
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ storeV4: true }) });
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{"success":false}' });
  });

  await page.goto('/store');
  const shell = page.getByTestId('store-v4-shell');
  await expect(shell, 'StoreV4 shell mounts for a DEFAULT visitor once its flag is on').toBeVisible({
    timeout: 15000,
  });

  const contract = await shell.evaluate((el) => ({
    accent: getComputedStyle(el).getPropertyValue('--world-accent').trim(),
    scoped: Boolean(el.closest('[data-style-lens-shell]')),
  }));
  expect(contract.accent, '--world-accent resolves from the default world').not.toBe('');
  expect(contract.scoped, 'data-style-lens-shell ancestor exists').toBe(true);
});
