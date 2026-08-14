/**
 * FILE: qa-findings.contract.mission.spec.ts
 * PURPOSE: Regression tests for the ranked worklist and expiring suppressions.
 * OWNER: SwanStudios Mission QA.
 *
 * Slice 1's value is behaviour that regresses silently: dedupe collapsing,
 * ranking, route attribution, and above all the suppression rules. A suppression
 * that quietly stops expiring restores the exact incentive this removed, and
 * nothing else in the suite would notice.
 */

import { expect, test } from '@playwright/test';
import {
  blockingFindings,
  buildFindings,
  fingerprintOf,
  type RawIssue,
} from './qaFindings';
import {
  applySuppressions,
  inDateSuppressionMatcher,
  suppressionFindings,
  type Suppression,
} from './qaSuppressions.audit';
import { buildWorklist, toRawIssues } from './crawlWorklist';
import { BENIGN_WRITE_BEACONS, isBenignWriteBeacon } from './benignBeacons';
import { QA_SUPPRESSIONS } from './qaSuppressions';
import {
  NO_ISSUES,
  closeIssueCursor,
  compactIssues,
  createCrawlState,
  markIssueCursor,
} from './production-dashboard-crawl.report';

const TODAY = '2026-08-12';

function suppression(overrides: Partial<Suppression> = {}): Suppression {
  return {
    id: 'test-suppression',
    pattern: 'tolerated noise',
    reason: 'documented and understood',
    expires: '2026-12-01',
    owner: 'mission-qa',
    ...overrides,
  };
}

