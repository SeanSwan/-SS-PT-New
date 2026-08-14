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

const qaClient = {
  id: 91,
  firstName: 'QA',
  lastName: 'Client',
  email: 'qa.client@swanstudios.local',
  role: 'client',
  canGenerateWorkoutPlans: true,
};

const exercises = [
  {
    id: '21s-bicep-curl',
    exerciseKey: '21s-bicep-curl',
    name: '21s Bicep Curl',
    exerciseType: 'isolation',
    difficulty: 420,
    primaryMuscles: ['arms'],
    equipmentNeeded: ['Barbell'],
    bodyPartCategory: 'arms',
  },
  {
    id: '360-jump',
    exerciseKey: '360-jump',
    name: '360 Jump',
    exerciseType: 'compound',
    difficulty: 620,
    primaryMuscles: ['cardio'],
    equipmentNeeded: ['Bodyweight'],
    bodyPartCategory: 'cardio',
  },
  {
    id: '90-90-hip-stretch',
    exerciseKey: '90-90-hip-stretch',
    name: '90/90 Hip Stretch',
    exerciseType: 'flexibility',
    difficulty: 120,
    primaryMuscles: ['recovery'],
    equipmentNeeded: ['Bodyweight'],
    bodyPartCategory: 'recovery',
  },
  {
    id: 'ab-wheel-rollout',
    exerciseKey: 'ab-wheel-rollout',
    name: 'Ab Wheel Rollout',
    exerciseType: 'core',
    difficulty: 360,
    primaryMuscles: ['core'],
    equipmentNeeded: ['Ab Wheel'],
    bodyPartCategory: 'core',
  },
];

const packages = [
  {
    id: 301,
    name: 'Founders Training Package',
    packageType: 'fixed',
    description: 'QA package for protected store smoke.',
    price: 1200,
    displayPrice: 1200,
    pricePerSession: 120,
    sessions: 10,
    totalSessions: 10,
    totalCost: 1200,
    theme: 'cosmic',
    isActive: true,
  },
];

