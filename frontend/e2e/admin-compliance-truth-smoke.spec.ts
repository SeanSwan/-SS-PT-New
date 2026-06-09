import { expect, test, type Page, type Route } from '@playwright/test';

interface AdminOverviewMockOptions {
  businessKpisUnavailable?: boolean;
  revenueUnavailable?: boolean;
  userGrowthUnavailable?: boolean;
  sessionTrackingUnavailable?: boolean;
  recentActivityUnavailable?: boolean;
}

type FailedResource = {
  status: number;
  url: string;
};

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

function watchAdminConsole(page: Page) {
  const consoleErrors: string[] = [];
  const failedResources: FailedResource[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResources.push({ status: response.status(), url: response.url() });
    }
  });

  return { consoleErrors, failedResources };
}

function isKnownRealtimeTransportNoise(message: string, failedResources: FailedResource[]) {
  if (!/Failed to load resource: the server responded with a status of 400/i.test(message)) return false;

  return failedResources.some((resource) => {
    if (resource.status !== 400) return false;

    const url = new URL(resource.url);
    return url.pathname === '/socket.io/' && url.searchParams.get('transport') === 'polling';
  });
}

async function seedAdminAuth(page: Page) {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: adminUser },
  );
}

async function mockAdminOverviewApi(page: Page, options: AdminOverviewMockOptions = {}) {
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/admin/compliance/at-risk') {
      return fulfillJson(route, { success: false, message: 'Compliance unavailable' }, 500);
    }
    if (endpoint === '/api/admin/analytics/revenue') {
      if (options.revenueUnavailable) {
        return fulfillJson(route, { success: false, message: 'Revenue unavailable' }, 500);
      }

      return fulfillJson(route, {
        success: true,
        data: {
          overview: {
            totalRevenue: 0,
            monthlyRecurring: 0,
            averageTransaction: 0,
            totalCustomers: 0,
          },
          revenueHistory: [],
        },
      });
    }
    if (endpoint === '/api/admin/analytics/users') {
      if (options.userGrowthUnavailable) {
        return fulfillJson(route, { success: false, message: 'User growth unavailable' }, 500);
      }

      return fulfillJson(route, {
        success: true,
        data: {
          overview: {
            totalUsers: 0,
            activeToday: 0,
            newThisWeek: 0,
            retentionRate: 0,
          },
          userActivity: [],
        },
      });
    }
    if (endpoint === '/api/admin/analytics/business-kpis') {
      if (options.businessKpisUnavailable) {
        return fulfillJson(route, { success: false, message: 'Business KPIs unavailable' }, 500);
      }

      return fulfillJson(route, {
        success: true,
        data: {
          mrr: 0,
          mrrChange: 0,
          totalRevenue: 0,
          revenueChange: 0,
          activeClients: 0,
          newClients: 0,
          churnedClients: 0,
          churnRate: 0,
          sessionUtilization: 0,
          avgLTV: 0,
          avgRevenuePerClient: 0,
          sessionsThisMonth: 0,
          sessionsLastMonth: 0,
          revenueSparkline: [0, 0],
          clientSparkline: [0, 0],
        },
      });
    }
    if (endpoint === '/api/admin/dashboard-stats') {
      return fulfillJson(route, {
        success: true,
        data: {
          overview: {
            totalUsers: 0,
            activeUsers: 0,
            recentSignups: 0,
            weeklySignups: 0,
            monthlySignups: 0,
          },
          growth: {
            daily: 0,
            weekly: 0,
            monthly: 0,
            averageDailySignups: '0',
          },
          distribution: {
            byRole: [],
            activePercentage: '0',
          },
          latestSignups: [],
          timestamp: new Date().toISOString(),
          databaseStatus: 'healthy',
        },
      });
    }
    if (endpoint === '/api/admin/signups-list') {
      return fulfillJson(route, {
        success: true,
        data: { signups: [], pagination: { hasMore: false } },
      });
    }
    if (endpoint === '/api/admin/database-health') {
      return fulfillJson(route, {
        success: true,
        data: {
          status: 'healthy',
          database: 'qa',
          version: 'qa',
          connectivity: 'connected',
          userTableAccessible: true,
          totalUsers: 0,
          lastUserCreated: null,
          timestamp: new Date().toISOString(),
        },
      });
    }
    if (endpoint === '/api/orientation/all') {
      return fulfillJson(route, { success: true, data: [] });
    }
    if (endpoint === '/api/sessions/admin/cancelled') {
      return fulfillJson(route, { success: true, data: [] });
    }
    if (endpoint.includes('/analytics/statistics/system-health')) {
      return fulfillJson(route, { success: true, data: { uptime: 99.9, services: [], systemMetrics: {} } });
    }
    if (endpoint.includes('/analytics/statistics/workouts')) {
      if (options.sessionTrackingUnavailable) {
        return fulfillJson(route, { success: false, message: 'Session stats unavailable' }, 500);
      }

      return fulfillJson(route, {
        success: true,
        data: {
          completionRate: 0,
          changePercent: 0,
          trend: [],
          target: 90,
          sessionsToday: 0,
          sessionsThisWeek: 0,
          sessionsThisMonth: 0,
          trainerUtilization: 0,
          avgDuration: 0,
          topClients: [],
        },
      });
    }
    if (endpoint === '/api/gamification/activity-feed') {
      if (options.recentActivityUnavailable) {
        return fulfillJson(route, { success: false, message: 'Activity feed unavailable' }, 500);
      }

      return fulfillJson(route, { success: true, data: [] });
    }
    if (endpoint.includes('/analytics/statistics/')) return fulfillJson(route, { success: true, data: {} });
    if (endpoint === '/api/admin/clients') {
      return fulfillJson(route, { success: true, data: { clients: [], pagination: { total: 0 } } });
    }

    return fulfillJson(route, {
      success: true,
      data: {},
      clients: [],
      checkIns: [],
      habits: [],
      triggers: [],
      notifications: [],
      items: [],
    });
  });
}

