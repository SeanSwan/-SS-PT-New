/**
 * ============================================================================
 * FILE: aiBffClientSummaryUserRoleFallthrough.test.mjs
 * PURPOSE: CA-0 — the `/client-summary/:clientId` handler in
 *          `routes/aiBffRoutes.mjs` carries `protect` ONLY and then runs a
 *          two-branch role ladder that handles `'client'` and `'trainer'`.
 *          `'user'` — the DEFAULT role minted by public self-registration and
 *          client-equivalent per `utils/clientAccess.mjs:23` — matches neither
 *          branch and falls through with no authorization of its own.
 *
 *          This file is BOTH the rule-55 diagnostic probe and the behavioural
 *          regression test for that defect.
 * AUTHOR: Claude (DeepSeek Harness) | CREATED: 2026-09-13
 * ============================================================================
 *
 * RULE 55 PROBE — WHY IT HAD TO BE EXECUTED
 * The audit doc named the target URL `/api/ai-command/client-summary/:clientId`
 * and described the route as `protect` ONLY. Both statements are incomplete:
 *
 *   - `core/routes.mjs:715` mounts `aiCommandRoutes` at `/api/ai-command`;
 *     the `client-summary` handler lives in `aiBffRoutes`, which
 *     `core/routes.mjs:718` mounts at `/api/admin/ai-bff`.
 *   - `core/routes.mjs:498` mounts `adminRoutes` at `/api/admin` — BEFORE
 *     line 718 — and `routes/adminRoutes.mjs:30-31` applies
 *     `router.use(authenticateToken); router.use(authorizeAdmin)` with NO path.
 *     `authorizeAdmin` is `adminOnly` (`middleware/auth.mjs:176`), which 403s
 *     every non-admin (`middleware/authMiddleware.mjs:436-451`).
 *
 * Static reading therefore cannot answer the CA-0 question. Two scenarios are
 * driven so the answer is observed rather than inferred:
 *
 *   SCENARIO A — the PRODUCTION mount chain, via `core/app.mjs::createApp()`.
 *                Answers: what does a `'user'` caller actually receive from the
 *                live URL today?
 *   SCENARIO B — the SAME real router under an ungated prefix, with the real
 *                downstream routers mounted. Answers: if the upstream
 *                `/api/admin` gate were removed, does the handler's own ladder
 *                deny a `'user'` caller, and are any of the four fan-out
 *                sub-results populated?
 *
 * ISOLATION (`config/database.mjs` loads repository env files — the ordinary
 * backend suite must never run against the shared `.env`). Note this worktree
 * has no `backend/.env` at all; these layers are defence in depth regardless:
 *   Layer 1 — `DATABASE_URL` deleted for the duration of this file.
 *   Layer 2 — the `sequelize` instance's query/authenticate/transaction are
 *             replaced with hard throws, so NO SQL can leave the process.
 *   Layer 3 — every model method is stubbed at runtime; no row is read/written.
 *   Layer 4 — global `fetch` is wrapped to REJECT any host that is not the
 *             loopback port this file itself opened. No external socket.
 *   Layer 5 — `protect` is patched in the router stack (the repo's established
 *             pattern — tests/api/destructiveOwnershipMatrix.test.mjs:152-161)
 *             so no real JWT/waiver lookup is needed. Everything the CA-0
 *             question is actually about — the in-handler role ladder and every
 *             downstream authorization guard — stays REAL.
 *             `req.user.id` is set as a STRING, reproducing
 *             `middleware/authMiddleware.mjs:357` `toStringId(user.id)`.
 */

import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const USER_ID = 901;          // the caller: default public-signup role
const OTHER_CLIENT_ID = 902;  // the target: a DIFFERENT client
const TRAINER_ID = 700;
const ADMIN_ID = 1;

const ADMIN_MOUNT = '/api/admin/ai-bff'; // production prefix (gated upstream)
const PROBE_MOUNT = '/probe/ai-bff';     // same router, no upstream /api/admin gate
const SUMMARY = '/client-summary';

let server;
let port;
let realFetch;
let currentCaller = { id: USER_ID, role: 'user' };
let savedDatabaseUrl;

/** Serialise a sub-result the way an operator reads it in the raw JSON. */
const describeSubResult = (value) => {
  if (value === null || value === undefined) return 'MISSING';
  if (typeof value !== 'object') return `scalar:${JSON.stringify(value)}`;
  if (value.error) return `DENIED(${value.error}${value.status ? ` status=${value.status}` : ''})`;
  if (Array.isArray(value.data)) return `POPULATED(array,len=${value.data.length})`;
  if (value.success === true) return 'POPULATED(success:true)';
  return `POPULATED(keys=${Object.keys(value).slice(0, 6).join(',')})`;
};

function makeRow(name) {
  return {
    id: 999999, userId: 999999, isDeleted: false, status: 'active',
    visibility: 'private', isActive: true,
    toJSON() { return { ...this }; },
    get(k) { return this[k]; },
  };
}

