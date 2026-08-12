# Hostile Code Review — QA harness slices 0+1

**Reviewer remit:** Kimi K3. **Author:** Opus 5. **Date:** 2026-08-12.
**Scope:** Full source of the modules below, as committed. No PII, no secrets, no
customer data. Route tables are excluded deliberately.

---

## 0. What I need from you

This is a CODE review, not a design review. Attack the implementation.

1. **VERDICT** — one line: STRONG / SHIP-WITH-CHANGES / SEND-BACK.
2. **Correctness bugs**, most severe first. Off-by-one, wrong operator, bad regex,
   unhandled null, ordering assumption, mutation-through-reference, async hazard.
3. **Where the design defeats its own purpose.** This code exists to stop a QA tool
   reporting "green" when it tested nothing. Find every remaining path where it can
   still report success having tested nothing, or hide a real defect.
4. **The suppression expiry mechanism is the incentive fix — attack it hardest.**
   How does someone silence a defect permanently without it looking like they did?
5. **Anything that will break in CI but not locally** (clock/timezone, path
   separators on Windows vs Linux, file ordering, parallel workers).

Be specific: name the function and line-level construct. Do not hedge to consensus.

---

## 1. Context

A Playwright crawl walks 85 hardcoded authenticated dashboard routes across four
roles in read-only mode against production, and asserts there are no console
errors, page errors, failed requests, or 4xx/5xx reads.

Before these slices it had four silent-failure defects: a throw on any route aborted
the remaining routes AND discarded the findings report (the attach call sat after the
loop); interaction truncation at 24-per-page was silent; a missing auth state called
test.skip() so an unauthenticated run reported success; and coverage was never
reported. A fifth was found later: an empty route table passed vacuously.

Slice 1 then replaced a single `expect(issues).toEqual({...all empty})` — which
printed one enormous object diff, with the same error on 30 routes reading as 30
unrelated strings — with a ranked, deduped worklist, and replaced a hardcoded
console-noise allowlist with suppressions that require a reason and an expiry.

Constraints: production is read-only; files cap at 300 lines; `today` is injected
rather than read from the clock so expiry is deterministic; the crawl writes its
report to disk after EVERY route so a crash still leaves evidence.

---

## FILE: frontend/e2e/mission/qaFindings.ts

