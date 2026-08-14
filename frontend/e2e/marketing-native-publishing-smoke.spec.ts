/**
 * SMOKE: Marketing Native Publishing
 * ==================================
 * Verifies the canonical admin Marketing tab without depending on production
 * credentials, seeded users, or third-party publishing services.
 */

import { expect, test, type Page, type Route } from '@playwright/test';
import { isSuppressedProductNoise } from './mission/productNoise';

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
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockMarketingApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;

    if (endpoint === '/api/cart') return fulfillJson(route, { id: 1, status: 'active', items: [], total: 0, totalSessions: 0 });

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/admin/marketing-readiness') {
      return fulfillJson(route, {
        success: true,
        data: {
          overall: 'degraded',
          generatedAt: '2026-07-16T00:00:00.000Z',
          subsystems: {
            socialPublishing: { status: 'ready', encryptionConfigured: true, connectedAccounts: 0, schedulerEnabled: true, providers: [] },
            automation: { status: 'degraded', armed: false, activeSequences: 0, leadNurtureActive: false, pendingScheduled: 0, emailSenderBuilt: false },
            email: { status: 'ready', sendgridConfigured: true, confirmedSubscribers: 0, pendingSubscribers: 0, unsubscribed: 0, broadcastBuilt: true },
            leadCapture: { status: 'ready', totalLeads: 0, capturePoints: {} },
            calendar: { status: 'ready', totalItems: 0, upcoming: 0 },
            campaigns: { status: 'ready', totalCampaigns: 0, activeCampaigns: 0 },
            contentTools: { status: 'demo', tools: [] },
          },
        },
      });
    }
    if (endpoint === '/api/admin/social-publishing/health') {
      return fulfillJson(route, {
        success: true,
        data: {
          configured: true,
          mode: 'native',
          encryption: true,
          providers: [
            { id: 'bluesky', implementationStatus: 'available' },
            { id: 'nextdoor', implementationStatus: 'partner_required' },
          ],
          accountCount: 0,
        },
      });
    }
    if (endpoint === '/api/admin/social-publishing/accounts') {
      return fulfillJson(route, { success: true, data: [] });
    }
    if (endpoint === '/api/admin/social-publishing/history') {
      return fulfillJson(route, { success: true, data: [] });
    }
    if (endpoint === '/api/admin/marketing-calendar') {
      return fulfillJson(route, { success: true, data: [], advisories: [] });
    }

    return fulfillJson(route, { success: true, data: [], notifications: [], stats: {}, counts: {} });
  });
}

async function inspectLayout(page: Page) {
  return page.evaluate(() => ({
    bodyLength: document.body.innerText.trim().length,
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
}

test.beforeEach(async ({ page }) => {
  await mockMarketingApi(page);
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: adminUser },
  );
});

test('admin Marketing native publishing smoke', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/dashboard/admin/marketing', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Marketing Command Center')).toBeVisible();
  await expect(page.getByRole('tab', { name: /Approval Queue/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Analytics/i })).toBeVisible();

  await page.getByRole('tab', { name: /Analytics/i }).click();
  await expect(page.getByText('Social Media Hub')).toBeVisible();
  await expect(page.getByText(/Native social publishing is active/i)).toBeVisible();
  await expect(page.getByText('Nextdoor')).toBeVisible();

  await page.getByRole('tab', { name: /Approval Queue/i }).click();
  await expect(page.getByText(/No social accounts connected yet/i)).toBeVisible();
  await expect(page.getByText(/Connect Bluesky from Analytics/i)).toBeVisible();

  const layout = await inspectLayout(page);
  await page.screenshot({ path: testInfo.outputPath('marketing-smoke.png'), fullPage: false });
  expect(layout.bodyLength).toBeGreaterThan(100);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(consoleErrors.filter(item => !isSuppressedProductNoise(item))).toEqual([]);
});
