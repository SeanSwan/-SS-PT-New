/**
 * Client dashboard widget responsive smoke.
 *
 * Purpose: verifies the canonical /dashboard/client/overview current-workout
 * and plan-vault cards keep dense workout-plan data usable on phones.
 * Privacy: local-only swanstudios.local QA data; no production data captured.
 * Surface receipt: UniversalDashboardLayout -> ClientHomeTab ->
 * ClientObservatoryHome -> ClientObservatoryWidgets.
 */
import { expect, test, type Page, type Route } from '@playwright/test';
import { workoutPlanCatalogResponse } from './client-workout-plan-responsive.fixtures';
import {
  inspectClientCurrentWorkoutCardLayout,
  inspectClientPlanVaultCardLayout,
} from './client-workout-plan-responsive-layout';

const demoUser = {
  id: 101,
  email: 'qa.client@swanstudios.local',
  username: 'qa_client',
  firstName: 'QA',
  lastName: 'Client',
  role: 'client',
  hasLinkedWaiver: true,
  waiverStatus: 'linked',
  isActive: true,
};

const overviewViewports = [
  { name: 'narrow-phone', width: 360, height: 800 },
  { name: 'phone', width: 414, height: 896 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

const planVaultCatalog = {
  ...workoutPlanCatalogResponse.trainingPlanCatalog,
  slots: workoutPlanCatalogResponse.trainingPlanCatalog.slots.map((slot, index) => ({
    ...slot,
    plan: slot.plan ? {
      ...slot.plan,
      currentWeek: index + 1,
      currentDay: index + 2,
      pdfFile: slot.plan.metadata.planPdf,
    } : slot.plan,
  })),
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

async function seedAuth(page: Page) {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: demoUser },
  );
}

async function mockOverviewApi(page: Page) {
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));
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
        profile: { userId: demoUser.id, points: 1240, level: 2, tier: 'bronze_forge', streakDays: 4 },
      });
    }
    if (endpoint === '/api/social/posts/feed') {
      return fulfillJson(route, {
        success: true,
        posts: [{ id: 'post-1', userId: demoUser.id, content: 'QA dashboard feed post', user: demoUser }],
        pagination: { total: 1, limit: 10, offset: 0 },
      });
    }
    if (endpoint === '/api/workouts/101/current') {
      return fulfillJson(route, {
        success: true,
        data: {
          id: 'qa-plan-6m',
          title: 'Lower Body Strength Assignment With Long Mobile-Safe Copy',
          name: 'Six-Month Performance Rebuild Plan For Dense Client Cards',
          trainingPlanCatalog: planVaultCatalog,
          todayAssignment: {
            assignmentKey: 'qa-plan-6m:week-3-day-2',
            assignmentType: 'homework',
            sessionType: 'solo',
            isLoggable: true,
            ctaLabel: 'Log Assignment',
            weekNumber: 3,
            dayNumber: 2,
            exerciseCount: 6,
            firstExerciseName: 'Tempo split squat',
          },
          homeworkSummary: workoutPlanCatalogResponse.homeworkSummary,
        },
        trainingPlanCatalog: planVaultCatalog,
        todayAssignment: workoutPlanCatalogResponse.todayAssignment,
        homeworkSummary: workoutPlanCatalogResponse.homeworkSummary,
      });
    }

    return fulfillJson(route, { success: true, data: [], achievements: [], rewards: [], leaderboard: [], challenges: [], posts: [] });
  });
}

test.beforeEach(async ({ page }) => {
  await seedAuth(page);
  await mockOverviewApi(page);
});

for (const viewport of overviewViewports) {
  test(`client overview workout widgets stay usable at ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/dashboard/client/overview', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);

    await expect(page.getByTestId('current-workout-card').first()).toBeVisible();
    await expect(page.getByTestId('client-plan-vault-card')).toBeVisible();
    await expect(page.getByLabel('6 Month Primary plan arc')).toBeVisible();
    await expect(page.getByRole('button', { name: /log today from 6 month primary plan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /view 12 month pdf plan/i })).toBeVisible();

    const currentCard = await inspectClientCurrentWorkoutCardLayout(page);
    const planVault = await inspectClientPlanVaultCardLayout(page);
    expect(currentCard.overflowX, `current workout overflow at ${viewport.name}`).toBeLessThanOrEqual(12);
    expect(planVault.overflowX, `plan vault overflow at ${viewport.name}`).toBeLessThanOrEqual(12);
    expect(currentCard.issues).toEqual([]);
    expect(planVault.issues).toEqual([]);

    await page.screenshot({ path: testInfo.outputPath(`client-overview-widgets-${viewport.name}.png`), fullPage: false });
  });
}
