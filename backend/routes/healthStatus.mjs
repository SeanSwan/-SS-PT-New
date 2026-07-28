/**
 * healthStatus.mjs — pure status derivation for the health endpoint.
 * ==================================================================
 * WHY THIS IS A SEPARATE, DEPENDENCY-FREE MODULE (SWA-71, 2026-07-28):
 * The health handler lives inside an Express route, so its logic could only be exercised by
 * booting a server. Pulling the decision out into a pure function makes the one thing that
 * actually matters — *what do we tell the operator* — unit-testable with no express, no database,
 * and no network. A health check nobody can test is the last place you want untested logic.
 *
 * WHAT WAS WRONG: `/health` set `status: 'healthy'` before touching the database, and every
 * database failure path was caught and rewritten to `message: 'Server healthy'`. With the DB
 * completely unreachable the endpoint reported:
 *
 *     200  { status: 'healthy', checks: { store: 'unknown' }, message: 'Server healthy' }
 *
 * During a launch incident — a wrong DATABASE_URL, an unreachable host — an operator curling
 * /health was told everything was fine while every real request failed. That is the same defect
 * class as a safety check that reports a pass without running.
 *
 * WHAT DELIBERATELY DID NOT CHANGE: the HTTP status stays 200 for every non-exception case.
 * Render uses this endpoint for liveness, and returning 503 during a transient database blip
 * would have it kill an application server that is running fine — turning a database problem into
 * an outage. Liveness ("the process is up") and readiness ("it can serve") are different
 * questions; this module makes the BODY answer the second one honestly while the STATUS CODE keeps
 * answering the first.
 *
 * @module routes/healthStatus
 */

/** Store-check outcomes, in increasing order of badness. */
export const STORE_CHECK = Object.freeze({
  READY: 'ready',
  DEGRADED: 'degraded',
  UNKNOWN: 'unknown'
});

/**
 * Derive the reported health body from what the store check actually produced.
 *
 * @param {Object} input
 * @param {boolean} input.dbReachable - false when the query threw, timed out, or models are absent
 * @param {number|null} input.validPricedPackages - sellable package count, null when unknown
 * @returns {{ status: string, ready: boolean, checks: { store: string }, message: string }}
 */
export function deriveHealthStatus({ dbReachable, validPricedPackages } = {}) {
  // STRICT checks, not truthiness — this function's whole contract is failing closed, so it must
  // not be lenient about its own inputs. Found by hostile review after the first ship:
  //   - called with NO argument it THREW on destructuring, which would 500 the health endpoint
  //   - `dbReachable: 'false'` (the STRING) is truthy and reported "healthy"
  //   - `validPricedPackages: Infinity` reported a transactable store
  // None were reachable from today's two call sites, which pass real booleans and a real count —
  // but a fail-closed primitive that fails open on unexpected input is backwards, and the next
  // caller does not know the unwritten contract.
  const reachable = dbReachable === true;
  const packageCount = Number.isFinite(validPricedPackages) ? validPricedPackages : 0;

  // The database is unreachable. Say so. This used to report "healthy" / "Server healthy", which
  // told an operator mid-incident that nothing was wrong.
  if (!reachable) {
    return {
      status: 'degraded',
      ready: false,
      checks: { store: STORE_CHECK.UNKNOWN },
      message: 'Server process is up but the database is unreachable — requests will fail'
    };
  }

  // Reachable, but nothing sellable. The server works; the storefront cannot transact.
  if (packageCount <= 0) {
    return {
      status: 'degraded',
      ready: false,
      checks: { store: STORE_CHECK.DEGRADED },
      message: 'Database reachable but no active priced packages — store cannot transact'
    };
  }

  return {
    status: 'healthy',
    ready: true,
    checks: { store: STORE_CHECK.READY },
    message: 'API operational'
  };
}

/**
 * HTTP status for the READINESS probe (a separate endpoint from liveness).
 *
 * Readiness is allowed to fail — that is its entire purpose. Point uptime monitoring here, not at
 * `/health`, so a genuine "cannot serve" condition is visible without giving Render a reason to
 * restart a process that is running correctly.
 *
 * @param {{ ready: boolean }} status
 * @returns {number} 200 when servable, 503 when not
 */
export function readinessHttpStatus(status) {
  return status?.ready ? 200 : 503;
}
