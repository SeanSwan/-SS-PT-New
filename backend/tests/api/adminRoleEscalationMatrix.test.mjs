/**
 * ============================================================================
 * FILE: adminRoleEscalationMatrix.test.mjs
 * PURPOSE: Drive EVERY /api/admin GET as client, user and trainer, and prove the
 *          non-admin roles are turned away.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-31 (SWA-75)
 * ============================================================================
 *
 * WHY EXECUTION, NOT INSPECTION
 * A static census of the same question — "which admin routes carry a role gate?" —
 * reported 141 of 323 as UNGATED. That number is garbage. `authorize([...])`
 * returns an anonymous arrow function, so a name-based scan of the middleware
 * chain cannot see the most common gate in the codebase and reports it as absent.
 * Driving the routes collapses 141 candidates to 2, and both turn out to be
 * deliberate. This is the third time in this audit that a name/text-based detector
 * produced a pile of false positives where execution produced the truth.
 *
 * SAFETY, deliberately built in:
 *   - GET only. No write is ever driven, so this can never mutate anything.
 *   - `protect` is stubbed, so no real credential is used.
 *   - Path params are filled with an id that will not match a real row.
 * A request that gets past a gate reaches a handler whose DB call fails in the
 * test environment — which still tells us what we need (it got past), without
 * depending on, or touching, real data.
 *
 * WHAT COUNTS AS DENIED: 401, 403, or 404. 404 is included because a route may
 * legitimately deny by hiding existence (see workoutSessionExistenceOracle.test.mjs
 * — that is the posture we deliberately chose for unauthorized reads).
 */

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

/**
 * Routes that non-admins may reach — keyed by route AND by the exact roles allowed.
 *
 * PER-ROLE ON PURPOSE. The first version of this allowlist keyed on route alone,
 * and mutation testing exposed it as nearly useless: allowlisting
 * /payment-settings/ so a TRAINER could reach it silently excused every other role
 * too, so deleting that route's role check entirely still passed the suite. An
 * allowlist that forgives more than it was meant to is worse than none, because it
 * reads like coverage.
 */
const INTENTIONALLY_REACHABLE = new Map([
  ['/api/admin/payment-settings/public', {
    roles: ['client', 'user', 'trainer'],
    reason: 'public by design — the checkout UI needs the payee details to render, and it returns only zelle/venmo/checkPayee',
  }],
  ['/api/admin/payment-settings/', {
    roles: ['trainer'],
    reason: 'admin OR trainer by design; returns the same fields /public already gives anonymously. Clients and raw users must still be denied.',
  }],
]);

/** Roles that must not be able to read admin surfaces. */
const NON_ADMIN_ROLES = ['client', 'user', 'trainer'];

const DENIED = new Set([401, 403, 404]);

let app;
let adminGets;
let setRole;

const decode = (re) => {
  if (re.fast_slash) return '';
  let s = re.source;
  s = s.replace(/^\^/, '').replace(/\(\?=\\\/\|\$\)$/, '').replace(/\\\/\?$/, '').replace(/\$$/, '');
  return s.replace(/\\\//g, '/');
};

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const { createApp } = await import('../../core/app.mjs');
  app = await createApp();

  let current = { id: 90001, role: 'client', email: 'probe@example.test' };
  setRole = (role) => { current = { id: 90001, role, email: 'probe@example.test' }; };

  // Swap every `protect` layer for a stub that authenticates as the role under
  // test. Patching the layer's handle keeps the Layer object intact.
  const patch = (stack) => {
    for (const layer of stack) {
      if (layer.route) {
        for (const l of layer.route.stack) {
          if (l.name === 'protect') l.handle = (req, _res, next) => { req.user = { ...current }; next(); };
        }
      } else if (layer.handle?.stack) {
        patch(layer.handle.stack);
      } else if (layer.name === 'protect') {
        layer.handle = (req, _res, next) => { req.user = { ...current }; next(); };
      }
    }
  };

  const collected = [];
  const walk = (stack, prefix) => {
    for (const layer of stack) {
      if (layer.route) {
        if (layer.route.methods.get) collected.push(prefix + layer.route.path);
      } else if (layer.handle?.stack) {
        walk(layer.handle.stack, prefix + decode(layer.regexp));
      }
    }
  };

  for (const layer of app._router.stack) {
    if (layer.name === 'router' && layer.handle?.stack) {
      patch(layer.handle.stack);
      walk(layer.handle.stack, decode(layer.regexp));
    }
  }

  adminGets = [...new Set(collected.filter((p) => p.startsWith('/api/admin')))];
// 600s, not because booting takes 600s (it takes ~7s alone) but because FOUR
// suites in this repo each boot the full Express app, and vitest may schedule
// them concurrently. Under that contention this hook once blew a 120s budget and
// vitest SKIPPED all of this file's security assertions — a skipped security test
// is worse than a failing one, because the summary still reads green-ish. The
// budget is deliberately far above any real boot so contention can never silence
// these checks.
}, 600000);

/** Fill path params with an id that will not match a real row. */
const concrete = (p) => p.replace(/:[A-Za-z0-9_]+/g, '999999').replace(/\/$/, '') || '/';

describe('admin surface rejects non-admin roles', () => {
  it('found a substantial admin GET surface to test', () => {
    // Guards against the harness silently collecting nothing and "passing".
    expect(adminGets.length).toBeGreaterThan(50);
  });

  for (const role of NON_ADMIN_ROLES) {
    it(`a ${role} cannot read any admin GET route it is not explicitly allowed`, async () => {
      setRole(role);
      const reachable = [];

      for (const p of adminGets) {
        let res;
        try {
          res = await request(app).get(concrete(p)).timeout({ deadline: 8000 });
        } catch {
          continue; // transport/timeout is inconclusive — never counted as a pass OR a finding
        }
        if (!DENIED.has(res.status)) reachable.push(p);
      }

      // Excused only if THIS role is named for THIS route.
      const unexpected = reachable.filter((p) => !INTENTIONALLY_REACHABLE.get(p)?.roles.includes(role));
      expect(unexpected).toEqual([]);
    }, 180000);
  }

  it('every allowlisted exception names its roles and carries a justification', () => {
    // An allowlist without reasons decays into a mute button; one without explicit
    // roles decays into a blanket pardon (which is exactly what happened here
    // before mutation testing caught it).
    for (const [route, entry] of INTENTIONALLY_REACHABLE) {
      expect(route.startsWith('/api/admin')).toBe(true);
      expect(entry.reason.length).toBeGreaterThan(30);
      expect(Array.isArray(entry.roles)).toBe(true);
      expect(entry.roles.length).toBeGreaterThan(0);
      for (const r of entry.roles) expect(NON_ADMIN_ROLES).toContain(r);
    }
  });
});
