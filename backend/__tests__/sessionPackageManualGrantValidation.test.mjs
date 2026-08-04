/**
 * sessionPackageManualGrantValidation.test.mjs
 * ============================================
 * Guards manual session-credit grant inputs so validation and mutation use the
 * same positive integer contract.
 */
import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockUser: {
    findByPk: vi.fn(),
  },
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 1, role: 'admin' };
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

vi.stubEnv('NODE_ENV', 'development');
vi.stubEnv('ENABLE_TEST_SESSION_GRANTS', 'true'); // reach the downstream validation past the F3 allowlist gate
const { default: sessionPackageManualGrantRoutes } = await import('../routes/sessionPackageManualGrantRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/session-packages', sessionPackageManualGrantRoutes);
  return app;
}

describe('session package manual grant validation', () => {
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUser.findByPk.mockResolvedValue({
      id: 7,
      role: 'client',
      clientSource: 'swanstudios',
      availableSessions: 3,
      save: vi.fn(),
    });
  });

  it('rejects fractional manual grants before loading a user', async () => {
    const response = await request(buildApp())
      .post('/api/session-packages/add-sessions')
      .send({
        clientId: 7,
        sessions: 2.5,
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Valid number of sessions is required',
    });
    expect(mocks.mockUser.findByPk).not.toHaveBeenCalled();
  });

  it('rejects scientific-notation test grants before loading a user', async () => {
    const response = await request(buildApp())
      .post('/api/session-packages/add-test-sessions')
      .send({
        sessions: '1e3',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Valid number of sessions is required',
    });
    expect(mocks.mockUser.findByPk).not.toHaveBeenCalled();
  });
});