```
/**
 * FILE: qaFindings.ts
 * PURPOSE: Structured QA findings — ranked, deduped worklist + expiring suppressions.
 * OWNER: SwanStudios Mission QA.
 *
 * WHY THIS EXISTS (Slice 1, 2026-08-12):
 * The crawl asserted `expect(issues).toEqual({...all empty})`, so a failure produced
 * one enormous object diff rather than a list of things to fix, and the same error
 * appearing on 30 routes read as 30 unrelated strings.
 *
 * The second problem was an incentive, not a format. Noise was silenced by appending
 * to a hardcoded allowlist, which is permanent, unattributed and free — so silencing
 * always cost less than fixing. Suppressions here REQUIRE a reason and an expiry, an
 * expired one fails the build, and one that stops matching is reported as stale. The
 * cheap path is now the one that removes the suppression.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type FindingCategory =
  | 'page-error'
  | 'route-failure'
  | 'console-error'
  | 'read-failure'
  | 'request-failure'
  | 'truncation'
  | 'blocked-write'
  | 'expired-suppression'
  | 'stale-suppression';

/** Severity is a property of the category — never hand-assigned, so it cannot drift. */
export const CATEGORY_SEVERITY: Record<FindingCategory, Severity> = {
  // An uncaught exception or a page that never loaded is a broken surface.
  'page-error': 'critical',
  'route-failure': 'critical',
  'expired-suppression': 'critical',
  // Visible-to-user breakage that did not necessarily kill the page.
  'console-error': 'high',
  'read-failure': 'high',
  'request-failure': 'medium',
  // Coverage debt: not a product defect, but it means we did not look.
  truncation: 'medium',
  'stale-suppression': 'low',
  'blocked-write': 'low',
};

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export interface Finding {
  /** Stable dedupe key: same defect on 30 routes collapses to one row. */
  fingerprint: string;
  category: FindingCategory;
  severity: Severity;
  /** Human-readable, volatile detail stripped so it groups correctly. */
  message: string;
  role?: string;
  /** Every route this was seen on, deduped and ordered. */
  routes: string[];
  occurrences: number;
  /** Best guess at the file to open, when the message carries a URL/frame. */
  owningFile?: string;
}

export interface Suppression {
  id: string;
  /** Regex source, matched case-insensitively against the finding message. */
  pattern: string;
  /** Required. "known issue" is not a reason — say what and why it is acceptable. */
  reason: string;
  /** Required, YYYY-MM-DD. Past this date the suppression FAILS the build. */
  expires: string;
  owner?: string;
}

/**
 * Volatile substrings that would otherwise make identical defects look distinct
 * (cache-busting hashes, ids, ports, timestamps). Stripped only for the
 * fingerprint — `message` keeps the original text for the reader.
 */
export function fingerprintOf(category: FindingCategory, message: string): string {
  const normalized = message
    // Absolute URLs carry the route, which is already a first-class field. Left
    // in, one connection failure across 30 routes fingerprints as 30 separate
    // defects — the wall of near-identical rows this worklist exists to remove.
    // Bare paths (e.g. "404 GET /api/sessions") are NOT stripped: there the
    // endpoint IS the defect's identity. `message` keeps the original text, so
    // normalising here costs no detail in the report.
    .replace(/\bhttps?:\/\/\S+/gi, '<URL>')
    .replace(/\b[0-9a-f]{8,}\b/gi, '<HASH>')
    .replace(/\b\d{4}-\d{2}-\d{2}T[\d:.]+Z?\b/g, '<TS>')
    .replace(/:\d{2,5}\b/g, ':<PORT>')
    .replace(/\b\d+\b/g, '<N>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  return `${category}::${normalized}`;
}

/** Pull a likely source file out of a stack frame or asset URL, for the worklist. */
export function owningFileOf(message: string): string | undefined {
  const url = message.match(/https?:\/\/[^\s)'"]+?\/([\w.-]+\.(?:tsx?|jsx?|mjs|css))/i);
  if (url) return url[1];
  const bare = message.match(/\b([\w.-]+\.(?:tsx?|jsx?|mjs))\b/);
  return bare?.[1];
}

export interface RawIssue {
  category: FindingCategory;
  message: string;
  route?: string;
  role?: string;
}

/**
 * Collapse raw issues into deduped findings. The same console error on 30 routes
 * becomes ONE row listing 30 routes — which is the difference between a worklist
 * and a wall of text.
 */
export function buildFindings(issues: RawIssue[]): Finding[] {
  const byFingerprint = new Map<string, Finding>();

  for (const issue of issues) {
    const fingerprint = fingerprintOf(issue.category, issue.message);
    const existing = byFingerprint.get(fingerprint);

    if (existing) {
      existing.occurrences += 1;
      if (issue.route && !existing.routes.includes(issue.route)) existing.routes.push(issue.route);
      continue;
    }

    byFingerprint.set(fingerprint, {
      fingerprint,
      category: issue.category,
      severity: CATEGORY_SEVERITY[issue.category],
      message: issue.message,
      role: issue.role,
      routes: issue.route ? [issue.route] : [],
      occurrences: 1,
      owningFile: owningFileOf(issue.message),
    });
  }

  return [...byFingerprint.values()].sort(rankFindings);
}

/** Most severe first; within a severity, the most widespread defect first. */
export function rankFindings(a: Finding, b: Finding): number {
  const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (bySeverity !== 0) return bySeverity;
  if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
  if (b.routes.length !== a.routes.length) return b.routes.length - a.routes.length;
  return a.fingerprint.localeCompare(b.fingerprint);
}

export interface SuppressionAudit {
  /** Suppressions past their expiry date — each becomes a critical finding. */
  expired: Suppression[];
  /** Valid, in-date, and actually matched something this run. */
  active: Suppression[];
  /** In-date but matched nothing — the defect may be fixed; candidate for deletion. */
  stale: Suppression[];
  /** Malformed (missing reason/expiry, unparseable date or pattern). */
  invalid: Array<{ suppression: Suppression; problem: string }>;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function compilePattern(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern, 'i');
  } catch {
    return null;
  }
}

/**
 * Apply suppressions and audit them in the same pass. `today` is injected rather
 * than read from the clock so expiry behaviour is testable and deterministic.
 */
export function applySuppressions(
  findings: Finding[],
  suppressions: Suppression[],
  today: string,
): { surviving: Finding[]; audit: SuppressionAudit } {
  const audit: SuppressionAudit = { expired: [], active: [], stale: [], invalid: [] };
  const usable: Array<{ suppression: Suppression; regex: RegExp }> = [];

  for (const suppression of suppressions) {
    const regex = compilePattern(suppression.pattern);
    if (!suppression.reason?.trim()) {
      audit.invalid.push({ suppression, problem: 'missing reason' });
    } else if (!ISO_DATE.test(suppression.expires || '')) {
      audit.invalid.push({ suppression, problem: 'missing or malformed expires (want YYYY-MM-DD)' });
    } else if (!regex) {
      audit.invalid.push({ suppression, problem: 'pattern is not a valid regular expression' });
    } else if (suppression.expires < today) {
      // Expired: it does NOT suppress. Whatever it was hiding comes back, and the
      // stale suppression is itself reported.
      audit.expired.push(suppression);
    } else {
      usable.push({ suppression, regex });
    }
  }

  const matched = new Set<string>();
  const surviving = findings.filter((finding) => {
    const hit = usable.find(({ regex }) => regex.test(finding.message));
    if (!hit) return true;
    matched.add(hit.suppression.id);
    return false;
  });

  for (const { suppression } of usable) {
    (matched.has(suppression.id) ? audit.active : audit.stale).push(suppression);
  }

  return { surviving, audit };
}

/** Turn suppression problems into findings so they rank alongside real defects. */
export function suppressionFindings(audit: SuppressionAudit): Finding[] {
  const rows: Finding[] = [];

  for (const suppression of audit.expired) {
    rows.push(makeSuppressionFinding(
      'expired-suppression',
      `Suppression "${suppression.id}" expired ${suppression.expires} — fix the underlying defect or renew it with a new reason. (${suppression.reason})`,
    ));
  }
  for (const { suppression, problem } of audit.invalid) {
    rows.push(makeSuppressionFinding(
      'expired-suppression',
      `Suppression "${suppression.id}" is invalid: ${problem}.`,
    ));
  }
  for (const suppression of audit.stale) {
    rows.push(makeSuppressionFinding(
      'stale-suppression',
      `Suppression "${suppression.id}" matched nothing this run — the defect may be fixed; delete it.`,
    ));
  }

  return rows.sort(rankFindings);
}

function makeSuppressionFinding(category: FindingCategory, message: string): Finding {
  return {
    fingerprint: fingerprintOf(category, message),
    category,
    severity: CATEGORY_SEVERITY[category],
    message,
    routes: [],
    occurrences: 1,
  };
}

/** Findings that must fail the build: everything except the informational tail. */
export function blockingFindings(findings: Finding[]): Finding[] {
  return findings.filter((finding) => finding.severity !== 'low');
}
```