test('admin compliance widget shows unavailable state instead of demo at-risk clients', async ({ page }, testInfo) => {
  const { consoleErrors, failedResources } = watchAdminConsole(page);
  await seedAdminAuth(page);
  await mockAdminOverviewApi(page);

  await page.goto('/dashboard/admin/overview', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.getByText(/Access Deep Telemetry/i).click();

  await expect(page.getByText(/Compliance data could not be loaded\./i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Retry$/i })).toBeVisible();
  await expect(page.getByText(/Marcus Johnson|Alicia Chen|Priya Patel|No workouts in 14 days/i)).toHaveCount(0);

  const overflowX = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  expect(overflowX).toBeLessThanOrEqual(12);
  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !/preloaded using link preload/i.test(item)
    && !/Failed to load resource: the server responded with a status of 500/i.test(item)
    && !/\/api\/admin\/compliance\/at-risk/i.test(item)
    && !isKnownRealtimeTransportNoise(item, failedResources)
  ));
  expect(unexpectedConsoleErrors).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('admin-compliance-unavailable-truth-smoke.png'), fullPage: false });
});

test('admin business KPI widget shows unavailable state instead of demo revenue KPIs', async ({ page }, testInfo) => {
  const { consoleErrors, failedResources } = watchAdminConsole(page);
  await seedAdminAuth(page);
  await mockAdminOverviewApi(page, { businessKpisUnavailable: true });

  await page.goto('/dashboard/admin/overview', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByText(/Business KPI data could not be loaded\./i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Retry$/i })).toBeVisible();
  await expect(page.getByText(/^Monthly Revenue$/i)).toHaveCount(0);
  await expect(page.getByText(/^Avg Client LTV$/i)).toHaveCount(0);

  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !/preloaded using link preload/i.test(item)
    && !/Failed to load resource: the server responded with a status of 500/i.test(item)
    && !/\/api\/admin\/compliance\/at-risk/i.test(item)
    && !/\/api\/admin\/analytics\/business-kpis/i.test(item)
    && !isKnownRealtimeTransportNoise(item, failedResources)
  ));
  expect(unexpectedConsoleErrors).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('admin-business-kpi-unavailable-truth-smoke.png'), fullPage: false });
});

