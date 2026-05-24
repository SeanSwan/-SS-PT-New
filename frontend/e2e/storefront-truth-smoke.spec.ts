import { expect, test, type Page, type Route } from '@playwright/test';

const livePackage = {
  id: 7701,
  name: 'QA Live Performance Pack',
  description: 'A live storefront package from the mocked API.',
  packageType: 'fixed',
  sessions: 8,
  totalSessions: 8,
  pricePerSession: 175,
  totalCost: 1400,
  price: 1400,
  displayPrice: 1400,
  imageUrl: '/assets/images/silver-package.jpg',
  isActive: true,
  displayOrder: 1,
};

const fallbackCatalogNames = /Single Session|10-Session Pack|24-Session Pack|3-Month Program|Silver Swan Wing|Golden Swan Flight|Sapphire Swan Soar|Platinum Swan Grace/i;

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockStorefrontApi(page: Page, body: unknown, status = 200) {
  await page.route('**/api/**', (route) => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/storefront') return fulfillJson(route, body, status);
    if (endpoint === '/api/subscriptions/tiers') return fulfillJson(route, { success: true, tiers: [] });
    if (endpoint === '/api/subscriptions/status') {
      return fulfillJson(route, {
        success: true,
        subscription: null,
        usage: { aiMessagesUsed: 0, aiMessagesLimit: 0, aiGenerationsUsed: 0, aiGenerationsLimit: 0, resetDate: null },
      });
    }
    return fulfillJson(route, { success: true, data: [], items: [] });
  });
}

async function unexpectedConsoleErrors(page: Page) {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  return consoleErrors;
}

test('public store renders live storefront packages and no fallback catalog', async ({ page }, testInfo) => {
  const consoleErrors = await unexpectedConsoleErrors(page);
  await mockStorefrontApi(page, {
    success: true,
    items: [livePackage],
    data: { packages: [livePackage], activeSpecials: [] },
  });

  await page.goto('/store', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByText(/QA Live Performance Pack/i)).toBeVisible();
  await expect(page.getByText(fallbackCatalogNames)).toHaveCount(0);

  const overflowX = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  expect(overflowX).toBeLessThanOrEqual(12);
  expect(consoleErrors.filter((item) => !/preloaded using link preload/i.test(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('storefront-live-truth-smoke.png'), fullPage: false });
});

test('public store empty package response shows retry state instead of fallback catalog', async ({ page }, testInfo) => {
  const consoleErrors = await unexpectedConsoleErrors(page);
  await mockStorefrontApi(page, { success: true, items: [], data: { packages: [], activeSpecials: [] } });

  await page.goto('/store', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByText(/^Failed to Load Packages$/i)).toBeVisible();
  await expect(page.getByText(/we couldn't load the training packages/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /retry loading/i })).toBeVisible();
  await expect(page.getByText(fallbackCatalogNames)).toHaveCount(0);

  const overflowX = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  expect(overflowX).toBeLessThanOrEqual(12);
  expect(consoleErrors.filter((item) => !/preloaded using link preload/i.test(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('storefront-error-truth-smoke.png'), fullPage: false });
});
