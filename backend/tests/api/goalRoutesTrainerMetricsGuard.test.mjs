import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const {
  assignmentFindAllMock,
  goalCountMock,
  redisGetMock,
  redisSetMock,
} = vi.hoisted(() => ({
  assignmentFindAllMock: vi.fn(),
  goalCountMock: vi.fn(),
  redisGetMock: vi.fn(),
  redisSetMock: vi.fn(),
}));

vi.mock('../../controllers/goalController.mjs', () => ({
  default: {
    getUserGoals: vi.fn(),
    createGoal: vi.fn(),
    getGoalAnalytics: vi.fn(),
    getGoalCategoriesStats: vi.fn(),
    getGoalById: vi.fn(),
    updateGoal: vi.fn(),
    updateGoalProgress: vi.fn(),
    deleteGoal: vi.fn(),
  },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, res, next) => {
    if (req.headers.authorization !== 'Bearer valid') {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    req.user = {
      id: Number(req.headers['x-test-user-id'] || 42),
      role: req.headers['x-test-role'] || 'trainer',
    };
    next();
  },
  trainerOrAdminOnly: (req, res, next) => {
    if (req.user?.role === 'trainer' || req.user?.role === 'admin') {
      next();
      return;
    }
    res.status(403).json({ success: false, message: 'Trainer or admin privileges required' });
  },
}));

vi.mock('../../models/associations.mjs', () => ({
  default: vi.fn(async () => ({
    ClientTrainerAssignment: { findAll: assignmentFindAllMock },
    Goal: {
      findByPk: vi.fn(),
      count: goalCountMock,
    },
  })),
}));

vi.mock('../../services/cache/redisWrapper.mjs', () => ({
  default: {
    get: redisGetMock,
    set: redisSetMock,
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import goalRoutes from '../../routes/goalRoutes.mjs';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/goals', goalRoutes);
  return app;
}

describe('goal trainer metrics route guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisGetMock.mockResolvedValue(null);
    redisSetMock.mockResolvedValue('OK');
  });

  it('rejects non-integer trainer IDs before querying assignments', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/goals/trainer/9.5/achieved')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid trainerId');
    expect(assignmentFindAllMock).not.toHaveBeenCalled();
    expect(goalCountMock).not.toHaveBeenCalled();
  });

  it('blocks trainers from reading another trainer goal metrics', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/goals/trainer/9/achieved')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Trainers can only view their own goals');
    expect(assignmentFindAllMock).not.toHaveBeenCalled();
  });

  it('allows trainers to read their own achieved-goal metrics', async () => {
    assignmentFindAllMock.mockResolvedValue([{ clientId: 1001 }]);
    goalCountMock.mockResolvedValue(3);

    const app = createApp();
    const res = await request(app)
      .get('/api/goals/trainer/42/achieved')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      trainerId: 42,
      achievedThisWeek: 3,
      clientCount: 1,
    });
    expect(assignmentFindAllMock).toHaveBeenCalledWith({
      where: { trainerId: 42, status: 'active' },
      attributes: ['clientId'],
    });
  });
});
