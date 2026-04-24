import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../models/User.mjs', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// asyncHandler is the real repo utility (errorMiddleware.mjs:438) —
// viewAsGuard is now wrapped with it so async rejections surface via
// next(error) on Express 4. We DO NOT mock it; we want the real
// Promise.resolve(fn).catch(next) behavior exercised by the test that
// asserts next(error) on User.findOne rejection.

import User from '../../models/User.mjs';
import logger from '../../utils/logger.mjs';
import { viewAsGuard, viewAsWriteBlocker } from '../../middleware/viewAsGuard.mjs';

const makeRes = () => {
  const res = {
    statusCode: 200,
    finishCallback: null,
  };
  res.status = vi.fn((statusCode) => {
    res.statusCode = statusCode;
    return res;
  });
  res.json = vi.fn().mockReturnValue(res);
  res.on = vi.fn((event, callback) => {
    if (event === 'finish') {
      res.finishCallback = callback;
    }
    return res;
  });
  return res;
};

const makeReq = (overrides = {}) => ({
  method: 'GET',
  query: {},
  originalUrl: '/api/v1/gamification/profile?viewAs=42',
  user: { id: 7, role: 'admin' },
  ...overrides,
});

const expectError = (res, statusCode, code, messagePattern) => {
  expect(res.status).toHaveBeenCalledWith(statusCode);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: false,
    code,
    message: expect.stringMatching(messagePattern),
  }));
};

