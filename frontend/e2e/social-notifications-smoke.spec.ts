import { expect, test, type Page, type Route } from '@playwright/test';

const clientUser = {
  id: '101',
  email: 'qa.client@swanstudios.local',
  username: 'qa_client',
  firstName: 'QA',
  lastName: 'Client',
  role: 'client',
  isActive: true,
};

interface ApiState {
  markAllReadHits: number;
  allRead: boolean;
}

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

function notificationsPayload(allRead: boolean) {
  const notifications = [
    {
      id: 9001,
      title: 'Session confirmed',
      message: 'Your Tuesday strength session is on the calendar.',
      type: 'session',
      read: allRead,
      link: '/dashboard/client/overview',
      createdAt: '2026-05-22T18:30:00.000Z',
      sender: { firstName: 'Swan', lastName: 'Studios' },
    },
    {
      id: 9002,
      title: 'Plan update ready',
      message: 'Your coach added a new progression note.',
      type: 'workout',
      read: true,
      createdAt: '2026-05-21T18:30:00.000Z',
    },
  ];

  return {
    success: true,
    data: {
      notifications,
      unreadCount: allRead ? 0 : 1,
    },
  };
}

async function mockSocialApi(page: Page, state: ApiState) {
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;
    const method = request.method();

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: clientUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: clientUser });
    if (endpoint === '/api/notifications' && method === 'GET') {
      return fulfillJson(route, notificationsPayload(state.allRead));
    }
    if (endpoint === '/api/notifications/read-all' && method === 'PATCH') {
      state.markAllReadHits += 1;
      state.allRead = true;
      return fulfillJson(route, { success: true, data: { success: true } });
    }
    if (endpoint === '/api/v1/gamification/profile') {
      return fulfillJson(route, {
        profile: {
          userId: clientUser.id,
          points: 1240,
          level: 2,
          tier: 'bronze_forge',
          leaderboardPosition: 12,
          nextLevelProgress: 42,
          recentAchievements: [],
          recentTransactions: [],
        },
      });
    }
    if (endpoint.startsWith('/api/v1/gamification/')) {
      return fulfillJson(route, { success: true, achievements: [], rewards: [], leaderboard: [], challenges: [] });
    }

    return fulfillJson(route, { success: true, data: [], posts: [], notifications: [] });
  });
}

async function inspectLayout(page: Page) {
  return page.evaluate(() => ({
    bodyText: document.body.innerText,
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
}

test('social notifications route renders live unread data and mark-read action', async ({ page }, testInfo) => {
  const apiState: ApiState = { markAllReadHits: 0, allRead: false };
  const consoleErrors: string[] = [];

  await mockSocialApi(page, apiState);
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: clientUser },
  );

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/social/notifications', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByRole('heading', { name: /^Notifications$/i })).toBeVisible();
  await expect(page.getByText(/session confirmed/i)).toBeVisible();
  await expect(page.getByText(/plan update ready/i)).toBeVisible();
  await expect(page.getByText(/1 unread/i)).toBeVisible();

  await page.getByRole('button', { name: /mark read/i }).click();
  await expect.poll(() => apiState.markAllReadHits).toBe(1);
  await expect(page.getByText(/0 unread/i)).toBeVisible();

  const layout = await inspectLayout(page);
  expect(new URL(page.url()).pathname).toBe('/social/notifications');
  expect(layout.bodyText).not.toMatch(/TODO|sample notification/i);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(consoleErrors.filter((item) => !/preloaded using link preload/i.test(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('social-notifications-smoke.png'), fullPage: false });
});
