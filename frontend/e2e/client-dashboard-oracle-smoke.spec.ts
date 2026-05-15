import { expect, test, type Page, type Route } from '@playwright/test';

const demoUser = {
  id: '101',
  email: 'qa.client@swanstudios.local',
  username: 'qa_client',
  firstName: 'QA',
  lastName: 'Client',
  role: 'client',
  isActive: true,
};

const routes = [
  { path: '/user-dashboard', expectedPath: '/dashboard/client/overview' },
  { path: '/dashboard/client/overview', expectedPath: '/dashboard/client/overview' },
  { path: '/dashboard/client/community', expectedPath: '/dashboard/client/community' },
  { path: '/dashboard/client/rewards', expectedPath: '/dashboard/client/rewards' },
  {
    path: '/dashboard/client/coach-assistant?sourcePath=%2Fdashboard%2Fclient%2Fcommunity',
    expectedPath: '/dashboard/client/coach-assistant',
  },
];

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

async function mockDashboardApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;

    if (endpoint === '/api/auth/me') return fulfillJson(route, { user: demoUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: demoUser });
    if (endpoint === '/api/profile/stats') {
      return fulfillJson(route, {
        success: true,
        stats: { posts: 1, followers: 0, following: 0, points: 1240, level: 2, streak: 4 },
      });
    }
    if (endpoint === '/api/v1/gamification/profile') {
      return fulfillJson(route, {
        profile: {
          userId: demoUser.id,
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
        posts: [
          {
            id: 'post-1',
            userId: demoUser.id,
            content: 'QA dashboard feed post',
            type: 'general',
            visibility: 'public',
            createdAt: '2026-05-15T12:00:00.000Z',
            user: demoUser,
            likesCount: 0,
            commentsCount: 0,
          },
        ],
        pagination: { total: 1, limit: 10, offset: 0 },
      });
    }
    if (endpoint.includes('/weekly-recap')) {
      return fulfillJson(route, { success: true, current: { streak: 4, xp: 1240 }, data: [] });
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
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const controls = [...document.querySelectorAll('a,button,[role="button"],[role="tab"]')].filter(visible);
    const smallTargets = controls
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: (element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 80),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter((item) => item.width < 44 || item.height < 44);

    return {
      bodyLength: document.body.innerText.trim().length,
      overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      smallTargets,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await mockDashboardApi(page);
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: demoUser }
  );
});

for (const route of routes) {
  test(`client dashboard route smoke: ${route.path}`, async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await page.screenshot({ path: testInfo.outputPath('viewport.png'), fullPage: false });

    const layout = await inspectLayout(page);
    expect(new URL(page.url()).pathname).toBe(route.expectedPath);
    expect(layout.bodyLength).toBeGreaterThan(80);
    expect(layout.overflowX).toBeLessThanOrEqual(12);
    expect(layout.smallTargets).toEqual([]);
    expect(consoleErrors.filter((item) => !/preloaded using link preload/i.test(item))).toEqual([]);
  });
}
