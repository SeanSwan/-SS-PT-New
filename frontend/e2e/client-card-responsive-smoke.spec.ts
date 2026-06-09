import { expect, test, type Page } from '@playwright/test';
import {
  collectUnexpectedConsoleErrors,
  inspectCardLayout,
  inspectClientDetailLayout,
  inspectFixedControlsAgainstClientCards,
  inspectMobileDashboardSafeArea,
  isKnownConsoleNoise,
} from './client-card-responsive-layout';
import {
  adminUser,
  mockSharedApi,
  responsiveViewports,
  seedAuth,
  trainerUser,
} from './client-card-responsive-smoke.fixtures';
import { inspectNestedClientCardLayout } from './client-card-responsive-overlap';

const frameCardForScreenshot = async (page: Page, selector: string) => {
  await page.keyboard.press('Escape');
  const card = page.locator(selector).first();
  await card.scrollIntoViewIfNeeded();
  await card.evaluate(async (element) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const scrollParentFor = (node: Element) => {
      let parent = node.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        const canScroll = parent.scrollHeight > parent.clientHeight + 1;
        const clipsScroll = style.overflowY === 'hidden' || style.overflowY === 'clip';
        if (canScroll && !clipsScroll) return parent;
        if (canScroll) return parent;
        parent = parent.parentElement;
      }
      return document.scrollingElement || document.documentElement;
    };
    const fixedBottom = Array.from(document.querySelectorAll<HTMLElement>('body *')).reduce((bottom, control) => {
      const style = window.getComputedStyle(control);
      const rect = control.getBoundingClientRect();
      if (
        style.position === 'fixed'
        && rect.width > 0
        && rect.height > 0
        && rect.width <= 150
        && rect.height <= 150
        && rect.top < window.innerHeight / 2
      ) {
        return Math.max(bottom, rect.bottom);
      }
      return bottom;
    }, 0);
    const scrollParent = scrollParentFor(element);
    const safeTop = Math.max(132, fixedBottom + 12);
    const scrollBy = (delta: number) => {
      if (scrollParent === document.body || scrollParent === document.documentElement) {
        window.scrollBy(0, delta);
        return;
      }
      scrollParent.scrollTop += delta;
    };
    const alignCard = () => {
      const rect = element.getBoundingClientRect();
      scrollBy(rect.top - safeTop);
    };
    alignCard();
    await new Promise(requestAnimationFrame);
    alignCard();
  });
};

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

    await frameCardForScreenshot(page, '[data-swan-client-card="admin"]');
    expect((await inspectMobileDashboardSafeArea(page)).issues).toEqual([]);
    expect((await inspectFixedControlsAgainstClientCards(page)).issues).toEqual([]);
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

    await frameCardForScreenshot(page, '[data-swan-client-card="trainer"]');
    expect((await inspectMobileDashboardSafeArea(page)).issues).toEqual([]);
    expect((await inspectFixedControlsAgainstClientCards(page)).issues).toEqual([]);
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
