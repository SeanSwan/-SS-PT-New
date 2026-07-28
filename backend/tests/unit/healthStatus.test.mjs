/**
 * Tests for health-status derivation — what the health endpoint TELLS an operator.
 *
 * WHY THIS FILE EXISTS (SWA-71, 2026-07-28, pre-launch audit):
 * `/health` set `status: 'healthy'` before touching the database, and every database failure path
 * was caught and rewritten to `message: 'Server healthy'`. With the database completely
 * unreachable it reported:
 *
 *     200  { status: 'healthy', checks: { store: 'unknown' }, message: 'Server healthy' }
 *
 * During a launch incident — a wrong DATABASE_URL, an unreachable host — an operator curling
 * /health was told everything was fine while every real request failed. Same defect class as a
 * safety check that reports a pass without running.
 *
 * The logic was extracted into a pure module specifically so it could be tested. Health-check
 * logic that can only be exercised by booting a server is the last place you want untested code.
 *
 * WHAT DELIBERATELY DID NOT CHANGE: `/health` still returns HTTP 200 in every non-exception case.
 * Render uses it for LIVENESS, and a 503 during a transient database blip would make it restart an
 * application server that is running fine — turning a database problem into an outage. The body
 * now answers "can it serve"; the status code keeps answering "is the process up". `/health/ready`
 * is the probe that is allowed to fail.
 *
 * Verified before shipping: both existing `/api/health` consumers (NetworkStatus.tsx,
 * useBackendConnection.tsx) branch on the HTTP status code only and never read the body, so
 * making the body truthful has no blast radius.
 */
import { describe, it, expect } from 'vitest';
import { deriveHealthStatus, readinessHttpStatus, STORE_CHECK } from '../../routes/healthStatus.mjs';

describe('deriveHealthStatus — an unreachable database must not report "healthy"', () => {
  const down = () => deriveHealthStatus({ dbReachable: false, validPricedPackages: null });

  it('reports degraded rather than healthy', () => {
    expect(down().status).toBe('degraded');
  });

  it('reports not-ready', () => {
    expect(down().ready).toBe(false);
  });

  it('marks the store check unknown', () => {
    expect(down().checks.store).toBe(STORE_CHECK.UNKNOWN);
  });

  it('says plainly that requests will fail', () => {
    expect(down().message).toMatch(/database is unreachable/i);
  });

  it('no longer claims "Server healthy"', () => {
    // The exact string the old code substituted on every database failure path.
    expect(down().message).not.toBe('Server healthy');
  });
});

describe('deriveHealthStatus — reachable but nothing sellable', () => {
  it('is degraded and not ready when there are no active priced packages', () => {
    const status = deriveHealthStatus({ dbReachable: true, validPricedPackages: 0 });
    expect(status.status).toBe('degraded');
    expect(status.ready).toBe(false);
    expect(status.checks.store).toBe(STORE_CHECK.DEGRADED);
    expect(status.message).toMatch(/cannot transact/i);
  });

  it.each([[null], [undefined], [0], [-1], [NaN]])(
    'treats a package count of %s as not ready',
    (count) => {
      expect(deriveHealthStatus({ dbReachable: true, validPricedPackages: count }).ready).toBe(false);
    }
  );
});

describe('deriveHealthStatus — genuinely healthy', () => {
  it('reports healthy and ready when the store can transact', () => {
    const status = deriveHealthStatus({ dbReachable: true, validPricedPackages: 5 });
    expect(status.status).toBe('healthy');
    expect(status.ready).toBe(true);
    expect(status.checks.store).toBe(STORE_CHECK.READY);
    expect(status.message).toBe('API operational');
  });
});

describe('deriveHealthStatus — strict inputs, because it must fail CLOSED', () => {
  // Found by hostile review after the first ship. None were reachable from the two real call
  // sites, but a fail-closed primitive that fails OPEN on unexpected input is backwards, and the
  // next caller does not know the unwritten contract.
  it('does not throw when called with no argument', () => {
    // Previously threw on destructuring, which would have 500'd the health endpoint.
    expect(() => deriveHealthStatus()).not.toThrow();
    expect(deriveHealthStatus().ready).toBe(false);
  });

  it.each([
    ['the STRING "false" (truthy)', { dbReachable: 'false', validPricedPackages: 5 }],
    ['a truthy non-boolean', { dbReachable: 1, validPricedPackages: 5 }]
  ])('treats %s as NOT reachable', (_label, input) => {
    expect(deriveHealthStatus(input).ready).toBe(false);
  });

  it.each([
    ['Infinity', Infinity],
    ['a numeric string', '5'],
    ['NaN', NaN]
  ])('treats a package count of %s as not sellable', (_label, count) => {
    expect(deriveHealthStatus({ dbReachable: true, validPricedPackages: count }).ready).toBe(false);
  });
});

describe('readinessHttpStatus — the probe that is allowed to fail', () => {
  it('returns 200 only when the service can actually serve', () => {
    expect(readinessHttpStatus(deriveHealthStatus({ dbReachable: true, validPricedPackages: 3 }))).toBe(200);
  });

  it.each([
    ['database unreachable', { dbReachable: false, validPricedPackages: null }],
    ['no sellable packages', { dbReachable: true, validPricedPackages: 0 }]
  ])('returns 503 when %s', (_label, input) => {
    expect(readinessHttpStatus(deriveHealthStatus(input))).toBe(503);
  });

  it.each([[undefined], [null], [{}], [{ ready: false }]])(
    'fails CLOSED for a malformed status (%s)',
    (input) => {
      // Reporting ready on a malformed input is how a broken deploy gets marked healthy.
      expect(readinessHttpStatus(input)).toBe(503);
    }
  );
});
