import { describe, expect, it, vi } from 'vitest';
import { authorizeResourceAccess } from '../../middleware/authMiddleware.mjs';

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

describe('authorizeResourceAccess', () => {
  it('allows client self-access when JWT user id is a string and route id is numeric', async () => {
    const req = {
      params: { userId: '42' },
      body: {},
      user: { id: '42', role: 'client' },
      path: '/api/v1/gamification/users/42/profile',
      method: 'GET',
    };
    const res = createResponse();
    const next = vi.fn();

    await authorizeResourceAccess('userId')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });
});
