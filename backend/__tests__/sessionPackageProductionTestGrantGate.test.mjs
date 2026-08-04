/**
 * sessionPackageProductionTestGrantGate.test.mjs
 * ==============================================
 * Locks the legacy direct test-session grant route out of production so paid
 * session credits cannot be minted from a normal authenticated account.
 */
import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockUser: {
    findByPk: vi.fn(),
  },
}));

vi.mock('../utils/apiKeyChecker.mjs', () => ({
  isStripeEnabled: () => false,
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 7, role: 'client' };
    next();
  },
  adminOnly: (_req, _res, next) => next(),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../models/User.mjs', () => ({
  default: mocks.mockUser,
}));

vi.mock('../models/StorefrontItem.mjs', () => ({
  default: {
    findAll: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../services/SessionGrantService.mjs', () => ({
  getStorefrontSessionCredits: vi.fn(() => 0),
}));

vi.mock('../services/sessionPackageCheckoutFulfillmentService.mjs', () => ({
  SessionPackageFulfillmentError: class SessionPackageFulfillmentError extends Error {},
  isSessionPackageCheckoutSession: vi.fn(),
  fulfillSessionPackageCheckoutSession: vi.fn(),
}));

const { default: sessionPackageRoutes } = await import('../routes/sessionPackageRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/session-packages', sessionPackageRoutes);
  return app;
}

describe('session package test-session grant gate (Kimi F3 — allowlist, fail-closed)', () => {
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUser.findByPk.mockResolvedValue({
      id: 7, role: 'client', clientSource: 'swanstudios', availableSessions: 0, save: vi.fn(),
    });
  });

  const post = () => request(buildApp())
    .post('/api/session-packages/add-test-sessions')
    .send({ sessions: 4, packageType: 'test', amount: 0, packageId: 'test-package' });

  it('rejects in production (before loading a user)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ENABLE_TEST_SESSION_GRANTS', 'true'); // even if the flag is on
    const r = await post();
    expect(r.status).toBe(403);
    expect(mocks.mockUser.findByPk).not.toHaveBeenCalled();
  });

  // The blacklist FAILED OPEN on these — the whole point of the fix.
  it.each(['', 'staging', 'prod', 'Production', 'preview'])(
    'rejects when NODE_ENV is the fail-open value %j',
    async (env) => {
      vi.stubEnv('NODE_ENV', env);
      vi.stubEnv('ENABLE_TEST_SESSION_GRANTS', 'true');
      const r = await post();
      expect(r.status).toBe(403);
      expect(mocks.mockUser.findByPk).not.toHaveBeenCalled();
    },
  );

  it('rejects in development WITHOUT the opt-in flag (default deny)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ENABLE_TEST_SESSION_GRANTS', '');
    const r = await post();
    expect(r.status).toBe(403);
    expect(mocks.mockUser.findByPk).not.toHaveBeenCalled();
  });

  it('allows ONLY in development WITH the explicit flag', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ENABLE_TEST_SESSION_GRANTS', 'true');
    const r = await post();
    expect(r.status).not.toBe(403); // passes the gate → reaches user load
    expect(mocks.mockUser.findByPk).toHaveBeenCalled();
  });
});