## FILE: frontend/e2e/mission/qaSuppressions.ts

```
/**
 * FILE: qaSuppressions.ts
 * PURPOSE: The single registry of QA finding suppressions. Every entry expires.
 * OWNER: SwanStudios Mission QA.
 *
 * HOW TO ADD ONE — read this before appending:
 *
 *   Adding a suppression is admitting a defect and choosing not to fix it yet.
 *   That is sometimes correct. It is never free. Each entry needs:
 *     - `reason`  — what the noise IS and why shipping with it is acceptable.
 *                   "known issue" / "flaky" / "not ours" are not reasons.
 *     - `expires` — YYYY-MM-DD. On that date the build FAILS until someone
 *                   fixes the defect or consciously renews the entry.
 *
 *   A suppression that stops matching is reported as STALE, so entries do not
 *   quietly outlive the bug they were hiding.
 *
 * WHAT DOES NOT BELONG HERE:
 *   Harness artifacts — noise the crawl creates itself, e.g. the 405s from its
 *   own write-blocking interceptor and the 400s from tearing down Socket.IO
 *   polling. Those are not product defects being tolerated; they are the test
 *   rig's own exhaust, they are state-dependent rather than message-matchable,
 *   and they are filtered unconditionally in production-dashboard-crawl.report.ts.
 *   Do not migrate them here — an expiring suppression for the harness's own
 *   output would fail the build for no product reason.
 */

import type { Suppression } from './qaFindings';

export const QA_SUPPRESSIONS: Suppression[] = [
  {
    id: 'unused-link-preload',
    pattern: 'preloaded using link preload',
    reason:
      'Vite emits <link rel=preload> hints for chunks that some routes never execute, so Chrome '
      + 'warns the preload went unused. Cosmetic, no user impact, but it does mean we ship '
      + 'bandwidth nobody spends — revisit when the route-level chunking is next touched.',
    expires: '2026-11-10',
    owner: 'mission-qa',
  },
  {
    id: 'service-worker-disabled-notice',
    pattern: 'Service Worker: PWA functionality temporarily disabled',
    reason:
      'The app deliberately logs this while PWA/service-worker support is switched off. It is an '
      + 'intentional notice rather than a fault, but it is logged at error level, which is wrong — '
      + 'either downgrade it to info or re-enable the service worker before this expires.',
    expires: '2026-11-10',
    owner: 'mission-qa',
  },
];
```


