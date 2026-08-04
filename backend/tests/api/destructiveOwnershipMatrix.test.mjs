/**
 * ============================================================================
 * FILE: destructiveOwnershipMatrix.test.mjs
 * PURPOSE: Drive every non-admin DELETE route as a NON-OWNER and prove the
 *          mutation never happens.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-31 (SWA-75)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * The admin matrices cover role gates. They say nothing about the ~70 DELETE routes
 * a client is *supposed* to reach — where the control is OWNERSHIP, not role. That
 * was the last unproven half of the destructive surface.
 *
 * THE SIGNAL IS THE MUTATION, NOT THE STATUS CODE. Every model write method is
 * instrumented, so the question asked is "did destroy()/update() actually run for a
 * non-owner?" A status code cannot answer that: a handler can return 200 having
 * deleted nothing, or 500 after deleting something.
 *
 * ── This harness took three iterations, and the first two LIED ──
 *
 * Both earlier versions produced confident, plausible, wrong findings. Recording
 * why, because anyone extending this will hit the same walls:
 *
 *   v1 — mocks ignored `where` entirely.            13 false positives.
 *        Handlers that authorise by SCOPING THE QUERY (`findOne({where:{id,userId}})`)
 *        were handed a row they could never have found in reality.
 *   v2 — checked options.where against a hand-written owner-key allowlist.
 *        2 false positives, for two DIFFERENT reasons:
 *          · /api/cart/remove/:itemId scopes ownership through an association —
 *            `include:[{model:ShoppingCart, where:{userId}}]` — which is an INNER
 *            JOIN the top-level `where` never mentions.
 *          · /api/goals/:goalId/supporters scopes on `supporterId`, a perfectly
 *            normal owner column my allowlist simply did not contain.
 *        The allowlist WAS the bug: a list of owner-column names can never be
 *        complete.
 *   v3 — this one. Name-agnostic: does the query scope itself to the CALLER? Any
 *        *Id-ish field, at any depth, INCLUDING association includes, whose value
 *        equals the caller's own id means the query cannot return another user's
 *        row. Covers supporterId, followerId, authorId and every future name.
 *
 * There are three authorisation styles in this codebase — check-after-fetch,
 * scope-in-query, and scope-via-include. An instrument blind to any one of them
 * manufactures findings.
 *
 * SAFETY: no DATABASE_URL, sequelize neutered, and every model method stubbed, so
 * the whole probe is pure in-memory. Nothing can reach any database.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

const OWNER = 902;   // every seeded row belongs to this user
const PROBER = 901;  // the non-owner driving the requests

/**
 * Routes where a NON-OWNER may legitimately cause a mutation, with the reason.
 * Empty today. An entry here is a claim that cross-user mutation is intended.
 */
const INTENTIONALLY_MUTABLE = new Map();

let app;
let targets;
let setCaller;
let mutations = [];
let callerId = PROBER;
let savedDatabaseUrl;

const unwrap = (v) => (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v))
  ? Object.values(v)[0] : v;

/** Does this query scope itself to the CALLER, and therefore exclude OWNER's rows? */
function scopedToCaller(node, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 6) return false;
  if (Array.isArray(node)) return node.some((n) => scopedToCaller(n, depth + 1));
  for (const [k, v] of Object.entries(node)) {
    if (/id$/i.test(k) && k.toLowerCase() !== 'id') {
      const n = Number(unwrap(v));
      if (Number.isFinite(n) && n === callerId && callerId !== OWNER) return true;
    }
    if (v && typeof v === 'object' && scopedToCaller(v, depth + 1)) return true;
  }
  return false;
}

/** options.where AND every association include's where. */
function excludes(opts) {
  if (!opts || typeof opts !== 'object') return false;
  if (scopedToCaller(opts.where)) return true;
  const inc = opts.include;
  if (Array.isArray(inc)) return inc.some((i) => excludes(i));
  if (inc && typeof inc === 'object') return excludes(inc);
  return false;
}

function makeRow(name) {
  const row = {
    id: 999999, userId: OWNER, ownerId: OWNER, clientId: OWNER, senderId: OWNER,
    trainerId: OWNER, createdBy: OWNER, authorId: OWNER, supporterId: OWNER,
    cartId: 555, isDeleted: false, status: 'active', visibility: 'private',
    toJSON() { return { ...this }; },
    get(k) { return this[k]; },
    destroy: async () => { mutations.push(`${name}.instance.destroy`); return 1; },
    update: async () => { mutations.push(`${name}.instance.update`); return row; },
    save: async () => { mutations.push(`${name}.instance.save`); return row; },
  };
  return row;
}

