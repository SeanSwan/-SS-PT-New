import { expect, test, type Page, type Route } from '@playwright/test';

const adminUser = {
  id: '9001',
  email: 'qa.admin@swanstudios.local',
  username: 'qa_admin',
  firstName: 'QA',
  lastName: 'Admin',
  phone: '555-0100',
  role: 'admin',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const buyerUser = {
  id: '501',
  email: 'qa.buyer@swanstudios.local',
  username: 'qa_buyer',
  firstName: 'QA',
  lastName: 'Buyer',
  phone: '555-0101',
  role: 'user',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const viewports = [
  { name: 'phone', width: 414, height: 896 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'qhd', width: 2560, height: 1440 },
  { name: '4k', width: 3840, height: 2160 },
] as const;

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

async function seedAuth(page: Page, user: typeof adminUser | typeof buyerUser) {
  await page.addInitScript(
    ({ token, currentUser }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(currentUser));
    },
    { token: jwt(), currentUser: user },
  );
}

async function inspectResponsiveSurface(page: Page, labelHints: string[]) {
  return page.evaluate((hints) => {
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };

    const interactive = Array.from(document.querySelectorAll<HTMLElement>('button,a,input,select,textarea,[role="button"]'))
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const label = [
          element.getAttribute('aria-label'),
          element.textContent,
          element.getAttribute('placeholder'),
          element.getAttribute('title'),
        ].filter(Boolean).join(' ').trim();
        return { label, width: rect.width, height: rect.height };
      })
      .filter((item) => hints.some((hint) => item.label.toLowerCase().includes(hint)));

    return {
      overflowX: Math.max(
        0,
        document.documentElement.scrollWidth - window.innerWidth,
        document.body.scrollWidth - window.innerWidth,
      ),
      smallTargets: interactive.filter((item) => item.width < 44 || item.height < 44),
    };
  }, labelHints.map((hint) => hint.toLowerCase()));
}

async function mockAdminFulfillmentApi(page: Page) {
  let fulfilled = false;

  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/admin/orders/pending' || endpoint === '/api/admin/orders/completed') {
      return fulfillJson(route, { success: true, orders: [] });
    }
    if (endpoint === '/api/admin/orders/fulfillment') {
      return fulfillJson(route, {
        success: true,
        items: [
          {
            orderId: 8101,
            orderNumber: 'SS-8101',
            orderItemId: 9901,
            orderDate: '2026-06-13T12:00:00.000Z',
            customer: { id: 501, name: 'QA Buyer', email: 'qa.buyer@swanstudios.local' },
            product: { id: 42, name: 'Buddy Fat Skin Recovery Drink', itemType: 'physical_product' },
            variant: { id: 8, label: 'Organic 1.5L Day Bottle', sku: 'BUDDY-1-5L', stockQuantity: 12 },
            quantity: 2,
            price: 24,
            subtotal: 48,
            fulfillmentStatus: fulfilled ? 'fulfilled' : 'pending_fulfillment',
            fulfillment: {
              mode: 'local_delivery',
              type: 'local_delivery',
              details: {
                recipientName: 'QA Buyer',
                phone: '555-0101',
                streetAddress: '123 Recovery Lane',
                city: 'Los Angeles',
                state: 'CA',
                postalCode: '90001',
                notes: 'Leave with front desk.',
              },
            },
          },
        ],
        stats: { pending: fulfilled ? 0 : 1, fulfilled: fulfilled ? 1 : 0, total: 1 },
      });
    }
    if (endpoint === '/api/admin/orders/fulfillment-items/9901/complete' && request.method() === 'PATCH') {
      fulfilled = true;
      return fulfillJson(route, { success: true, item: { id: 9901, fulfillmentStatus: 'fulfilled' } });
    }

    return fulfillJson(route, { success: true, data: [], items: [], posts: [] });
  });
}

function physicalProductCart() {
  return {
    id: 9901,
    status: 'open',
    items: [
      {
        id: 8801,
        quantity: 1,
        price: 24,
        storefrontItemId: 42,
        productVariantId: 8,
        productVariant: {
          id: 8,
          label: 'Organic 1.5L Day Bottle',
          sku: 'BUDDY-1-5L',
          price: 24,
          stockQuantity: 12,
        },
        storefrontItem: {
          name: 'Buddy Fat Skin Recovery Drink',
          description: 'Fresh ginger, lemon, honey, tea, and spices prepared for local recovery support.',
          type: 'product',
          itemKind: 'physical_product',
          fulfillmentType: 'local_delivery',
          isTaxable: true,
          sessions: 0,
          totalSessions: 0,
        },
      },
    ],
    total: 24,
    totalSessions: 0,
    itemCount: 1,
  };
}

