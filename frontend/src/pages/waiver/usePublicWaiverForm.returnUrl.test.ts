/**
 * safeReturnUrl — open-redirect guard
 * ====================================
 * The waiver gate redirects logged-in clients to `/waiver?returnUrl=…` and the
 * page navigates there after signing, so this value is attacker-reachable via
 * a crafted link. An earlier version of this guard did string checks
 * (`startsWith('//')`) and let three real bypasses through — found by attacking
 * it during the SWA-140 hostile pass, not by review:
 *
 *   /\evil.com      → browsers normalise the backslash    → //evil.com
 *   /<TAB>/evil.com → browsers strip control characters   → //evil.com
 *   /<VTAB>/evil.com → same
 *
 * Each would have bounced a client who just signed a waiver onto an
 * attacker-controlled page. The guard now parses against a sentinel origin so
 * the same normalisation the browser performs is applied before the decision.
 */
import { describe, it, expect } from 'vitest';
import { safeReturnUrl, computeAge } from './usePublicWaiverForm';

describe('safeReturnUrl — refuses anything that leaves the origin', () => {
  const offSite: Array<[string, string]> = [
    ['https://evil.com', 'absolute URL'],
    ['http://evil.com/x', 'absolute URL, http'],
    ['//evil.com', 'protocol-relative'],
    ['%2F%2Fevil.com', 'protocol-relative, percent-encoded'],
    ['/\\evil.com', 'backslash normalised to a slash by the browser'],
    ['/%5Cevil.com', 'backslash, percent-encoded'],
    ['/\\/evil.com', 'slash + backslash'],
    ['/%09/evil.com', 'TAB stripped by the browser, leaving //'],
    ['/%0B/evil.com', 'vertical tab'],
    ['/%0A/evil.com', 'newline'],
    ['javascript:alert(1)', 'javascript scheme'],
    ['data:text/html,<script>alert(1)</script>', 'data scheme'],
  ];

  it.each(offSite)('blocks %s (%s)', (input) => {
    expect(safeReturnUrl(input)).toBeNull();
  });

  it('blocks a malformed percent-encoding rather than throwing', () => {
    expect(safeReturnUrl('%E0%A4%A')).toBeNull();
  });

  it('blocks empty and missing values', () => {
    expect(safeReturnUrl(null)).toBeNull();
    expect(safeReturnUrl('')).toBeNull();
  });
});

describe('safeReturnUrl — preserves legitimate destinations', () => {
  it('keeps a plain dashboard path', () => {
    expect(safeReturnUrl('/dashboard/client')).toBe('/dashboard/client');
  });

  it('keeps query string and hash', () => {
    expect(safeReturnUrl('/dashboard/client/progress?tab=1#chart'))
      .toBe('/dashboard/client/progress?tab=1#chart');
  });

  it('accepts the percent-encoded form the gate actually writes', () => {
    expect(safeReturnUrl('%2Fdashboard%2Fclient%2Fprogress'))
      .toBe('/dashboard/client/progress');
  });
});

describe('computeAge — the check that decides who may sign', () => {
  const at = new Date('2026-08-04T12:00:00Z');

  it('treats an 18th birthday as adult', () => {
    expect(computeAge('2008-08-04', at)).toBe(18);
  });

  it('treats the day before an 18th birthday as a minor', () => {
    expect(computeAge('2008-08-05', at)).toBe(17);
  });

  it('handles a late-in-year birthday that has not happened yet', () => {
    expect(computeAge('2008-12-31', at)).toBe(17);
  });

  it('rejects a date that does not exist rather than guessing', () => {
    expect(computeAge('2026-02-31', at)).toBeNull();
    expect(computeAge('not-a-date', at)).toBeNull();
    expect(computeAge('', at)).toBeNull();
  });

  it('returns a negative age for a future date of birth, which fails the adult check', () => {
    const age = computeAge('2030-01-01', at);
    expect(age).not.toBeNull();
    expect(age as number).toBeLessThan(18);
  });
});
