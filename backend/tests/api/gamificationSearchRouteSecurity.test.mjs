import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { searchGamificationMock } = vi.hoisted(() => ({
  searchGamificationMock: vi.fn(),
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
  default: new Proxy({}, { get: () => (_req, res) => res.status(200).json({ success: true }) }),
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
  searchGamification: searchGamificationMock,
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 101, role: 'client' };
    return next();
  },
  adminOnly: (_req, _res, next) => next(),
  trainerOnly: (_req, _res, next) => next(),
  trainerOrAdminOnly: (_req, _res, next) => next(),
  authorizeResourceAccess: () => (_req, _res, next) => next(),
  requireAnyRole: () => (_req, _res, next) => next(),
}));

import gamificationV1Routes from '../../routes/gamificationV1Routes.mjs';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/gamification', gamificationV1Routes);
  app.use('/api/gamification', gamificationV1Routes);
  return app;
};

describe('gamification search route limit parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchGamificationMock.mockResolvedValue({
      challenges: [],
      achievements: [],
      rewards: [],
    });
  });

  it.each([
    ['/api/v1/gamification'],
    ['/api/gamification'],
  ])('uses decimal integer limits and caps them on %s', async (base) => {
    const app = createApp();

    const validResponse = await request(app).get(`${base}/search?q=swan&type=achievements&limit=7`);
    expect(validResponse.status).toBe(200);
    expect(searchGamificationMock).toHaveBeenLastCalledWith('swan', 'achievements', 7);

    const cappedResponse = await request(app).get(`${base}/search?q=swan&limit=500`);
    expect(cappedResponse.status).toBe(200);
    expect(searchGamificationMock).toHaveBeenLastCalledWith('swan', 'all', 100);
  });

  it.each([
    ['/api/v1/gamification'],
    ['/api/gamification'],
  ])('falls back to the default limit for non-decimal numeric tokens on %s', async (base) => {
    const app = createApp();
    const response = await request(app).get(`${base}/search?q=swan&limit=0x64`);

    expect(response.status).toBe(200);
    expect(searchGamificationMock).toHaveBeenLastCalledWith('swan', 'all', 20);
  });
});