async function mockCheckoutApi(page: Page, checkoutPayloads: unknown[]) {
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: buyerUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: buyerUser });
    if (endpoint === '/api/cart') return fulfillJson(route, physicalProductCart());
    if (endpoint === '/api/v2/payments/health') {
      return fulfillJson(route, { success: true, data: { status: 'healthy' } });
    }
    if (endpoint === '/api/v2/payments/create-checkout-session') {
      checkoutPayloads.push(request.postDataJSON());
      return fulfillJson(route, {
        success: true,
        data: {
          sessionId: 'cs_test_fulfillment_ready',
          checkoutUrl: '/checkout/success?session_id=cs_test_fulfillment_ready',
        },
      });
    }
    if (endpoint === '/api/financial/track-checkout-start') return fulfillJson(route, { success: true });

    return fulfillJson(route, { success: true, data: [], items: [], posts: [] });
  });
}

test.describe('storefront fulfillment responsive product loop', () => {
  for (const viewport of viewports) {
    test(`admin can review and complete product fulfillment at ${viewport.name}`, async ({ page }, testInfo) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await seedAuth(page, adminUser);
      await mockAdminFulfillmentApi(page);

      await page.goto('/dashboard/admin/pending-orders', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Physical Product Fulfillment')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Buddy Fat Skin Recovery Drink')).toBeVisible();
      await expect(page.getByText(/organic 1\.5l day bottle/i)).toBeVisible();
      await expect(page.getByText(/stock: 12/i)).toBeVisible();
      await expect(page.getByText(/123 recovery lane/i)).toBeVisible();

      const layout = await inspectResponsiveSurface(page, [
        'search fulfillment queue',
        'filter fulfillment status',
        'mark fulfilled',
        'refresh',
      ]);
      expect(layout.overflowX).toBeLessThanOrEqual(12);
      expect(layout.smallTargets).toEqual([]);

      await page.getByRole('button', { name: /mark fulfilled/i }).click();
      await expect(page.getByRole('button', { name: /^fulfilled$/i })).toBeDisabled();
      expect(pageErrors).toEqual([]);

      await page.screenshot({ path: testInfo.outputPath(`admin-fulfillment-${viewport.name}.png`), fullPage: false });
    });
  }

  for (const viewport of viewports) {
    test(`checkout collects product delivery details before Stripe at ${viewport.name}`, async ({ page }, testInfo) => {
      const pageErrors: string[] = [];
      const checkoutPayloads: unknown[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await seedAuth(page, buyerUser);
      await mockCheckoutApi(page, checkoutPayloads);

      await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: /^secure checkout$/i })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Product Fulfillment')).toBeVisible();
      await expect(page.getByLabel('Delivery Address')).toBeVisible();
      await expect(page.getByRole('button', { name: /proceed to secure payment/i })).toBeDisabled();

      await page.getByLabel('Delivery Address').fill('123 Recovery Lane');
      await page.getByLabel('City').fill('Los Angeles');
      await page.getByLabel('State').fill('CA');
      await page.getByLabel('ZIP').fill('90001');
      await page.getByLabel('Notes').fill('Leave with front desk.');

      const layout = await inspectResponsiveSurface(page, [
        'local delivery',
        'pickup',
        'delivery address',
        'city',
        'state',
        'zip',
        'proceed to secure payment',
      ]);
      expect(layout.overflowX).toBeLessThanOrEqual(12);
      expect(layout.smallTargets).toEqual([]);

      await expect(page.getByRole('button', { name: /proceed to secure payment/i })).toBeEnabled();
      await page.getByRole('button', { name: /proceed to secure payment/i }).click();
      await expect.poll(() => checkoutPayloads.length).toBe(1);

      const checkoutPayload = checkoutPayloads[0] as any;
      expect(checkoutPayload.fulfillmentIntent.required).toBe(true);
      expect(checkoutPayload.fulfillmentIntent.mode).toBe('local_delivery');
      expect(checkoutPayload.fulfillmentIntent.details.streetAddress).toBe('123 Recovery Lane');
      expect(checkoutPayload.fulfillmentIntent.details.city).toBe('Los Angeles');
      expect(checkoutPayload.fulfillmentIntent.details.postalCode).toBe('90001');
      expect(pageErrors).toEqual([]);

      await page.screenshot({ path: testInfo.outputPath(`checkout-fulfillment-${viewport.name}.png`), fullPage: false });
    });
  }
});
