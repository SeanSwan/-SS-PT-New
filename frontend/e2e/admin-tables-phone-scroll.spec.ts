/**
 * Admin tables phone-width scroll probe (launch audit lane 2, hostile loop 2).
 *
 * Live-DOM proof for the P1 fix `faf56539d`: at 320/375/414px the
 * admin-specials and admin-waivers tables must scroll INSIDE their labeled
 * region (scrollWidth > clientWidth), the page itself must not overflow
 * horizontally, and the scroller must be keyboard-focusable.
 * Harness pattern: coach-command-center-mobile-smoke.spec.ts (mocked admin
 * session + page.route API mocks against a plain vite dev server).
 */
import { expect, test, type Page, type Route } from '@playwright/test';

const adminUser = {
  id: 1,
  email: 'qa.admin@swanstudios.local',
  username: 'qa_admin',
  firstName: 'QA',
  lastName: 'Admin',
  role: 'admin',
  isActive: true,
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
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

const waiverRecords = [
  {
    id: 'w1', fullName: 'QA Client One', email: 'qa.client1@swanstudios.local', phone: null,
    status: 'pending_match', source: 'public_form', signedAt: '2026-08-01T00:00:00.000Z',
    pendingMatches: [{ id: 'm1' }], user: null,
  },
  {
    id: 'w2', fullName: 'QA Client Two', email: null, phone: '5550000000',
    status: 'linked', source: 'admin_upload', signedAt: '2026-08-02T00:00:00.000Z',
    pendingMatches: [], user: { firstName: 'QA', lastName: 'Linked' },
  },
];

const specials = [
  {
    id: 1, name: 'QA Launch Bonus', bonusSessions: 2, applicablePackageIds: [],
    startDate: '2026-08-01T00:00:00.000Z', endDate: '2026-08-31T00:00:00.000Z', isActive: true,
  },
  {
    id: 2, name: 'QA Winter Deal', bonusSessions: 1, applicablePackageIds: [],
    startDate: '2026-12-01T00:00:00.000Z', endDate: '2026-12-31T00:00:00.000Z', isActive: false,
  },
];

async function mockAdminApi(page: Page) {
  await page.route('**/health**', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/auth/me' || endpoint === '/api/profile') {
      return fulfillJson(route, { success: true, user: adminUser });
    }
    if (endpoint === '/api/admin/waivers') {
      return fulfillJson(route, {
        success: true,
        data: { records: waiverRecords, pagination: { pages: 1, total: waiverRecords.length } },
      });
    }
    if (endpoint === '/api/admin/specials') {
      return fulfillJson(route, { success: true, data: specials });
    }
    if (endpoint === '/api/storefront') {
      return fulfillJson(route, { success: true, data: [] });
    }
    return fulfillJson(route, { success: true, data: [], items: [], records: [], notifications: [], conversations: [] });
  });
}

async function installAdminSession(page: Page) {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: adminUser },
  );
}

test.beforeEach(async ({ page }) => {
  await mockAdminApi(page);
  await installAdminSession(page);
});

for (const viewport of [320, 375, 414] as const) {
  test(`Waiver records table scrolls inside its region at ${viewport}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport, height: 800 });
    await page.goto('/dashboard/admin/waivers', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('QA Client One')).toBeVisible({ timeout: 45_000 });
    const scroller = page.getByRole('region', { name: 'Waiver records table' });
    await expect(scroller).toBeVisible();

    const probe = await scroller.evaluate((el) => ({
      scrollable: el.scrollWidth > el.clientWidth,
      tabIndex: (el as HTMLElement).tabIndex,
      pageOverflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    }));

    expect(probe.scrollable, 'table must scroll inside the region, not clip').toBe(true);
    expect(probe.tabIndex, 'scroller must be keyboard-focusable').toBe(0);
    expect(probe.pageOverflowX, 'page itself must not overflow horizontally').toBeLessThanOrEqual(1);
  });

  // The MOUNTED /admin-specials surface is AdminCreateSpecialManager (per-client
  // deals form) — no table, no scroller by design (hostile loop 2 R14 finding:
  // AdminSpecialsTable is dormant). Live assertion here is layout integrity only.
  test(`mounted Create Special surface has no horizontal overflow at ${viewport}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport, height: 800 });
    await page.goto('/dashboard/admin/admin-specials', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Create Special').first()).toBeVisible({ timeout: 45_000 });
    const overflowX = await page.evaluate(
      () => Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    );
    expect(overflowX, 'page must not overflow horizontally').toBeLessThanOrEqual(1);
  });
}
