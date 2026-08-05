/**
 * Admin data-sync orphan detection — two live data-loss bugs
 * ==========================================================
 * `POST /api/admin/sync-data` "repairs" orphaned records: it nulls the user/trainer on orphaned
 * sessions and DESTROYS orphaned notifications. Both bugs below were confirmed against the
 * production database, and either one alone was sufficient to cause the loss.
 *
 * BUG 1 — `Op.notIn: []` does not mean "exclude nothing". Sequelize drops the entire WHERE clause,
 * so an empty exclusion list matches EVERY row. Production has 7 users, so the user path was
 * latent — but the trainer path filtered to `role === 'trainer'`, and production has ZERO of
 * those, so that list was empty in real life.
 *
 * BUG 2 — orphaned was defined as `trainerId NOT IN (users WHERE role === 'trainer')`. Orphaned
 * means the referenced row is GONE. Production's 9 trainer-assigned sessions pointed at users 5
 * and 2 — both present, both `role='admin'` (admins who also coach). Genuinely orphaned: 0.
 * Would have been cleared: 9.
 *
 * These tests assert the destructive call does NOT happen. A test that only checks the happy path
 * ("real orphans are cleaned") passes just as happily against the broken code.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const ADMIN = { id: 1, role: 'admin' };

/**
 * Boot the router with every model and the transaction mocked.
 * `users` is the full User.findAll result the route will see.
 */
async function mountRouter({ users, sessions = [], notifications = [] }) {
  vi.resetModules();

  const sessionUpdate = vi.fn(async () => [0]);
  const notificationDestroy = vi.fn(async () => 0);
  const commit = vi.fn(async () => undefined);
  const rollback = vi.fn(async () => undefined);

  // Session.findAll is called three times: orphaned-by-user, orphaned-by-trainer, past-sessions.
  // Returning the captured `where` lets each test assert what was actually asked for.
  const sessionWheres = [];
  const sessionFindAll = vi.fn(async (opts) => {
    sessionWheres.push(opts?.where);
    return sessions;
  });
  const notificationWheres = [];
  const notificationFindAll = vi.fn(async (opts) => {
    notificationWheres.push(opts?.where);
    return notifications;
  });

  vi.doMock('../../models/User.mjs', () => ({ default: { findAll: vi.fn(async () => users) } }));
  vi.doMock('../../models/Session.mjs', () => ({
    default: { findAll: sessionFindAll, update: sessionUpdate },
  }));
  vi.doMock('../../models/Notification.mjs', () => ({
    default: { findAll: notificationFindAll, destroy: notificationDestroy },
  }));
  vi.doMock('../../database.mjs', () => ({
    default: { transaction: vi.fn(async () => ({ commit, rollback })) },
  }));
  vi.doMock('../../middleware/authMiddleware.mjs', () => ({
    protect: (req, _res, next) => { req.user = ADMIN; next(); },
    adminOnly: (req, _res, next) => { req.user = ADMIN; next(); },
  }));

  const router = (await import('../../routes/admin.mjs')).default;
  const app = express();
  app.use(express.json());
  app.use('/api/admin', router);

  return { app, sessionUpdate, notificationDestroy, commit, rollback, sessionWheres, notificationWheres };
}

/**
 * Walk a Sequelize `where` and collect every array held under an `Op.notIn` symbol key.
 *
 * JSON.stringify CANNOT be used here: Sequelize's operators are Symbol keys, and stringify drops
 * symbol-keyed properties entirely — a where of `{ trainerId: { [Op.notIn]: [5] } }` serialises to
 * `{"trainerId":{}}`. My first version of this test asserted against that string and was therefore
 * asserting nothing at all.
 */
function collectNotInIds(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) {
    for (const item of node) collectNotInIds(item, found);
    return found;
  }
  for (const sym of Object.getOwnPropertySymbols(node)) {
    if (String(sym).includes('notIn')) {
      const v = node[sym];
      if (Array.isArray(v)) found.push(...v);
    } else {
      collectNotInIds(node[sym], found);
    }
  }
  for (const key of Object.keys(node)) collectNotInIds(node[key], found);
  return found;
}

/** True if any Op.notIn in this where holds an EMPTY array — the match-everything shape. */
function hasEmptyNotIn(node) {
  if (!node || typeof node !== 'object') return false;
  if (Array.isArray(node)) return node.some(hasEmptyNotIn);
  for (const sym of Object.getOwnPropertySymbols(node)) {
    const v = node[sym];
    if (String(sym).includes('notIn') && Array.isArray(v) && v.length === 0) return true;
    if (hasEmptyNotIn(v)) return true;
  }
  return Object.keys(node).some((k) => hasEmptyNotIn(node[k]));
}

/** Readable rendering for assertion messages, since stringify hides the symbol keys. */
function describeWhere(node) {
  const ids = collectNotInIds(node);
  return `where(notIn ids: [${ids.join(',')}])`;
}

afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

describe('admin data-sync refuses to act on an empty user set', () => {
  it('ABORTS instead of treating every record as orphaned when no users exist', async () => {
    const h = await mountRouter({ users: [] });
    const res = await request(h.app).post('/api/admin/sync-data').send({});

    // The destructive calls are the assertion. A 200 with zero writes would also be "safe", but
    // silently reporting success on a broken read is how this class hides.
    expect(h.notificationDestroy).not.toHaveBeenCalled();
    expect(h.sessionUpdate).not.toHaveBeenCalled();
    expect(h.rollback).toHaveBeenCalled();
    expect(h.commit).not.toHaveBeenCalled();
    expect(res.status).toBe(409);
  });

  it('proceeds normally when users exist', async () => {
    const h = await mountRouter({ users: [{ id: 1, role: 'admin' }, { id: 2, role: 'client' }] });
    const res = await request(h.app).post('/api/admin/sync-data').send({});

    expect(h.commit).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});

describe('orphaned means the user is GONE, not that their role changed', () => {
  it('excludes trainer sessions against ALL user ids, not just role==="trainer"', async () => {
    // Production shape: admins who coach. If the exclusion list were role-filtered it would be
    // empty here, and every trainer-assigned session would be cleared.
    const users = [
      { id: 5, role: 'admin' },
      { id: 2, role: 'admin' },
      { id: 9, role: 'client' },
    ];
    const h = await mountRouter({ users });
    await request(h.app).post('/api/admin/sync-data').send({});

    // Second Session.findAll is the trainer-orphan query.
    const ids = collectNotInIds(h.sessionWheres[1]);

    // Every existing user id must be in the exclusion list — including the admins. If this were
    // still role-filtered, `ids` would be empty and all three assertions would fail.
    expect(ids).toEqual(expect.arrayContaining([5, 2, 9]));
  });

  it('never builds an empty exclusion list, which Sequelize turns into match-everything', async () => {
    const h = await mountRouter({ users: [{ id: 5, role: 'admin' }] });
    await request(h.app).post('/api/admin/sync-data').send({});

    // Symbol-aware: the previous JSON.stringify version of this check passed vacuously because
    // stringify drops the Op.notIn key it was meant to inspect.
    const wheres = h.sessionWheres.concat(h.notificationWheres);
    expect(wheres.length).toBeGreaterThan(0); // guard against asserting over an empty loop

    for (const where of wheres) {
      const ids = collectNotInIds(where);
      // Not "no ids anywhere" — specifically, no notIn clause was built with an EMPTY array,
      // which is the shape Sequelize turns into match-everything.
      expect(hasEmptyNotIn(where), `empty notIn found in ${describeWhere(where)}`).toBe(false);
      if (ids.length) expect(ids).toContain(5);
    }
  });
});
