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

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockNutritionApi(page: Page) {
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: clientUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: clientUser });
    if (endpoint === '/api/subscriptions/status') {
      return fulfillJson(route, {
        success: true,
        subscription: {
          tier: 'pro',
          tierName: 'Swan Guardian',
          status: 'active',
          hasFullAIAccess: true,
          isInTrial: false,
          trialDaysRemaining: 0,
          trialEndDate: null,
          currentPeriodEnd: null,
          amount: 99,
          paymentMethod: 'card',
        },
        usage: {
          aiMessagesUsed: 2,
          aiMessagesLimit: 1000,
          aiGenerationsUsed: 1,
          aiGenerationsLimit: 100,
          resetDate: null,
        },
      });
    }
    if (endpoint === '/api/subscriptions/tiers') return fulfillJson(route, { success: true, tiers: [] });
    if (endpoint === '/api/macros/summary') {
      return fulfillJson(route, {
        success: true,
        summary: {
          date: '2026-05-23',
          userId: Number(clientUser.id),
          totalCalories: 1940,
          totalProtein: 142,
          totalCarbs: 188,
          totalFat: 61,
          totalFiber: 31,
          totalSugar: 48,
          totalSodium: 1580,
          mealCount: 3,
          meals: {
            breakfast: { calories: 480, protein: 36, carbs: 54, fat: 16, count: 1 },
            lunch: { calories: 690, protein: 52, carbs: 78, fat: 20, count: 1 },
            dinner: { calories: 770, protein: 54, carbs: 56, fat: 25, count: 1 },
          },
        },
      });
    }

    return fulfillJson(route, {
      success: true,
      data: [],
      achievements: [],
      rewards: [],
      leaderboard: [],
      notifications: [],
      stats: {},
    });
  });
}

async function installClientSession(page: Page) {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: clientUser },
  );
}

async function inspectNutritionWorkspace(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const workspace = [...document.querySelectorAll('[role="tabpanel"], main, body')]
      .find((element) => (element.textContent || '').includes('Nutrition Intelligence')) ?? document.body;
    const controls = [...workspace.querySelectorAll('a,button,[role="button"],[role="tab"],input,select,textarea')]
      .filter(visible);
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
  await mockNutritionApi(page);
  await installClientSession(page);
});

test('client nutrition workspace renders meal logging and live macro summary tabs', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/dashboard/client/meal-planner', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByRole('heading', { name: 'Nutrition Intelligence' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /log meal/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /food intake tracker/i })).toBeVisible();

  await page.getByRole('tab', { name: /my macros/i }).click();
  await expect(page.getByRole('region', { name: /macronutrient split donut chart/i })).toBeVisible();
  await expect(page.getByText('1,940')).toBeVisible();
  await expect(page.getByText(/daily macronutrient distribution/i)).toBeVisible();

  const layout = await inspectNutritionWorkspace(page);
  expect(new URL(page.url()).pathname).toBe('/dashboard/client/meal-planner');
  expect(layout.bodyText).not.toMatch(/Generate mock nutrition plan for demo/i);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(layout.smallTargets).toEqual([]);
  expect(consoleErrors.filter((item) => !/preloaded using link preload/i.test(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('nutrition-workspace-smoke.png'), fullPage: false });
});