## FILE: frontend/e2e/mission/crawlWorklist.ts

```
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
```


## FILE: frontend/e2e/mission/production-dashboard-crawl.report.ts

```
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
```


## FILE: scripts/qa/mission-report.mjs

```
#!/usr/bin/env node
/**
 * SCRIPT: Mission QA report generator
 * PURPOSE: Render the ranked repair list from real crawl results.
 * SAFETY: Reads local test-result JSON only; emits no credentials.
 *
 * WHY THIS WAS REWRITTEN (Slice 1, 2026-08-12):
 * The previous version read NOTHING. It had no readFileSync, no result parsing —
 * it emitted a fixed block of prose with a fresh timestamp, so the artifact a
 * human opens to judge site health was byte-identical whether the suite passed,
 * failed, or never ran. Its own header claimed it "reads local test-result
 * metadata"; that was false.
 *
 * It now reads dashboard-crawl-*.json (written by the crawl after every route)
 * and renders the ranked worklist. Consuming plain JSON is deliberate: the
 * worklist is built in TypeScript under frontend/e2e, and this script must not
 * import it.
 *
 * If no results exist, this says so and exits non-zero. A QA report that cannot
 * find evidence must not look like a clean bill of health.
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(`Usage: node scripts/qa/mission-report.mjs [options]

Options:
  --results=<dir>  Playwright output dir. Default frontend/test-results.
  --out=<path>     Output markdown path.
  -h, --help       Print this help.

Exits non-zero when no crawl results are found, so an empty run cannot be
mistaken for a passing one.
`);
  process.exit(0);
}

const opt = (name, fallback) => {
  const hit = args.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const resultsDir = path.resolve(repoRoot, opt('results', 'frontend/test-results'));
const outputPath = path.resolve(
  repoRoot,
  opt('out', 'docs/qa/reports/SWANSTUDIOS-MISSION-QA-REPORT-latest.md'),
);

/** Recursively collect dashboard-crawl-*.json, newest first. */
function findReports(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findReports(full));
    else if (/^dashboard-crawl-.*\.json$/.test(entry.name)) found.push(full);
  }
  return found.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

function loadReports(files) {
  const byRole = new Map();
  for (const file of files) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, 'utf-8'));
    } catch {
      continue;
    }
    const role = parsed?.summary?.role;
    // Newest wins: files are sorted newest-first, so never overwrite.
    if (role && !byRole.has(role)) byRole.set(role, { ...parsed, file });
  }
  return [...byRole.values()];
}

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function mergeWorklists(reports) {
  const merged = new Map();
  for (const report of reports) {
    for (const finding of report.worklist ?? []) {
      const key = `${finding.fingerprint}::${report.summary.role}`;
      if (!merged.has(key)) merged.set(key, { ...finding, role: report.summary.role });
    }
  }
  return [...merged.values()].sort((a, b) => (
    (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    || (b.occurrences ?? 0) - (a.occurrences ?? 0)
  ));
}

function coverageTable(reports) {
  const rows = reports.map((report) => {
    const s = report.summary;
    return `| ${s.role} | ${s.visited}/${s.total} | ${s.failed} | ${s.unreached} | ${s.truncated} | ${s.complete ? 'yes' : 'NO'} |`;
  });
  return ['| Role | Visited | Failed | Never reached | Truncated | Complete |',
    '| --- | --- | --- | --- | --- | --- |', ...rows].join('\n');
}

function worklistSection(findings) {
  if (findings.length === 0) return '_No findings._';
  return findings.map((finding, index) => {
    const routes = finding.routes?.length
      ? `\n   - routes (${finding.routes.length}): ${finding.routes.slice(0, 8).join(', ')}${finding.routes.length > 8 ? ' …' : ''}`
      : '';
    const file = finding.owningFile ? `\n   - file: \`${finding.owningFile}\`` : '';
    const seen = finding.occurrences > 1 ? ` ×${finding.occurrences}` : '';
    return `${index + 1}. **[${String(finding.severity).toUpperCase()}]** \`${finding.category}\`${seen} — ${finding.role}\n`
      + `   - ${finding.message}${routes}${file}`;
  }).join('\n');
}

