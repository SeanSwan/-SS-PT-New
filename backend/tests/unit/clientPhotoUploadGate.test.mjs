/**
 * uploadClientPhoto — authorization-gate regression (IDOR guard).
 * ===============================================================
 * The client-card "add photo" affordance writes another user's photo, so the
 * controller MUST fail-closed via checkClientAccess BEFORE any storage/DB work.
 * These tests exercise the gate paths that need no DB connection (admin + the
 * client/user self-only branch return before any query), proving the wiring:
 *   - a non-admin/non-trainer cannot set ANOTHER client's photo (IDOR) → 403,
 *     and the denial happens even when a valid file is attached (gate is first).
 *   - invalid client id → 400.
 *   - an authorized actor (admin) passes the gate, then 400s on a missing file.
 *
 * Run: node --test backend/tests/unit/clientPhotoUploadGate.test.mjs
 * Also runs under the backend Vitest suite.
 */
import { test as nodeTest } from 'node:test';
import assert from 'node:assert/strict';
import { uploadClientPhoto } from '../../controllers/profileController.mjs';
import User from '../../models/User.mjs';

const isVitest = Boolean(process.env.VITEST || process.env.VITEST_WORKER_ID);
const test = isVitest ? (await import('vitest')).it : nodeTest;

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

const fakeImage = { buffer: Buffer.from('not-a-real-image'), originalname: 'pic.png', mimetype: 'image/png' };

async function withPatchedUserModel({ sequelize, findByPk }, run) {
  const originalSequelize = User.sequelize;
  const originalFindByPk = User.findByPk;
  User.sequelize = sequelize ?? originalSequelize;
  if (findByPk) User.findByPk = findByPk;
  try {
    await run();
  } finally {
    User.sequelize = originalSequelize;
    User.findByPk = originalFindByPk;
  }
}

test('DENIES a non-admin/non-trainer setting another client\'s photo (IDOR) — before any upload', async () => {
  const req = { params: { clientId: '9' }, user: { id: 5, role: 'user' }, file: fakeImage };
  const res = mockRes();
  await uploadClientPhoto(req, res);
  assert.equal(res.statusCode, 403, 'cross-user photo write must be forbidden');
  assert.equal(res.body.success, false);
});

test('DENIES a plain client setting another client\'s photo (IDOR)', async () => {
  const req = { params: { clientId: '42' }, user: { id: 7, role: 'client' }, file: fakeImage };
  const res = mockRes();
  await uploadClientPhoto(req, res);
  assert.equal(res.statusCode, 403);
});

test('DENIES an unassigned trainer setting a client photo before storage/DB writes', async () => {
  const queries = [];
  let findByPkCalled = false;
  const fakeSequelize = {
    QueryTypes: { SELECT: 'SELECT' },
    query: async (sql, options) => {
      queries.push({ sql, options });
      return [];
    },
  };

  await withPatchedUserModel({
    sequelize: fakeSequelize,
    findByPk: async () => {
      findByPkCalled = true;
      throw new Error('User.findByPk must not run before authorization');
    },
  }, async () => {
    const req = { params: { clientId: '42' }, user: { id: 7, role: 'trainer' }, file: fakeImage };
    const res = mockRes();
    await uploadClientPhoto(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.success, false);
  });

  assert.equal(queries.length, 2, 'trainer gate should check assignment and session-history fallback');
  assert.match(queries[0].sql, /client_trainer_assignments/);
  assert.match(queries[1].sql, /sessions/);
  assert.equal(findByPkCalled, false, 'unauthorized trainer must not reach write-path model lookup');
});

test('rejects an invalid client id with 400', async () => {
  const req = { params: { clientId: 'abc' }, user: { id: 1, role: 'admin' }, file: fakeImage };
  const res = mockRes();
  await uploadClientPhoto(req, res);
  assert.equal(res.statusCode, 400);
});

test('admin passes the gate, then 400s when no file is provided (proves gate is not over-blocking)', async () => {
  const req = { params: { clientId: '9' }, user: { id: 1, role: 'admin' }, file: undefined };
  const res = mockRes();
  await uploadClientPhoto(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /No file/i);
});
