/**
 * Mission QA: production live read-only checks.
 *
 * This spec hits sswanstudios.com with real GET requests. It blocks every write
 * method so it can verify production behavior without mutating orders, sessions,
 * schedules, posts, workouts, or client data.
 */

import { expect, test, type Page, type Route } from '@playwright/test';
import { isBenignBeaconRequest, isBenignWriteBeacon, mentionsBenignBeacon } from './benignBeacons';

test.describe.configure({ retries: 0 });

interface LiveApiState {
  readFailures: string[];
  blockedWrites: string[];
}

const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const legacyClientAuthState = process.env.SWAN_PROD_AUTH_STATE;
const adminAuthState = process.env.SWAN_PROD_ADMIN_AUTH_STATE;
const trainerAuthState = process.env.SWAN_PROD_TRAINER_AUTH_STATE;
const clientAuthState = process.env.SWAN_PROD_CLIENT_AUTH_STATE || legacyClientAuthState;

function expectedConsoleNoise(message: string, state: LiveApiState) {
  if (/preloaded using link preload/i.test(message)) return true;
  if (/Service Worker: PWA functionality temporarily disabled/i.test(message)) return true;
  // Transport noise from a registered beacon. Registry-driven for the same reason
  // the write allowlist is: hardcoding ONE endpoint here meant a second beacon's
  // noise was never covered, and a stale suppression silences by accident.
  if (mentionsBenignBeacon(message) && /405|Request failed|ERR_BAD_RESPONSE|Response error/i.test(message)) {
    return true;
  }
  if (/Failed to load resource: the server responded with a status of 405/i.test(message)) {
    return state.blockedWrites.length > 0
      && state.blockedWrites.every((entry) => allowedBlockedWrite(entry));
  }

  return false;
}

function allowedBlockedWrite(entry: string) {
  return isBenignWriteBeacon(entry);
}

async function fulfillWriteBlock(route: Route, state: LiveApiState, endpoint: string) {
  state.blockedWrites.push(`${route.request().method()} ${endpoint}`);
  // Still blocked — QA traffic must never pollute production analytics — but
  // answered 204 like the real endpoint so the app's error path stays quiet.
  if (isBenignBeaconRequest(route.request().method(), endpoint)) {
    await route.fulfill({ status: 204, body: '' });
    return;
  }
  await route.fulfill({
    status: 405,
    contentType: 'application/json',
    body: JSON.stringify({ success: false, message: 'Mission QA production read-only write blocked' }),
  });
}

async function installProductionReadOnlyGuard(page: Page, state: LiveApiState) {
  page.on('response', (response) => {
    const request = response.request();
    if (writeMethods.has(request.method()) || response.status() < 400) return;
    state.readFailures.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;

    if (writeMethods.has(request.method())) {
      return fulfillWriteBlock(route, state, endpoint);
    }

    return route.continue();
  });
}

function watchProductionConsole(page: Page) {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  return consoleErrors;
}

async function settleProductionPage(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
}

async function visibleBodyText(page: Page) {
  return page.locator('body').innerText({ timeout: 30_000 });
}

async function assertReadOnlyState(state: LiveApiState, consoleErrors: string[]) {
  expect(state.blockedWrites.filter((entry) => !allowedBlockedWrite(entry))).toEqual([]);
  expect(state.readFailures).toEqual([]);
  expect(consoleErrors.filter((item) => !expectedConsoleNoise(item, state))).toEqual([]);
}

async function openLiveReadOnlyPage(page: Page, apiState: LiveApiState, pathName: string) {
  const consoleErrors = watchProductionConsole(page);
  await installProductionReadOnlyGuard(page, apiState);
  await page.goto(pathName, { waitUntil: 'domcontentloaded' });
  await settleProductionPage(page);
  return consoleErrors;
}

async function assertAuthenticatedRoute(
  page: Page,
  apiState: LiveApiState,
  consoleErrors: string[],
  expectedText: RegExp,
) {
  const bodyText = await visibleBodyText(page);
  const layout = await page.evaluate(() => ({
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    pathname: window.location.pathname,
  }));

  expect(layout.pathname).not.toMatch(/login/i);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(bodyText).toMatch(expectedText);
  expect(bodyText).not.toMatch(/demo mode|Sarah Johnson|Real API integration coming soon/i);
  expect(bodyText).not.toMatch(/log in|sign in/i);
  await assertReadOnlyState(apiState, consoleErrors);
}

