import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const { clientOnly } = await import('../../middleware/authMiddleware.mjs');

const makeResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status: vi.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((payload) => {
      res.body = payload;
      return res;
    }),
  };
  return res;
};

const makeRequest = (role) => ({
  user: { id: '42', role },
  path: '/api/client/profile',
  method: 'PATCH',
});

describe('clientOnly raw-user compatibility', () => {
  it('treats raw user role as a client-equivalent account', () => {
    const req = makeRequest('user');
    const res = makeResponse();
    const next = vi.fn();

    clientOnly(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('keeps trainer accounts out of client-only self-service routes', () => {
    const req = makeRequest('trainer');
    const res = makeResponse();
    const next = vi.fn();

    clientOnly(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toMatchObject({ success: false });
  });
});