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

import { writeFileSync } from 'node:fs';
import type { TestInfo } from '@playwright/test';

export type DashboardRole = 'admin' | 'trainer' | 'client' | 'user';

/** Terminal status for a single route. `unreached` is derived, never assigned. */
export type RouteStatus = 'visited' | 'failed';

export interface RouteResult {
  route: string;
  status: RouteStatus;
  /** Interactions actually performed on this route. */
  clicks: number;
  /** Present only when status === 'failed'. */
  error?: string;
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

function allowedConsoleNoise(message: string, state: CrawlIssueState) {
  if (/preloaded using link preload/i.test(message)) return true;
  if (/Service Worker: PWA functionality temporarily disabled/i.test(message)) return true;
  if (/Failed to load resource: the server responded with a status of 400/i.test(message)) {
    return state.requestFailures.some(isSocketPollingUrl)
      || state.readFailures.some((entry) => /\/socket\.io\//.test(entry));
  }
  if (/Failed to load resource: the server responded with a status of 405/i.test(message)) {
    return state.blockedWrites.length > 0;
  }
  return false;
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
): ActionableIssues {
  const attempted = new Set(state.routeResults.map((entry) => entry.route));

  return {
    readFailures: state.readFailures,
    requestFailures: state.requestFailures.filter((entry) => !isSocketPollingUrl(entry)),
    consoleErrors: state.consoleErrors.filter((entry) => !allowedConsoleNoise(entry, state)),
    pageErrors: state.pageErrors,
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

/**
 * Write the report to the test output directory. Called after EVERY route, so a
 * hard crash still leaves complete evidence for everything already crawled.
 * Never throws — a reporting failure must not mask a crawl finding.
 */
export function flushCrawlReport(
  testInfo: TestInfo,
  state: CrawlIssueState,
  role: DashboardRole,
  allRoutes: string[],
): string | null {
  const path = testInfo.outputPath(`dashboard-crawl-${role}.json`);
  try {
    const summary = summarizeCoverage(role, allRoutes.length, state);
    writeFileSync(
      path,
      JSON.stringify({ summary, ...state, actionable: compactIssues(state, allRoutes) }, null, 2),
      'utf-8',
    );
    return path;
  } catch {
    return null;
  }
}

/** Attach the final report to the Playwright run. Safe to call after flushing. */
export async function attachCrawlReport(
  testInfo: TestInfo,
  state: CrawlIssueState,
  role: DashboardRole,
  allRoutes: string[],
) {
  const summary = summarizeCoverage(role, allRoutes.length, state);
  await testInfo.attach(`dashboard-crawl-${role}.json`, {
    body: JSON.stringify({ summary, ...state, actionable: compactIssues(state, allRoutes) }, null, 2),
    contentType: 'application/json',
  });
}
