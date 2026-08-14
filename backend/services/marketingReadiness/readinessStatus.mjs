/**
 * MODULE: Marketing Readiness — shared status vocabulary
 * ======================================================
 * Extracted from `marketingReadinessService.mjs` (2026-08-14) so subsystem
 * builders can live in their own files without a circular import back to the
 * parent service. Behaviour is unchanged — this is a lift, not a redesign.
 *
 * STATUS semantics (the contract every subsystem builder honours):
 *  - ready     → configured and operating, OR safely dark by deliberate default
 *  - demo      → renders sample data; not backed by live persistence yet
 *  - degraded  → works, but with a real defect the operator should fix
 *  - blocked   → cannot function; operator action required
 *
 * `demo` deliberately carries ZERO severity: a labs panel must never make the
 * whole cockpit look broken. Only operational subsystems move the rollup.
 */

export const STATUS = {
  READY: 'ready',
  DEGRADED: 'degraded',
  BLOCKED: 'blocked',
  DEMO: 'demo',
};

// Worst-of rollup across operational (non-demo) subsystems.
export const SEVERITY = { ready: 0, demo: 0, degraded: 1, blocked: 2 };

export const rollup = (subsystems) => {
  let worst = STATUS.READY;
  for (const s of subsystems) {
    if ((SEVERITY[s?.status] ?? 0) > (SEVERITY[worst] ?? 0)) worst = s.status;
  }
  return worst;
};

export default { STATUS, SEVERITY, rollup };