const revenueAnalytics = {
  overview: {
    totalRevenue: 12400,
    monthlyRecurring: 4200,
    averageTransaction: 620,
    totalCustomers: 18,
  },
  changes: {
    revenue: 0,
    customers: 0,
    transactions: 0,
    conversion: 0,
  },
  revenueHistory: [
    { month: 'Apr', revenue: 9200, transactions: 14 },
    { month: 'May', revenue: 12400, transactions: 20 },
  ],
  topPackages: [
    { name: 'Founders', revenue: 7200 },
    { name: 'Elite', revenue: 5200 },
  ],
  recentTransactions: [
    {
      id: 'txn-qa-1',
      customer: { name: 'QA Client' },
      package: 'Founders Training Package',
      amount: 1200,
      date: '2026-05-24T12:00:00.000Z',
      status: 'Completed',
    },
  ],
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

async function mockAdminWorkoutApi(page: Page) {
  await page.route('**/health**', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;

    if (endpoint === '/api/cart') return fulfillJson(route, { id: 1, status: 'active', items: [], total: 0, totalSessions: 0 });
    if (!endpoint.startsWith('/api/')) return route.continue();

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/auth/clients') return fulfillJson(route, { success: true, clients: [qaClient] });
    if (endpoint === '/api/subscriptions/status') {
      return fulfillJson(route, {
        success: true,
        subscription: {
          tier: 'pro',
          tierName: 'Swan Guardian',
          status: 'active',
          hasFullAIAccess: true,
          isInTrial: false,
        },
        usage: {},
      });
    }
    if (endpoint === '/api/subscriptions/tiers') return fulfillJson(route, { success: true, tiers: [] });
    if (endpoint === '/api/macros/summary') {
      return fulfillJson(route, {
        success: true,
        summary: {
          totalCalories: 1940,
          totalProtein: 142,
          totalCarbs: 188,
          totalFat: 61,
          totalFiber: 31,
        },
      });
    }
    if (endpoint === '/api/exercises/library') return fulfillJson(route, { success: true, exercises });
    if (endpoint === '/api/workout/plans') return fulfillJson(route, { success: true, plans: [] });
    if (endpoint === '/api/workout/recommendations') return fulfillJson(route, { success: true, exercises });
    if (endpoint === '/api/admin/storefront') return fulfillJson(route, { success: true, items: packages });
    if (endpoint === '/api/admin/analytics/revenue') {
      return fulfillJson(route, { success: true, data: revenueAnalytics });
    }
    if (endpoint === '/api/sessions/users/trainers') {
      return fulfillJson(route, [{ id: 'trainer-qa', firstName: 'QA', lastName: 'Trainer', role: 'trainer' }]);
    }
    if (endpoint === '/api/sessions/users/clients') {
      return fulfillJson(route, [{ ...qaClient, id: String(qaClient.id) }]);
    }
    if (endpoint === '/api/sessions/stats') {
      return fulfillJson(route, {
        success: true,
        stats: {
          total: 1,
          available: 0,
          booked: 1,
          confirmed: 0,
          completed: 0,
          cancelled: 0,
          blocked: 0,
          upcoming: 1,
        },
      });
    }
    if (endpoint === '/api/session-types') return fulfillJson(route, { success: true, data: [] });
    if (endpoint === '/api/user/credits') return fulfillJson(route, { success: true, credits: { sessionsRemaining: 8 } });
    if (endpoint === '/api/sessions') {
      return fulfillJson(route, [
        {
          id: 'session-qa-1',
          title: 'QA Client Session',
          start: '2026-05-24T18:00:00.000Z',
          end: '2026-05-24T19:00:00.000Z',
          status: 'scheduled',
          trainerId: 'trainer-qa',
          userId: String(qaClient.id),
          client: qaClient,
          trainer: { id: 'trainer-qa', firstName: 'QA', lastName: 'Trainer' },
          location: 'Main Studio',
        },
      ]);
    }

    return fulfillJson(route, {
      success: true,
      data: [],
      plans: [],
      stats: {},
      notifications: [],
    });
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

async function inspectRoute(page: Page) {
  return page.evaluate(() => {
    const bodyText = document.body.innerText;
    const overflowX = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
    const clippedRows = [...document.querySelectorAll('div, button')]
      .filter((element) => /21s Bicep Curl|90\/90 Hip Stretch|Ab Wheel Rollout/.test(element.textContent || ''))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter((item) => item.width > 0 && item.height > 0);

    return { bodyText, overflowX, clippedRows };
  });
}

test.beforeEach(async ({ page }) => {
  await mockAdminWorkoutApi(page);
  await installAdminSession(page);
});

test('protected admin workout planner renders rolodex without SVG NaN or horizontal overflow', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/dashboard/admin/workout-planner', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /^Workout Planner$/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/exercise rolodex/i)).toBeVisible();
  await expect(page.getByText('21s Bicep Curl')).toBeVisible();

  const layout = await inspectRoute(page);
  expect(new URL(page.url()).pathname).toBe('/dashboard/admin/workout-planner');
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(layout.clippedRows.length).toBeGreaterThan(0);
  expect(consoleErrors.filter((item) => !isSuppressedProductNoise(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('admin-workout-planner-protected-smoke.png'), fullPage: false });
});

test('protected admin bootcamp builder renders manual rolodex and accepts exercise add', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/dashboard/admin/bootcamp', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /boot camp class builder/i })).toBeVisible();
  await page.getByRole('button', { name: /^manual$/i }).click();
  await expect(page.getByText(/exercise rolodex/i)).toBeVisible();
  await expect(page.getByText('90/90 Hip Stretch')).toBeVisible();
  await page.getByRole('button', { name: /add 90\/90 hip stretch/i }).click();
  await expect(page.getByText('Station 1')).toBeVisible();
  await expect(page.getByRole('button', { name: /90\/90 Hip Stretch 60s/i })).toBeVisible();
  await page.getByRole('button', { name: /board 2.*joint-friendly alternatives/i }).click();
  await expect(page.getByText(/modification options/i)).toBeVisible();
  await page.getByRole('button', { name: /board 3.*low-impact swaps/i }).click();
  await expect(page.getByText(/low-impact swaps prioritize/i)).toBeVisible();

  const layout = await inspectRoute(page);
  expect(new URL(page.url()).pathname).toBe('/dashboard/admin/bootcamp');
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(consoleErrors.filter((item) => !isSuppressedProductNoise(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('admin-bootcamp-protected-smoke.png'), fullPage: false });
});

test('protected admin theme-connected schedule nutrition store and revenue surfaces render', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const surfaces = [
    {
      path: '/dashboard/admin/master-schedule',
      visibleText: /schedule overview/i,
      screenshot: 'admin-master-schedule-theme-smoke.png',
    },
    {
      path: '/dashboard/admin/meal-planner',
      visibleText: /nutrition intelligence/i,
      screenshot: 'admin-nutrition-theme-smoke.png',
    },
    {
      path: '/dashboard/admin/admin-packages',
      visibleText: /founders training package/i,
      screenshot: 'admin-packages-theme-smoke.png',
    },
    {
      path: '/dashboard/admin/revenue',
      visibleText: /revenue analytics/i,
      screenshot: 'admin-revenue-theme-smoke.png',
    },
  ];

  for (const surface of surfaces) {
    await page.goto(surface.path, { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      document.documentElement.style.setProperty('--bg-base', '#05070b');
      document.documentElement.style.setProperty('--bg-surface', '#101622');
      document.documentElement.style.setProperty('--bg-elevated', '#141b2a');
      document.documentElement.style.setProperty('--accent-primary', '#8ee8ff');
      document.documentElement.style.setProperty('--accent-secondary', '#b69cff');
    });

    await expect(page.getByText(surface.visibleText).first()).toBeVisible();
    const layout = await inspectRoute(page);
    expect(new URL(page.url()).pathname).toBe(surface.path);
    expect(layout.overflowX).toBeLessThanOrEqual(12);
    await page.screenshot({ path: testInfo.outputPath(surface.screenshot), fullPage: false });
  }

  expect(consoleErrors.filter((item) => !isSuppressedProductNoise(item))).toEqual([]);
});
