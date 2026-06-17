/**
 * Mission QA: production dashboard crawl.
 *
 * Exercises authenticated dashboard routes in read-only mode. The crawler
 * clicks safe navigation/tab/menu controls, blocks write methods, and reports
 * console/page/network failures with enough context to repair the live surface.
 */

import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';

test.describe.configure({ retries: 0 });

type DashboardRole = 'admin' | 'trainer' | 'client' | 'user';

interface CrawlIssueState {
  blockedWrites: string[];
  readFailures: string[];
  requestFailures: string[];
  consoleErrors: string[];
  pageErrors: string[];
  clicks: Array<{ role: DashboardRole; route: string; label: string; url: string }>;
}

interface CrawlCandidate {
  id: string;
  label: string;
  href: string | null;
  role: string;
}

const authStates: Record<DashboardRole, string | undefined> = {
  admin: process.env.SWAN_PROD_ADMIN_AUTH_STATE,
  trainer: process.env.SWAN_PROD_TRAINER_AUTH_STATE,
  client: process.env.SWAN_PROD_CLIENT_AUTH_STATE || process.env.SWAN_PROD_AUTH_STATE,
  user: process.env.SWAN_PROD_USER_AUTH_STATE,
};

const roleRoutes: Record<DashboardRole, string[]> = {
  admin: [
    '/dashboard/admin',
    '/dashboard/admin/coach-assistant',
    '/dashboard/admin/overview',
    '/dashboard/admin/messages',
    '/dashboard/admin/client-management',
    '/dashboard/admin/client-management?intent=log_workout',
    '/dashboard/admin/client-management?intent=plan_next',
    '/dashboard/admin/waivers',
    '/dashboard/admin/admin-sessions',
    '/dashboard/admin/master-schedule',
    '/dashboard/admin/workout-planner',
    '/dashboard/admin/bootcamp',
    '/dashboard/admin/equipment',
    '/dashboard/admin/body-map',
    '/dashboard/admin/meal-planner',
    '/dashboard/admin/admin-packages',
    '/dashboard/admin/pending-orders',
    '/dashboard/admin/revenue',
    '/dashboard/admin/marketing',
    '/dashboard/admin/gamification',
    '/dashboard/admin/content',
    '/dashboard/admin/security',
    '/dashboard/admin/style-guide',
    '/dashboard/admin/badge-creator',
    '/dashboard/admin/immigration',
    '/dashboard/admin/my-home',
    '/dashboard/admin/automation',
    '/dashboard/admin/sms-logs',
    '/dashboard/admin/log-my-workout',
    '/dashboard/admin/log-workout',
  ],
  trainer: [
    '/dashboard/trainer',
    '/dashboard/trainer/overview',
    '/dashboard/trainer/clients',
    '/dashboard/trainer/log-workout',
    '/dashboard/trainer/client-progress',
    '/dashboard/trainer/assessments',
    '/dashboard/trainer/videos',
    '/dashboard/trainer/workout-forge',
    '/dashboard/trainer/plaud',
    '/dashboard/trainer/workout-planner',
    '/dashboard/trainer/meal-planner',
    '/dashboard/trainer/schedule',
    '/dashboard/trainer/messages',
    '/dashboard/trainer/live',
    '/dashboard/trainer/creators',
    '/dashboard/trainer/equipment',
    '/dashboard/trainer/bootcamp',
    '/dashboard/trainer/body-map',
    '/dashboard/trainer/sprint-planner',
    '/dashboard/trainer/video-call',
    '/dashboard/trainer/my-home',
    '/dashboard/trainer/coach-assistant',
    '/dashboard/trainer/virtual-olympics',
  ],
  client: [
    '/dashboard/client',
    '/dashboard/client/overview',
    '/dashboard/client/onboarding',
    '/dashboard/client/workouts',
    '/dashboard/client/log-workout',
    '/dashboard/client/progress',
    '/dashboard/client/progress/detailed',
    '/dashboard/client/ai-consent',
    '/dashboard/client/meal-planner',
    '/dashboard/client/schedule',
    '/dashboard/client/community',
    '/dashboard/client/messages',
    '/dashboard/client/live',
    '/dashboard/client/creators',
    '/dashboard/client/profile',
    '/dashboard/client/rewards',
    '/dashboard/client/body-map',
    '/dashboard/client/my-home',
    '/dashboard/client/coach-assistant',
    '/dashboard/client/virtual-olympics',
  ],
  user: [
    '/user-dashboard',
    '/user-dashboard/reels',
    '/user-dashboard/friends',
    '/user-dashboard/challenges',
    '/user-dashboard/notifications',
    '/user-dashboard/creative',
    '/user-dashboard/photos',
    '/user-dashboard/about',
    '/user-dashboard/activity',
    '/user-dashboard/nutrition',
    '/user-dashboard/progress',
    '/user-dashboard/profile',
  ],
};

