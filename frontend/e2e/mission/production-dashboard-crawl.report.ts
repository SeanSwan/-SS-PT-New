/**
 * FILE: production-dashboard-crawl.report.ts
 * PURPOSE: Crash-durable findings report + coverage summary for the dashboard crawl.
 * OWNER: SwanStudios Mission QA.
 *
 * WHY THIS EXISTS (Slice 0, 2026-08-11):
 * The crawl previously attached its findings report only AFTER the whole route
 * loop completed. Any thrown error mid-loop therefore destroyed every finding
 * collected up to that point, and left the remaining routes unvisited with no
 * record that they had been skipped. Reviewers (Kimi K3, Tencent HY3) both
 * flagged the same failure: a partial run was indistinguishable from a full one.
 *
 * This module makes the report crash-durable — it is flushed to disk after every
 * single route — and makes coverage explicit: `visited / total` is always
 * reported, and any route the crawl never reached is counted, not silently
 * dropped.
 */


export type DashboardRole = 'admin' | 'trainer' | 'client' | 'user';

/** Terminal status for a single route. `unreached` is derived, never assigned. */
export type RouteStatus = 'visited' | 'failed';

/**
 * Half-open [start, end) indices into each issue array, marking what this route
 * contributed. Console/network events arrive on page-level listeners with no
 * route attached, so the crawl records where each route's slice begins and ends
 * instead. Without this a worklist can say "TypeError: x is undefined" but not
 * WHICH page produced it, which is the one thing a repairer needs.
 */
export interface IssueSpan {
  consoleErrors: [number, number];
  pageErrors: [number, number];
  requestFailures: [number, number];
  readFailures: [number, number];
}

export interface RouteResult {
  route: string;
  status: RouteStatus;
  /** Interactions actually performed on this route. */
  clicks: number;
  /** Present only when status === 'failed'. */
  error?: string;
  span?: IssueSpan;
}

/** Snapshot the current lengths, to be closed into a span after the route runs. */
export function markIssueCursor(state: CrawlIssueState): IssueSpan {
  return {
    consoleErrors: [state.consoleErrors.length, state.consoleErrors.length],
    pageErrors: [state.pageErrors.length, state.pageErrors.length],
    requestFailures: [state.requestFailures.length, state.requestFailures.length],
    readFailures: [state.readFailures.length, state.readFailures.length],
  };
}

/** Close a span at the current lengths, capturing everything the route emitted. */
export function closeIssueCursor(state: CrawlIssueState, start: IssueSpan): IssueSpan {
  return {
    consoleErrors: [start.consoleErrors[0], state.consoleErrors.length],
    pageErrors: [start.pageErrors[0], state.pageErrors.length],
    requestFailures: [start.requestFailures[0], state.requestFailures.length],
    readFailures: [start.readFailures[0], state.readFailures.length],
  };
}

export interface CrawlIssueState {
  blockedWrites: string[];
  readFailures: string[];
  requestFailures: string[];
  consoleErrors: string[];
  pageErrors: string[];
  clicks: Array<{ role: DashboardRole; route: string; label: string; url: string }>;
  routeResults: RouteResult[];
  /**
   * Routes whose interaction budget was exhausted, with the count NOT exercised.
   * Surfaced explicitly so truncation can never masquerade as full coverage.
   */
  truncations: Array<{ route: string; exercised: number; skipped: number }>;
}

export function createCrawlState(): CrawlIssueState {
  return {
    blockedWrites: [],
    readFailures: [],
    requestFailures: [],
    consoleErrors: [],
    pageErrors: [],
    clicks: [],
    routeResults: [],
    truncations: [],
  };
}

export interface CoverageSummary {
  role: DashboardRole;
  total: number;
  visited: number;
  failed: number;
  /** Routes in the manifest the crawl never got to (crash, timeout, abort). */
  unreached: number;
  /** Routes where the click budget cut exploration short. */
  truncated: number;
  complete: boolean;
}

export function summarizeCoverage(
  role: DashboardRole,
  totalRoutes: number,
  state: CrawlIssueState,
): CoverageSummary {
  const visited = state.routeResults.filter((entry) => entry.status === 'visited').length;
  const failed = state.routeResults.filter((entry) => entry.status === 'failed').length;
  const unreached = Math.max(0, totalRoutes - state.routeResults.length);

  return {
    role,
    total: totalRoutes,
    visited,
    failed,
    unreached,
    truncated: state.truncations.length,
    complete: unreached === 0 && failed === 0,
  };
}

/** One-line, always-printed coverage banner. A partial run cannot look like a full one. */
export function formatCoverageLine(summary: CoverageSummary): string {
  const parts = [
    `[dashboard-crawl] ${summary.role}: ${summary.visited}/${summary.total} routes visited`,
  ];
  if (summary.failed > 0) parts.push(`${summary.failed} FAILED`);
  if (summary.unreached > 0) parts.push(`${summary.unreached} NEVER REACHED`);
  if (summary.truncated > 0) parts.push(`${summary.truncated} TRUNCATED`);
  return parts.join(' · ');
}

