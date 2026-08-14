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

interface AllocationApiState {
  availableByClient: Record<string, number>;
  addHits: number;
}

type FailedResource = {
  method: string;
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

async function mockAllocationApi(page: Page, state: AllocationApiState) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;

    if (endpoint === '/api/cart') return fulfillJson(route, { id: 1, status: 'active', items: [], total: 0, totalSessions: 0 });

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/sessions/allocation-health') {
      return fulfillJson(route, { success: true, data: { status: 'healthy' } });
    }
    if (endpoint === '/api/sessions/users/clients') {
      return fulfillJson(route, [
        {
          id: '501',
          firstName: 'QA',
          lastName: 'Live Client',
          email: 'qa.live.client@swanstudios.local',
          phone: '',
          photo: '',
          availableSessions: state.availableByClient['501'],
          role: 'client',
          createdAt: '2026-05-01T12:00:00.000Z',
          updatedAt: '2026-05-22T12:00:00.000Z',
        },
        {
          id: '502',
          firstName: 'Hidden',
          lastName: 'Control',
          email: 'hidden.control@swanstudios.local',
          phone: '',
          photo: '',
          availableSessions: state.availableByClient['502'],
          role: 'client',
          createdAt: '2026-05-02T12:00:00.000Z',
          updatedAt: '2026-05-22T12:00:00.000Z',
        },
      ]);
    }
    if (endpoint.startsWith('/api/sessions/user-summary/')) {
      const clientId = endpoint.split('/').pop() || '501';
      const available = state.availableByClient[clientId] ?? 0;
      return fulfillJson(route, {
        success: true,
        data: {
          userId: Number(clientId),
          available,
          scheduled: clientId === '501' ? 2 : 0,
          completed: clientId === '501' ? 6 : 1,
          cancelled: 1,
          total: clientId === '501' ? available + 9 : available + 2,
        },
      });
    }
    if (endpoint === '/api/sessions/add-to-user' && request.method() === 'POST') {
      const body = request.postDataJSON() as { sessionCount?: number };
      state.addHits += 1;
      state.availableByClient['501'] += Number(body.sessionCount || 0);
      return fulfillJson(route, {
        success: true,
        message: 'Successfully added sessions',
        data: { userId: 501, added: body.sessionCount || 0, availableSessions: state.availableByClient['501'] },
      });
    }

    return fulfillJson(route, { success: true, data: [], sessions: [], notifications: [], stats: {} });
  });
}

async function inspectLayout(page: Page) {
  return page.evaluate(() => ({
    bodyText: document.body.innerText,
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
}

function isSocketPolling400(resource: FailedResource) {
  if (resource.status !== 400) return false;
  try {
    const url = new URL(resource.url);
    return url.pathname === '/socket.io/' && url.searchParams.get('transport') === 'polling';
  } catch {
    return false;
  }
}

function isKnownRealtimeTransportNoise(message: string, failedResources: FailedResource[]) {
  if (!/^Failed to load resource: the server responded with a status of 400 \(\)$/.test(message)) {
    return false;
  }

  const failed400s = failedResources.filter((resource) => resource.status === 400);
  return failed400s.length > 0 && failed400s.every(isSocketPolling400);
}

test('admin session allocation renders live balances and posts quick add', async ({ page }, testInfo) => {
  const apiState: AllocationApiState = { availableByClient: { '501': 4, '502': 0 }, addHits: 0 };
  const consoleErrors: string[] = [];
  const failedResources: FailedResource[] = [];

  await mockAllocationApi(page, apiState);
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: adminUser },
  );

  page.on('response', (response) => {
    if (response.status() >= 400) {
      const request = response.request();
      failedResources.push({
        method: request.method(),
        status: response.status(),
        url: response.url(),
      });
    }
  });

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/dashboard/admin/session-allocation', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /session allocation manager/i })).toBeVisible();
  await expect(page.getByText(/QA Live Client/i)).toBeVisible();
  await expect(page.getByText(/Hidden Control/i)).toBeVisible();
  await expect(page.getByText(/^4$/).first()).toBeVisible();
  await expect(page.getByText(/^13$/).first()).toBeVisible();
  await expect(page.getByText(/^6$/).first()).toBeVisible();
  await expect(page.getByText(/Good/i)).toBeVisible();

  await page.getByPlaceholder(/search clients/i).fill('live');
  await expect(page.getByText(/Hidden Control/i)).toHaveCount(0);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export filtered session allocations/i }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let csv = '';
  for await (const chunk of stream!) csv += chunk.toString();
  expect(csv).toContain('QA Live Client');
  expect(csv).not.toContain('Hidden Control');
  await page.getByRole('button', { name: /clear allocation filter/i }).click();
  await expect(page.getByText(/Hidden Control/i)).toBeVisible();

  await page.getByRole('button', { name: /add sessions to QA Live Client/i }).click();
  await expect(page.getByRole('heading', { name: /add sessions to QA Live Client/i })).toBeVisible();
  await page.getByLabel(/number of sessions/i).fill('1');
  await page.getByRole('button', { name: /add 1 session/i }).click();
  await expect.poll(() => apiState.addHits).toBe(1);
  await expect(page.getByText(/^5$/).first()).toBeVisible();
  await expect(page.getByText(/^14$/).first()).toBeVisible();

  const layout = await inspectLayout(page);
  expect(layout.bodyText).not.toMatch(/Premium Training Package|Elite Performance Package|Starter Fitness Package|Sarah|Michael|Emma/i);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !isSuppressedProductNoise(item)
    && !isKnownRealtimeTransportNoise(item, failedResources)
  ));
  expect(unexpectedConsoleErrors).toEqual([]);

  await page.getByRole('button', { name: /view details for QA Live Client/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/admin\/client-management\?clientId=501/);

  await page.screenshot({ path: testInfo.outputPath('session-allocation-live-smoke.png'), fullPage: false });
});