const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const unsafeClickPattern = /\b(delete|remove|submit|save|send|share|post|upload|logout|log out|sign out|checkout|pay|buy|purchase|confirm|approve|archive|block|charge|grant|revoke|publish|enable|disable|start|join|assign|allocate|arm|run|launch)\b/i;
const maxClicksPerRoute = Number(process.env.SWAN_DASHBOARD_CRAWL_MAX_CLICKS_PER_ROUTE || '24');

function allowedReadFailure(entry: string) {
  return /^401 GET \/api\/subscriptions\/status$/.test(entry);
}

function isSocketPollingUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.pathname === '/socket.io/' && url.searchParams.get('transport') === 'polling';
  } catch {
    return false;
  }
}

function allowedConsoleNoise(message: string, state: CrawlIssueState) {
  if (/preloaded using link preload/i.test(message)) return true;
  if (/Service Worker: PWA functionality temporarily disabled/i.test(message)) return true;
  if (/\/api\/subscriptions\/status/i.test(message) && /401|Request failed|ERR_BAD_RESPONSE|Response error/i.test(message)) {
    return true;
  }
  if (/Failed to load resource: the server responded with a status of 401/i.test(message)) {
    return state.readFailures.every(allowedReadFailure);
  }
  if (/Failed to load resource: the server responded with a status of 400/i.test(message)) {
    return state.requestFailures.some(isSocketPollingUrl) || state.readFailures.some((entry) => /\/socket\.io\//.test(entry));
  }
  return false;
}

function compactIssues(state: CrawlIssueState) {
  return {
    readFailures: state.readFailures.filter((entry) => !allowedReadFailure(entry)),
    requestFailures: state.requestFailures.filter((entry) => !isSocketPollingUrl(entry)),
    consoleErrors: state.consoleErrors.filter((entry) => !allowedConsoleNoise(entry, state)),
    pageErrors: state.pageErrors,
    blockedWrites: state.blockedWrites.filter((entry) => !/^POST \/api\/dashboard\/track-pageview$/.test(entry)),
  };
}

async function installReadOnlyGuard(page: Page, state: CrawlIssueState) {
  page.on('console', (message) => {
    if (message.type() === 'error') state.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => state.pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    state.requestFailures.push(request.url());
  });
  page.on('response', (response) => {
    const request = response.request();
    if (writeMethods.has(request.method()) || response.status() < 400) return;
    const endpoint = new URL(response.url()).pathname;
    state.readFailures.push(`${response.status()} ${request.method()} ${endpoint}`);
  });

  await page.route('**/*', async (route: Route) => {
    const request = route.request();
    if (!writeMethods.has(request.method())) return route.continue();

    const endpoint = new URL(request.url()).pathname;
    state.blockedWrites.push(`${request.method()} ${endpoint}`);
    return route.fulfill({
      status: 405,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'Dashboard crawl read-only write blocked' }),
    });
  });
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  await page.waitForTimeout(250);
}

