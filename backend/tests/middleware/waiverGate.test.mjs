/**
 * Waiver gate middleware regression tests
 * =======================================
 *
 * Locks the beta-readiness audit requirement that client/user training,
 * dashboard, and AI APIs fail closed unless a linked waiver exists.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mocks = vi.hoisted(() => ({
  waiverFindOne: vi.fn(),
}));

vi.mock('../../models/index.mjs', () => ({
  getModel: (name) => {
    if (name === 'WaiverRecord') {
      return { findOne: mocks.waiverFindOne };
    }
    throw new Error(`Unexpected model lookup: ${name}`);
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const {
  LINKED_WAIVER_STATUS,
  requireLinkedWaiver,
  shouldGateWaiverAccess,
} = await import('../../middleware/waiverGate.mjs');

const authMiddlewareSource = readFileSync(
  resolve(__dirname, '../../middleware/authMiddleware.mjs'),
  'utf8',
);

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function mockReq({ role = 'client', url = '/api/client/overview', userId = '42' } = {}) {
  return {
    originalUrl: url,
    path: url,
    method: 'GET',
    user: { id: userId, role, email: `${role}@example.test` },
  };
}

describe('waiverGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the real linked waiver status enum value', () => {
    expect(LINKED_WAIVER_STATUS).toBe('linked');
  });

  it('is wired into protect after JWT user authentication', () => {
    expect(authMiddlewareSource).toContain("import { requireLinkedWaiver } from './waiverGate.mjs';");
    expect(authMiddlewareSource).toContain('await requireLinkedWaiver(req, res, next);');
  });

  it('gates client/user dashboard, training, and AI API paths only', () => {
    expect(shouldGateWaiverAccess({ role: 'client' }, '/api/client/overview')).toBe(true);
    expect(shouldGateWaiverAccess({ role: 'user' }, '/api/workout-forms')).toBe(true);
    expect(shouldGateWaiverAccess({ role: 'client' }, '/api/ai-chat/message')).toBe(true);
    expect(shouldGateWaiverAccess({ role: 'client' }, '/api/social/posts')).toBe(true);
    expect(shouldGateWaiverAccess({ role: 'user' }, '/api/gamification/profile')).toBe(true);

    expect(shouldGateWaiverAccess({ role: 'client' }, '/api/auth/me')).toBe(false);
    expect(shouldGateWaiverAccess({ role: 'client' }, '/api/public/waivers/submit')).toBe(false);
    expect(shouldGateWaiverAccess({ role: 'admin' }, '/api/client/overview')).toBe(false);
    expect(shouldGateWaiverAccess({ role: 'trainer' }, '/api/workout-forms')).toBe(false);
  });

  it('blocks an unsigned client before the gated route handler runs', async () => {
    mocks.waiverFindOne.mockResolvedValue(null);
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    await requireLinkedWaiver(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      code: 'WAIVER_REQUIRED',
    });
    expect(mocks.waiverFindOne).toHaveBeenCalledWith({
      where: { userId: 42, status: 'linked' },
      attributes: ['id', 'status', 'signedAt'],
      order: [['signedAt', 'DESC'], ['id', 'DESC']],
    });
  });

  it('allows a client with a linked waiver and attaches the waiver record', async () => {
    const signedAt = new Date('2026-06-16T12:00:00.000Z');
    mocks.waiverFindOne.mockResolvedValue({ id: 77, status: 'linked', signedAt });
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    await requireLinkedWaiver(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
    expect(req.waiverRecord).toEqual({ id: 77, status: 'linked', signedAt });
  });

  it('bypasses admin and trainer operator roles without querying waiver records', async () => {
    for (const role of ['admin', 'trainer']) {
      const req = mockReq({ role, url: '/api/client/overview' });
      const res = mockRes();
      const next = vi.fn();

      await requireLinkedWaiver(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toBeNull();
    }

    expect(mocks.waiverFindOne).not.toHaveBeenCalled();
  });

  it('fails closed when waiver verification cannot be completed', async () => {
    mocks.waiverFindOne.mockRejectedValue(new Error('database unavailable'));
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    await requireLinkedWaiver(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({
      success: false,
      code: 'WAIVER_VERIFICATION_FAILED',
    });
  });
});
