import { expect, test, type Page, type Route } from '@playwright/test';
import { isSuppressedProductNoise } from './mission/productNoise';

const demoUser = {
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

type FailedResource = {
  status: number;
  url: string;
};

function isKnownRealtimeTransportNoise(message: string, failedResources: FailedResource[]) {
  if (!/Failed to load resource: the server responded with a status of 400/i.test(message)) return false;

  return failedResources.some((resource) => {
    if (resource.status !== 400) return false;

    const url = new URL(resource.url);
    return url.pathname === '/socket.io/' && url.searchParams.get('transport') === 'polling';
  });
}

function actionableConsoleErrors(consoleErrors: string[], failedResources: FailedResource[]) {
  return consoleErrors.filter((item) => {
    if (isSuppressedProductNoise(item)) return false;
    if (isKnownRealtimeTransportNoise(item, failedResources)) return false;
    return true;
  });
}

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

async function mockGamificationApi(page: Page) {
  await page.route('**/health**', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;

    if (endpoint === '/api/cart') return fulfillJson(route, { id: 1, status: 'active', items: [], total: 0, totalSessions: 0 });

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: demoUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: demoUser });
    if (endpoint === '/api/v1/gamification/profile') {
      return fulfillJson(route, {
        profile: {
          userId: demoUser.id,
          points: 4321,
          level: 8,
          tier: 'silver_edge',
          leaderboardPosition: 2,
          nextLevelProgress: 64,
          nextLevelPoints: 5000,
          recentAchievements: [
            {
              id: 'ua-1',
              achievementId: 'ach-1',
              earnedAt: '2026-05-22T12:00:00.000Z',
              progress: 100,
              isCompleted: true,
              pointsAwarded: 250,
              maxProgress: 100,
              achievement: {
                id: 'ach-1',
                name: 'Hydration Consistency',
                description: 'Logged recovery habits for the week.',
                iconEmoji: 'Trophy',
                xpReward: 250,
                category: 'recovery',
              },
            },
          ],
          recentTransactions: [
            {
              id: 'tx-1',
              points: 250,
              balance: 4321,
              transactionType: 'earn',
              source: 'workout',
              description: 'Workout approved',
              createdAt: '2026-05-22T12:30:00.000Z',
            },
          ],
        },
      });
    }
    if (endpoint === '/api/v1/gamification/achievements') return fulfillJson(route, { achievements: [] });
    if (endpoint === '/api/v1/gamification/rewards') {
      return fulfillJson(route, {
        rewards: [{ id: 'reward-1', name: 'Recovery Credit', pointCost: 500 }],
      });
    }
    if (endpoint === '/api/v1/gamification/leaderboard') {
      return fulfillJson(route, {
        leaderboard: [
          {
            userId: demoUser.id,
            overallLevel: 8,
            client: { id: demoUser.id, firstName: 'QA', lastName: 'Client', username: 'qa_client' },
          },
        ],
      });
    }

    return fulfillJson(route, { success: true, data: [], notifications: [] });
  });
}

async function inspectLayout(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const root = document.querySelector('main') ?? document.body;
    const controls = [...root.querySelectorAll('a,button,[role="button"]')].filter(visible);
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
      bodyText: document.body.innerText,
      overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      smallTargets,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await mockGamificationApi(page);
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: demoUser },
  );
});

test('gamification hub renders live gamification API data', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const failedResources: FailedResource[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failedResources.push({ status: response.status(), url: response.url() });
  });

  await page.goto('/gamification', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /train, level, rally/i })).toBeVisible();
  await expect(page.getByText('4,321')).toBeVisible();
  await expect(page.getByText('8').first()).toBeVisible();
  await expect(page.getByText('2nd')).toBeVisible();
  await expect(page.getByText('Hydration Consistency')).toBeVisible();
  await expect(page.getByText('Recovery Credit')).toBeVisible();
  await expect(page.getByText('Workout approved')).toBeVisible();
  await expect(page.getByText('QA Client', { exact: true })).toBeVisible();

  const layout = await inspectLayout(page);
  expect(new URL(page.url()).pathname).toBe('/gamification');
  expect(layout.bodyText).not.toMatch(/Advanced Features Coming Soon/i);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(layout.smallTargets).toEqual([]);
  expect(actionableConsoleErrors(consoleErrors, failedResources)).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('gamification-hub-smoke.png'), fullPage: false });
});