test('@mission @prod-live-readonly @readonly public store renders from production without writes', async ({ page }, testInfo) => {
  expect(process.env.SWAN_MISSION_QA_LIVE_API || '0').toBe('1');
  expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('0');

  const apiState: LiveApiState = { readFailures: [], blockedWrites: [] };
  const consoleErrors = watchProductionConsole(page);
  await installProductionReadOnlyGuard(page, apiState);

  await page.goto('/store', { waitUntil: 'domcontentloaded' });
  await settleProductionPage(page);

  const bodyText = await visibleBodyText(page);
  const layout = await page.evaluate(() => ({
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    pathname: window.location.pathname,
  }));

  expect(layout.pathname).not.toMatch(/login/i);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(bodyText).toMatch(/SwanStudios Store|Store|Session|Package|Training/i);
  expect(bodyText).not.toMatch(/\b404\b|page not found/i);
  await assertReadOnlyState(apiState, consoleErrors);

  await page.screenshot({ path: testInfo.outputPath('production-store-live-readonly.png'), fullPage: false });
});

test('@mission @prod-live-readonly @readonly protected client dashboard does not leak without auth state', async ({ page }, testInfo) => {
  expect(process.env.SWAN_MISSION_QA_LIVE_API || '0').toBe('1');
  expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('0');

  const apiState: LiveApiState = { readFailures: [], blockedWrites: [] };
  const consoleErrors = watchProductionConsole(page);
  await installProductionReadOnlyGuard(page, apiState);

  await page.goto('/dashboard/client/overview', { waitUntil: 'domcontentloaded' });
  await settleProductionPage(page);

  const bodyText = await visibleBodyText(page);
  const location = new URL(page.url());
  const authSurface = `${location.pathname} ${bodyText}`;

  expect(authSurface).toMatch(/login|log in|sign in/i);
  expect(bodyText).not.toMatch(/current workout|today's assignment|progress overview - 12 of 12/i);
  await assertReadOnlyState(apiState, consoleErrors);

  await page.screenshot({ path: testInfo.outputPath('production-protected-dashboard-no-auth.png'), fullPage: false });
});

test.describe('admin production live read-only checks', () => {
  test.use({ storageState: adminAuthState || { cookies: [], origins: [] } });

  test('@mission @prod-live-readonly @readonly admin auth can reach production command surface', async ({ page }, testInfo) => {
    test.skip(!adminAuthState, 'Set SWAN_PROD_ADMIN_AUTH_STATE to a local Playwright storage-state file.');
    expect(process.env.SWAN_MISSION_QA_LIVE_API || '0').toBe('1');
    expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('0');

    const apiState: LiveApiState = { readFailures: [], blockedWrites: [] };
    const consoleErrors = await openLiveReadOnlyPage(page, apiState, '/dashboard/admin');
    await assertAuthenticatedRoute(page, apiState, consoleErrors, /admin|dashboard|clients|workout|schedule|revenue/i);

    await page.screenshot({ path: testInfo.outputPath('production-admin-live-readonly.png'), fullPage: false });
  });
});

test.describe('trainer production live read-only checks', () => {
  test.use({ storageState: trainerAuthState || { cookies: [], origins: [] } });

  test('@mission @prod-live-readonly @readonly trainer auth can reach client workflow surface', async ({ page }, testInfo) => {
    test.skip(!trainerAuthState, 'Set SWAN_PROD_TRAINER_AUTH_STATE to a local Playwright storage-state file.');
    expect(process.env.SWAN_MISSION_QA_LIVE_API || '0').toBe('1');
    expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('0');

    const apiState: LiveApiState = { readFailures: [], blockedWrites: [] };
    const consoleErrors = await openLiveReadOnlyPage(page, apiState, '/dashboard/trainer/clients');
    await assertAuthenticatedRoute(page, apiState, consoleErrors, /trainer|clients|my clients|workout|schedule/i);

    await page.screenshot({ path: testInfo.outputPath('production-trainer-clients-live-readonly.png'), fullPage: false });
  });
});

test.describe('client production live read-only checks', () => {
  test.use({ storageState: clientAuthState || { cookies: [], origins: [] } });

  test('@mission @prod-live-readonly @readonly client auth can reach progress-first dashboard', async ({ page }, testInfo) => {
    test.skip(!clientAuthState, 'Set SWAN_PROD_CLIENT_AUTH_STATE or SWAN_PROD_AUTH_STATE to a local Playwright storage-state file.');
    expect(process.env.SWAN_MISSION_QA_LIVE_API || '0').toBe('1');
    expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('0');

    const apiState: LiveApiState = { readFailures: [], blockedWrites: [] };
    const overviewConsoleErrors = await openLiveReadOnlyPage(page, apiState, '/dashboard/client/overview');
    await assertAuthenticatedRoute(page, apiState, overviewConsoleErrors, /workout|dashboard|assignment|progress/i);

    await page.goto('/dashboard/client/progress', { waitUntil: 'domcontentloaded' });
    await settleProductionPage(page);
    await assertAuthenticatedRoute(page, apiState, overviewConsoleErrors, /progress|chart|workout|stats/i);

    await page.screenshot({ path: testInfo.outputPath('production-client-progress-live-readonly.png'), fullPage: false });
  });
});
