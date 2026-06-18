/**
 * Mission QA: production dashboard crawl.
 *
 * Exercises authenticated dashboard routes in read-only mode. The crawler
 * clicks safe navigation/tab/menu controls, blocks write methods, and reports
 * console/page/network failures with enough context to repair the live surface.
 */

import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { roleRoutes, type DashboardRole } from './production-dashboard-crawl.routes';

test.describe.configure({ retries: 0 });

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

const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const unsafeClickPattern = /\b(delete|remove|submit|save|send|share|post|upload|logout|log out|sign out|checkout|pay|buy|purchase|confirm|approve|archive|block|charge|grant|revoke|publish|enable|disable|start|join|assign|allocate|arm|run|launch)\b/i;
const maxClicksPerRoute = Number(process.env.SWAN_DASHBOARD_CRAWL_MAX_CLICKS_PER_ROUTE || '24');
const crawlTimeoutMs = Number(process.env.SWAN_DASHBOARD_CRAWL_TEST_TIMEOUT_MS || '600000');
const networkIdleTimeoutMs = Number(process.env.SWAN_DASHBOARD_CRAWL_NETWORK_IDLE_TIMEOUT_MS || '1000');
const settleDelayMs = Number(process.env.SWAN_DASHBOARD_CRAWL_SETTLE_MS || '125');

function isSocketPollingUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.pathname === '/socket.io/' && url.searchParams.get('transport') === 'polling';
  } catch {
    return false;
  }
}

function isNavigationAbort(request: { failure(): { errorText: string } | null }) {
  return /net::ERR_ABORTED|NS_BINDING_ABORTED|Target closed/i.test(request.failure()?.errorText || '');
}

function allowedConsoleNoise(message: string, state: CrawlIssueState) {
  if (/preloaded using link preload/i.test(message)) return true;
  if (/Service Worker: PWA functionality temporarily disabled/i.test(message)) return true;
  if (/Failed to load resource: the server responded with a status of 400/i.test(message)) {
    return state.requestFailures.some(isSocketPollingUrl) || state.readFailures.some((entry) => /\/socket\.io\//.test(entry));
  }
  if (/Failed to load resource: the server responded with a status of 405/i.test(message)) {
    return state.blockedWrites.length > 0;
  }
  return false;
}

function compactIssues(state: CrawlIssueState) {
  return {
    readFailures: state.readFailures,
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
    if (isNavigationAbort(request)) return;
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
    if (endpoint === '/socket.io/') return route.continue();
    state.blockedWrites.push(`${request.method()} ${endpoint}`);
    if (request.method() === 'POST' && endpoint === '/api/dashboard/track-pageview') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({
      status: 405,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'Dashboard crawl read-only write blocked' }),
    });
  });
}

async function settle(page: Page) {
  if (networkIdleTimeoutMs > 0) {
    await page.waitForLoadState('networkidle', { timeout: networkIdleTimeoutMs }).catch(() => undefined);
  }
  if (settleDelayMs > 0) {
    await page.waitForTimeout(settleDelayMs);
  }
}

async function gotoRoute(page: Page, route: string) {
  try {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/ERR_ABORTED|frame was detached/i.test(message)) throw error;
    await page.waitForTimeout(500).catch(() => undefined);
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  }
}

async function assertDashboardRouteLoaded(page: Page, bodyText: string) {
  const currentPath = new URL(page.url()).pathname;
  expect(currentPath).not.toMatch(/^\/(?:login|signin|sign-in)$/i);
  expect(bodyText).not.toMatch(/\b404\b|page not found/i);
}

async function markSafeCandidates(page: Page): Promise<CrawlCandidate[]> {
  return page.evaluate(({ unsafe }) => {
    const unsafePattern = new RegExp(unsafe, 'i');
    const currentPath = window.location.pathname;
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
      .filter((candidate) => {
        if (!candidate.href) return true;
        const href = new URL(candidate.href);
        return href.origin === window.location.origin && href.pathname === currentPath;
      });
  }, { unsafe: unsafeClickPattern.source });
}

async function crawlRoute(page: Page, state: CrawlIssueState, role: DashboardRole, route: string, testInfo: TestInfo) {
  await gotoRoute(page, route);
  await settle(page);

  const bodyText = await page.locator('body').innerText({ timeout: 20_000 }).catch(() => '');
  await assertDashboardRouteLoaded(page, bodyText);

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
      await gotoRoute(page, route);
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
      test.setTimeout(crawlTimeoutMs);
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
