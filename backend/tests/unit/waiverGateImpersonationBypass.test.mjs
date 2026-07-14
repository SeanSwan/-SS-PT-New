import { beforeEach, describe, expect, it, vi } from 'vitest';

const findOneMock = vi.fn();

vi.mock('../../models/index.mjs', () => ({
  getModel: () => ({ findOne: findOneMock }),
}));

const { requireLinkedWaiver } = await import('../../middleware/waiverGate.mjs');

const buildRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

const clientReq = (extra = {}) => ({
  user: { id: 84, role: 'client' },
  originalUrl: '/api/sessions/analytics',
  ...extra,
});

beforeEach(() => findOneMock.mockReset());

describe('requireLinkedWaiver — admin impersonation bypass', () => {
  it('403s an unsigned client on a gated API route (real login keeps the gate)', async () => {
    findOneMock.mockResolvedValue(null);
    const res = buildRes();
    const next = vi.fn();
    await requireLinkedWaiver(clientReq(), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body?.code ?? res.body?.error ?? '').toBeDefined();
  });

  it('passes an unsigned client through when the request is an admin impersonation session', async () => {
    findOneMock.mockResolvedValue(null);
    const res = buildRes();
    const next = vi.fn();
    await requireLinkedWaiver(
      clientReq({ impersonation: { actorId: 2, targetUserId: 84, targetRole: 'client' } }),
      res,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
    // bypass short-circuits BEFORE the waiver lookup
    expect(findOneMock).not.toHaveBeenCalled();
  });

  it('still passes a signed client through normally', async () => {
    findOneMock.mockResolvedValue({ id: 1, status: 'signed', signedAt: '2026-07-01' });
    const res = buildRes();
    const next = vi.fn();
    await requireLinkedWaiver(clientReq(), res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });
});
