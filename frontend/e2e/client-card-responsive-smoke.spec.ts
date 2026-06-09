import { expect, test } from '@playwright/test';
import {
  adminUser,
  collectUnexpectedConsoleErrors,
  inspectCardLayout,
  inspectClientDetailLayout,
  isKnownConsoleNoise,
  mockSharedApi,
  responsiveViewports,
  seedAuth,
  trainerUser,
} from './client-card-responsive-smoke.fixtures';
import { inspectNestedClientCardLayout } from './client-card-responsive-overlap';

for (const viewport of responsiveViewports) {
  test(`admin client cards have no responsive overlap at ${viewport.name}`, async ({ page }, testInfo) => {
    const consoleErrors = collectUnexpectedConsoleErrors(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await seedAuth(page, adminUser);
    await mockSharedApi(page, adminUser);

    await page.goto('/dashboard/admin/client-management', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await expect(page.locator('[data-swan-client-card="admin"]').first()).toBeVisible();
    await expect(page.getByText(/Programs, biometrics, measurements/i)).toBeVisible();

    await page.getByRole('button', { name: /select a client/i }).click();
    await page.getByLabel(/search clients/i).fill('biometrics');
    await expect(page.getByRole('option', { name: /Alexandria-Cassandra/i })).toBeVisible();

    const layout = await inspectCardLayout(page);
    const nestedLayout = await inspectNestedClientCardLayout(page);
    expect(layout.overflowX, `horizontal overflow at ${viewport.name}`).toBeLessThanOrEqual(12);
    expect(layout.issues).toEqual([]);
    expect(nestedLayout.issues).toEqual([]);
    expect(consoleErrors.filter((item) => !isKnownConsoleNoise(item))).toEqual([]);

    await page.screenshot({ path: testInfo.outputPath(`admin-client-cards-${viewport.name}.png`), fullPage: false });
  });

  test(`admin selected client detail tabs do not clip at ${viewport.name}`, async ({ page }, testInfo) => {
    const consoleErrors = collectUnexpectedConsoleErrors(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await seedAuth(page, adminUser);
    await mockSharedApi(page, adminUser);

    await page.goto('/dashboard/admin/client-management?clientId=501&tab=biometrics', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await expect(page.getByRole('tablist', { name: /client detail tabs/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /biometrics/i })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: /open measurements/i })).toBeVisible();

    const layout = await inspectClientDetailLayout(page);
    expect(layout.overflowX, `detail horizontal overflow at ${viewport.name}`).toBeLessThanOrEqual(12);
    expect(layout.issues).toEqual([]);
    expect(consoleErrors.filter((item) => !isKnownConsoleNoise(item))).toEqual([]);

    await page.screenshot({ path: testInfo.outputPath(`admin-client-detail-biometrics-${viewport.name}.png`), fullPage: false });
  });

  test(`trainer client cards have no responsive overlap at ${viewport.name}`, async ({ page }, testInfo) => {
    const consoleErrors = collectUnexpectedConsoleErrors(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await seedAuth(page, trainerUser);
    await mockSharedApi(page, trainerUser);

    await page.goto('/dashboard/trainer/clients', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await expect(page.locator('[data-swan-client-card="trainer"]').first()).toBeVisible();
    await expect(page.locator('[data-swan-client-card="trainer"]').first().getByText(/Workout Proof/i)).toBeVisible();

    await page.getByPlaceholder(/search clients/i).fill('measurements');
    await expect(page.locator('[data-swan-client-card="trainer"]').filter({ hasText: /Alexandria-Cassandra/i })).toBeVisible();
    await expect(page.getByText(/Jordan Mobility/i)).toHaveCount(0);

    const layout = await inspectCardLayout(page);
    const nestedLayout = await inspectNestedClientCardLayout(page);
    expect(layout.overflowX, `horizontal overflow at ${viewport.name}`).toBeLessThanOrEqual(12);
    expect(layout.issues).toEqual([]);
    expect(nestedLayout.issues).toEqual([]);
    expect(consoleErrors.filter((item) => !isKnownConsoleNoise(item))).toEqual([]);

    await page.screenshot({ path: testInfo.outputPath(`trainer-client-cards-${viewport.name}.png`), fullPage: false });
  });
}

test('admin selected client measurements expansion has no phone overflow', async ({ page }, testInfo) => {
  const consoleErrors = collectUnexpectedConsoleErrors(page);
  await page.setViewportSize({ width: 414, height: 896 });
  await seedAuth(page, adminUser);
  await mockSharedApi(page, adminUser);

  await page.goto('/dashboard/admin/client-management?clientId=501&tab=biometrics', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.getByRole('button', { name: /open measurements/i }).click();

  await expect(page.getByRole('button', { name: /back to biometrics/i })).toBeVisible();
  await expect(page.getByText(/Body Measurements Entry/i)).toBeVisible();
  await expect(page.getByText(/Measurement Date/i)).toBeVisible();

  const layout = await inspectClientDetailLayout(page);
  expect(layout.overflowX, 'measurements expansion phone horizontal overflow').toBeLessThanOrEqual(12);
  expect(layout.issues).toEqual([]);
  expect(consoleErrors.filter((item) => !isKnownConsoleNoise(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('admin-client-measurements-expanded-phone.png'), fullPage: false });
});