async function markSafeCandidates(page: Page): Promise<CrawlCandidate[]> {
  return page.evaluate(({ unsafe }) => {
    const unsafePattern = new RegExp(unsafe, 'i');
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const elements = [...document.querySelectorAll<HTMLElement>('a[href],button,[role="tab"],[role="menuitem"],[role="button"],summary')];
    return elements
      .filter((element) => visible(element) && !element.hasAttribute('disabled') && element.getAttribute('aria-disabled') !== 'true')
      .map((element, index) => {
        const href = element instanceof HTMLAnchorElement ? element.href : null;
        const label = (
          element.getAttribute('aria-label')
          || element.getAttribute('title')
          || element.textContent
          || href
          || element.tagName
        ).trim().replace(/\s+/g, ' ').slice(0, 100);
        const id = `dashboard-crawl-${Date.now()}-${index}`;
        element.setAttribute('data-dashboard-crawl-id', id);
        return { id, label, href, role: element.getAttribute('role') || element.tagName.toLowerCase() };
      })
      .filter((candidate) => candidate.label && !unsafePattern.test(candidate.label))
      .filter((candidate) => !candidate.href || candidate.href.startsWith(window.location.origin));
  }, { unsafe: unsafeClickPattern.source });
}

async function crawlRoute(page: Page, state: CrawlIssueState, role: DashboardRole, route: string, testInfo: TestInfo) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await settle(page);

  const bodyText = await page.locator('body').innerText({ timeout: 20_000 }).catch(() => '');
  expect(bodyText).not.toMatch(/\b404\b|page not found|log in|sign in/i);

  const candidates = (await markSafeCandidates(page)).slice(0, maxClicksPerRoute);
  for (const candidate of candidates) {
    const locator = page.locator(`[data-dashboard-crawl-id="${candidate.id}"]`).first();
    if (!(await locator.isVisible().catch(() => false))) continue;

    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    await locator.click({ timeout: 5_000 }).catch(() => undefined);
    state.clicks.push({ role, route, label: candidate.label, url: page.url() });
    await page.keyboard.press('Escape').catch(() => undefined);
    await settle(page);

    if (new URL(page.url()).pathname !== new URL(route, page.url()).pathname) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await settle(page);
    }
  }

  await page.screenshot({ path: testInfo.outputPath(`${role}-${route.replace(/[^a-z0-9]+/gi, '-')}.png`), fullPage: false });
}

async function attachCrawlReport(testInfo: TestInfo, state: CrawlIssueState) {
  await testInfo.attach('dashboard-crawl-report.json', {
    body: JSON.stringify({ ...state, actionable: compactIssues(state) }, null, 2),
    contentType: 'application/json',
  });
}

function declareRoleCrawl(role: DashboardRole) {
  test.describe(`${role} production dashboard crawl`, () => {
    test.use({ storageState: authStates[role] || { cookies: [], origins: [] } });

    test(`@mission @prod-live-readonly @readonly @dashboard-crawl ${role} dashboard has no actionable console errors`, async ({ page }, testInfo) => {
      test.skip(!authStates[role], `Set SWAN_PROD_${role.toUpperCase()}_AUTH_STATE to crawl ${role} production dashboard.`);
      expect(process.env.SWAN_MISSION_QA_LIVE_API || '0').toBe('1');
      expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('0');

      const state: CrawlIssueState = {
        blockedWrites: [],
        readFailures: [],
        requestFailures: [],
        consoleErrors: [],
        pageErrors: [],
        clicks: [],
      };
      await installReadOnlyGuard(page, state);

      for (const route of roleRoutes[role]) {
        await crawlRoute(page, state, role, route, testInfo);
      }

      await attachCrawlReport(testInfo, state);
      expect(compactIssues(state)).toEqual({
        readFailures: [],
        requestFailures: [],
        consoleErrors: [],
        pageErrors: [],
        blockedWrites: [],
      });
    });
  });
}

declareRoleCrawl('admin');
declareRoleCrawl('trainer');
declareRoleCrawl('client');
declareRoleCrawl('user');
