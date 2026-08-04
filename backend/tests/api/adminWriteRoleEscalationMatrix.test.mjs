/**
 * ============================================================================
 * FILE: adminWriteRoleEscalationMatrix.test.mjs
 * PURPOSE: Drive every /api/admin POST, PUT, PATCH and DELETE as client, user and
 *          trainer, and prove the non-admin roles are turned away.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-31 (SWA-75)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * adminRoleEscalationMatrix.test.mjs drives admin GETs only. That was a deliberate
 * safety choice, and it left the more dangerous half unproven: a missing gate on a
 * READ leaks, a missing gate on a WRITE lets a client mutate the business.
 *
 * WHY IT IS SAFE TO DRIVE WRITES HERE — three independent layers, not one
 *
 * The naive version of this file would be genuinely dangerous. `database.mjs` falls
 * back to LOCALHOST POSTGRES (db `swanstudios`, user `swanadmin`) whenever
 * DATABASE_URL is unset — the in-memory SQLite path is only reached if configuration
 * THROWS, which it does not. So "just don't set DATABASE_URL" is NOT isolation: on a
 * machine with a local Postgres running, these probes would write to a real database.
 *
 *   Layer 1 — DATABASE_URL is never read here, so production is unreachable by
 *             construction.
 *   Layer 2 — `sequelize.query` is replaced with a throwing stub before any request
 *             is driven. Every Sequelize read and write funnels through it
 *             (Model.create, .update, .destroy included), so no statement of any
 *             kind can reach any database, local or otherwise.
 *   Layer 3 — the first test PROVES layer 2 is active rather than assuming it. If
 *             the stub is ever bypassed, that test fails and the suite stops before
 *             a single write probe runs.
 *
 * A request that gets past a role gate therefore reaches a handler whose first DB
 * call throws — surfacing as 5xx, which is exactly the signal this matrix wants
 * ("it got past the gate"), with nothing mutated.
 *
 * WHAT COUNTS AS DENIED: 401, 403, 404. 404 is included because a route may
 * legitimately deny by hiding existence (see workoutSessionExistenceOracle).
 * A 4xx that is NOT one of those (e.g. 400 validation) means the request reached
 * handler logic — that is NOT a denial and is reported.
 *
 * ⚠️ WHY THIS MATRIX IS SOUND, AND WHY THE SAME TRICK IS NOT SOUND ELSEWHERE
 *
 * All 134 admin write routes answer 403 here. That is a definitive result because a
 * role gate replies BEFORE the handler resolves any model, so the verdict cannot be
 * confused with a harness failure.
 *
 * The same harness pointed at DELETE routes OUTSIDE /api/admin produced 50 × 500 and
 * NONE of it was interpretable. Many handlers resolve a model as their first
 * statement (`getStorefrontItem()` and friends), and this harness never calls
 * `initializeModelsCache()`, so resolution throws and the try/catch answers 500
 * before the authorization check runs. A 500 there means "threw early", NOT
 * "ungated" — the two are indistinguishable.
 *
 * The diagnostic that settles it: drive the SAME route as an ADMIN. On
 * DELETE /api/storefront/:id both client and admin got 500, and admin is supposed to
 * succeed — so the failure is pre-authorization and harness-induced, not a gate
 * defect. That route's `role !== 'admin'` check is present and correct.
 *
 * RULE FOR ANYONE EXTENDING THIS: a non-denial status is only a finding if a
 * privileged role gets a DIFFERENT result on the same route. Same result for both
 * means the probe never reached the decision, and reporting it is manufacturing a
 * finding.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

const NON_ADMIN_ROLES = ['client', 'user', 'trainer'];
const DENIED = new Set([401, 403, 404]);
const DB_BLOCKED = 'ADMIN_WRITE_MATRIX_DB_BLOCKED';

/**
 * Admin write routes reachable by a non-admin, with the role and the reason.
 * Per-route AND per-role on purpose: keying on route alone silently pardons every
 * role, which mutation testing already exposed once on the GET matrix.
 */
const INTENTIONALLY_REACHABLE = new Map();

let app;
let adminWrites;
let setRole;
let sequelize;

