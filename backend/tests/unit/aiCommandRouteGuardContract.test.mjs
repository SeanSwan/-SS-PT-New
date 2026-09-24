/**
 * Card 1.5 — every MUTATING command-lane route carries the kill switch and the
 * rate limiter. Enforcement, not convention.
 *
 * `/cancel` shipped with `protect` only while `/execute` and `/confirm` both
 * carried the full chain (finding F14g). Nothing noticed, because guard adoption
 * was a habit rather than a checked property: a paused lane still mutated
 * pending-operation state, and an endpoint whose failures are unaudited had no
 * rate limit at all. The next route added would have inherited the same silence.
 *
 * This walks the ROUTER — not the source text — so a guard that is imported,
 * mentioned in a comment, or applied to the wrong route cannot satisfy it.
 */
import { describe, it, expect, vi } from 'vitest';

const noop = (_req, _res, next) => next();
vi.mock('../../middleware/authMiddleware.mjs', () => ({ protect: function protect(_q, _s, n) { n(); } }));
vi.mock('../../middleware/aiCommandGuards.mjs', () => ({
  aiCommandLaneKillSwitch: function aiCommandLaneKillSwitch(_q, _s, n) { n(); },
  aiCommandRateLimiter: function aiCommandRateLimiter(_q, _s, n) { n(); },
}));
vi.mock('../../database.mjs', () => ({ default: { query: vi.fn() } }));
vi.mock('../../services/ai/commandAudit.mjs', () => ({ recordCommandAudit: vi.fn() }));
vi.mock('../../services/ai/commandExecutor.mjs', () => ({
  executeCommandPipeline: vi.fn(), executeConfirmedOperation: vi.fn(), checkForConfirmation: vi.fn(),
}));
vi.mock('../../services/ai/commandContextEnvelope.mjs', () => ({ buildCommandContextEnvelope: vi.fn() }));
vi.mock('../../services/ai/commandExecutionLane.mjs', () => ({ getCommandExecutionLane: vi.fn() }));
vi.mock('../../services/ai/commandDispatchEligibility.mjs', () => ({
  gateCommandFrontendDispatch: vi.fn(), buildDispatchRefusalResponse: vi.fn(),
}));

const router = (await import('../../routes/aiCommandRoutes.mjs')).default;

/** [{ method, path, guards: string[] }] straight from the mounted stack. */
const routes = router.stack
  .filter((layer) => layer.route)
  .map((layer) => ({
    path: layer.route.path,
    method: Object.keys(layer.route.methods)[0]?.toUpperCase(),
    guards: layer.route.stack.map((h) => h.name).filter(Boolean),
  }));

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const REQUIRED = ['protect', 'aiCommandLaneKillSwitch', 'aiCommandRateLimiter'];

describe('command-lane guard contract', () => {
  it('the router exposes routes to check — if this fails the walk broke, not the routes', () => {
    expect(routes.length).toBeGreaterThan(4);
    expect(routes.some((r) => r.path === '/execute')).toBe(true);
  });

  for (const route of routes.filter((r) => MUTATING.has(r.method))) {
    it(`${route.method} ${route.path} carries ${REQUIRED.join(' + ')}`, () => {
      for (const guard of REQUIRED) {
        expect(route.guards, `${route.method} ${route.path} guards: ${route.guards.join(', ')}`).toContain(guard);
      }
    });
  }

  it('every GET is at least authenticated — no anonymous read of the lane', () => {
    for (const route of routes.filter((r) => r.method === 'GET')) {
      expect(route.guards, `GET ${route.path}`).toContain('protect');
    }
  });

  it('the read-back route is rate-limited too — it is an owner-gated lookup loop otherwise', () => {
    const readBack = routes.find((r) => r.path === '/pending/:operationId');
    expect(readBack).toBeTruthy();
    expect(readBack.guards).toContain('aiCommandRateLimiter');
  });
});
