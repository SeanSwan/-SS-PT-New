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
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uploadClientPhoto } from '../../controllers/profileController.mjs';

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

const fakeImage = { buffer: Buffer.from('not-a-real-image'), originalname: 'pic.png', mimetype: 'image/png' };

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
