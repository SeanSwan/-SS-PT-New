import { expect, test, type Page, type Route } from '@playwright/test';
import { isSuppressedProductNoise } from './mission/productNoise';

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

const demoBuyer = {
  id: '501',
  email: 'qa.buyer@swanstudios.local',
  username: 'qa_buyer',
  firstName: 'QA',
  lastName: 'Buyer',
  phone: '555-0101',
  role: 'user',
  isActive: true,
};

const liveCart = {
  id: 9901,
  status: 'active',
  items: [{
    id: 8801,
    quantity: 1,
    price: 1400,
    storefrontItemId: livePackage.id,
    storefrontItem: {
      name: livePackage.name,
      description: livePackage.description,
      sessions: livePackage.sessions,
      totalSessions: livePackage.totalSessions,
      packageType: livePackage.packageType,
      type: 'training',
    },
  }],
  total: 1400,
  totalSessions: 8,
  itemCount: 1,
};

const fallbackCatalogNames = /Single Session|10-Session Pack|24-Session Pack|3-Month Program|Silver Swan Wing|Golden Swan Flight|Sapphire Swan Soar|Platinum Swan Grace/i;

type FailedResource = {
  status: number;
  url: string;
};

function jwt() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }),
    'qa-signature',
  ].join('.');
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installBuyerSession(page: Page) {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: demoBuyer },
  );
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

async function mockAuthenticatedPurchaseApi(page: Page) {
  let hasCartItem = false;
  let checkoutCreates = 0;

  await page.route('**/api/**', (route) => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/auth/me') return fulfillJson(route, { user: demoBuyer });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: demoBuyer });
    if (endpoint === '/api/storefront') {
      return fulfillJson(route, {
        success: true,
        pricesVisible: true,
        items: [livePackage],
        data: { packages: [livePackage], activeSpecials: [] },
      });
    }
    if (endpoint === '/api/cart') {
      return fulfillJson(route, hasCartItem ? liveCart : { ...liveCart, items: [], total: 0, totalSessions: 0, itemCount: 0 });
    }
    if (endpoint === '/api/cart/add') {
      hasCartItem = true;
      return fulfillJson(route, { ...liveCart, userRoleUpgrade: true });
    }
    if (endpoint === '/api/v2/payments/health') {
      return fulfillJson(route, { success: true, data: { status: 'healthy' } });
    }
    if (endpoint === '/api/v2/payments/create-checkout-session') {
      checkoutCreates += 1;
      return fulfillJson(route, {
        success: true,
        data: {
          sessionId: 'cs_test_store_ready',
          checkoutUrl: '/checkout/success?session_id=cs_test_store_ready',
        },
      });
    }
    if (endpoint === '/api/financial/track-checkout-start') {
      return fulfillJson(route, { success: true });
    }
    if (endpoint === '/api/subscriptions/tiers') return fulfillJson(route, { success: true, tiers: [] });
    if (endpoint === '/api/subscriptions/status') return fulfillJson(route, { success: true, subscription: null, usage: {} });
    return fulfillJson(route, { success: true, data: [], items: [] });
  });

  return {
    checkoutCreates: () => checkoutCreates,
  };
}

function isKnownRealtimeTransportNoise(message: string, failedResources: FailedResource[]) {
  if (!/Failed to load resource: the server responded with a status of 400/i.test(message)) return false;
  return failedResources.some((resource) => {
    if (resource.status !== 400) return false;
    const url = new URL(resource.url);
    return url.pathname === '/socket.io/' && url.searchParams.get('transport') === 'polling';
  });
}

async function consoleIssueCollector(page: Page) {
  const consoleErrors: string[] = [];
  const failedResources: FailedResource[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResources.push({ status: response.status(), url: response.url() });
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  return {
    actionable: () => consoleErrors.filter((item) => {
      if (isSuppressedProductNoise(item)) return false;
      if (isKnownRealtimeTransportNoise(item, failedResources)) return false;
      return true;
    }),
  };
}

async function inspectPurchaseLayout(page: Page) {
  return page.evaluate(() => {
    const overflowX = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const targetLabels = [/add .*cart/i, /view cart/i, /secure payment/i, /return to cart/i, /back to store/i];
    const smallTargets = [...document.querySelectorAll('button,a,[role="button"]')]
      .filter(visible)
      .map((element) => {
        const label = [
          element.getAttribute('aria-label'),
          element.textContent,
          element.getAttribute('title'),
        ].filter(Boolean).join(' ');
        const rect = element.getBoundingClientRect();
        return { label: label.trim(), width: rect.width, height: rect.height };
      })
      .filter((item) => targetLabels.some((pattern) => pattern.test(item.label)))
      .filter((item) => item.width < 44 || item.height < 44);

    return { overflowX, smallTargets };
  });
}

test('public store renders live storefront packages and no fallback catalog', async ({ page }, testInfo) => {
  const consoleIssues = await consoleIssueCollector(page);
  await mockStorefrontApi(page, {
    success: true,
    items: [livePackage],
    data: { packages: [livePackage], activeSpecials: [] },
  });

  await page.goto('/store', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText(/QA Live Performance Pack/i)).toBeVisible();
  await expect(page.getByText(fallbackCatalogNames)).toHaveCount(0);

  const overflowX = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  expect(overflowX).toBeLessThanOrEqual(12);
  expect(consoleIssues.actionable()).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('storefront-live-truth-smoke.png'), fullPage: false });
});

test('public store empty package response shows retry state instead of fallback catalog', async ({ page }, testInfo) => {
  const consoleIssues = await consoleIssueCollector(page);
  await mockStorefrontApi(page, { success: true, items: [], data: { packages: [], activeSpecials: [] } });

  await page.goto('/store', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText(/^Failed to Load Packages$/i)).toBeVisible();
  await expect(page.getByText(/we couldn't load the training packages/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /retry loading/i })).toBeVisible();
  await expect(page.getByText(fallbackCatalogNames)).toHaveCount(0);

  const overflowX = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  expect(overflowX).toBeLessThanOrEqual(12);
  expect(consoleIssues.actionable()).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('storefront-error-truth-smoke.png'), fullPage: false });
});

test('authenticated mobile buyer can add a package and reach checkout handoff', async ({ page }, testInfo) => {
  const consoleIssues = await consoleIssueCollector(page);
  await installBuyerSession(page);
  const purchaseApi = await mockAuthenticatedPurchaseApi(page);

  await page.goto('/store', { waitUntil: 'domcontentloaded' });

  const packageCard = page.getByRole('group', { name: /view details for qa live performance pack/i });
  await expect(packageCard).toBeVisible();

  await packageCard.getByRole('button', { name: /add qa live performance pack to cart/i }).click();
  const cartButton = page.getByRole('button', { name: /view cart \(1 item\)/i });
  await expect(cartButton).toBeVisible();
  await cartButton.click();

  await expect(page.getByRole('heading', { name: /^secure checkout$/i })).toBeVisible();
  await expect(page.locator('h4').filter({ hasText: /qa live performance pack/i })).toBeVisible();
  const readyLayout = await inspectPurchaseLayout(page);
  expect(readyLayout.overflowX).toBeLessThanOrEqual(12);
  expect(readyLayout.smallTargets).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('storefront-mobile-purchase-handoff.png'), fullPage: false });

  await page.getByRole('button', { name: /proceed to secure payment/i }).click();
  await expect(page.getByText(/redirecting to secure payment/i)).toBeVisible();
  await expect.poll(purchaseApi.checkoutCreates).toBe(1);
  expect(consoleIssues.actionable()).toEqual([]);
});
