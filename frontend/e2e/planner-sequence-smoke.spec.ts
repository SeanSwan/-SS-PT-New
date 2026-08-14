/**
 * Planner sequencing brain — real-browser smoke (unified-brain Slice 5/6).
 * Network-stubbed like admin-workout-surfaces-protected-smoke: mocked auth +
 * API routes against the local Vite server, no production data, no real
 * credentials. The backend half of the seam (deterministic router → typed
 * FRONTEND_DISPATCH) is covered by Supertest; this spec drives the browser
 * half end-to-end: dock submit → dispatch → sequence engine → visible reorder
 * receipt with one-tap Undo → guarded undo.
 */
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
    id: '21s-bicep-curl', exerciseKey: '21s-bicep-curl', name: '21s Bicep Curl',
    exerciseType: 'isolation', difficulty: 420, primaryMuscles: ['arms'],
    equipmentNeeded: ['Barbell'], bodyPartCategory: 'arms',
  },
  {
    id: 'ab-wheel-rollout', exerciseKey: 'ab-wheel-rollout', name: 'Ab Wheel Rollout',
    exerciseType: 'core', difficulty: 360, primaryMuscles: ['core'],
    equipmentNeeded: ['Ab Wheel'], bodyPartCategory: 'core',
  },
  {
    id: '360-jump', exerciseKey: '360-jump', name: '360 Jump',
    exerciseType: 'compound', difficulty: 620, primaryMuscles: ['cardio'],
    equipmentNeeded: ['Bodyweight'], bodyPartCategory: 'cardio',
  },
];

function jwt() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }),
    'qa-signature',
  ].join('.');
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockPlannerApi(page: Page) {
  await page.route('**/health**', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;
    if (!endpoint.startsWith('/api/')) return route.continue();

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/auth/clients') return fulfillJson(route, { success: true, clients: [qaClient] });
    if (endpoint === '/api/exercises/library') return fulfillJson(route, { success: true, exercises });
    if (endpoint === '/api/ai-command/execute') {
      const body = route.request().postDataJSON() as { message?: string };
      // Mirror of the verified Supertest contract: a direct rearrangement
      // imperative on the Planner returns the typed FRONTEND_DISPATCH
      // envelope from the deterministic router (no LLM, no chat fallback).
      return fulfillJson(route, {
        success: true,
        type: 'frontend_dispatch',
        command: 'planner_rearrange_workout',
        event: 'AI_PLANNER_REARRANGE',
        payload: { instruction: body?.message ?? '' },
        message: 'Sent to the active workout surface.',
        fallbackToChat: false,
      });
    }

    return fulfillJson(route, { success: true, data: [], plans: [], stats: {}, notifications: [] });
  });
}

test.beforeEach(async ({ page }) => {
  await mockPlannerApi(page);
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: adminUser },
  );
});

test('rearrange command reorders the draft, shows an Undo receipt, and undo restores it', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/dashboard/admin/workout-planner', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /workout planner/i, level: 1 })).toBeVisible();

  await page.getByLabel('Select client').selectOption('91');

  // Build a deliberately mis-ordered draft: isolation → core → power/compound.
  await page.getByRole('button', { name: 'Add 21s Bicep Curl' }).click();
  await page.getByRole('button', { name: 'Add Ab Wheel Rollout' }).click();
  await page.getByRole('button', { name: 'Add 360 Jump' }).click();

  await page.getByRole('button', { name: /open coach/i }).click();
  await page.getByLabel('Tell Swan Coach what to change').fill('Rearrange this workout into the best order.');
  await page.getByRole('button', { name: 'Send to Swan Coach' }).click();

  const receiptFeed = page.getByRole('log', { name: /swan coach receipts/i });
  await expect(receiptFeed).toContainText(/Reordered 3 exercises/i);
  await expect(receiptFeed).toContainText('360 Jump #3→#1');
  await page.screenshot({ path: testInfo.outputPath('planner-sequence-receipt.png'), fullPage: false });

  await receiptFeed.getByRole('button', { name: 'Undo' }).click();
  await expect(receiptFeed).toContainText('Rearrangement undone.');

  expect(consoleErrors.filter((item) => !isSuppressedProductNoise(item))).toEqual([]);
});