describe('viewAsWriteBlocker', () => {
  it('blocks mutation verbs when viewAs is present with any parsed shape', () => {
    const cases = [
      ['POST', '42'],
      ['PUT', ''],
      ['PATCH', ['1', '2']],
      ['DELETE', { id: '1' }],
    ];

    for (const [method, viewAs] of cases) {
      const req = makeReq({ method, query: { viewAs } });
      const res = makeRes();
      const next = vi.fn();

      viewAsWriteBlocker(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expectError(res, 403, 'IMPERSONATION_READ_ONLY', /Writes are not permitted/);
    }
  });

  it('does not block mutation verbs when viewAs is truly absent', () => {
    const req = makeReq({ method: 'POST', query: {} });
    const res = makeRes();
    const next = vi.fn();

    viewAsWriteBlocker(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('does not block read verbs with viewAs so per-route read guards can handle them', () => {
    for (const method of ['GET', 'HEAD']) {
      const req = makeReq({ method, query: { viewAs: '42' } });
      const res = makeRes();
      const next = vi.fn();

      viewAsWriteBlocker(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    }
  });
});

describe('viewAsGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    User.findOne.mockResolvedValue({
      id: 42,
      role: 'client',
      isActive: true,
      accountStatus: 'active',
    });
  });

  it('is a no-op when viewAs is truly absent', async () => {
    const req = makeReq({ query: {} });
    const res = makeRes();
    const next = vi.fn();

    await viewAsGuard(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.viewAsUserId).toBeUndefined();
    expect(User.findOne).not.toHaveBeenCalled();
    expect(res.on).not.toHaveBeenCalled();
  });

  it('rejects array viewAs before generic object shape checks', async () => {
    const req = makeReq({ query: { viewAs: ['1', '2'] } });
    const res = makeRes();
    const next = vi.fn();

    await viewAsGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expectError(res, 400, 'IMPERSONATION_INVALID_PARAM', /Only one viewAs parameter allowed/);
  });

  it('rejects object-shaped viewAs params', async () => {
    const req = makeReq({ query: { viewAs: { id: '1' } } });
    const res = makeRes();
    const next = vi.fn();

    await viewAsGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expectError(res, 400, 'IMPERSONATION_INVALID_PARAM', /Invalid viewAs shape/);
  });

  it('rejects empty viewAs explicitly', async () => {
    const req = makeReq({ query: { viewAs: '' } });
    const res = makeRes();
    const next = vi.fn();

    await viewAsGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expectError(res, 400, 'IMPERSONATION_INVALID_PARAM', /cannot be empty/);
  });

  it.each([
    ['abc'],
    ['1.0'],
    ['1e3'],
    ['0x10'],
    [' 42 '],
    ['+42'],
    ['-1'],
    ['0'],
    ['042'],
    ['9007199254740993'],
  ])('rejects invalid positive-integer string %s', async (viewAs) => {
    const req = makeReq({ query: { viewAs } });
    const res = makeRes();
    const next = vi.fn();

    await viewAsGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expectError(res, 400, 'IMPERSONATION_INVALID_PARAM', /positive integer/);
  });

  it.each(['client', 'trainer', 'user'])('rejects non-admin actor role %s', async (role) => {
    const req = makeReq({ query: { viewAs: '42' }, user: { id: 7, role } });
    const res = makeRes();
    const next = vi.fn();

    await viewAsGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(User.findOne).not.toHaveBeenCalled();
    expectError(res, 403, 'IMPERSONATION_ADMIN_ONLY', /Only admin users/);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('defensively rejects %s if mounted directly', async (method) => {
    const req = makeReq({ method, query: { viewAs: '42' } });
    const res = makeRes();
    const next = vi.fn();

    await viewAsGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(User.findOne).not.toHaveBeenCalled();
    expectError(res, 403, 'IMPERSONATION_READ_ONLY', /Writes are not permitted/);
  });

  it.each(['GET', 'HEAD'])('sets req.viewAsUserId for admin %s with valid client target', async (method) => {
    const req = makeReq({ method, query: { viewAs: '42' } });
    const res = makeRes();
    const next = vi.fn();

    await viewAsGuard(req, res, next);

    expect(User.findOne).toHaveBeenCalledWith({ where: { id: 42 } });
    expect(req.viewAsUserId).toBe(42);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));

    res.finishCallback();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[viewAs] actor=7 target=42 method='));
  });

  // Codex Gate #3 LOW — planning test matrix requires both client AND
  // user (normalized) target roles to pass the target-role gate.
  it.each(['client', 'user'])('accepts valid %s target role on happy path', async (targetRole) => {
    User.findOne.mockResolvedValue({
      id: 42,
      role: targetRole,
      isActive: true,
      accountStatus: 'active',
    });
    const req = makeReq({ query: { viewAs: '42' } });
    const res = makeRes();
    const next = vi.fn();

    await viewAsGuard(req, res, next);

    expect(req.viewAsUserId).toBe(42);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // not next(error)
    expect(res.status).not.toHaveBeenCalled();
  });

  // Codex Gate #3 HIGH — Express 4 does not auto-catch async rejections.
  // viewAsGuard is wrapped with asyncHandler; a User.findOne rejection
  // must surface via next(error), not as an unhandled promise rejection
  // or a silent response.
  it('routes User.findOne rejection through next(error), not JSON response', async () => {
    const dbError = new Error('Simulated DB failure');
    User.findOne.mockRejectedValue(dbError);
    const req = makeReq({ query: { viewAs: '42' } });
    const res = makeRes();
    const next = vi.fn();

    await viewAsGuard(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(dbError);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(req.viewAsUserId).toBeUndefined();
  });

  it('returns 404 when target does not exist', async () => {
    User.findOne.mockResolvedValue(null);
    const req = makeReq({ query: { viewAs: '42' } });
    const res = makeRes();
    const next = vi.fn();

    await viewAsGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expectError(res, 404, 'IMPERSONATION_TARGET_NOT_FOUND', /Target user not found/);
  });

  it.each(['admin', 'trainer'])('rejects target role %s', async (role) => {
    User.findOne.mockResolvedValue({
      id: 42,
      role,
      isActive: true,
      accountStatus: 'active',
    });
    const req = makeReq({ query: { viewAs: '42' } });
    const res = makeRes();
    const next = vi.fn();

    await viewAsGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expectError(res, 400, 'IMPERSONATION_TARGET_INVALID_ROLE', /client-scope users/);
  });

  it('treats inactive targets as not found', async () => {
    User.findOne.mockResolvedValue({
      id: 42,
      role: 'client',
      isActive: false,
      accountStatus: 'active',
    });
    const req = makeReq({ query: { viewAs: '42' } });
    const res = makeRes();
    const next = vi.fn();

    await viewAsGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expectError(res, 404, 'IMPERSONATION_TARGET_NOT_FOUND', /Target user not found/);
  });

  it.each(['stub', 'invited'])('treats accountStatus %s targets as not found', async (accountStatus) => {
    User.findOne.mockResolvedValue({
      id: 42,
      role: 'client',
      isActive: true,
      accountStatus,
    });
    const req = makeReq({ query: { viewAs: '42' } });
    const res = makeRes();
    const next = vi.fn();

    await viewAsGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expectError(res, 404, 'IMPERSONATION_TARGET_NOT_FOUND', /Target user not found/);
  });
});
