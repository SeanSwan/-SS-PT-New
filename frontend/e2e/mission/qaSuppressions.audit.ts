/**
 * FILE: qaSuppressions.audit.ts
 * PURPOSE: The suppression contract — validation, expiry, and audit.
 * OWNER: SwanStudios Mission QA.
 *
 * Split from qaFindings.ts (Rule 4, 300-line cap) and because findings and
 * suppressions are separate concerns: one describes what broke, the other
 * governs what we are permitted to ignore and for how long.
 *
 * The whole point is the incentive. A suppression must name an owner and a
 * reason and carry an expiry; past that date it stops silencing and becomes a
 * critical finding. One that matches nothing is reported stale so it cannot
 * outlive the bug it hid. Dependency runs one way: this imports from
 * qaFindings.ts, never the reverse.
 */

import {
  CATEGORY_SEVERITY,
  fingerprintOf,
  rankFindings,
  type Finding,
  type FindingCategory,
} from './qaFindings';

export interface Suppression {
  id: string;
  /** Regex source, matched case-insensitively against the finding message. */
  pattern: string;
  /** Required. "known issue" is not a reason — say what and why it is acceptable. */
  reason: string;
  /** Required, YYYY-MM-DD. Past this date the suppression FAILS the build. */
  expires: string;
  /** Required. An unattributed suppression is what this registry abolishes. */
  owner: string;
}

export interface SuppressionAudit {
  /** Suppressions past their expiry date — each becomes a critical finding. */
  expired: Suppression[];
  /** Valid, in-date, and actually matched something this run. */
  active: Suppression[];
  /** In-date but matched nothing — the defect may be fixed; candidate for deletion. */
  stale: Suppression[];
  /** Malformed (missing reason/owner/expiry, unparseable or over-broad pattern). */
  invalid: Array<{ suppression: Suppression; problem: string }>;
  /** Per-id match count, so a blanket pattern is visibly fat in the report. */
  matchCounts: Record<string, number>;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Unrelated strings used to detect an over-broad pattern. A suppression is meant
 * to silence ONE known defect; a pattern matching all of these (`.`, `.*`, `\w`)
 * silences everything while showing up in the report as one innocuous line.
 */
const BREADTH_CANARIES = [
  'lorem ipsum dolor sit amet',
  '404 GET /api/example',
  'TypeError: value is not a function',
];

function compilePattern(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern, 'i');
  } catch {
    return null;
  }
}

function validate(
  suppression: Suppression,
  regex: RegExp | null,
  seenIds: Set<string>,
): string | null {
  if (!suppression.id?.trim()) return 'missing id';
  if (seenIds.has(suppression.id)) return `duplicate id "${suppression.id}"`;
  if (!suppression.reason?.trim()) return 'missing reason';
  // An unattributed suppression is exactly what this registry exists to abolish.
  if (!suppression.owner?.trim()) return 'missing owner';
  if (!ISO_DATE.test(suppression.expires || '')) {
    return 'missing or malformed expires (want YYYY-MM-DD)';
  }
  if (!regex) return 'pattern is not a valid regular expression';
  if (BREADTH_CANARIES.every((canary) => regex.test(canary))) {
    return 'pattern is over-broad (matches unrelated messages) — target one defect';
  }
  return null;
}

/**
 * Apply suppressions and audit them in the same pass. `today` is injected rather
 * than read from the clock so expiry behaviour is testable and deterministic.
 *
 * Every suppression is tested against EVERY finding independently. First-hit
 * attribution would let two overlapping entries report the second as "stale —
 * delete it", and deleting it breaks the day the first is narrowed or removed.
 */
export function applySuppressions(
  findings: Finding[],
  suppressions: Suppression[],
  today: string,
): { surviving: Finding[]; audit: SuppressionAudit } {
  const audit: SuppressionAudit = {
    expired: [], active: [], stale: [], invalid: [], matchCounts: {},
  };
  const usable: Array<{ suppression: Suppression; regex: RegExp }> = [];
  const seenIds = new Set<string>();

  for (const suppression of suppressions) {
    const regex = compilePattern(suppression.pattern);
    const problem = validate(suppression, regex, seenIds);
    if (suppression.id) seenIds.add(suppression.id);

    if (problem) {
      audit.invalid.push({ suppression, problem });
    } else if (suppression.expires < today) {
      // Expired: it does NOT suppress. Whatever it hid comes back, and the
      // expired entry is itself reported as a critical finding.
      audit.expired.push(suppression);
    } else {
      usable.push({ suppression, regex: regex as RegExp });
    }
  }

  for (const { suppression, regex } of usable) {
    audit.matchCounts[suppression.id] = findings
      .filter((finding) => regex.test(finding.message)).length;
    (audit.matchCounts[suppression.id] > 0 ? audit.active : audit.stale).push(suppression);
  }

  const surviving = findings.filter(
    (finding) => !usable.some(({ regex }) => regex.test(finding.message)),
  );

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

/**
 * Predicate over raw messages for the in-date, valid suppressions only. This is
 * what makes the registry the SINGLE source of product suppressions: the crawl's
 * assertion path and the worklist path both consult it, so an entry that expires
 * stops silencing everywhere at once.
 */
export function inDateSuppressionMatcher(
  suppressions: Suppression[],
  today: string,
): (message: string) => boolean {
  const seenIds = new Set<string>();
  const usable: RegExp[] = [];

  for (const suppression of suppressions) {
    const regex = compilePattern(suppression.pattern);
    const problem = validate(suppression, regex, seenIds);
    if (suppression.id) seenIds.add(suppression.id);
    if (problem || suppression.expires < today) continue;
    usable.push(regex as RegExp);
  }

  return (message: string) => usable.some((regex) => regex.test(message));
}
