import { describe, expect, it, vi } from 'vitest';
import {
  assertAssignmentOrAdmin,
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
});