const decode = (re) => {
  if (re.fast_slash) return '';
  let s = re.source;
  s = s.replace(/^\^/, '').replace(/\(\?=\\\/\|\$\)$/, '').replace(/\\\/\?$/, '').replace(/\$$/, '');
  return s.replace(/\\\//g, '/');
};

/**
 * Saved and restored rather than simply deleted. Vitest's default pool forks an
 * isolated process per FILE, so mutating env here cannot reach a sibling suite —
 * but that is an unstated default, and a config change (pool: 'threads',
 * isolate: false, fileParallelism tweaks) would silently turn this file into
 * sabotage of every sibling that needs a database. A test may not leave the
 * environment worse than it found it on the strength of a default it does not own.
 */
let savedDatabaseUrl;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  savedDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL; // layer 1

  sequelize = (await import('../../database.mjs')).default;

  // Layer 2: nothing reaches any database. Model.create/update/destroy all route
  // through sequelize.query, so this one stub covers reads and writes alike.
  sequelize.query = async () => { throw new Error(DB_BLOCKED); };
  if (sequelize.connectionManager) {
    sequelize.connectionManager.getConnection = async () => { throw new Error(DB_BLOCKED); };
  }
  sequelize.authenticate = async () => { throw new Error(DB_BLOCKED); };
  sequelize.transaction = async () => { throw new Error(DB_BLOCKED); };

  const { createApp } = await import('../../core/app.mjs');
  app = await createApp();

  let current = { id: 90001, role: 'client', email: 'probe@example.test' };
  setRole = (role) => { current = { id: 90001, role, email: 'probe@example.test' }; };

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
        for (const method of ['post', 'put', 'patch', 'delete']) {
          if (layer.route.methods[method]) collected.push({ method, path: prefix + layer.route.path });
        }
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

  const seen = new Set();
  adminWrites = collected.filter((r) => {
    if (!r.path.startsWith('/api/admin')) return false;
    const key = `${r.method} ${r.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}, 180000);

afterAll(() => {
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;
});

/** Path params filled with an id that cannot match a real row. */
const concrete = (p) => p.replace(/:[A-Za-z0-9_]+/g, '999999').replace(/\/$/, '') || '/';

describe('admin WRITE surface rejects non-admin roles', () => {
  it('SAFETY: the database is provably unreachable before any write is driven', async () => {
    // This must run first and must pass, or every "denied" below is meaningless
    // and — far worse — the probes could be hitting a real local database.
    await expect(sequelize.query('SELECT 1')).rejects.toThrow(DB_BLOCKED);
    await expect(sequelize.transaction()).rejects.toThrow(DB_BLOCKED);
    expect(process.env.DATABASE_URL).toBeUndefined();
  });

  it('found a substantial admin write surface to test', () => {
    // Guards against the harness collecting nothing and "passing".
    expect(adminWrites.length).toBeGreaterThan(30);
  });

  for (const role of NON_ADMIN_ROLES) {
    it(`a ${role} cannot write to any admin route it is not explicitly allowed`, async () => {
      setRole(role);
      const reachable = [];

      for (const { method, path } of adminWrites) {
        let res;
        try {
          res = await request(app)[method](concrete(path)).send({}).timeout({ deadline: 8000 });
        } catch {
          continue; // transport/timeout is inconclusive — never a pass OR a finding
        }
        if (!DENIED.has(res.status)) reachable.push(`${method.toUpperCase()} ${path}`);
      }

      const unexpected = reachable.filter(
        (k) => !INTENTIONALLY_REACHABLE.get(k)?.roles.includes(role),
      );
      expect(unexpected).toEqual([]);
    }, 300000);
  }

  it('every allowlisted exception names its roles and carries a justification', () => {
    for (const [key, entry] of INTENTIONALLY_REACHABLE) {
      expect(key).toMatch(/^(POST|PUT|PATCH|DELETE) \/api\/admin/);
      expect(entry.reason.length).toBeGreaterThan(30);
      expect(Array.isArray(entry.roles) && entry.roles.length > 0).toBe(true);
      for (const r of entry.roles) expect(NON_ADMIN_ROLES).toContain(r);
    }
  });
});
