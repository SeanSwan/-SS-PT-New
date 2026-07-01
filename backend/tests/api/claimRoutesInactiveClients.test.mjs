import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentUser: { id: 7, role: 'admin' },
  userFindByPk: vi.fn(),
  userFindOne: vi.fn(),
  generateClaimToken: vi.fn(),
  hashToken: vi.fn(),
  isTokenExpired: vi.fn(),
}));

vi.mock('../../models/index.mjs', () => ({
  getUser: () => ({
    findByPk: mocks.userFindByPk,
    findOne: mocks.userFindOne,
  }),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = mocks.currentUser;
    next();
  },
  rateLimiter: ({ max = 100, message = 'Too many requests, please try again later.' } = {}) => {
    const hits = new Map();
    return (req, res, next) => {
      const key = `${req.get('x-rate-limit-key') || req.ip || 'test'}:${req.path}`;
      const count = (hits.get(key) || 0) + 1;
      hits.set(key, count);
      if (count > max) {
        return res.status(429).json({ success: false, message });
      }
      return next();
    };
  },
}));

vi.mock('../../services/claimTokenService.mjs', () => ({
  generateClaimToken: mocks.generateClaimToken,
  hashToken: mocks.hashToken,
  isTokenExpired: mocks.isTokenExpired,
}));

const { default: claimRoutes } = await import('../../routes/claimRoutes.mjs');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/claim', claimRoutes);
  return app;
};

describe('claim routes inactive-client login readiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = { id: 7, role: 'admin' };
    mocks.generateClaimToken.mockReturnValue({
      plainToken: 'SWAN-ABCDEFGH',
      hash: 'claim-hash',
      expires: new Date('2030-01-01T00:00:00.000Z'),
    });
    mocks.hashToken.mockImplementation((token) => `hash:${token}`);
    mocks.isTokenExpired.mockReturnValue(false);
  });

  it('keeps recovery claim-token generation admin-only', async () => {
    mocks.currentUser = { id: 8, role: 'trainer' };

    const res = await request(buildApp())
      .post('/api/claim/generate-token')
      .send({ clientId: 42 })
      .expect(403);

    expect(res.body).toMatchObject({
      success: false,
      message: 'Admin only',
    });
    expect(mocks.userFindByPk).not.toHaveBeenCalled();
    expect(mocks.generateClaimToken).not.toHaveBeenCalled();
  });
  it('rejects malformed client IDs before database lookup or token generation', async () => {
    const res = await request(buildApp())
      .post('/api/claim/generate-token')
      .send({ clientId: '42x' })
      .expect(400);

    expect(res.body).toMatchObject({
      success: false,
      message: 'Valid clientId is required',
    });
    expect(mocks.userFindByPk).not.toHaveBeenCalled();
    expect(mocks.generateClaimToken).not.toHaveBeenCalled();
  });
  it('does not generate claim links for inactive client records', async () => {
    const update = vi.fn();
    mocks.userFindByPk.mockResolvedValue({
      id: 42,
      role: 'client',
      isActive: false,
      accountStatus: 'invited',
      forcePasswordChange: true,
      firstName: 'Inactive',
      lastName: 'Client',
      update,
    });

    const res = await request(buildApp())
      .post('/api/claim/generate-token')
      .send({ clientId: 42 })
      .expect(409);

    expect(res.body).toMatchObject({
      success: false,
      message: 'Client is inactive. Reactivate the client before generating a claim link.',
    });
    expect(update).not.toHaveBeenCalled();
    expect(mocks.generateClaimToken).not.toHaveBeenCalled();
  });

  it('does not generate claim links for non-client user records', async () => {
    const update = vi.fn();
    mocks.userFindByPk.mockResolvedValue({
      id: 99,
      role: 'trainer',
      isActive: true,
      accountStatus: 'invited',
      forcePasswordChange: true,
      firstName: 'Staff',
      lastName: 'Member',
      update,
    });

    const res = await request(buildApp())
      .post('/api/claim/generate-token')
      .send({ clientId: 99 })
      .expect(404);

    expect(res.body).toMatchObject({
      success: false,
      message: 'Client not found',
    });
    expect(update).not.toHaveBeenCalled();
    expect(mocks.generateClaimToken).not.toHaveBeenCalled();
  });
  it('verifies claim codes only against active invited or stub clients', async () => {
    mocks.userFindOne.mockResolvedValue(null);

    await request(buildApp())
      .get('/api/claim/verify/SWAN-ABCDEFGH')
      .expect(200);

    expect(mocks.userFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        claimTokenHash: 'hash:SWAN-ABCDEFGH',
        role: 'client',
        isActive: true,
      }),
    }));
  });

  it('rejects malformed public claim verification tokens before database lookup', async () => {
    await request(buildApp())
      .get('/api/claim/verify/not-a-claim-token')
      .expect(400);

    expect(mocks.hashToken).not.toHaveBeenCalled();
    expect(mocks.userFindOne).not.toHaveBeenCalled();
  });

  it('rate-limits repeated public claim verification attempts', async () => {
    mocks.userFindOne.mockResolvedValue(null);
    const app = buildApp();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(app)
        .get('/api/claim/verify/SWAN-ABCDEFGH')
        .set('x-rate-limit-key', 'verify-limit')
        .expect(200);
    }

    const res = await request(app)
      .get('/api/claim/verify/SWAN-ABCDEFGH')
      .set('x-rate-limit-key', 'verify-limit')
      .expect(429);

    expect(res.body).toMatchObject({
      success: false,
      message: 'Too many claim-link attempts, please try again later.',
    });
  });

  it('activates claim codes only when the matched client can log in afterward', async () => {
    mocks.userFindOne.mockResolvedValue(null);

    await request(buildApp())
      .post('/api/claim/activate')
      .send({ token: 'SWAN-ABCDEFGH', password: 'StrongPass1!' })
      .expect(404);

    expect(mocks.userFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        claimTokenHash: 'hash:SWAN-ABCDEFGH',
        role: 'client',
        isActive: true,
      }),
    }));
  });

  it('rejects malformed public activation tokens before database lookup', async () => {
    await request(buildApp())
      .post('/api/claim/activate')
      .send({ token: 'not-a-claim-token', password: 'StrongPass1!' })
      .expect(400);

    expect(mocks.hashToken).not.toHaveBeenCalled();
    expect(mocks.userFindOne).not.toHaveBeenCalled();
  });

  it('rate-limits repeated public claim activation attempts', async () => {
    mocks.userFindOne.mockResolvedValue(null);
    const app = buildApp();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app)
        .post('/api/claim/activate')
        .set('x-rate-limit-key', 'activate-limit')
        .send({ token: 'SWAN-ABCDEFGH', password: 'StrongPass1!' })
        .expect(404);
    }

    const res = await request(app)
      .post('/api/claim/activate')
      .set('x-rate-limit-key', 'activate-limit')
      .send({ token: 'SWAN-ABCDEFGH', password: 'StrongPass1!' })
      .expect(429);

    expect(res.body).toMatchObject({
      success: false,
      message: 'Too many claim-link attempts, please try again later.',
    });
  });
});