test.describe('@mission @contract qa findings worklist', () => {
  test('the same defect on many routes collapses to ONE ranked row naming them all', () => {
    const issues: RawIssue[] = ['/a', '/b', '/c'].map((route) => ({
      category: 'console-error',
      message: 'TypeError: cannot read properties of undefined',
      route,
    }));

    const [finding] = buildFindings(issues);

    expect(buildFindings(issues)).toHaveLength(1);
    expect(finding.occurrences).toBe(3);
    expect(finding.routes).toEqual(['/a', '/b', '/c']);
  });

  test('one failure across many routes is ONE row, not a wall of near-identical rows', () => {
    // Found by running the real crawl: 30 routes failing to connect produced 30
    // separate CRITICAL rows, because the route lived inside the message. The
    // route is already a first-class field, so URLs must not split the group.
    const issues: RawIssue[] = ['/dashboard/a', '/dashboard/b', '/dashboard/c'].map((route) => ({
      category: 'route-failure',
      message: `page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:59999${route}`,
      route,
    }));

    const findings = buildFindings(issues);

    expect(findings).toHaveLength(1);
    expect(findings[0].routes).toEqual(['/dashboard/a', '/dashboard/b', '/dashboard/c']);
  });

  test('bare endpoint paths still separate findings — there the endpoint IS the defect', () => {
    const findings = buildFindings([
      { category: 'read-failure', message: '404 GET /api/sessions', route: '/a' },
      { category: 'read-failure', message: '404 GET /api/users', route: '/a' },
    ]);
    expect(findings).toHaveLength(2);
  });

  test('fingerprints ignore volatile detail so one defect does not look like many', () => {
    // Cache-busting hashes and ids would otherwise split one bug into N rows.
    const a = fingerprintOf('console-error', 'Failed to load /assets/app-4f3a9c21.js at 10:31');
    const b = fingerprintOf('console-error', 'Failed to load /assets/app-99bb0de4.js at 11:02');
    expect(a).toBe(b);
  });

  test('ranking puts critical first, then the most widespread', () => {
    const findings = buildFindings([
      { category: 'request-failure', message: 'medium thing' },
      { category: 'page-error', message: 'uncaught exception' },
      { category: 'console-error', message: 'high thing on one route', route: '/a' },
      { category: 'console-error', message: 'high thing everywhere', route: '/a' },
      { category: 'console-error', message: 'high thing everywhere', route: '/b' },
    ]);

    expect(findings.map((entry) => entry.severity))
      .toEqual(['critical', 'high', 'high', 'medium']);
    // Within equal severity, the defect hitting more routes ranks first.
    expect(findings[1].message).toBe('high thing everywhere');
  });

  test('an in-date suppression silences its finding', () => {
    const findings = buildFindings([{ category: 'console-error', message: 'tolerated noise here' }]);
    const { surviving, audit } = applySuppressions(findings, [suppression()], TODAY);

    expect(surviving).toHaveLength(0);
    expect(audit.active).toHaveLength(1);
  });

  test('an EXPIRED suppression stops silencing AND becomes a critical finding', () => {
    // The core incentive fix. If this regresses, suppressions become permanent
    // again and silencing is once more cheaper than fixing.
    const findings = buildFindings([{ category: 'console-error', message: 'tolerated noise here' }]);
    const expired = suppression({ id: 'stale-one', expires: '2026-01-01' });

    const { surviving, audit } = applySuppressions(findings, [expired], TODAY);

    expect(audit.expired).toHaveLength(1);
    expect(surviving).toHaveLength(1); // the underlying defect is visible again
    const extra = suppressionFindings(audit);
    expect(extra[0].severity).toBe('critical');
    expect(extra[0].message).toContain('expired 2026-01-01');
  });

  test('a suppression without a reason or a valid expiry is rejected, not honoured', () => {
    const findings = buildFindings([{ category: 'console-error', message: 'tolerated noise here' }]);

    const noReason = applySuppressions(findings, [suppression({ reason: '  ' })], TODAY);
    expect(noReason.audit.invalid[0].problem).toBe('missing reason');
    expect(noReason.surviving).toHaveLength(1);

    const noExpiry = applySuppressions(findings, [suppression({ expires: 'soon' })], TODAY);
    expect(noExpiry.audit.invalid[0].problem).toContain('expires');
    expect(noExpiry.surviving).toHaveLength(1);
  });

  test('a suppression that matches nothing is reported as stale, so it can be deleted', () => {
    const { audit } = applySuppressions([], [suppression()], TODAY);
    expect(audit.stale).toHaveLength(1);
    expect(suppressionFindings(audit)[0].severity).toBe('low');
  });

  test('blocking findings exclude only the informational tail', () => {
    const findings = buildFindings([
      { category: 'page-error', message: 'boom' },
      { category: 'blocked-write', message: 'POST /api/x' },
    ]);
    expect(blockingFindings(findings).map((entry) => entry.category)).toEqual(['page-error']);
  });

  test('console errors are attributed to the route that produced them', () => {
    // Listeners fire without route context; spans are what make the worklist
    // say WHERE. Without them every error would land in the unattributed tail.
    const state = createCrawlState();

    const first = markIssueCursor(state);
    state.consoleErrors.push('error from route A');
    state.routeResults.push({ route: '/a', status: 'visited', clicks: 1, span: closeIssueCursor(state, first) });

    const second = markIssueCursor(state);
    state.consoleErrors.push('error from route B');
    state.routeResults.push({ route: '/b', status: 'visited', clicks: 1, span: closeIssueCursor(state, second) });

    const issues = toRawIssues(state, 'admin');
    expect(issues.find((entry) => entry.message === 'error from route A')?.route).toBe('/a');
    expect(issues.find((entry) => entry.message === 'error from route B')?.route).toBe('/b');
  });

  test('errors emitted outside any route span are kept, not dropped', () => {
    const state = createCrawlState();
    state.consoleErrors.push('error before any route ran');

    const issues = toRawIssues(state, 'admin');
    expect(issues).toHaveLength(1);
    expect(issues[0].route).toBeUndefined();
  });

  // ---- Fixes from the Kimi K3 hostile code review (2026-08-12) ----

  test('overlapping suppressions are BOTH active — neither is mislabelled stale', () => {
    // BUG-6. First-hit attribution marked only the first matcher active, so an
    // operator following "stale — delete it" would delete a load-bearing entry.
    const findings = buildFindings([{ category: 'console-error', message: 'tolerated noise here' }]);
    const a = suppression({ id: 'a', pattern: 'tolerated' });
    const b = suppression({ id: 'b', pattern: 'noise here' });

    const { audit } = applySuppressions(findings, [a, b], TODAY);

    expect(audit.active.map((entry) => entry.id).sort()).toEqual(['a', 'b']);
    expect(audit.stale).toHaveLength(0);
    expect(audit.matchCounts).toEqual({ a: 1, b: 1 });
  });

  test('an over-broad pattern is rejected, not silently honoured', () => {
    // A `.` pattern silences everything while reading as one innocuous line.
    const findings = buildFindings([{ category: 'page-error', message: 'boom' }]);
    const { surviving, audit } = applySuppressions(findings, [suppression({ pattern: '.' })], TODAY);

    expect(audit.invalid[0].problem).toContain('over-broad');
    expect(surviving).toHaveLength(1);
  });

  test('an unattributed suppression is rejected — owner is required', () => {
    const findings = buildFindings([{ category: 'console-error', message: 'tolerated noise here' }]);
    const { surviving, audit } = applySuppressions(
      findings, [{ ...suppression(), owner: '' }], TODAY,
    );

    expect(audit.invalid[0].problem).toBe('missing owner');
    expect(surviving).toHaveLength(1);
  });

  test('duplicate suppression ids are rejected — id is the registry identity key', () => {
    const { audit } = applySuppressions([], [suppression(), suppression()], TODAY);
    expect(audit.invalid[0].problem).toContain('duplicate id');
  });

  test('blocked writes reach the worklist, so it cannot disagree with the gate', () => {
    // BUG-4: the category existed but was never emitted, so the worklist could
    // print "(no findings)" moments before the assertion failed on blocked writes.
    const state = createCrawlState();
    state.blockedWrites.push('POST /api/sessions');
    state.blockedWrites.push('POST /api/dashboard/track-pageview'); // harness's own, excluded

    const issues = toRawIssues(state, 'admin', []);
    const blocked = issues.filter((entry) => entry.category === 'blocked-write');

    expect(blocked.map((entry) => entry.message)).toEqual(['POST /api/sessions']);
  });

  test('EVERY benign beacon is excluded from the worklist, not just the first one', () => {
    // The live production audit failed on `POST /api/telemetry/funnel` (SWA-29),
    // a second fire-and-forget beacon that shipped after the allowlist was
    // written. The allowlist named ONE endpoint in four separate copies, so a
    // new beacon reads as a real finding on every route and buries the real ones.
    const state = createCrawlState();
    state.blockedWrites.push('POST /api/sessions');
    for (const beacon of BENIGN_WRITE_BEACONS) {
      state.blockedWrites.push(`${beacon.method} ${beacon.path}`);
    }

    const issues = toRawIssues(state, 'admin', []);
    const blocked = issues.filter((entry) => entry.category === 'blocked-write');

    expect(blocked.map((entry) => entry.message)).toEqual(['POST /api/sessions']);
  });

  test('routes the crawl never reached reach the worklist too', () => {
    const state = createCrawlState();
    state.routeResults.push({ route: '/a', status: 'visited', clicks: 0 });

    const issues = toRawIssues(state, 'admin', ['/a', '/b']);
    const unreached = issues.filter((entry) => entry.message.includes('never reached'));

    expect(unreached).toHaveLength(1);
    expect(unreached[0].route).toBe('/b');
  });

  test('the in-date matcher is the SINGLE source of product suppressions', () => {
    // BUG-2: compactIssues used to hardcode its own copies of registry patterns,
    // so an entry could expire while the real gate kept swallowing the defect.
    const live = inDateSuppressionMatcher([suppression()], TODAY);
    const dead = inDateSuppressionMatcher([suppression({ expires: '2026-01-01' })], TODAY);

    expect(live('tolerated noise here')).toBe(true);
    expect(dead('tolerated noise here')).toBe(false);
    expect(live('an unrelated TypeError')).toBe(false);
  });

  test('an expired suppression ALONE fails the gate, with no other defect present', () => {
    // BUG-1, the review's headline. compactIssues is clean here, so ONLY the
    // worklist gate can catch this. Pre-fix, worklist.blocking was computed,
    // logged and discarded, so the test went green. Pins the WIRING, not the
    // function — the difference between an incentive fix and a description of one.
    const state = createCrawlState();
    state.routeResults.push({ route: '/a', status: 'visited', clicks: 0 });

    const worklist = buildWorklist(
      state, 'admin', [suppression({ expires: '2026-01-01' })], TODAY, ['/a'],
    );

    expect(compactIssues(state, ['/a'])).toEqual(NO_ISSUES);
    expect(worklist.blocking.map((entry) => entry.category)).toEqual(['expired-suppression']);
  });

  test('the SHIPPED registry itself passes the stricter validation', () => {
    // Slice 1 tightened validation (owner required, duplicate ids rejected,
    // over-broad patterns rejected). If the registry's own entries fail those
    // rules, every crawl reports critical invalid-suppression findings and the
    // build breaks on our own configuration. Validate the real thing, not a stub.
    const { audit } = applySuppressions([], QA_SUPPRESSIONS, TODAY);

    expect(audit.invalid).toEqual([]);
    // And nothing shipped already expired.
    expect(audit.expired).toEqual([]);
  });

  test('the worklist folds suppression problems in alongside real defects', () => {
    const state = createCrawlState();
    const cursor = markIssueCursor(state);
    state.pageErrors.push('uncaught TypeError');
    state.routeResults.push({ route: '/a', status: 'visited', clicks: 0, span: closeIssueCursor(state, cursor) });

    const worklist = buildWorklist(state, 'admin', [suppression({ expires: '2026-01-01' })], TODAY);

    expect(worklist.findings.map((entry) => entry.category))
      .toEqual(expect.arrayContaining(['page-error', 'expired-suppression']));
    expect(worklist.blocking.length).toBeGreaterThan(0);
  });
});
