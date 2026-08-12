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

/** Numeric rank, serialised with each finding so non-TypeScript consumers
 *  (scripts/qa/mission-report.mjs) never re-declare a table that can drift. */
export function severityRank(severity: Severity): number {
  return SEVERITY_RANK[severity];
}

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
/** Findings that must fail the build: everything except the informational tail. */
export function blockingFindings(findings: Finding[]): Finding[] {
  return findings.filter((finding) => finding.severity !== 'low');
}
