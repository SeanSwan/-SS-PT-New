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

vi.mock('../services/sessionPackageCheckoutFulfillmentService.mjs', () => ({
  SessionPackageFulfillmentError: class SessionPackageFulfillmentError extends Error {},
  isSessionPackageCheckoutSession: vi.fn(),
  fulfillSessionPackageCheckoutSession: vi.fn(),
}));

vi.stubEnv('NODE_ENV', 'production');
const { default: sessionPackageRoutes } = await import('../routes/sessionPackageRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/session-packages', sessionPackageRoutes);
  return app;
}

describe('session package production test-session grant gate', () => {
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUser.findByPk.mockResolvedValue({
      id: 7,
      role: 'client',
      clientSource: 'swanstudios',
      availableSessions: 0,
      save: vi.fn(),
    });
  });

  it('rejects direct test-session grants in production before loading a user', async () => {
    const response = await request(buildApp())
      .post('/api/session-packages/add-test-sessions')
      .send({
        sessions: 4,
        packageType: 'test',
        amount: 0,
        packageId: 'test-package',
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'This endpoint is only available in development mode',
    });
    expect(mocks.mockUser.findByPk).not.toHaveBeenCalled();
  });
});