async function call(path, caller) {
  currentCaller = caller;
  const response = await realFetch(`http://127.0.0.1:${port}${path}`, {
    headers: { Authorization: 'Bearer probe-token-unused-protect-is-patched' },
  });
  let body;
  try { body = await response.json(); } catch { body = null; }
  return { status: response.status, body };
}

const patchProtect = (stack) => {
  for (const layer of stack) {
    const replacement = (req, _res, next) => {
      req.user = { id: String(currentCaller.id), role: currentCaller.role };
      next();
    };
    if (layer.route) {
      for (const l of layer.route.stack) if (l.name === 'protect') l.handle = replacement;
    } else if (layer.handle?.stack) {
      patchProtect(layer.handle.stack);
    } else if (layer.name === 'protect') {
      layer.handle = replacement;
    }
  }
};

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  savedDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL; // isolation layer 1

  // Isolation layer 2 — no SQL can leave the process.
  const sequelize = (await import('../../database.mjs')).default;
  sequelize.query = async () => { throw new Error('DB_BLOCKED'); };
  sequelize.authenticate = async () => { throw new Error('DB_BLOCKED'); };
  sequelize.transaction = async () => ({ commit: async () => {}, rollback: async () => {}, LOCK: {} });

  // Isolation layer 3 — every model method stubbed.
  const models = await import('../../models/index.mjs');
  await models.initializeModelsCache();
  for (const [name, M] of Object.entries(models.getAllModels())) {
    if (!M || typeof M !== 'function') continue;
    try {
      M.findByPk = async () => makeRow(name);
      M.findOne = async () => makeRow(name);
      M.findAll = async () => [makeRow(name)];
      M.findAndCountAll = async () => ({ rows: [makeRow(name)], count: 1 });
      M.count = async () => 1;
      M.create = async () => makeRow(name);
      M.update = async () => [1];
      M.destroy = async () => 1;
    } catch { /* frozen model */ }
  }

  // `ensureClientAccess` resolves the TARGET through User.findByPk and requires
  // `isClientEquivalentRole(client.role)` (utils/clientAccess.mjs:59-65), so the
  // target must answer as a real client-role row — not a generic stub.
  const User = models.getModel('User');
  User.findByPk = async (id) => ({ id: Number(id), role: 'client' });

  // The app is assembled from the REAL routers in the REAL mount order rather
  // than via `core/app.mjs::createApp()`, because createApp() terminates in a
  // catch-all (which answered the probe mount with 200 + HTML, masking it).
  // Mount order below mirrors core/routes.mjs:498 -> :718 and :428/:430.
  const app = express();
  const [
    { default: adminRoutes },
    { default: adminClientRoutes },
    { default: aiBffRoutes },
    { default: painEntryRoutes },
    { default: bodyMeasurementRoutes },
  ] = await Promise.all([
    import('../../routes/adminRoutes.mjs'),
    import('../../routes/adminClientRoutes.mjs'),
    import('../../routes/aiBffRoutes.mjs'),
    import('../../routes/painEntryRoutes.mjs'),
    import('../../routes/bodyMeasurementRoutes.mjs'),
  ]);

  // SCENARIO A — production mount chain: the global admin gate that
  // routes/adminRoutes.mjs:30-31 applies to every /api/admin path.
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/ai-bff', aiBffRoutes);
  app.use('/api/admin', adminClientRoutes);

  // SCENARIO B — the very same router object under a prefix with no upstream
  // `/api/admin` admin gate. One port, so the handler's `fetchInternal` fan-out
  // reaches the same real downstream routers.
  app.use(PROBE_MOUNT, aiBffRoutes);

  // The real downstream fan-out targets (core/routes.mjs:428, :430).
  app.use('/api/pain-entries', painEntryRoutes);
  app.use('/api/measurements', bodyMeasurementRoutes);

  patchProtect(app._router.stack);

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  port = server.address().port;
  // fetchInternal builds its loopback URL from process.env.PORT.
  process.env.PORT = String(port);

  // Isolation layer 4 — loopback only.
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(String(url));
    const isLoopback = (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')
      && Number(parsed.port) === port;
    if (!isLoopback) throw new Error(`EXTERNAL_SOCKET_BLOCKED: ${parsed.host}`);
    return realFetch(url, options);
  };
}, 300000);

afterAll(async () => {
  if (realFetch && globalThis.fetch !== realFetch) globalThis.fetch = realFetch;
  if (server) await new Promise((resolve) => server.close(resolve));
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;
});

