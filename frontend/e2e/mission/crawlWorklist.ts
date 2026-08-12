/**
 * FILE: crawlWorklist.ts
 * PURPOSE: Turn crawl state into a ranked repair list, and persist the evidence.
 * OWNER: SwanStudios Mission QA.
 *
 * Split out of production-dashboard-crawl.report.ts (Rule 4, 300-line cap). The
 * dependency runs ONE way — this imports the state/coverage types, never the
 * reverse — so persistence can embed the worklist without an import cycle.
 */

import { writeFileSync } from 'node:fs';
import type { TestInfo } from '@playwright/test';
import {
  applySuppressions,
  blockingFindings,
  buildFindings,
  rankFindings,
  suppressionFindings,
  type Finding,
  type FindingCategory,
  type RawIssue,
  type Suppression,
  type SuppressionAudit,
} from './qaFindings';
import {
  compactIssues,
  summarizeCoverage,
  type CrawlIssueState,
  type DashboardRole,
  type IssueSpan,
} from './production-dashboard-crawl.report';

/**
 * Flatten crawl state into route-attributed raw issues. Entries emitted outside
 * any route's span (during setup, or after the last route) are kept with no
 * route rather than dropped — losing a real error because it landed in a gap
 * would be the same silent-coverage failure this harness exists to remove.
 */
export function toRawIssues(state: CrawlIssueState, role: DashboardRole): RawIssue[] {
  const issues: RawIssue[] = [];
  const claimed = { consoleErrors: 0, pageErrors: 0, requestFailures: 0, readFailures: 0 };

  const drain = (
    key: keyof typeof claimed,
    category: FindingCategory,
    span: IssueSpan | undefined,
    route: string,
  ) => {
    if (!span) return;
    const [from, to] = span[key];
    for (const message of state[key].slice(from, to)) issues.push({ category, message, route, role });
    claimed[key] = Math.max(claimed[key], to);
  };

  for (const result of state.routeResults) {
    if (result.status === 'failed') {
      issues.push({
        category: 'route-failure',
        message: result.error ?? 'route failed with no error message',
        route: result.route,
        role,
      });
    }
    drain('consoleErrors', 'console-error', result.span, result.route);
    drain('pageErrors', 'page-error', result.span, result.route);
    drain('requestFailures', 'request-failure', result.span, result.route);
    drain('readFailures', 'read-failure', result.span, result.route);
  }

  // Unattributed tail — no route, but never discarded.
  const tail: Array<[keyof typeof claimed, FindingCategory]> = [
    ['consoleErrors', 'console-error'],
    ['pageErrors', 'page-error'],
    ['requestFailures', 'request-failure'],
    ['readFailures', 'read-failure'],
  ];
  for (const [key, category] of tail) {
    for (const message of state[key].slice(claimed[key])) issues.push({ category, message, role });
  }

  for (const entry of state.truncations) {
    issues.push({
      category: 'truncation',
      message: `${entry.skipped} interaction(s) never exercised (budget ${entry.exercised})`,
      route: entry.route,
      role,
    });
  }

  return issues;
}

export interface Worklist {
  findings: Finding[];
  audit: SuppressionAudit;
  blocking: Finding[];
}

/**
 * The ranked repair list. Suppression problems are folded in as findings so an
 * expired suppression ranks alongside — and as loudly as — a real defect.
 * `today` is injected so expiry behaviour is deterministic in tests.
 */
export function buildWorklist(
  state: CrawlIssueState,
  role: DashboardRole,
  suppressions: Suppression[],
  today: string,
): Worklist {
  const { surviving, audit } = applySuppressions(
    buildFindings(toRawIssues(state, role)),
    suppressions,
    today,
  );
  const findings = [...surviving, ...suppressionFindings(audit)].sort(rankFindings);
  return { findings, audit, blocking: blockingFindings(findings) };
}

/** Human-readable ranked worklist — the thing that replaces the giant object diff. */
export function formatWorklist(findings: Finding[]): string {
  if (findings.length === 0) return '  (no findings)';
  return findings
    .map((finding, index) => {
      const where = finding.routes.length
        ? `\n       routes: ${finding.routes.slice(0, 5).join(', ')}${finding.routes.length > 5 ? ` (+${finding.routes.length - 5} more)` : ''}`
        : '';
      const file = finding.owningFile ? `\n       file: ${finding.owningFile}` : '';
      const seen = finding.occurrences > 1 ? ` ×${finding.occurrences}` : '';
      return `  ${index + 1}. [${finding.severity.toUpperCase()}] ${finding.category}${seen}\n`
        + `       ${finding.message.slice(0, 160)}${where}${file}`;
    })
    .join('\n');
}

/**
 * Write the report to the test output directory. Called after EVERY route, so a
 * hard crash still leaves complete evidence for everything already crawled.
 * Never throws — a reporting failure must not mask a crawl finding.
 */
function reportPayload(
  state: CrawlIssueState,
  role: DashboardRole,
  allRoutes: string[],
  suppressions: Suppression[],
  today: string,
) {
  const { findings, audit } = buildWorklist(state, role, suppressions, today);
  return {
    summary: summarizeCoverage(role, allRoutes.length, state),
    // The ranked worklist is embedded so downstream consumers (scripts/qa/
    // mission-report.mjs) read plain JSON and never import TypeScript.
    worklist: findings,
    suppressionAudit: audit,
    ...state,
    actionable: compactIssues(state, allRoutes),
  };
}

export function flushCrawlReport(
  testInfo: TestInfo,
  state: CrawlIssueState,
  role: DashboardRole,
  allRoutes: string[],
  suppressions: Suppression[] = [],
  today: string = new Date().toISOString().slice(0, 10),
): string | null {
  const path = testInfo.outputPath(`dashboard-crawl-${role}.json`);
  try {
    writeFileSync(
      path,
      JSON.stringify(reportPayload(state, role, allRoutes, suppressions, today), null, 2),
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
  suppressions: Suppression[] = [],
  today: string = new Date().toISOString().slice(0, 10),
) {
  await testInfo.attach(`dashboard-crawl-${role}.json`, {
    body: JSON.stringify(reportPayload(state, role, allRoutes, suppressions, today), null, 2),
    contentType: 'application/json',
  });
}
