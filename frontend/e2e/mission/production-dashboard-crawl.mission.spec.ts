/**
 * Mission QA: production dashboard crawl. Walks authenticated dashboard routes
 * read-only, clicking safe controls and reporting console/page/network failures.
 *
 * Slices 0-1 made it durable and its reporting honest; rationale lives in
 * production-dashboard-crawl.report.ts, crawlWorklist.ts and qaFindings.ts.
 */

import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { roleRoutes, type DashboardRole } from './production-dashboard-crawl.routes';
import { isBenignBeaconRequest } from './benignBeacons';
import {
  NO_ISSUES,
  closeIssueCursor,
  compactIssues,
  createCrawlState,
  formatCoverageLine,
  markIssueCursor,
  overTruncationBudget,
  summarizeCoverage,
  type CrawlIssueState,
} from './production-dashboard-crawl.report';
import { attachCrawlReport, buildWorklist, flushCrawlReport, formatWorklist } from './crawlWorklist';
import { QA_SUPPRESSIONS } from './qaSuppressions';
import {
  inDateSuppressionMatcher,
} from './qaSuppressions.audit';

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

// Escape hatch for partial runs. OFF by default: a silently skipped crawl is
// indistinguishable from a passing one in CI summary output.
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
    // Registered beacons are still BLOCKED (QA traffic must never reach production
    // analytics), but answered 204 like the real endpoint so the app's own error
    // path never fires and invents console noise the audit would then report.
    if (isBenignBeaconRequest(request.method(), endpoint)) {
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
    + 'A crawl that cannot authenticate has tested nothing, so this fails loudly rather than '
    + 'reporting green. SWAN_DASHBOARD_CRAWL_ALLOW_MISSING_AUTH=1 downgrades it to a skip.';
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
      // Captured ONCE: per-call expiry could straddle midnight UTC mid-crawl.
      const today = new Date().toISOString().slice(0, 10);
      const isSuppressed = inDateSuppressionMatcher(QA_SUPPRESSIONS, today);
      // An empty route table satisfies every other assertion vacuously and reports
      // `0/0 · complete` — the same green-on-nothing failure as missing auth.
      expect(
        routes.length,
        `${role}: route table is empty. A crawl with no routes would report success `
        + 'having tested nothing.',
      ).toBeGreaterThan(0);

      const state = createCrawlState();
      await installReadOnlyGuard(page, state);

      for (const route of routes) {
          const cursor = markIssueCursor(state);  // attribute what this route emits
        try {  // Fix 1: one bad route cannot end the crawl or destroy evidence.
          const clicks = await crawlRoute(page, state, role, route, testInfo);
          state.routeResults.push({
            route, status: 'visited', clicks, span: closeIssueCursor(state, cursor),
          });
        } catch (error) {
          state.routeResults.push({
            route,
            status: 'failed',
            clicks: 0,
            error: error instanceof Error ? error.message.split('\n')[0] : String(error),
            span: closeIssueCursor(state, cursor),
          });
        }
        // Crash-durable: evidence survives even a hard abort.
        flushCrawlReport(testInfo, state, role, routes, QA_SUPPRESSIONS, today);
      }

      const summary = summarizeCoverage(role, routes.length, state);
      // Fix 4: coverage is always visible; a partial run cannot look like a full one.
      // eslint-disable-next-line no-console
      console.log(formatCoverageLine(summary));

      const worklist = buildWorklist(state, role, QA_SUPPRESSIONS, today, routes);
      if (worklist.findings.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`[dashboard-crawl] ${role} worklist:
${formatWorklist(worklist.findings)}`);
      }

      // Attaching must never mask the findings underneath it.
      await attachCrawlReport(testInfo, state, role, routes, QA_SUPPRESSIONS, today)
        .catch((error: unknown) => {
          // eslint-disable-next-line no-console
          console.error(`[dashboard-crawl] attach failed: ${
            error instanceof Error ? error.message : String(error)}`);
        });

      // Truncation FAILS by default; the allowance must be raised deliberately.
      const allowedTruncations = Number(process.env.SWAN_DASHBOARD_CRAWL_ALLOWED_TRUNCATIONS || '0');
      expect(
        overTruncationBudget(state.truncations, allowedTruncations),
        `${role}: ${state.truncations.length} route(s) exceeded the ${maxClicksPerRoute}-interaction `
        + `budget (allowance ${allowedTruncations}), so part of each page was never exercised. `
        + 'Raise SWAN_DASHBOARD_CRAWL_MAX_CLICKS_PER_ROUTE to cover them, or set '
        + 'SWAN_DASHBOARD_CRAWL_ALLOWED_TRUNCATIONS to acknowledge the debt explicitly.',
      ).toEqual([]);

      // THE gate for suppression health: without it, expiry was wired to a log line.
      expect(
        worklist.blocking,
        `${role}: ${worklist.blocking.length} blocking finding(s)\n${formatWorklist(worklist.blocking)}`,
      ).toEqual([]);

      // Product suppressions come from the expiring registry ONLY — otherwise this
      // assertion becomes a second, permanent suppression system.
      expect(compactIssues(state, routes, isSuppressed)).toEqual(NO_ISSUES);
    });
  });
}

declareRoleCrawl('admin');
declareRoleCrawl('trainer');
declareRoleCrawl('client');
declareRoleCrawl('user');
