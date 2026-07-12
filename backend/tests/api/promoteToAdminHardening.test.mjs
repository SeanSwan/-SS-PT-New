/**
 * promoteToAdmin hardening — behavioral regression tests
 * ======================================================
 * After the legacy /api/auth duplicate was removed, the controller handler
 * mounted at /api/admin/promote-admin is the ONLY admin-promotion surface,
 * so it must carry the best properties of both prior implementations:
 *
 *  1. Fail CLOSED with an explicit 503 when ADMIN_ACCESS_CODE is not
 *     configured (the one good property the removed legacy handler had) —
 *     never fall through to a code comparison against undefined.
 *  2. Constant-time code comparison (crypto.timingSafeEqual over digests) —
 *     the removed public-register path was hardened this way; the surviving
 *     surface must not regress to `!==`.
 *  3. Read the env var at CALL time, not module-import time, so env
 *     rotation and test isolation behave.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const fakeUser = {
  id: 7,
  firstName: 'Test',
  lastName: 'User',
  email: 'user7@example.com',
  role: 'user',
  update: vi.fn(async function (fields) { Object.assign(this, fields); return this; }),
};

vi.mock('../../models/index.mjs', () => ({
  getUser: vi.fn(() => ({ findByPk: vi.fn(async (id) => (Number(id) === 7 ? fakeUser : null)) })),
}));

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn(async () => ({ rollback: vi.fn(), commit: vi.fn() })),
  },
}));

const { promoteToAdmin } = await import('../../controllers/userManagementController.mjs');

const makeReqRes = (body) => {
  const req = { body, user: { id: 1 } };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  return { req, res };
};

const REAL_CODE = 'unit-test-admin-access-code-abcdef123456';
const ORIGINAL_ENV = process.env.ADMIN_ACCESS_CODE;

describe('promoteToAdmin hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_ACCESS_CODE = REAL_CODE;
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.ADMIN_ACCESS_CODE;
    else process.env.ADMIN_ACCESS_CODE = ORIGINAL_ENV;
  });

  it('fails closed with 503 when ADMIN_ACCESS_CODE is not configured', async () => {
    delete process.env.ADMIN_ACCESS_CODE;
    const { req, res } = makeReqRes({ userId: 7, adminCode: 'anything' });

    await promoteToAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(fakeUser.update).not.toHaveBeenCalled();
  });

  it('rejects a non-string adminCode with 400 (String() coercion must not admit array-wrapped codes)', async () => {
    const { req, res } = makeReqRes({ userId: 7, adminCode: [REAL_CODE] });

    await promoteToAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(fakeUser.update).not.toHaveBeenCalled();
  });

  it('rejects a wrong code with 401 without touching the user', async () => {
    const { req, res } = makeReqRes({ userId: 7, adminCode: 'wrong-code' });

    await promoteToAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(fakeUser.update).not.toHaveBeenCalled();
  });

  it('promotes with the correct code (env read at call time)', async () => {
    process.env.ADMIN_ACCESS_CODE = 'rotated-code-after-boot-0123456789ab';
    const { req, res } = makeReqRes({ userId: 7, adminCode: 'rotated-code-after-boot-0123456789ab' });

    await promoteToAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(fakeUser.update).toHaveBeenCalledWith({ role: 'admin' }, expect.anything());
  });

  it('uses a constant-time comparison, not `!==` (source contract)', () => {
    const source = readFileSync(
      resolve(__dirname, '../../controllers/userManagementController.mjs'), 'utf8');
    const start = source.indexOf('export const promoteToAdmin = async');
    const end = source.indexOf('export const ', start + 1);
    const slice = source.slice(start, end);

    expect(source).toContain('timingSafeEqual');
    expect(slice).toContain('constantTimeEquals(adminCode, expectedAdminCode)');
    expect(slice).not.toMatch(/adminCode\s*[!=]==?\s*(ADMIN_ACCESS_CODE|expectedAdminCode)/);
  });
});