describe('CA-0 rule-55 probe — what a `user`-role caller actually receives', () => {
  it('SCENARIO A — production mount chain: records the raw response for a `user` caller', async () => {
    const { status, body } = await call(`${ADMIN_MOUNT}${SUMMARY}/${OTHER_CLIENT_ID}`, { id: USER_ID, role: 'user' });
    console.log('CA0_PROBE_A_MOUNTED=' + JSON.stringify({
      request: `GET ${ADMIN_MOUNT}${SUMMARY}/${OTHER_CLIENT_ID}`,
      caller: { id: String(USER_ID), role: 'user' },
      status,
      body,
    }, null, 2));
    expect(status).toBe(403);
  }, 60000);

  it('SCENARIO B — handler contract without the upstream /api/admin gate: records the raw response', async () => {
    const { status, body } = await call(`${PROBE_MOUNT}${SUMMARY}/${OTHER_CLIENT_ID}`, { id: USER_ID, role: 'user' });
    const raw = {
      request: `GET ${PROBE_MOUNT}${SUMMARY}/${OTHER_CLIENT_ID}`,
      caller: { id: String(USER_ID), role: 'user' },
      status,
      profile: describeSubResult(body?.profile),
      activePain: describeSubResult(body?.activePain),
      latestMeasurements: describeSubResult(body?.latestMeasurements),
      recentWorkouts: describeSubResult(body?.recentWorkouts),
      body,
    };
    // Emitted verbatim so it can be quoted as probe evidence.
    //
    // PRE-FIX (recorded 2026-09-13, before routes/aiBffRoutes.mjs was repaired)
    // this same probe returned status 200 with NO guarded data — the ladder fell
    // through and each downstream guard denied independently:
    //   profile            -> { error: 'HTTP 403', status: 403 }  (adminOnly)
    //   activePain         -> { error: 'HTTP 404', status: 404 }  (verifyClientAccessByUserId)
    //   latestMeasurements -> { error: 'HTTP 404', status: 404 }  (verifyClientAccessByUserId)
    //   recentWorkouts     -> { error: 'HTTP 403', status: 403 }  (adminOnly)
    // i.e. exposure was NOT demonstrated; what was demonstrated is that the
    // handler had no authorization of its own and answered 200 instead of 403.
    console.log('CA0_PROBE_B_UNGUARDED=' + JSON.stringify(raw, null, 2));
    expect(status).toBe(403);
    expect(body).toEqual({ error: 'Access denied' });
  }, 60000);

  it('PROBE — the URL named in the audit doc is not the mounted URL', async () => {
    const docPath = await call(`/api/ai-command/client-summary/${OTHER_CLIENT_ID}`, { id: USER_ID, role: 'user' });
    const realPath = await call(`${ADMIN_MOUNT}${SUMMARY}/${OTHER_CLIENT_ID}`, { id: USER_ID, role: 'user' });
    console.log('CA0_MOUNT_TRUTH=' + JSON.stringify({
      docPath: `/api/ai-command/client-summary/${OTHER_CLIENT_ID}`,
      docPathStatus: docPath.status,
      realPath: `${ADMIN_MOUNT}${SUMMARY}/${OTHER_CLIENT_ID}`,
      realPathStatus: realPath.status,
    }));
    expect(docPath.status).toBe(404);
    expect(realPath.status).toBe(403);
  }, 60000);
});

describe('CA-0 — the handler itself must deny a `user`-role caller', () => {
  it('denies a `user`-role caller requesting a DIFFERENT client id', async () => {
    const { status, body } = await call(`${PROBE_MOUNT}${SUMMARY}/${OTHER_CLIENT_ID}`, { id: USER_ID, role: 'user' });
    expect(status).toBe(403);
    expect(body).toEqual({ error: 'Access denied' });
  }, 60000);

  it('denies an unknown role (fail-closed)', async () => {
    const { status } = await call(`${PROBE_MOUNT}${SUMMARY}/${OTHER_CLIENT_ID}`, { id: USER_ID, role: 'contractor' });
    expect(status).toBe(403);
  }, 60000);
});

describe('CA-0 — the gate is not deny-everyone (controls)', () => {
  it('grants a `user`-role caller their OWN id — string session id vs numeric param', async () => {
    // Regression for the type-fragile comparison the audit calls out:
    // `middleware/authMiddleware.mjs:357` sets `req.user.id` via toStringId, so
    // the old `req.user.id !== clientId` compared a string against the number
    // from parsePositiveId and denied the caller their own record.
    const { status } = await call(`${PROBE_MOUNT}${SUMMARY}/${USER_ID}`, { id: String(USER_ID), role: 'user' });
    expect(status).toBe(200);
  }, 60000);

  it('grants an admin', async () => {
    const { status } = await call(`${PROBE_MOUNT}${SUMMARY}/${OTHER_CLIENT_ID}`, { id: ADMIN_ID, role: 'admin' });
    expect(status).toBe(200);
  }, 60000);

  it('denies an UNASSIGNED trainer and grants an ASSIGNED one', async () => {
    const models = await import('../../models/index.mjs');
    const assignment = models.getModel('ClientTrainerAssignment');

    assignment.findOne = async () => null;
    const unassigned = await call(`${PROBE_MOUNT}${SUMMARY}/${OTHER_CLIENT_ID}`, { id: TRAINER_ID, role: 'trainer' });
    expect(unassigned.status).toBe(403);

    assignment.findOne = async () => ({ id: 5, clientId: OTHER_CLIENT_ID, trainerId: TRAINER_ID, status: 'active' });
    const assigned = await call(`${PROBE_MOUNT}${SUMMARY}/${OTHER_CLIENT_ID}`, { id: TRAINER_ID, role: 'trainer' });
    expect(assigned.status).toBe(200);
  }, 60000);
});
