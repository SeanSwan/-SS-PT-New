import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

/**
 * Mounted workout authorization matrix (Astra blueprint S1 — R01/F01/D-010).
 * ============================================================================
 * The FIRST-MOUNTED controller (workoutController.mjs via workoutRoutes at
 * /api/workout) serves the live /api/workout/sessions/* CRUD paths — it
 * shadows workoutSessionRoutes for core CRUD (S0-MANIFEST.md route-ownership
 * finding). Required named cases (09-tests.md):
 *   first mounted handler denies unassigned trainer
 *   revoked assignment denies
 *   self access survives
 *   admin allowed
 *   owner field immutable
 *   denied mutation writes zero rows
 *
 * VM harness: real controller source, stubbed dependencies, no DB/network.
 * Run: node ../scripts/run-disposable-security-tests.mjs --suite mountedWorkoutAuthorization
 */

const root = path.resolve(process.cwd(), '..');
const noop = () => {};
const logger = { info: noop, warn: noop, error: noop, debug: noop };

/**
 * Assignment map semantics: `trainer 3` holds an ACTIVE assignment to client
 * 202. Trainer 7's assignment to 202 was REVOKED (inactive → helper says no).
 * Admin is id 9. Client is 202 (self access = 202 reading 202).
 */
const ACTIVE_ASSIGNMENTS = new Set(['3:202']);
const assignments = {
  assertAssignmentOrAdmin: async (userId, role, clientId) => {
    if (role === 'admin') return true;
    return ACTIVE_ASSIGNMENTS.has(`${userId}:${clientId}`);
  },
};

async function loadController(serviceOverrides = {}) {
  const calls = { created: [], updated: [], deleted: [] };
  const service = {
    getWorkoutSessions: async () => [],
    getWorkoutSessionById: async (id) => ({
      id,
      userId: 202,
      notes: 'synthetic private note',
      trainerId: 3,
    }),
    createWorkoutSession: async (data) => { calls.created.push(data); return { id: 'new-1', ...data }; },
    updateWorkoutSession: async (id, data) => { calls.updated.push({ id, data }); return { id, userId: 202, ...data }; },
    deleteWorkoutSession: async (id) => { calls.deleted.push(id); return true; },
    getClientProgress: async () => ({ level: 1 }),
    getWorkoutStatistics: async () => ({ total: 0 }),
    ...serviceOverrides,
  };
  const filename = path.join(root, 'backend/controllers/workoutController.mjs');
  const source = fs.readFileSync(filename, 'utf8');
  const module = new vm.SourceTextModule(source, { identifier: filename });
  await module.link(async name => {
    const deps = {
      '../services/workoutService.mjs': { default: service },
      '../utils/responseUtils.mjs': {
        errorResponse: (res, status, message) => { res.status = status; res.body = message; },
        successResponse: (res, body, status = 200) => { res.status = status; res.body = body; },
      },
      '../utils/logger.mjs': { default: logger },
      '../utils/idUtils.mjs': { idEquals: (a, b) => String(a) === String(b) },
      '../middleware/verifyClientAccess.mjs': assignments,
    };
    assert.ok(Object.hasOwn(deps, name), `Unstubbed import: ${name}`);
    const values = deps[name];
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    });
  });
  await module.evaluate();
  return { controller: module.namespace, calls, service };
}

const res = () => ({});
const trainerReq = (id = 7, role = 'trainer') => ({ user: { id, role }, params: {}, query: {}, body: {} });

test('first mounted handler denies unassigned trainer', async () => {
  const { controller } = await loadController();
  const response = res();
  await controller.getWorkoutSessionById(
    { ...trainerReq(7), params: { sessionId: 's1' } }, response);
  assert.equal(response.status, 404);
  assert.ok(!JSON.stringify(response.body).includes('synthetic private note'));
});

