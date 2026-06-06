/**
 * Mission QA: Workout Logger action safety.
 *
 * Verifies the trainer/admin daily logging workflow that Sean uses with real
 * clients: add an exercise, export a PDF, understand why summary is locked
 * before save, and prevent accidental cancel data loss.
 */

import { expect, test, type Page, type Route } from '@playwright/test';
import { fulfillJson, jwt, watchConsoleErrors, type MissionApiState } from './missionHarness';

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

function missionExpectedConsoleNoise(message: string) {
  if (/preloaded using link preload/i.test(message)) return true;

  return process.env.SWAN_MISSION_QA_MODE === 'contract'
    && /WebSocket connection to 'ws:\/\/(?:localhost|127\.0\.0\.1):10000\/socket\.io\//i.test(message);
}

async function blockWrite(route: Route, state: MissionApiState, endpoint: string) {
  state.blockedWrites.push(`${route.request().method()} ${endpoint}`);
  await fulfillJson(route, { success: false, message: 'Mission QA read-only write blocked' }, 405);
}

async function mockWorkoutLoggerApi(page: Page, state: MissionApiState) {
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;
    const method = request.method();

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

    return fulfillJson(route, { success: true, data: [], clients: [], stats: {}, notifications: [] });
  });
}

test('@mission @contract @readonly admin workout logger protects export, summary, and cancel actions', async ({ page }, testInfo) => {
  expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('0');

  const apiState: MissionApiState = { blockedWrites: [] };
  const consoleErrors = watchConsoleErrors(page);
  await mockWorkoutLoggerApi(page, apiState);
  await installAdminSession(page);

  await page.goto('/dashboard/admin/client-management?clientId=501&tab=training&trainingSection=logger', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByText(/SwanStudios Paid Client/i).first()).toBeVisible();
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
  expect(consoleErrors.filter((item) => !missionExpectedConsoleNoise(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('admin-workout-logger-actions.png'), fullPage: false });
});
