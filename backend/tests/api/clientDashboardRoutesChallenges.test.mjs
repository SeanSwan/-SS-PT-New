import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const {
  challengeParticipantFindAllMock,
  challengeModel,
} = vi.hoisted(() => ({
  challengeParticipantFindAllMock: vi.fn(),
  challengeModel: { modelName: 'Challenge' },
}));

vi.mock('../../database.mjs', () => ({
  default: {
    fn: vi.fn(),
    col: vi.fn(),
  },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: Number(req.headers['x-test-user-id'] || 42),
      role: 'client',
    };
    next();
  },
  clientOnly: (_req, _res, next) => next(),
  rateLimiter: () => (_req, _res, next) => next(),
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    ChallengeParticipant: { findAll: challengeParticipantFindAllMock },
    Challenge: challengeModel,
  }),
  Op: { not: Symbol.for('sequelize.not') },
}));

vi.mock('../../controllers/profileController.mjs', () => ({
  updateClientProfile: (_req, res) => res.status(200).json({ success: true }),
}));

import clientDashboardRoutes from '../../routes/clientDashboardRoutes.mjs';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/client', clientDashboardRoutes);
  return app;
}

describe('client dashboard challenge route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads challenges for normal integer SwanStudios user IDs', async () => {
    const challengeRows = [
      { id: 'participation-1', userId: 42, status: 'active', challengeId: 'challenge-1' },
    ];
    challengeParticipantFindAllMock.mockResolvedValue(challengeRows);

    const res = await request(createApp())
      .get('/api/client/challenges')
      .set('X-Test-User-Id', '42');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, challenges: challengeRows });
    expect(challengeParticipantFindAllMock).toHaveBeenCalledWith({
      where: { userId: 42 },
      include: [{ model: challengeModel }],
      order: [['updatedAt', 'DESC']],
    });
  });
});