test('revoked assignment denies', async () => {
  // Trainer 7 HAD an assignment to 202 (revoked) — the helper now says no.
  const { controller } = await loadController();
  const response = res();
  await controller.updateWorkoutSession(
    { ...trainerReq(7), params: { sessionId: 's1' }, body: { notes: 'x' } }, response);
  assert.equal(response.status, 404);

  const del = res();
  await controller.deleteWorkoutSession(
    { ...trainerReq(7), params: { sessionId: 's1' } }, del);
  assert.equal(del.status, 404);
});

test('self access survives', async () => {
  // Trainer 3 reads their OWN session row (userId 3) — no assignment needed.
  const { controller } = await loadController({
    getWorkoutSessionById: async (id) => ({ id, userId: 3, notes: 'own note' }),
  });
  const response = res();
  await controller.getWorkoutSessionById(
    { ...trainerReq(3), params: { sessionId: 'own-1' } }, response);
  assert.equal(response.status, 200);
  assert.ok(JSON.stringify(response.body).includes('own note'));
});

test('admin allowed', async () => {
  const { controller } = await loadController();
  const response = res();
  await controller.getWorkoutSessionById(
    { user: { id: 9, role: 'admin' }, params: { sessionId: 's1' } }, response);
  assert.equal(response.status, 200);

  const del = res();
  await controller.deleteWorkoutSession(
    { user: { id: 9, role: 'admin' }, params: { sessionId: 's1' } }, del);
  assert.equal(del.status, 200);
});

test('owner field immutable', async () => {
  // The session owner cannot be transferred through PUT: the update
  // whitelist must never carry userId, whatever the body contains.
  const { controller, calls } = await loadController();
  const response = res();
  await controller.updateWorkoutSession(
    { user: { id: 9, role: 'admin' }, params: { sessionId: 's1' }, body: { notes: 'ok', userId: 999, trainerId: 999 } }, response);
  assert.equal(response.status, 200);
  assert.equal(calls.updated.length, 1);
  assert.equal(calls.updated[0].data.userId, undefined);
  assert.equal(calls.updated[0].data.trainerId, undefined);
  assert.equal(calls.updated[0].data.notes, 'ok');
});

test('denied mutation writes zero rows', async () => {
  const { controller, calls } = await loadController();
  // Unassigned trainer attempts create-for-202, update, delete — all denied,
  // and none of the three may reach the service layer.
  const create = res();
  await controller.createWorkoutSession(
    { ...trainerReq(7), body: { userId: 202, title: 'hostile' } }, create);
  assert.equal(create.status, 404);

  const update = res();
  await controller.updateWorkoutSession(
    { ...trainerReq(7), params: { sessionId: 's1' }, body: { notes: 'hostile' } }, update);
  assert.equal(update.status, 404);

  const del = res();
  await controller.deleteWorkoutSession(
    { ...trainerReq(7), params: { sessionId: 's1' } }, del);
  assert.equal(del.status, 404);

  assert.deepEqual(calls.created, []);
  assert.deepEqual(calls.updated, []);
  assert.deepEqual(calls.deleted, []);
});

test('assigned trainer retains access (matrix: assigned column)', async () => {
  const { controller } = await loadController();
  const response = res();
  await controller.getWorkoutSessionById(
    { ...trainerReq(3), params: { sessionId: 's1' } }, response);
  assert.equal(response.status, 200);
});

test('client cannot read another client (matrix: client column)', async () => {
  const { controller } = await loadController();
  const response = res();
  await controller.getWorkoutSessionById(
    { user: { id: 202, role: 'client' }, params: { sessionId: 'someone-elses' } }, response);
  // session fixture userId=202 would pass self — force a mismatch via a
  // different-user session to prove the client branch fails closed.
  const other = res();
  const { controller: c2 } = await loadController({
    getWorkoutSessionById: async (id) => ({ id, userId: 303, notes: 'not yours' }),
  });
  await c2.getWorkoutSessionById(
    { user: { id: 202, role: 'client' }, params: { sessionId: 's1' } }, other);
  assert.equal(other.status, 404);
});
