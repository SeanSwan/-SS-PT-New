import { expect, test, type Page, type Route } from '@playwright/test';
import { workoutPlanCatalogResponse } from './client-workout-plan-responsive.fixtures';
import { inspectClientPlanVaultCardLayout } from './client-workout-plan-responsive-layout';

test.describe.configure({ retries: 0 });

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

function jwt() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }),
    'qa-signature',
  ].join('.');
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

const clientPlanVaultCatalog = {
  ...workoutPlanCatalogResponse.trainingPlanCatalog,
  slots: workoutPlanCatalogResponse.trainingPlanCatalog.slots.map((slot) => ({
    ...slot,
    plan: slot.plan ? {
      ...slot.plan,
      currentWeek: slot.horizonKey === 'six_month' ? 3 : 1,
      currentDay: slot.horizonKey === 'six_month' ? 2 : 1,
      pdfFile: slot.plan.metadata.planPdf,
    } : null,
  })),
};

async function mockWorkoutHistoryApi(page: Page) {
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/auth/me') return fulfillJson(route, { user: demoUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: demoUser });
    if (endpoint === '/api/workouts/101/current') {
      return fulfillJson(route, {
        success: true,
        data: {
          id: 'qa-plan-6m',
          title: 'Six-Month Performance Rebuild Plan For Dense Client Cards',
          todayAssignment: workoutPlanCatalogResponse.todayAssignment,
          homeworkSummary: workoutPlanCatalogResponse.homeworkSummary,
          trainingPlanCatalog: clientPlanVaultCatalog,
        },
        plan: {
          id: 'qa-plan-6m',
          title: 'Six-Month Performance Rebuild Plan For Dense Client Cards',
          todayAssignment: workoutPlanCatalogResponse.todayAssignment,
          homeworkSummary: workoutPlanCatalogResponse.homeworkSummary,
          trainingPlanCatalog: clientPlanVaultCatalog,
        },
        todayAssignment: workoutPlanCatalogResponse.todayAssignment,
        homeworkSummary: workoutPlanCatalogResponse.homeworkSummary,
        trainingPlanCatalog: clientPlanVaultCatalog,
      });
    }
    if (endpoint === '/api/workout/sessions') {
      return fulfillJson(route, {
        success: true,
        data: {
          sessions: [{
            id: 'session-long-mobile',
            title: 'Lower Body Strength History Entry With Long Mobile-Safe Copy',
            date: '2026-06-08T12:00:00.000Z',
            duration: 62,
            intensity: 8,
            totalSets: 4,
            totalWeight: 1290,
            notes: 'Coach notes should wrap cleanly without hiding set detail or pushing the card sideways.',
            logs: [
              { id: 1, exerciseName: 'Goblet Squat With Controlled Tempo', setNumber: 1, weight: 55, reps: 12, tempo: '3-1-1', rpe: 7 },
              { id: 2, exerciseName: 'Goblet Squat With Controlled Tempo', setNumber: 2, weight: 60, reps: 10, tempo: '3-1-1', rpe: 8 },
            ],
          }],
        },
      });
    }
    return fulfillJson(route, { success: true, data: [], achievements: [], posts: [] });
  });
}

async function installClientSession(page: Page) {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: demoUser },
  );
}

async function inspectWorkoutHistoryLayout(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const smallTargets = [...document.querySelectorAll('a,button,[role="button"]')]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { label: (element.textContent || element.getAttribute('aria-label') || '').trim(), width: rect.width, height: rect.height };
      })
      .filter((item) => item.width < 44 || item.height < 44);
    const tableOverflow = [...document.querySelectorAll('table')]
      .map((table) => Math.max(0, table.scrollWidth - table.clientWidth));
    return {
      overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      smallTargets,
      tableOverflow,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await mockWorkoutHistoryApi(page);
  await installClientSession(page);
});

test('client workout history keeps logged workout cards usable on responsive viewports', async ({ page }, testInfo) => {
  await page.goto('/dashboard/client/workouts', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByRole('heading', { name: /my workouts/i })).toBeVisible();
  await expect(page.getByText(/lower body strength history entry/i)).toBeVisible();

  await page.getByRole('button', { name: /lower body strength history entry/i }).click();
  await expect(page.getByText(/goblet squat with controlled tempo/i)).toBeVisible();
  await expect(page.getByText(/coach notes should wrap cleanly/i)).toBeVisible();

  const layout = await inspectWorkoutHistoryLayout(page);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(layout.smallTargets).toEqual([]);
  expect(layout.tableOverflow.every((overflow) => overflow <= 12)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('client-workout-history.png'), fullPage: false });
});

test('client plan vault card keeps arc actions usable on responsive workout route', async ({ page }, testInfo) => {
  await page.goto('/dashboard/client/workouts', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  const vault = page.getByTestId('client-plan-vault-card');
  await expect(vault).toBeVisible();
  await expect(vault.getByText(/plan vault/i)).toBeVisible();
  await expect(vault.getByLabel(/6 month primary plan arc/i)).toBeVisible();
  await expect(vault.getByRole('button', { name: /log today from 6 month primary plan/i })).toBeVisible();
  await expect(vault.getByRole('button', { name: /view 6 month pdf plan/i })).toBeVisible();

  const layout = await inspectClientPlanVaultCardLayout(page);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(layout.issues).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('client-plan-vault-card.png'), fullPage: false });
});
