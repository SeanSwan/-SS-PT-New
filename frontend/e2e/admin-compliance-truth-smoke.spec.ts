import { expect, test } from '@playwright/test';
import {
  isKnownRealtimeTransportNoise,
  mockAdminOverviewApi,
  seedAdminAuth,
  watchAdminConsole,
} from './adminComplianceTruthSmoke.helpers';
import { isSuppressedProductNoise } from './mission/productNoise';

test('admin compliance widget shows unavailable state instead of demo at-risk clients', async ({ page }, testInfo) => {
  const { consoleErrors, failedResources } = watchAdminConsole(page);
  await seedAdminAuth(page);
  await mockAdminOverviewApi(page);

  await page.goto('/dashboard/admin/overview', { waitUntil: 'domcontentloaded' });
  // The compliance widget is a directly-visible overview section now — the
  // old "Access Deep Telemetry" reveal button no longer exists
  // (AdminOverviewPanel renders ClientComplianceDashboard unconditionally).

  await expect(page.getByText(/Compliance data could not be loaded\./i)).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole('alert').filter({ hasText: /Compliance data could not be loaded/i })
      .getByRole('button', { name: /^Retry$/i }),
  ).toBeVisible();
  await expect(page.getByText(/Marcus Johnson|Alicia Chen|Priya Patel|No workouts in 14 days/i)).toHaveCount(0);

  const overflowX = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  expect(overflowX).toBeLessThanOrEqual(12);
  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !isSuppressedProductNoise(item)
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

  await expect(page.getByText(/Business KPI data could not be loaded\./i)).toBeVisible();
  // Scoped to this widget's alert: the always-mounted compliance widget (its
  // at-risk endpoint is unconditionally 500'd by the mock) renders its OWN
  // "Retry" — a bare page-level locator matches both and trips strict mode.
  await expect(
    page.getByRole('alert').filter({ hasText: /Business KPI data could not be loaded/i })
      .getByRole('button', { name: /^Retry$/i }),
  ).toBeVisible();
  await expect(page.getByText(/^Monthly Revenue$/i)).toHaveCount(0);
  await expect(page.getByText(/^Avg Client LTV$/i)).toHaveCount(0);

  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !isSuppressedProductNoise(item)
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

  await expect(page.getByText(/Revenue data could not be loaded\./i)).toBeVisible();
  await expect(
    page.getByRole('alert').filter({ hasText: /Revenue data could not be loaded/i })
      .getByRole('button', { name: /^Retry$/i }),
  ).toBeVisible();
  await expect(page.getByText(/MRR:\s*\$8,750/i)).toHaveCount(0);
  await expect(page.getByText(/Avg:\s*\$186/i)).toHaveCount(0);

  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !isSuppressedProductNoise(item)
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

  await expect(page.getByText(/User growth data could not be loaded\./i)).toBeVisible();
  await expect(
    page.getByRole('alert').filter({ hasText: /User growth data could not be loaded/i })
      .getByRole('button', { name: /^Retry$/i }),
  ).toBeVisible();
  await expect(page.getByText(/47 active/i)).toHaveCount(0);
  await expect(page.getByText(/\+3 this week/i)).toHaveCount(0);

  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !isSuppressedProductNoise(item)
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

  await expect(page.getByText(/Session tracking data could not be loaded\./i)).toBeVisible();
  await expect(
    page.getByRole('alert').filter({ hasText: /Session tracking data could not be loaded/i })
      .getByRole('button', { name: /^Retry$/i }),
  ).toBeVisible();
  await expect(page.getByText(/^(Client A|Client B|Client C)$/i)).toHaveCount(0);
  await expect(page.getByText(/Avg session:\s*52 min/i)).toHaveCount(0);

  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !isSuppressedProductNoise(item)
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

  await expect(page.getByText(/Recent activity could not be loaded\./i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Retry recent activity$/i })).toBeVisible();
  await expect(page.getByText(/Payment received.*186|Daily backup completed|Training session scheduled/i)).toHaveCount(0);

  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !isSuppressedProductNoise(item)
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

  const analyticsAction = page.getByRole('button', { name: /Analytics: Analytics & insights/i });
  await expect(analyticsAction).toBeVisible();
  await analyticsAction.click();

  await expect(page).toHaveURL(/\/dashboard\/admin\/revenue$/);
});
