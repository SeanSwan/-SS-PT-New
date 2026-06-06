/**
 * Mission QA: admin/trainer proof loop.
 *
 * Contract mode verifies the operator side of SwanStudios' core promise without
 * production writes: trainer sees assigned client proof, then admin can open the
 * planner surface against the same SwanStudios paid client context.
 */

import { expect, test, type Page, type Route } from '@playwright/test';
import { fulfillJson, jwt, watchConsoleErrors, type MissionApiState } from './missionHarness';

test.describe.configure({ retries: 0 });

const paidClient = {
  id: 501,
  firstName: 'SwanStudios',
  lastName: 'Paid Client',
  email: 'paid.client@swanstudios-qa.local',
  role: 'client',
  clientSource: 'swanstudios',
  availableSessions: 8,
  membershipLevel: 'founders',
  canGenerateWorkoutPlans: true,
};

const trainerUser = {
  id: 77,
  email: 'trainer.proof@swanstudios-qa.local',
  username: 'trainer_proof',
  firstName: 'Mission',
  lastName: 'Trainer',
  role: 'trainer',
  isActive: true,
};

const adminUser = {
  id: 1,
  email: 'admin.proof@swanstudios-qa.local',
  username: 'admin_proof',
  firstName: 'Mission',
  lastName: 'Admin',
  role: 'admin',
  isActive: true,
};

const exercises = [
  {
    id: 'goblet-squat',
    exerciseKey: 'goblet-squat',
    name: 'Goblet Squat',
    exerciseType: 'compound',
    difficulty: 320,
    primaryMuscles: ['legs'],
    equipmentNeeded: ['Dumbbell'],
    bodyPartCategory: 'legs',
  },
  {
    id: 'incline-push-up',
    exerciseKey: 'incline-push-up',
    name: 'Incline Push-up',
    exerciseType: 'compound',
    difficulty: 180,
    primaryMuscles: ['chest'],
    equipmentNeeded: ['Bench'],
    bodyPartCategory: 'upper body',
  },
];

async function installMissionSession(page: Page, user: typeof trainerUser | typeof adminUser) {
  await page.addInitScript(
    ({ token, currentUser }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(currentUser));
    },
    { token: jwt(), currentUser: user },
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

async function mockAdminTrainerApi(page: Page, state: MissionApiState, user: typeof trainerUser | typeof adminUser) {
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;
    const method = request.method();

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return blockWrite(route, state, endpoint);

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user });
    if (endpoint === '/api/client-trainer-assignments/trainer/77') {
      return fulfillJson(route, {
        success: true,
        totalClients: 1,
        assignments: [{
          id: 9001,
          trainerId: trainerUser.id,
          status: 'active',
          assignedAt: '2026-05-20T12:00:00.000Z',
          client: paidClient,
        }],
      });
    }
    if (endpoint === '/api/sessions/history/501') {
      return fulfillJson(route, [{ id: 1, status: 'completed', sessionDate: '2026-05-28T12:00:00.000Z' }]);
    }
    if (endpoint === '/api/sessions/upcoming/501') return fulfillJson(route, []);
    if (endpoint === '/api/auth/clients') return fulfillJson(route, { success: true, clients: [paidClient] });
    if (endpoint === '/api/subscriptions/status') {
      return fulfillJson(route, {
        success: true,
        subscription: { tier: 'pro', status: 'active', hasFullAIAccess: true, isInTrial: false },
      });
    }
    if (endpoint === '/api/subscriptions/tiers') return fulfillJson(route, { success: true, tiers: [] });
    if (endpoint === '/api/exercises/library') return fulfillJson(route, { success: true, exercises });
    if (endpoint === '/api/workout/recommendations') return fulfillJson(route, { success: true, exercises });
    if (endpoint === '/api/workout/plans') return fulfillJson(route, { success: true, plans: [] });

    return fulfillJson(route, { success: true, data: [], clients: [], stats: {}, notifications: [] });
  });
}

async function layoutSnapshot(page: Page) {
  return page.evaluate(() => ({
    bodyText: document.body.innerText,
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
}

test('@mission @contract @readonly trainer sees SwanStudios paid client proof without writes', async ({ page }, testInfo) => {
  expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('0');

  const apiState: MissionApiState = { blockedWrites: [] };
  const consoleErrors = watchConsoleErrors(page);
  await mockAdminTrainerApi(page, apiState, trainerUser);
  await installMissionSession(page, trainerUser);

  await page.goto('/dashboard/trainer/clients', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByRole('heading', { name: /^My Clients$/i })).toBeVisible();
  await expect(page.getByText(/SwanStudios Paid Client/i)).toBeVisible();
  await expect(page.getByText(/Workout Proof/i)).toBeVisible();
  await expect(page.getByText(/1 logged/i)).toBeVisible();

  const layout = await layoutSnapshot(page);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(layout.bodyText).not.toMatch(/Demo Mode|Sarah Johnson|Real API integration coming soon/i);
  expect(apiState.blockedWrites).toEqual([]);
  expect(consoleErrors.filter((item) => !missionExpectedConsoleNoise(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('trainer-paid-client-proof-loop.png'), fullPage: false });
});

test('@mission @contract @readonly admin opens planner with paid-client training context without writes', async ({ page }, testInfo) => {
  expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('0');

  const apiState: MissionApiState = { blockedWrites: [] };
  const consoleErrors = watchConsoleErrors(page);
  await mockAdminTrainerApi(page, apiState, adminUser);
  await installMissionSession(page, adminUser);

  await page.goto('/dashboard/admin/workout-planner?clientId=501&source=clients-team', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByRole('heading', { name: /swan studios workout planner/i })).toBeVisible();
  await expect(page.getByText(/exercise rolodex/i)).toBeVisible();
  await expect(page.getByText(/Goblet Squat/i)).toBeVisible();
  await expect(page.getByText(/Incline Push-up/i)).toBeVisible();

  const layout = await layoutSnapshot(page);
  expect(new URL(page.url()).pathname).toBe('/dashboard/admin/workout-planner');
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(layout.bodyText).not.toMatch(/Demo Mode|Sarah Johnson|Real API integration coming soon/i);
  expect(apiState.blockedWrites).toEqual([]);
  expect(consoleErrors.filter((item) => !missionExpectedConsoleNoise(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('admin-paid-client-planner-proof-loop.png'), fullPage: false });
});