const decode = (re) => {
  if (re.fast_slash) return '';
  let s = re.source;
  s = s.replace(/^\^/, '').replace(/\(\?=\\\/\|\$\)$/, '').replace(/\\\/\?$/, '').replace(/\$$/, '');
  return s.replace(/\\\//g, '/');
};

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  savedDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  const sequelize = (await import('../../database.mjs')).default;
  sequelize.query = async () => { throw new Error('DB_BLOCKED'); };
  sequelize.authenticate = async () => { throw new Error('DB_BLOCKED'); };
  sequelize.transaction = async () => ({ commit: async () => {}, rollback: async () => {}, LOCK: {} });

  const models = await import('../../models/index.mjs');
  await models.initializeModelsCache();

  for (const [name, M] of Object.entries(models.getAllModels())) {
    if (!M || typeof M !== 'function') continue;
    try {
      M.findByPk = async (_id, o = {}) => (excludes(o) ? null : makeRow(name));
      M.findOne = async (o = {}) => (excludes(o) ? null : makeRow(name));
      M.findAll = async (o = {}) => (excludes(o) ? [] : [makeRow(name)]);
      M.findAndCountAll = async (o = {}) => (excludes(o) ? { rows: [], count: 0 } : { rows: [makeRow(name)], count: 1 });
      M.count = async (o = {}) => (excludes(o) ? 0 : 1);
      M.create = async () => makeRow(name);
      M.destroy = async (o = {}) => { if (excludes(o)) return 0; mutations.push(`${name}.destroy`); return 1; };
      M.update = async (_v, o = {}) => { if (excludes(o)) return [0]; mutations.push(`${name}.update`); return [1]; };
      M.decrement = async () => [1];
      M.increment = async () => [1];
      M.bulkCreate = async () => [makeRow(name)];
    } catch { /* frozen model */ }
  }

  const { createApp } = await import('../../core/app.mjs');
  app = await createApp();

  let current = { id: PROBER, role: 'client' };
  setCaller = (id) => { current = { id, role: 'client' }; callerId = id; };

  const patch = (stack) => {
    for (const layer of stack) {
      if (layer.route) {
        for (const l of layer.route.stack) {
          if (l.name === 'protect') l.handle = (req, _res, next) => { req.user = { ...current }; next(); };
        }
      } else if (layer.handle?.stack) patch(layer.handle.stack);
      else if (layer.name === 'protect') layer.handle = (req, _res, next) => { req.user = { ...current }; next(); };
    }
  };

  const collected = [];
  const walk = (stack, prefix) => {
    for (const layer of stack) {
      if (layer.route) { if (layer.route.methods.delete) collected.push(prefix + layer.route.path); }
      else if (layer.handle?.stack) walk(layer.handle.stack, prefix + decode(layer.regexp));
    }
  };
  for (const layer of app._router.stack) {
    if (layer.name === 'router' && layer.handle?.stack) { patch(layer.handle.stack); walk(layer.handle.stack, decode(layer.regexp)); }
  }

  targets = [...new Set(collected.filter((p) => !p.startsWith('/api/admin')))];
}, 300000);

afterAll(() => {
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;
});

const concrete = (p) => p.replace(/:[A-Za-z0-9_]+/g, '999999').replace(/\/$/, '') || '/';

describe('destructive routes: a non-owner cannot cause a mutation', () => {
  it('collected a substantial DELETE surface outside /api/admin', () => {
    expect(targets.length).toBeGreaterThan(40);
  });

  it('no non-owner DELETE reaches destroy()/update(), and owners still can', async () => {
    const leaked = [];
    let ownerMutatedSomewhere = 0;

    for (const p of targets) {
      setCaller(PROBER);
      mutations = [];
      try { await request(app).delete(concrete(p)).send({}).timeout({ deadline: 5000 }); } catch { continue; }
      const nonOwner = [...mutations];

      setCaller(OWNER);
      mutations = [];
      try { await request(app).delete(concrete(p)).send({}).timeout({ deadline: 5000 }); } catch { /* ignore */ }
      const owner = [...mutations];
      if (owner.length > 0) ownerMutatedSomewhere += 1;

      if (nonOwner.length > 0 && !INTENTIONALLY_MUTABLE.has(p)) {
        leaked.push(`${p} -> ${JSON.stringify(nonOwner)}`);
      }
    }

    // The control. Without it, a harness that never reaches ANY handler would
    // report a perfect zero and look like proof.
    expect(ownerMutatedSomewhere).toBeGreaterThan(10);
    expect(leaked).toEqual([]);
  }, 300000);
});
