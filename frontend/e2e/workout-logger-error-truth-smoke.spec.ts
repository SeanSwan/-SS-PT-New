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

async function mockWorkoutLoggerApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;

    if (endpoint === '/api/cart') return fulfillJson(route, { id: 1, status: 'active', items: [], total: 0, totalSessions: 0 });

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: trainerUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: trainerUser });
    if (endpoint === '/api/workout-forms/client/77/info') {
      return fulfillJson(route, { success: false, message: 'Client not available for trainer' }, 403);
    }

    return fulfillJson(route, { success: true, data: [], stats: {}, notifications: [] });
  });
}

async function inspectLayout(page: Page) {
  return page.evaluate(() => ({
    bodyText: document.body.innerText,
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
}

type FailedResource = {
  status: number;
  url: string;
};

function isKnownRealtimeTransportNoise(message: string, failedResources: FailedResource[]) {
  if (!/Failed to load resource: the server responded with a status of 400/i.test(message)) return false;

  return failedResources.some((resource) => {
    if (resource.status !== 400) return false;

    const url = new URL(resource.url);
    return url.pathname === '/socket.io/' && url.searchParams.get('transport') === 'polling';
  });
}

test('trainer workout logger failed client load does not fall back to demo mode', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const failedResources: FailedResource[] = [];

  await mockWorkoutLoggerApi(page);
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: trainerUser },
  );

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failedResources.push({ status: response.status(), url: response.url() });
  });

  await page.goto('/dashboard/trainer/log-workout?clientId=77', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /workout logging error/i })).toBeVisible();
  await expect(page.locator('p').filter({ hasText: /client workout data could not be loaded/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /back to my clients/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();

  await expect(page.getByRole('button', { name: /start demo workout/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /try full logger/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /back to demo/i })).toHaveCount(0);
  await expect(page.getByText(/workout logger ready|demo mode|Sarah Johnson|sarah\.j@demo\.com/i)).toHaveCount(0);

  const layout = await inspectLayout(page);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !isSuppressedProductNoise(item)
    && !/Failed to load resource: the server responded with a status of 403/i.test(item)
    && !/\/api\/workout-forms\/client\/77\/info/i.test(item)
    && !isKnownRealtimeTransportNoise(item, failedResources)
  ));
  expect(unexpectedConsoleErrors).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('workout-logger-error-truth-smoke.png'), fullPage: false });
});
