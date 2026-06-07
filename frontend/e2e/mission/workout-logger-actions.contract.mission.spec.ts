/**
 * Mission QA: Workout Logger action safety.
 *
 * Verifies the trainer/admin daily logging workflow that Sean uses with real
 * clients: add an exercise, export a PDF, understand why summary is locked
 * before save, and prevent accidental cancel data loss.
 */

import { expect, test, type Page, type Route } from '@playwright/test';
import { fulfillJson, isExpectedMissionConsoleNoise, jwt, watchConsoleErrors, type MissionApiState } from './missionHarness';

test.describe.configure({ retries: 0 });

const adminUser = {
  id: 1,
  email: 'admin.logger@swanstudios-qa.local',
  username: 'admin_logger',
  firstName: 'Mission',
  lastName: 'Admin',
  role: 'admin',
  isActive: true,
};

const paidClient = {
  id: 501,
  firstName: 'SwanStudios',
  lastName: 'Paid Client',
  email: 'paid.client@swanstudios-qa.local',
  role: 'client',
  clientSource: 'swanstudios',
  availableSessions: 8,
  totalWorkouts: 12,
  fitnessGoal: 'Strength and measurable progress',
  trainingExperience: 'intermediate',
  onboardingComplete: true,
  isOnboardingComplete: true,
};

const exerciseLibrary = [
  {
    id: 'goblet-squat',
    exerciseKey: 'goblet-squat',
    name: 'Goblet Squat',
    exerciseType: 'compound',
    bodyPartCategory: 'legs',
    primaryMuscles: ['legs', 'glutes'],
    equipment: ['Dumbbell'],
    equipmentNeeded: ['Dumbbell'],
    difficulty: 320,
    source: 'swanstudios',
  },
];

async function installAdminSession(page: Page) {
  await page.addInitScript(
    ({ token, currentUser }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(currentUser));
    },
    { token: jwt(), currentUser: adminUser },
  );
}

async function blockWrite(route: Route, state: MissionApiState, endpoint: string) {
  state.blockedWrites.push(`${route.request().method()} ${endpoint}`);
  await fulfillJson(route, { success: false, message: 'Mission QA read-only write blocked' }, 405);
}

function readPostJson(route: Route) {
  try {
    return route.request().postDataJSON() as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function mockWorkoutLoggerApi(page: Page, state: MissionApiState) {
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;
    const method = request.method();

    if (
      method === 'POST' &&
      endpoint === '/api/workout-forms' &&
      state.capturedWorkoutFormSubmissions
    ) {
      const body = readPostJson(route);
      state.capturedWorkoutFormSubmissions.push(body);
      return fulfillJson(route, {
        success: true,
        form: {
          id: 'mission-form-1',
          clientId: body.clientId,
          date: body.date,
          sessionDeducted: false,
        },
        message: 'Mission QA simulated workout save',
      }, 201);
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return blockWrite(route, state, endpoint);

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/admin/clients') {
      return fulfillJson(route, { success: true, data: { clients: [paidClient] } });
    }
    if (endpoint === '/api/admin/clients/501') {
      return fulfillJson(route, { success: true, data: { client: paidClient } });
    }
    if (endpoint === '/api/workout-forms/client/501/info') {
      return fulfillJson(route, {
        success: true,
        client: {
          id: paidClient.id,
          firstName: paidClient.firstName,
          lastName: paidClient.lastName,
          email: paidClient.email,
          availableSessions: paidClient.availableSessions,
          clientSource: paidClient.clientSource,
          hasWorkoutToday: false,
        },
      });
    }
    if (endpoint === '/api/exercises/library') {
      return fulfillJson(route, { success: true, exercises: exerciseLibrary });
    }
    if (endpoint === '/api/equipment-profiles') {
      return fulfillJson(route, { success: true, profiles: [] });
    }
    if (endpoint === '/api/admin/clients/501/workouts') {
      return fulfillJson(route, { success: true, workouts: [] });
    }
    if (endpoint === '/api/workouts/501/current') {
      return fulfillJson(route, { data: { todayAssignment: null } });
    }
    if (endpoint === '/api/workout-plans/client/501') {
      return fulfillJson(route, {
        success: true,
        trainingPlanCatalog: {
          primaryPlanId: 'mission-six-month',
          primaryHorizonKey: 'six_month',
          slots: [
            {
              horizonKey: 'six_month',
              label: '6 Month',
              durationWeeks: 26,
              durationDays: 182,
              isDefaultHorizon: true,
              isFilled: true,
              isPrimary: true,
              plan: {
                id: 'mission-six-month',
                title: 'Mission Trainer-Led Arc',
                status: 'active',
                horizonKey: 'six_month',
                durationWeeks: 26,
                assignmentDefault: 'trainer_session',
                billingIntent: 'trainer_led_scheduled_flow',
                defaultShouldDeductSession: false,
              },
            },
            {
              horizonKey: 'one_week',
              label: '1 Week',
              durationWeeks: 1,
              durationDays: 7,
              isDefaultHorizon: false,
              isFilled: true,
              isPrimary: false,
              plan: {
                id: 'mission-homework',
                title: 'Mission Homework Diary Arc',
                status: 'draft',
                horizonKey: 'one_week',
                durationWeeks: 1,
                assignmentDefault: 'homework',
                billingIntent: 'non_billable_assignment',
                defaultShouldDeductSession: false,
              },
            },
          ],
        },
      });
    }

    return fulfillJson(route, { success: true, data: [], clients: [], stats: {}, notifications: [] });
  });
}

