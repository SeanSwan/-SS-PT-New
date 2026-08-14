import { expect, test, type Page, type Route } from '@playwright/test';
import { isSuppressedProductNoise } from './mission/productNoise';

const trainerUser = {
  id: 7,
  email: 'qa.trainer@swanstudios.local',
  username: 'qa_trainer',
  firstName: 'QA',
  lastName: 'Trainer',
  role: 'trainer',
  isActive: true,
};

const assignment = {
  id: 9001,
  trainerId: trainerUser.id,
  status: 'active',
  assignedAt: '2026-05-22T12:00:00.000Z',
  client: {
    id: 81,
    firstName: 'QA',
    lastName: 'Assigned',
    email: 'assigned.client@swanstudios.local',
    availableSessions: 4,
    phone: null,
    membershipLevel: 'basic',
    totalWorkouts: 1,
    lastWorkout: { completedAt: '2026-05-20T12:00:00.000Z' },
    createdAt: '2026-05-22T12:00:00.000Z',
  },
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

async function seedTrainerAuth(page: Page) {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: trainerUser },
  );
}

async function mockTrainerClientsApi(page: Page, options: { assignmentsStatus?: number } = {}) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;

    if (endpoint === '/api/cart') return fulfillJson(route, { id: 1, status: 'active', items: [], total: 0, totalSessions: 0 });

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: trainerUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: trainerUser });
    if (endpoint === '/api/client-trainer-assignments/trainer/7') {
      if (options.assignmentsStatus) {
        return fulfillJson(route, { success: false, message: 'Failed to fetch trainer assignments' }, options.assignmentsStatus);
      }
      return fulfillJson(route, { success: true, assignments: [assignment], totalClients: 1 });
    }
    if (endpoint === '/api/sessions/history/81') {
      return fulfillJson(route, [{ id: 1, status: 'completed', sessionDate: '2026-05-20T12:00:00.000Z' }]);
    }
    if (endpoint === '/api/sessions/upcoming/81') return fulfillJson(route, []);

    return fulfillJson(route, { success: true, data: [], clients: [], stats: {}, notifications: [] });
  });
}

function collectUnexpectedConsoleErrors(page: Page) {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  return consoleErrors;
}

async function layoutSnapshot(page: Page) {
  return page.evaluate(() => ({
    bodyText: document.body.innerText,
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
}

test('trainer My Clients renders live assignments without demo wrapper data', async ({ page }, testInfo) => {
  const consoleErrors = collectUnexpectedConsoleErrors(page);
  await seedTrainerAuth(page);
  await mockTrainerClientsApi(page);

  await page.goto('/dashboard/trainer/clients', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('region', { name: /client roster/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /open qa assigned/i })).toBeVisible();
  await expect(page.getByText(/Workout Proof/i)).toBeVisible();
  await expect(page.getByText(/1 logged/i)).toBeVisible();
  await expect(page.getByText(/Last logged:/i)).toBeVisible();
  await expect(page.getByText(/(?:Assigned|Joined) (?:Today|Yesterday|\d+ (?:days|weeks|months) ago)/i)).toBeVisible();
  await expect(page.getByText(/NaN/i)).toHaveCount(0);
  await expect(page.getByText(/Demo Mode|View Demo Data|Sarah Johnson|sarah\.j@demo\.com|Real API integration coming soon/i)).toHaveCount(0);

  const layout = await layoutSnapshot(page);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(consoleErrors.filter((item) => !isSuppressedProductNoise(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('trainer-my-clients-live-truth-smoke.png'), fullPage: false });
});

test('trainer My Clients shows an honest API error instead of demo clients', async ({ page }, testInfo) => {
  const consoleErrors = collectUnexpectedConsoleErrors(page);
  await seedTrainerAuth(page);
  await mockTrainerClientsApi(page, { assignmentsStatus: 500 });

  await page.goto('/dashboard/trainer/clients', { waitUntil: 'domcontentloaded' });

  const errorAlert = page.getByRole('alert');
  await expect(errorAlert).toContainText(/couldn't load your client roster/i);
  await expect(page.getByText(/failed to fetch trainer assignments/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /try again/i })).toHaveCount(0);
  await expect(page.getByText(/Demo Mode|View Demo Data|Sarah Johnson|sarah\.j@demo\.com|Demo Client Assignments/i)).toHaveCount(0);

  const layout = await layoutSnapshot(page);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !isSuppressedProductNoise(item)
    && !/Failed to load resource: the server responded with a status of 500/i.test(item)
    && !/\[ClientHub\] roster load failed/i.test(item)
    && !/Error loading clients:/i.test(item)
    && !/\[GlobalClientContext\] Failed to fetch clients:/i.test(item)
    && !/\/api\/client-trainer-assignments\/trainer\/7/i.test(item)
  ));
  expect(unexpectedConsoleErrors).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('trainer-my-clients-error-truth-smoke.png'), fullPage: false });
});
