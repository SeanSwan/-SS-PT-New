import { describe, expect, it, vi } from 'vitest';
import {
  assertAssignmentOrAdmin,
  filterPlansByTrainerAssignment,
  verifyClientAccessByUserId,
} from '../../middleware/verifyClientAccess.mjs';

function createResponse() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

describe('verifyClientAccess strict id parsing', () => {
  it('rejects malformed user ids before assignment checks can normalize them', async () => {
    const req = {
      params: { userId: '42abc' },
      body: {},
      user: { id: '42', role: 'client' },
    };
    const res = createResponse();
    const next = vi.fn();

    await verifyClientAccessByUserId({ paramName: 'userId' })(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ success: false, message: 'Valid clientId is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('does not treat malformed client self-access ids as equal', async () => {
    await expect(assertAssignmentOrAdmin('42abc', 'client', '42')).resolves.toBe(false);
    await expect(assertAssignmentOrAdmin('42', 'client', '42')).resolves.toBe(true);
  });

  it('treats raw user accounts as client-equivalent for self access only', async () => {
    await expect(assertAssignmentOrAdmin('42', 'user', '42')).resolves.toBe(true);
    await expect(assertAssignmentOrAdmin('42', 'user', '43')).resolves.toBe(false);
  });

  it('lets raw user accounts pass middleware for their own client resource only', async () => {
    const allowedReq = {
      params: { userId: '42' },
      body: {},
      user: { id: '42', role: 'user' },
    };
    const allowedRes = createResponse();
    const allowedNext = vi.fn();

    await verifyClientAccessByUserId({ paramName: 'userId' })(allowedReq, allowedRes, allowedNext);

    expect(allowedNext).toHaveBeenCalledTimes(1);
    expect(allowedRes.statusCode).toBeNull();

    const deniedReq = {
      params: { userId: '43' },
      body: {},
      user: { id: '42', role: 'user' },
    };
    const deniedRes = createResponse();
    const deniedNext = vi.fn();

    await verifyClientAccessByUserId({ paramName: 'userId' })(deniedReq, deniedRes, deniedNext);

    expect(deniedRes.statusCode).toBe(404);
    expect(deniedNext).not.toHaveBeenCalled();
  });

  it('filters plan lists for raw user accounts to their own records', async () => {
    const plans = [
      { id: 1, userId: 42 },
      { id: 2, userId: 43 },
    ];

    await expect(filterPlansByTrainerAssignment({ user: { id: '42', role: 'user' } }, plans))
      .resolves.toEqual([{ id: 1, userId: 42 }]);
  });
});