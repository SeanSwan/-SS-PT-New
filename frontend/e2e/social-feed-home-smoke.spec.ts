import { expect, test, type Page, type Route } from '@playwright/test';
import { watchSocialSmokeConsole } from './social-dashboard-smoke-utils';

const clientUser = {
  id: '101',
  email: 'qa.client@swanstudios.local',
  username: 'qa_client',
  firstName: 'QA',
  lastName: 'Client',
  role: 'client',
  hasLinkedWaiver: true,
  waiverStatus: 'linked',
  isActive: true,
};

const viewportMatrix = [
  { name: 'phone', width: 414, height: 896 },
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

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function seedAuth(page: Page) {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: clientUser },
  );
}

async function mockHomeFeedApi(page: Page) {
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;

    if (endpoint === '/api/auth/me') return fulfillJson(route, { user: clientUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: clientUser });
    if (endpoint === '/api/profile/stats') {
      return fulfillJson(route, {
        success: true,
        stats: { posts: 1, followers: 0, following: 0, points: 1240, level: 2, streak: 4 },
      });
    }
    if (endpoint === '/api/v1/gamification/profile') {
      return fulfillJson(route, {
        profile: {
          userId: clientUser.id,
          points: 1240,
          level: 2,
          tier: 'bronze_forge',
          streakDays: 4,
          userAchievements: [],
          recentTransactions: [],
        },
      });
    }
    if (endpoint === '/api/social/posts/feed') {
      return fulfillJson(route, {
        success: true,
        posts: [{
          id: 'post-feed-smoke',
          content: 'QA social redirect feed post',
          type: 'workout',
          createdAt: '2026-06-13T12:00:00.000Z',
          user: clientUser,
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
        }],
        pagination: { total: 1, limit: 10, offset: 0 },
      });
    }

    return fulfillJson(route, {
      success: true,
      data: [],
      achievements: [],
      rewards: [],
      leaderboard: [],
      challenges: [],
      posts: [],
      notifications: [],
    });
  });
}

async function inspectLayout(page: Page) {
  return page.evaluate(() => ({
    bodyText: document.body.innerText,
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
}

test.beforeEach(async ({ page }) => {
  await seedAuth(page);
  await mockHomeFeedApi(page);
});

test('social feed alias renders the Home community feed across the dashboard viewport matrix', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Desktop Chrome', 'Viewport matrix is covered once with explicit dimensions.');

  const consoleWatcher = watchSocialSmokeConsole(page);

  for (const viewport of viewportMatrix) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/social/feed', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);

    await expect.poll(() => new URL(page.url()).pathname, {
      message: `redirect path at ${viewport.name}`,
    }).toBe('/user-dashboard');
    await expect(page.getByText('Live community signal')).toBeVisible();
    await expect(page.getByText('QA social redirect feed post')).toBeVisible();
    await expect(page.getByText('1 live post')).toBeVisible();

    const layout = await inspectLayout(page);
    expect(layout.bodyText, `body text at ${viewport.name}`).not.toMatch(/TODO|sample post/i);
    expect(layout.overflowX, `overflow at ${viewport.name}`).toBeLessThanOrEqual(12);
  }

  expect(consoleWatcher.actionableErrors()).toEqual([]);
});
