import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ownerAdminOnly } from '../../middleware/authMiddleware.mjs';

const buildResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status: vi.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((body) => {
      res.body = body;
      return res;
    }),
  };
  return res;
};

describe('ownerAdminOnly HTTP middleware', () => {
  const originalOwnerEmails = process.env.OWNER_ADMIN_EMAILS;
  const originalOwnerIds = process.env.OWNER_ADMIN_IDS;

  beforeEach(() => {
    process.env.OWNER_ADMIN_EMAILS = 'owner@example.test';
    delete process.env.OWNER_ADMIN_IDS;
  });

  afterEach(() => {
    if (originalOwnerEmails === undefined) delete process.env.OWNER_ADMIN_EMAILS;
    else process.env.OWNER_ADMIN_EMAILS = originalOwnerEmails;

    if (originalOwnerIds === undefined) delete process.env.OWNER_ADMIN_IDS;
    else process.env.OWNER_ADMIN_IDS = originalOwnerIds;
  });

  it('allows configured owner admins through', async () => {
    const req = {
      user: { id: 1, role: 'admin', email: 'owner@example.test' },
      path: '/dangerous-route',
      method: 'DELETE',
    };
    const res = buildResponse();
    const next = vi.fn();

    await ownerAdminOnly(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('denies normal admins so compromised secondary admin accounts cannot run destructive owner actions', async () => {
    const req = {
      user: { id: 2, role: 'admin', email: 'secondary@example.test' },
      path: '/dangerous-route',
      method: 'DELETE',
    };
    const res = buildResponse();
    const next = vi.fn();

    await ownerAdminOnly(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Access denied: Owner admin only',
    });
  });
});