function suppressionSection(reports) {
  const lines = [];
  for (const report of reports) {
    const audit = report.suppressionAudit;
    if (!audit) continue;
    for (const item of audit.expired ?? []) lines.push(`- **EXPIRED** \`${item.id}\` (${item.expires}) — ${item.reason}`);
    for (const item of audit.stale ?? []) lines.push(`- STALE \`${item.id}\` — matched nothing; candidate for deletion`);
    for (const item of audit.active ?? []) lines.push(`- active \`${item.id}\` — expires ${item.expires}`);
  }
  return lines.length ? [...new Set(lines)].join('\n') : '_No suppressions in effect._';
}

const reports = loadReports(findReports(resultsDir));

if (reports.length === 0) {
  process.stderr.write(
    `No dashboard-crawl results found under ${path.relative(repoRoot, resultsDir)}.\n`
    + 'Refusing to write a report that would imply a clean run. '
    + 'Run the crawl first (npm run qa:mission:prod-live-readonly).\n',
  );
  process.exit(1);
}

const findings = mergeWorklists(reports);
const blocking = findings.filter((finding) => finding.severity !== 'low');

const markdown = `# SWANSTUDIOS-MISSION-QA-REPORT

Generated: ${new Date().toISOString()}
Source: ${reports.length} crawl result file(s) under \`${path.relative(repoRoot, resultsDir)}\`

## Coverage

${coverageTable(reports)}

## Ranked repair list

${blocking.length} blocking finding(s), ${findings.length} total.

${worklistSection(findings)}

## Suppressions

${suppressionSection(reports)}
`;

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, markdown, 'utf8');
process.stdout.write(
  `Wrote ${path.relative(repoRoot, outputPath)} — ${reports.length} role(s), `
  + `${blocking.length} blocking finding(s)\n`,
);```


## FILE: frontend/e2e/mission/production-dashboard-crawl.mission.spec.ts (the caller)

```

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
      const today = new Date().toISOString().slice(0, 10);
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
        // Console/network listeners fire without route context, so bracket each
        // route to attribute what it emitted (Slice 1 — a worklist must say WHERE).
        const cursor = markIssueCursor(state);
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

      // Slice 1: ranked repair list, not one enormous diff — the same defect on
      // 30 routes collapses to a single row naming all 30.
      const worklist = buildWorklist(state, role, QA_SUPPRESSIONS, today);
      if (worklist.findings.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`[dashboard-crawl] ${role} worklist:
${formatWorklist(worklist.findings)}`);
      }

      await attachCrawlReport(testInfo, state, role, routes, QA_SUPPRESSIONS, today);

      // Fix 2: truncation FAILS by default. Reporting alone would make letting
      // pages outgrow the budget the cheapest path to green — the same incentive
      // that grew the console-noise allowlist. The allowance must be raised
      // deliberately, so coverage debt is visible and costed.
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
```
