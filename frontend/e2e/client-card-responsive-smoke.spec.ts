import { expect, test, type Page } from '@playwright/test';
import {
  inspectActivationQueueMobileFootprint,
  collectUnexpectedConsoleErrors,
  inspectCardLayout,
  inspectClientSelectorDropdownSurface,
  inspectClientDetailLayout,
  inspectFixedControlsAgainstClientCards,
  inspectMobileDashboardSafeArea,
  filterKnownConsoleNoise,
} from './client-card-responsive-layout';
import {
  inspectClientTrainingShellLayout,
  inspectClientWorkoutPlanLayout,
} from './client-workout-plan-responsive-layout';
import {
  adminUser,
  mockSharedApi,
  responsiveViewports,
  seedAuth,
  trainerUser,
} from './client-card-responsive-smoke.fixtures';
import {
  inspectClientDetailIdentitySubtext,
  inspectClientDetailTabLabelFit,
  inspectClientWorkspaceTopBar,
  inspectFramedClientCardTop,
  inspectNestedClientCardLayout,
  inspectSelectedClientActionStripFootprint,
  inspectTrainerClientContactEmailFit,
} from './client-card-responsive-overlap';

const frameCardForScreenshot = async (page: Page, selector: string) => {
  await page.keyboard.press('Escape');
  await page.locator('[role="listbox"][aria-label="Client list"]').waitFor({ state: 'hidden', timeout: 1000 }).catch(() => undefined);
  const card = page.locator(selector).first();
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
    const guard = document.querySelector<HTMLElement>('[data-swan-mobile-dashboard-safe-area]');
    const guardBottom = guard ? guard.getBoundingClientRect().bottom : 0;
    const safeTop = window.innerWidth <= 1024
      ? Math.max(144, guardBottom + 20, fixedBottom + 28)
      : 24;
    const waitForFrame = () => new Promise(requestAnimationFrame);
    const alignCard = async () => {
      const rect = element.getBoundingClientRect();
      const documentScroller = scrollParent === document.body || scrollParent === document.documentElement;
      const parentTop = scrollParent instanceof HTMLElement
        ? scrollParent.getBoundingClientRect().top
        : safeTop;
      const targetTop = documentScroller ? safeTop : Math.max(safeTop, parentTop + 8);
      element.dataset.swanFrameTargetTop = String(Math.round(targetTop));
      element.dataset.swanFrameParentTop = String(Math.round(parentTop));
      element.dataset.swanFrameSafeTop = String(Math.round(safeTop));
      element.dataset.swanFrameScroller = documentScroller ? 'document' : scrollParent.tagName.toLowerCase();
      const attemptScroll = async (delta: number) => {
        if (Math.abs(delta) < 1) return;
        if (!documentScroller) scrollParent.scrollTop += delta;
        await waitForFrame();
        const remaining = element.getBoundingClientRect().top - targetTop;
        if (Math.abs(remaining) >= Math.abs(delta) - 1) {
          window.scrollBy(0, remaining);
          await waitForFrame();
        }
      };
      await attemptScroll(rect.top - targetTop);
      element.dataset.swanFrameFinalTop = String(Math.round(element.getBoundingClientRect().top));
    };
    await alignCard();
    await alignCard();
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
    expect((await inspectClientSelectorDropdownSurface(page)).issues).toEqual([]);
    await page.keyboard.press('Escape');
    await page.locator('[role="listbox"][aria-label="Client list"]').waitFor({ state: 'hidden', timeout: 1000 }).catch(() => undefined);
    expect((await inspectClientWorkspaceTopBar(page)).issues).toEqual([]);
    expect((await inspectActivationQueueMobileFootprint(page)).issues).toEqual([]);

    const layout = await inspectCardLayout(page);
    const nestedLayout = await inspectNestedClientCardLayout(page);
    expect(layout.overflowX, `horizontal overflow at ${viewport.name}`).toBeLessThanOrEqual(12);
    expect(layout.issues).toEqual([]);
    expect(nestedLayout.issues).toEqual([]);
    expect(filterKnownConsoleNoise(consoleErrors)).toEqual([]);

    await frameCardForScreenshot(page, '[data-swan-client-card="admin"]');
    expect((await inspectFramedClientCardTop(page, '[data-swan-client-card="admin"]')).issues).toEqual([]);
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
    expect((await inspectClientDetailIdentitySubtext(page)).issues).toEqual([]);
    expect((await inspectClientDetailTabLabelFit(page)).issues).toEqual([]);
    expect((await inspectClientWorkspaceTopBar(page)).issues).toEqual([]);
    expect((await inspectSelectedClientActionStripFootprint(page)).issues).toEqual([]);
    expect(filterKnownConsoleNoise(consoleErrors)).toEqual([]);

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
    expect((await inspectTrainerClientContactEmailFit(page)).issues).toEqual([]);
    expect(filterKnownConsoleNoise(consoleErrors)).toEqual([]);

    await frameCardForScreenshot(page, '[data-swan-client-card="trainer"]');
    expect((await inspectFramedClientCardTop(page, '[data-swan-client-card="trainer"]')).issues).toEqual([]);
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
  expect((await inspectClientDetailTabLabelFit(page)).issues).toEqual([]);
  expect(filterKnownConsoleNoise(consoleErrors)).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('admin-client-measurements-expanded-phone.png'), fullPage: false });
});

for (const viewport of responsiveViewports) {
  test(`admin selected client training plans have no program-card overlap at ${viewport.name}`, async ({ page }, testInfo) => {
    const consoleErrors = collectUnexpectedConsoleErrors(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await seedAuth(page, adminUser);
    await mockSharedApi(page, adminUser);

    await page.goto('/dashboard/admin/client-management?clientId=501&tab=training&trainingSection=plans', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);

    await expect(page.getByRole('tab', { name: 'Training', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: /training plans/i })).toBeVisible();
    await expect(page.getByLabel(/active training arc/i)).toBeVisible();
    await expect(page.getByText(/Plan Arc Vault/i)).toBeVisible();
    await expect(page.getByLabel('6 Month plan arc').getByText(/Six-Month Performance Rebuild/i)).toBeVisible();
    await expect(page.getByLabel('6 Month plan arc').getByRole('button', { name: /open 6 month pdf plan/i })).toBeVisible();

    const detailLayout = await inspectClientDetailLayout(page);
    const trainingShellLayout = await inspectClientTrainingShellLayout(page);
    const planLayout = await inspectClientWorkoutPlanLayout(page);
    expect(detailLayout.overflowX, `detail horizontal overflow at ${viewport.name}`).toBeLessThanOrEqual(12);
    expect(detailLayout.issues).toEqual([]);
    expect(trainingShellLayout.overflowX, `training shell horizontal overflow at ${viewport.name}`).toBeLessThanOrEqual(12);
    expect(trainingShellLayout.issues).toEqual([]);
    expect(planLayout.overflowX, `plan horizontal overflow at ${viewport.name}`).toBeLessThanOrEqual(12);
    expect(planLayout.issues).toEqual([]);
    expect((await inspectClientDetailTabLabelFit(page)).issues).toEqual([]);
    expect((await inspectSelectedClientActionStripFootprint(page)).issues).toEqual([]);
    expect(filterKnownConsoleNoise(consoleErrors)).toEqual([]);

    await page.screenshot({ path: testInfo.outputPath(`admin-client-training-plans-${viewport.name}.png`), fullPage: false });
  });
}