/**
 * Filters known-benign console/network noise. Unchanged behaviour from the
 * original spec — moved here so the spec stays under the 300-line cap.
 */
export function isSocketPollingUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.pathname === '/socket.io/' && url.searchParams.get('transport') === 'polling';
  } catch {
    return false;
  }
}

/**
 * Filter for the crawl's OWN exhaust — the 405s its write-blocking interceptor
 * injects, and the 400s Chromium reports when Socket.IO polling is torn down.
 * These are not tolerated product defects, so they are not registry suppressions.
 *
 * Correlation is BUDGETED, not existential. The previous form asked
 * `state.requestFailures.some(isSocketPollingUrl)` — once a single teardown 400
 * had occurred (which it always does, early), EVERY later "status of 400"
 * console error from any endpoint for any reason was whitelisted for the rest of
 * the run, hiding real regressions behind the harness's own noise. Now each
 * suppressed message consumes one unit of budget, and a message that names a URL
 * is judged on that URL alone.
 */
export function harnessExhaustFilter(state: CrawlIssueState): (message: string) => boolean {
  let socket400Budget = state.requestFailures.filter(isSocketPollingUrl).length
    + state.readFailures.filter((entry) => /\/socket\.io\//.test(entry)).length;
  let blocked405Budget = state.blockedWrites.length;

  return (message: string) => {
    const url = message.match(/https?:\/\/\S+/)?.[0];

    if (/Failed to load resource: the server responded with a status of 400/i.test(message)) {
      if (url) return isSocketPollingUrl(url);
      if (socket400Budget > 0) { socket400Budget -= 1; return true; }
      return false;
    }
    if (/Failed to load resource: the server responded with a status of 405/i.test(message)) {
      if (blocked405Budget > 0) { blocked405Budget -= 1; return true; }
      return false;
    }
    return false;
  };
}

export interface ActionableIssues {
  readFailures: string[];
  requestFailures: string[];
  consoleErrors: string[];
  pageErrors: string[];
  blockedWrites: string[];
  routeFailures: string[];
  unreachedRoutes: string[];
}

/**
 * The assertion target. Route failures and unreached routes are first-class
 * members: a crawl that died at route 7 of 85 must fail even when the seven
 * routes it managed to visit were clean.
 */
export function compactIssues(
  state: CrawlIssueState,
  allRoutes: string[] = [],
  /**
   * Product-defect suppressions, supplied by the caller from the expiring
   * registry. Previously this function hardcoded its own copies of two registry
   * patterns, so there were TWO suppression systems: the registry (advisory) and
   * these regexes (the actual gate). A registry entry could expire and this
   * function would keep swallowing the defect forever. The registry is now the
   * only source of product suppressions; the default suppresses nothing.
   */
  isSuppressed: (message: string) => boolean = () => false,
): ActionableIssues {
  const attempted = new Set(state.routeResults.map((entry) => entry.route));
  const isExhaust = harnessExhaustFilter(state);

  return {
    readFailures: state.readFailures,
    requestFailures: state.requestFailures.filter((entry) => !isSocketPollingUrl(entry)),
    consoleErrors: state.consoleErrors
      .filter((entry) => !isExhaust(entry) && !isSuppressed(entry)),
    pageErrors: state.pageErrors.filter((entry) => !isSuppressed(entry)),
    blockedWrites: state.blockedWrites
      .filter((entry) => !/^POST \/api\/dashboard\/track-pageview$/.test(entry)),
    routeFailures: state.routeResults
      .filter((entry) => entry.status === 'failed')
      .map((entry) => `${entry.route} — ${entry.error ?? 'unknown error'}`),
    unreachedRoutes: allRoutes.filter((route) => !attempted.has(route)),
  };
}

/**
 * Returns the truncations to fail on: the full list when the count exceeds the
 * allowance, otherwise empty. Returning the entries (not a boolean) means the
 * assertion diff names exactly which routes were under-explored and by how much.
 *
 * The allowance defaults to 0 at the call site. Acknowledging truncation
 * therefore requires deliberately raising a number someone can see, rather than
 * silently tolerating partial coverage.
 */
export function overTruncationBudget(
  truncations: CrawlIssueState['truncations'],
  allowed: number,
): CrawlIssueState['truncations'] {
  return truncations.length > allowed ? truncations : [];
}

/** An all-clear result, for use as the `toEqual` expectation. */
export const NO_ISSUES: ActionableIssues = {
  readFailures: [],
  requestFailures: [],
  consoleErrors: [],
  pageErrors: [],
  blockedWrites: [],
  routeFailures: [],
  unreachedRoutes: [],
};
