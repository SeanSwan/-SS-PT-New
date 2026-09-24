/**
 * ============================================================================
 * FILE: workout-planner-async-retirement.spec.ts
 * PURPOSE: Real-browser gate for plan 58 — a delayed add lookup must not attach
 * its result to a later client scope.
 * AUTHOR: Astra slice | LAST MODIFIED: 2026-09-06
 * AI VILLAGE VALIDATED: Not requested
 * ============================================================================
 *
 * WHAT THIS FILE DOES: mounts the REAL `/dashboard/admin/workout-planner` route
 * against a locally mocked API, selects a real client in the rendered dropdown,
 * then — inside ONE synchronous browser task — dispatches the accepted
 * AI_PLANNER_ADD_EXERCISE the Coach command lane would emit AND switches the
 * real client dropdown. The lookup continuation can only run after that task,
 * so this is the deterministic browser form of "the lookup resolves after the
 * target changed". It asserts the new scope receives no row and no receipt.
 * A paired control test dispatches the same event WITHOUT a scope change and
 * asserts the row and the Added receipt DO appear, so the negative test cannot
 * pass vacuously.
 * HOW IT FITS IN THE APP: dashboard route -> WorkoutPlannerProvider ->
 * orchestration -> useWorkoutPlannerAiEvents listener -> draft owner CAS ->
 * builder rows / dock receipts. No production delay hook, no debug endpoint.
 * KEY DECISIONS: The dispatch happens through the real event bus and the real
 * mounted receiver; only the transport (`/api/**`) and the exercise library are
 * mocked, exactly as the existing planner e2e gates do.
 * NOT COVERED: the Detailed-Schedule day control needs a generated multi-week
 * plan, which this fixture does not produce; and jsdom/browser cannot widen the
 * lookup beyond the in-memory search's microtask, so the race is driven at the
 * one-task boundary rather than with an artificial delay.
 * NASM PROTOCOL CONTEXT: N/A — plan-58 lifetime contract only.
 */
import { expect, test, type Page, type Route } from '@playwright/test';

const adminUser = {
  id: 1,
  email: 'qa.admin@swanstudios.local',
  username: 'qa_admin',
  firstName: 'QA',
  lastName: 'Admin',
  role: 'admin',
  isActive: true,
};

const clients = [
  { id: 91, firstName: 'QA', lastName: 'Clientone', email: 'qa.clientone@swanstudios.local', role: 'client', canGenerateWorkoutPlans: true },
  { id: 92, firstName: 'QA', lastName: 'Clienttwo', email: 'qa.clienttwo@swanstudios.local', role: 'client', canGenerateWorkoutPlans: true },
];

const exercises = [
  {
    id: 'ab-wheel-rollout', exerciseKey: 'ab-wheel-rollout', name: 'Ab Wheel Rollout',
    exerciseType: 'core', difficulty: 360, primaryMuscles: ['core'],
    equipmentNeeded: ['Ab Wheel'], bodyPartCategory: 'core',
  },
  {
    id: '21s-bicep-curl', exerciseKey: '21s-bicep-curl', name: '21s Bicep Curl',
    exerciseType: 'isolation', difficulty: 420, primaryMuscles: ['arms'],
    equipmentNeeded: ['Barbell'], bodyPartCategory: 'arms',
  },
];

const ADDED_EXERCISE = 'Ab Wheel Rollout';

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
    if (endpoint === '/api/auth/clients') return fulfillJson(route, { success: true, clients });
    if (endpoint === '/api/exercises/library') return fulfillJson(route, { success: true, exercises });
    return fulfillJson(route, { success: true, data: [], plans: [], stats: {}, notifications: [], profiles: [] });
  });
}

/**
 * Open the mounted planner. A first load immediately after Vite re-optimizes
 * its deps can 504 the lazy Planner chunk ("Outdated Optimize Dep"), which the
 * route turns into its tab error boundary — one bounded reload clears it.
 */
async function gotoPlanner(page: Page) {
  const heading = page.getByRole('heading', { name: /workout planner/i, level: 1 });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto('/dashboard/admin/workout-planner?clientId=91', { waitUntil: 'domcontentloaded' });
    try {
      await heading.waitFor({ state: 'visible', timeout: 8000 });
      return heading;
    } catch {
      await page.waitForTimeout(750);
    }
  }
  await expect(heading).toBeVisible();
  return heading;
}

/** Open the mounted planner on client 91 with the Coach receipt feed visible. */
async function openPlannerWithDock(page: Page) {
  await gotoPlanner(page);
  const clientSelect = page.getByLabel('Select client');
  await clientSelect.selectOption('91');
  await expect(clientSelect).toHaveValue('91');
  await page.getByRole('button', { name: /open coach/i }).click();
  return { clientSelect, receiptFeed: page.getByRole('log', { name: /swan coach receipts/i }) };
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => console.log('[pageerror]', error.message));
  page.on('console', (message) => { if (message.type() === 'error') console.log('[console.error]', message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) console.log('[http]', response.status(), response.url()); });
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

test('control: an accepted add with an unchanged scope does append and does claim Added', async ({ page }) => {
  const { receiptFeed } = await openPlannerWithDock(page);

  await page.evaluate((exerciseName) => {
    window.dispatchEvent(new CustomEvent('AI_PLANNER_ADD_EXERCISE', {
      detail: { exerciseName, acknowledgeAIWorkoutEvent: () => {} },
    }));
  }, ADDED_EXERCISE);

  await expect(page.getByRole('button', { name: `Remove ${ADDED_EXERCISE}` })).toBeVisible();
  await expect(receiptFeed).toContainText(`Added ${ADDED_EXERCISE}`);
});

test('a client switch in the same task as an accepted add leaves the new scope untouched', async ({ page }, testInfo) => {
  const { clientSelect, receiptFeed } = await openPlannerWithDock(page);

  // ONE synchronous browser task: the receiver accepts the lookup, then the
  // real client dropdown publishes the new target before microtasks resume.
  const accepted = await page.evaluate((exerciseName) => {
    let handled: boolean | null = null;
    window.dispatchEvent(new CustomEvent('AI_PLANNER_ADD_EXERCISE', {
      detail: { exerciseName, acknowledgeAIWorkoutEvent: (value: boolean) => { handled = value; } },
    }));
    const select = document.querySelector('select[aria-label="Select client"]') as HTMLSelectElement | null;
    if (select) {
      select.value = '92';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return handled;
  }, ADDED_EXERCISE);
  expect(accepted).toBe(true); // the old scope DID accept the lookup
  await expect(clientSelect).toHaveValue('92');

  await page.waitForTimeout(1500); // give the retired continuation every chance to misbehave

  await expect(page.getByRole('button', { name: `Remove ${ADDED_EXERCISE}` })).toHaveCount(0);
  await expect(receiptFeed).not.toContainText(`Added ${ADDED_EXERCISE}`);
  await expect(receiptFeed).not.toContainText(/Couldn't find/);

  // Evidence shot: the switched scope's dock feed, empty of any late outcome.
  await receiptFeed.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('planner-async-retirement.png'), fullPage: false });
  await receiptFeed.screenshot({ path: testInfo.outputPath('planner-async-retirement-dock.png') });
});
