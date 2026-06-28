import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { getUserProfileMock, setSelectedRankTitleMock } = vi.hoisted(() => ({
  getUserProfileMock: vi.fn(),
  setSelectedRankTitleMock: vi.fn(),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../controllers/gamificationController.mjs', () => ({
  default: new Proxy({
    getUserProfile: (req, res) => {
      getUserProfileMock(req.params.userId);
      return res.status(200).json({ success: true, userId: req.params.userId });
    },
    setSelectedRankTitle: (req, res) => {
      setSelectedRankTitleMock(req.params.userId, req.body?.rankTitleKey);
      return res.status(200).json({ success: true, userId: req.params.userId, rankTitleKey: req.body?.rankTitleKey });
    },
  }, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (typeof prop === 'symbol') return target[prop];
      return (_req, res) => res.status(200).json({ success: true });
    },
  }),
}));

vi.mock('../../controllers/challengeController.mjs', () => ({
  default: new Proxy({}, { get: () => (_req, res) => res.status(200).json({ success: true }) }),
}));
vi.mock('../../controllers/progressController.mjs', () => ({
  default: new Proxy({}, { get: () => (_req, res) => res.status(200).json({ success: true }) }),
}));
vi.mock('../../controllers/goalController.mjs', () => ({
  default: new Proxy({}, { get: () => (_req, res) => res.status(200).json({ success: true }) }),
}));
vi.mock('../../controllers/socialController.mjs', () => ({
  default: new Proxy({}, { get: () => (_req, res) => res.status(200).json({ success: true }) }),
}));

vi.mock('../../services/gamificationDashboardService.mjs', () => ({
  getDashboardData: vi.fn(),
  getFeaturedData: vi.fn(),
  searchGamification: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const users = {
      user: { id: 101, role: 'user' },
      client: { id: 102, role: 'client' },
      trainer: { id: 103, role: 'trainer' },
      admin: { id: 104, role: 'admin' },
    };

    if (!users[token]) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    req.user = users[token];
    return next();
  },
  adminOnly: (_req, _res, next) => next(),
  trainerOnly: (_req, _res, next) => next(),
  trainerOrAdminOnly: (_req, _res, next) => next(),
  authorizeResourceAccess: () => (_req, _res, next) => next(),
  requireAnyRole: (...roles) => (req, res, next) => (
    roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({ success: false, message: 'Forbidden' })
  ),
}));

import gamificationV1Routes from '../../routes/gamificationV1Routes.mjs';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/gamification', gamificationV1Routes);
  app.use('/api/gamification', gamificationV1Routes);
  return app;
};

describe('gamification profile access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['/api/v1/gamification'],
    ['/api/gamification'],
  ])('lets a basic authenticated user read their own profile on %s', async (base) => {
    const response = await request(createApp())
      .get(`${base}/profile`)
      .set('Authorization', 'Bearer user');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, userId: 101 });
    expect(getUserProfileMock).toHaveBeenCalledWith(101);
  });

  it.each([
    ['/api/v1/gamification', 'user', 101],
    ['/api/gamification', 'user', 101],
    ['/api/v1/gamification', 'client', 102],
    ['/api/gamification', 'client', 102],
  ])('lets an authenticated profile user equip only their own profile rank title on %s as %s', async (base, token, userId) => {
    const response = await request(createApp())
      .put(`${base}/profile/rank-title`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rankTitleKey: 'swan_initiate' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, userId, rankTitleKey: 'swan_initiate' });
    expect(setSelectedRankTitleMock).toHaveBeenCalledWith(userId, 'swan_initiate');
  });
});
