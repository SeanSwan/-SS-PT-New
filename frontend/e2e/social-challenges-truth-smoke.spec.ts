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

async function mockSocialApi(page: Page) {
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: clientUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: clientUser });
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
    if (endpoint === '/api/v1/gamification/achievements') return fulfillJson(route, { achievements: [] });
    if (endpoint === '/api/v1/gamification/rewards') return fulfillJson(route, { rewards: [] });
    if (endpoint === '/api/v1/gamification/leaderboard') return fulfillJson(route, { leaderboard: [] });
    if (endpoint === '/api/v1/gamification/challenges') {
      return fulfillJson(route, { success: false, message: 'challenge API unavailable' });
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

test.beforeEach(async ({ page }) => {
  await mockSocialApi(page);
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: clientUser },
  );
});

test('social challenges show an honest empty state when challenge API fails', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/social/challenges', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByRole('tab', { name: /active/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /no active challenges/i })).toBeVisible();
  await expect(page.getByText(/30-day push-up challenge/i)).toHaveCount(0);
  await expect(page.getByText(/showing sample challenges/i)).toHaveCount(0);

  const layout = await inspectLayout(page);
  expect(new URL(page.url()).pathname).toBe('/social/challenges');
  expect(layout.bodyText).not.toMatch(/Cardio Crusher|Original Song Challenge|Game Night Stream/i);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(consoleErrors.filter((item) => !/preloaded using link preload/i.test(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('social-challenges-truth-smoke.png'), fullPage: false });
});
