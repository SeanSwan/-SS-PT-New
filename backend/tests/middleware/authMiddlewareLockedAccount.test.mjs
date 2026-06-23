/**
 * Auth middleware locked-account regression tests.
 * Blocks owner-commanded account locks from remaining usable through existing access tokens.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  jwtVerify: vi.fn(),
  userFindByPk: vi.fn(),
  requireLinkedWaiver: vi.fn(async (_req, _res, next) => next()),
}));

vi.mock('jsonwebtoken', () => ({
  default: { verify: mocks.jwtVerify },
}));

vi.mock('../../models/index.mjs', () => ({
  getUser: () => ({ findByPk: mocks.userFindByPk }),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../utils/jwtSecretGuard.mjs', () => ({
  getJwtSecret: () => 'test-jwt-secret',
  isJwtSecretConfigurationError: () => false,
}));

vi.mock('../../middleware/waiverGate.mjs', () => ({
  requireLinkedWaiver: mocks.requireLinkedWaiver,
}));

const { protect } = await import('../../middleware/authMiddleware.mjs');

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

function mockReq() {
  return {
    headers: { authorization: 'Bearer valid-access-token' },
    path: '/api/client/overview',
    originalUrl: '/api/client/overview',
    method: 'GET',
  };
}

describe('protect locked-account enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.jwtVerify.mockReturnValue({
      id: 42,
      tokenType: 'access',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
  });

  it('rejects a locked account before any protected handler can run', async () => {
    mocks.userFindByPk.mockResolvedValue({
      id: 42,
      role: 'client',
      username: 'locked.client',
      email: 'locked@example.test',
      isActive: true,
      isLocked: true,
      subscriptionTier: 'premium',
    });
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    await protect(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mocks.requireLinkedWaiver).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Account is locked. Please contact support.',
    });
  });
});

describe('refresh token locked-account source contract', () => {
  it('checks inactive and locked status before minting replacement tokens', () => {
    const source = readFileSync(resolve(__dirname, '../../controllers/authController.mjs'), 'utf8');
    const start = source.indexOf('export const refreshToken = async');
    const end = source.indexOf('export const logout', start);
    const refreshSource = source.slice(start, end);

    expect(refreshSource).toContain('user.isActive === false');
    expect(refreshSource).toContain('user.isLocked');
    expect(refreshSource.indexOf('user.isLocked')).toBeLessThan(refreshSource.indexOf('generateAccessToken'));
  });
});