test('@mission @contract @readonly admin workout logger protects export, summary, and cancel actions', async ({ page }, testInfo) => {
  expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('0');

  const apiState: MissionApiState = { blockedWrites: [] };
  const consoleErrors = watchConsoleErrors(page);
  await mockWorkoutLoggerApi(page, apiState);
  await installAdminSession(page);

  await page.goto('/dashboard/admin/client-management?clientId=501&tab=training&trainingSection=logger&sessionId=910&sessionDate=2026-06-06', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByText(/SwanStudios Paid Client/i).first()).toBeVisible();
  const loggerUrl = new URL(page.url());
  expect(loggerUrl.searchParams.get('sessionId')).toBe('910');
  expect(loggerUrl.searchParams.get('sessionDate')).toBe('2026-06-06');
  await page.getByRole('button', { name: /search and add exercises/i }).click();
  await page.getByRole('combobox', { name: /search exercises/i }).fill('goblet');
  await page.getByRole('option', { name: /goblet squat/i }).first().click();

  await expect(page.getByText(/Goblet Squat/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /enter reps or weight, then save/i })).toBeDisabled();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /export pdf/i }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^SwanStudios-Workout-SwanStudios-Paid-Client-/);

  await page.getByRole('button', { name: /^cancel$/i }).click();
  await expect(page.getByRole('dialog', { name: /discard unsaved workout/i })).toBeVisible();
  await page.getByRole('button', { name: /keep logging/i }).click();

  expect(apiState.blockedWrites).toEqual([]);
  expect(consoleErrors.filter((item) => !isExpectedMissionConsoleNoise(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('admin-workout-logger-actions.png'), fullPage: false });
});

test('@mission @contract @readonly admin scheduled logger save keeps linked session context', async ({ page }, testInfo) => {
  expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('0');

  const apiState: MissionApiState = { blockedWrites: [], capturedWorkoutFormSubmissions: [] };
  const consoleErrors = watchConsoleErrors(page);
  await mockWorkoutLoggerApi(page, apiState);
  await installAdminSession(page);

  await page.goto('/dashboard/admin/client-management?clientId=501&tab=training&trainingSection=logger&sessionId=910&sessionDate=2026-06-06', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await page.getByRole('button', { name: /search and add exercises/i }).click();
  await page.getByRole('combobox', { name: /search exercises/i }).fill('goblet');
  await page.getByRole('option', { name: /goblet squat/i }).first().click();
  await page.getByRole('spinbutton', { name: /set 1 weight in lbs/i }).fill('40');
  await page.getByRole('spinbutton', { name: /set 1 reps/i }).fill('10');
  await page.getByRole('button', { name: /complete & save workout/i }).click();

  await expect.poll(() => apiState.capturedWorkoutFormSubmissions?.length ?? 0).toBe(1);
  expect(apiState.capturedWorkoutFormSubmissions?.[0]).toMatchObject({
    clientId: 501,
    date: '2026-06-06',
    scheduledSessionId: '910',
  });
  expect(apiState.blockedWrites).toEqual([]);
  expect(consoleErrors.filter((item) => !isExpectedMissionConsoleNoise(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('admin-scheduled-logger-submit-context.png'), fullPage: false });
});

test('@mission @contract @readonly admin plan vault exposes trainer-led versus homework plan use', async ({ page }, testInfo) => {
  expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('0');

  const apiState: MissionApiState = { blockedWrites: [] };
  const consoleErrors = watchConsoleErrors(page);
  await mockWorkoutLoggerApi(page, apiState);
  await installAdminSession(page);

  await page.goto('/dashboard/admin/client-management?clientId=501&tab=training&trainingSection=plans', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByRole('heading', { name: /training plans/i })).toBeVisible();
  await expect(page.getByLabel(/6 month plan arc/i)).toContainText(/Trainer-led/i);
  await expect(page.getByLabel(/1 week plan arc/i)).toContainText(/Homework diary/i);
  await expect(page.getByText(/Mission Trainer-Led Arc/i).first()).toBeVisible();
  await expect(page.getByText(/Mission Homework Diary Arc/i).first()).toBeVisible();

  const layout = await page.evaluate(() => ({
    bodyText: document.body.innerText,
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(layout.bodyText).not.toMatch(/Demo Mode|Sarah Johnson|Real API integration coming soon/i);
  expect(apiState.blockedWrites).toEqual([]);
  expect(consoleErrors.filter((item) => !isExpectedMissionConsoleNoise(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('admin-plan-vault-assignment-use.png'), fullPage: false });
});
