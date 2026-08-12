/**
 * Mission QA: production dashboard crawl.
 *
 * Exercises authenticated dashboard routes in read-only mode. The crawler
 * clicks safe navigation/tab/menu controls, blocks write methods, and reports
 * console/page/network failures with enough context to repair the live surface.
 *
 * SLICE 0 (2026-08-11) — durability + honest coverage. Four defects fixed:
 *   1. A throw on any route aborted the remaining routes AND discarded the
 *      report (it was attached after the loop). Each route is now isolated and
 *      the report is flushed to disk after every one.
 *   2. Interaction truncation at `maxClicksPerRoute` was silent. It is now an
 *      explicit finding naming the count not exercised.
 *   3. Missing auth state silently skipped, so an untested run reported green.
 *      It is now a hard failure unless explicitly opted out of.
 *   4. Coverage was never reported. `visited / total` is now always printed and
 *      routes the crawl never reached fail the assertion.
 */

import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { roleRoutes, type DashboardRole } from './production-dashboard-crawl.routes';
import {
  NO_ISSUES,
  attachCrawlReport,
  compactIssues,
  createCrawlState,
  flushCrawlReport,
  formatCoverageLine,
  overTruncationBudget,
  summarizeCoverage,
  type CrawlIssueState,
} from './production-dashboard-crawl.report';

test.describe.configure({ retries: 0 });

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

/**
 * Escape hatch for partial runs (e.g. only an admin auth state is available).
 * Defaults OFF: strict is the correct default, because a silently skipped crawl
 * is indistinguishable from a passing one in CI summary output.
 */
const allowMissingAuth = process.env.SWAN_DASHBOARD_CRAWL_ALLOW_MISSING_AUTH === '1';

function isNavigationAbort(request: { failure(): { errorText: string } | null }) {
  return /net::ERR_ABORTED|NS_BINDING_ABORTED|Target closed/i.test(request.failure()?.errorText || '');
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

  const allCandidates = await markSafeCandidates(page);
  const candidates = allCandidates.slice(0, maxClicksPerRoute);

  // Truncation is a finding, never a silent cap — otherwise an under-explored
  // page is indistinguishable from a fully exercised one.
  if (allCandidates.length > candidates.length) {
    state.truncations.push({
      route,
      exercised: candidates.length,
      skipped: allCandidates.length - candidates.length,
    });
  }

  let clicked = 0;
  for (const candidate of candidates) {
    const locator = page.locator(`[data-dashboard-crawl-id="${candidate.id}"]`).first();
    if (!(await locator.isVisible().catch(() => false))) continue;

    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    await locator.click({ timeout: 5_000 }).catch(() => undefined);
    clicked += 1;
    state.clicks.push({ role, route, label: candidate.label, url: page.url() });
    await page.keyboard.press('Escape').catch(() => undefined);
    await settle(page);

    if (new URL(page.url()).pathname !== new URL(route, page.url()).pathname) {
      await gotoRoute(page, route);
      await settle(page);
    }
  }

  await page.screenshot({ path: testInfo.outputPath(`${role}-${route.replace(/[^a-z0-9]+/gi, '-')}.png`), fullPage: false })
    .catch(() => undefined);

  return clicked;
}

function missingAuthMessage(role: DashboardRole) {
  return `No production auth state for "${role}" (set SWAN_PROD_${role.toUpperCase()}_AUTH_STATE). `
    + 'A crawl that cannot authenticate has tested nothing, so failing loudly rather than '
    + 'reporting green. Set SWAN_DASHBOARD_CRAWL_ALLOW_MISSING_AUTH=1 to downgrade to a skip '
    + 'for deliberate partial runs.';
}

function declareRoleCrawl(role: DashboardRole) {
  test.describe(`${role} production dashboard crawl`, () => {
    test.use({ storageState: authStates[role] || { cookies: [], origins: [] } });

    test(`@mission @prod-live-readonly @readonly @dashboard-crawl ${role} dashboard has no actionable console errors`, async ({ page }, testInfo) => {
      test.setTimeout(crawlTimeoutMs);

      if (!authStates[role]) {
        // Strict by default (fix 3). Opt-out is explicit and named in the message.
        test.skip(allowMissingAuth, missingAuthMessage(role));
        throw new Error(missingAuthMessage(role));
      }

      expect(process.env.SWAN_MISSION_QA_LIVE_API || '0').toBe('1');
      expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('0');

      const routes = roleRoutes[role];
      // An empty route table would satisfy every other assertion vacuously and
      // report `0/0 routes visited · complete` — the same "green on nothing"
      // failure as a missing auth state. The manifest decaying to empty must be
      // loud, not a pass.
      expect(
        routes.length,
        `${role}: route table is empty. A crawl with no routes would report success `
        + 'having tested nothing.',
      ).toBeGreaterThan(0);

      const state = createCrawlState();
      await installReadOnlyGuard(page, state);

      for (const route of routes) {
        // Fix 1: one bad route can no longer end the crawl or destroy evidence.
        try {
          const clicks = await crawlRoute(page, state, role, route, testInfo);
          state.routeResults.push({ route, status: 'visited', clicks });
        } catch (error) {
          state.routeResults.push({
            route,
            status: 'failed',
            clicks: 0,
            error: error instanceof Error ? error.message.split('\n')[0] : String(error),
          });
        }
        // Fix 1 (cont.): crash-durable — evidence survives even a hard abort.
        flushCrawlReport(testInfo, state, role, routes);
      }

      const summary = summarizeCoverage(role, routes.length, state);
      // Fix 4: coverage is always visible; a partial run cannot look like a full one.
      // eslint-disable-next-line no-console
      console.log(formatCoverageLine(summary));

      await attachCrawlReport(testInfo, state, role, routes);

      // Fix 2: truncation FAILS by default. If it only reported, the cheapest way
      // to keep the suite green would be to let pages outgrow the budget — the
      // same incentive that produced the console-noise suppression list. The
      // allowance is a number someone must deliberately raise, so coverage debt
      // is visible and costed rather than silent.
      const allowedTruncations = Number(process.env.SWAN_DASHBOARD_CRAWL_ALLOWED_TRUNCATIONS || '0');
      expect(
        overTruncationBudget(state.truncations, allowedTruncations),
        `${role}: ${state.truncations.length} route(s) exceeded the ${maxClicksPerRoute}-interaction `
        + `budget (allowance ${allowedTruncations}), so part of each page was never exercised. `
        + 'Raise SWAN_DASHBOARD_CRAWL_MAX_CLICKS_PER_ROUTE to cover them, or set '
        + 'SWAN_DASHBOARD_CRAWL_ALLOWED_TRUNCATIONS to acknowledge the debt explicitly.',
      ).toEqual([]);

      expect(compactIssues(state, routes)).toEqual(NO_ISSUES);
    });
  });
}

declareRoleCrawl('admin');
declareRoleCrawl('trainer');
declareRoleCrawl('client');
declareRoleCrawl('user');