test('admin revenue chart shows unavailable state instead of demo revenue trend', async ({ page }, testInfo) => {
  const { consoleErrors, failedResources } = watchAdminConsole(page);
  await seedAdminAuth(page);
  await mockAdminOverviewApi(page, { revenueUnavailable: true });

  await page.goto('/dashboard/admin/overview', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByText(/Revenue data could not be loaded\./i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Retry$/i })).toBeVisible();
  await expect(page.getByText(/MRR:\s*\$8,750/i)).toHaveCount(0);
  await expect(page.getByText(/Avg:\s*\$186/i)).toHaveCount(0);

  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !/preloaded using link preload/i.test(item)
    && !/Failed to load resource: the server responded with a status of 500/i.test(item)
    && !/\/api\/admin\/compliance\/at-risk/i.test(item)
    && !/\/api\/admin\/analytics\/revenue/i.test(item)
    && !isKnownRealtimeTransportNoise(item, failedResources)
  ));
  expect(unexpectedConsoleErrors).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('admin-revenue-chart-unavailable-truth-smoke.png'), fullPage: false });
});

test('admin user growth chart shows unavailable state instead of demo growth trend', async ({ page }, testInfo) => {
  const { consoleErrors, failedResources } = watchAdminConsole(page);
  await seedAdminAuth(page);
  await mockAdminOverviewApi(page, { userGrowthUnavailable: true });

  await page.goto('/dashboard/admin/overview', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByText(/User growth data could not be loaded\./i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Retry$/i })).toBeVisible();
  await expect(page.getByText(/47 active/i)).toHaveCount(0);
  await expect(page.getByText(/\+3 this week/i)).toHaveCount(0);

  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !/preloaded using link preload/i.test(item)
    && !/Failed to load resource: the server responded with a status of 500/i.test(item)
    && !/\/api\/admin\/compliance\/at-risk/i.test(item)
    && !/\/api\/admin\/analytics\/users/i.test(item)
    && !isKnownRealtimeTransportNoise(item, failedResources)
  ));
  expect(unexpectedConsoleErrors).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('admin-user-growth-unavailable-truth-smoke.png'), fullPage: false });
});

test('admin session tracking widget shows unavailable state instead of demo sessions', async ({ page }, testInfo) => {
  const { consoleErrors, failedResources } = watchAdminConsole(page);
  await seedAdminAuth(page);
  await mockAdminOverviewApi(page, { sessionTrackingUnavailable: true });

  await page.goto('/dashboard/admin/overview', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByText(/Session tracking data could not be loaded\./i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Retry$/i })).toBeVisible();
  await expect(page.getByText(/^(Client A|Client B|Client C)$/i)).toHaveCount(0);
  await expect(page.getByText(/Avg session:\s*52 min/i)).toHaveCount(0);

  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !/preloaded using link preload/i.test(item)
    && !/Failed to load resource: the server responded with a status of 500/i.test(item)
    && !/\/api\/admin\/compliance\/at-risk/i.test(item)
    && !/\/api\/admin\/analytics\/statistics\/workouts/i.test(item)
    && !isKnownRealtimeTransportNoise(item, failedResources)
  ));
  expect(unexpectedConsoleErrors).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('admin-session-tracking-unavailable-truth-smoke.png'), fullPage: false });
});

test('admin recent activity feed shows unavailable state instead of demo platform events', async ({ page }, testInfo) => {
  const { consoleErrors, failedResources } = watchAdminConsole(page);
  await seedAdminAuth(page);
  await mockAdminOverviewApi(page, { recentActivityUnavailable: true });

  await page.goto('/dashboard/admin/overview', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByText(/Recent activity could not be loaded\./i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Retry$/i })).toBeVisible();
  await expect(page.getByText(/Payment received.*186|Daily backup completed|Training session scheduled/i)).toHaveCount(0);

  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !/preloaded using link preload/i.test(item)
    && !/Failed to load resource: the server responded with a status of 500/i.test(item)
    && !/\/api\/admin\/compliance\/at-risk/i.test(item)
    && !/\/api\/gamification\/activity-feed/i.test(item)
    && !isKnownRealtimeTransportNoise(item, failedResources)
  ));
  expect(unexpectedConsoleErrors).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('admin-recent-activity-unavailable-truth-smoke.png'), fullPage: false });
});

test('admin quick actions are semantic buttons and navigate to mounted routes', async ({ page }) => {
  await seedAdminAuth(page);
  await mockAdminOverviewApi(page);

  await page.goto('/dashboard/admin/overview', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  const analyticsAction = page.getByRole('button', { name: /Analytics: Analytics & insights/i });
  await expect(analyticsAction).toBeVisible();
  await analyticsAction.click();

  await expect(page).toHaveURL(/\/dashboard\/admin\/revenue$/);
});
