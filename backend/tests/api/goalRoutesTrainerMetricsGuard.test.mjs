import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const {
  assignmentFindAllMock,
  goalCountMock,
  goalFindAllMock,
  goalFindByPkMock,
  getGoalAnalyticsMock,
  redisGetMock,
  redisSetMock,
} = vi.hoisted(() => ({
  assignmentFindAllMock: vi.fn(),
  goalCountMock: vi.fn(),
  goalFindAllMock: vi.fn(),
  goalFindByPkMock: vi.fn(),
  getGoalAnalyticsMock: vi.fn(),
  redisGetMock: vi.fn(),
  redisSetMock: vi.fn(),
}));

vi.mock('../../controllers/goalController.mjs', () => ({
  default: {
    getUserGoals: vi.fn(),
    createGoal: vi.fn(),
    getGoalAnalytics: getGoalAnalyticsMock,
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
      findByPk: goalFindByPkMock,
      findAll: goalFindAllMock,
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
    getGoalAnalyticsMock.mockImplementation((_req, res) => res.status(418).json({
      success: false,
      message: 'single-goal analytics path used',
    }));
  });

  it('returns authenticated-user collection analytics instead of single-goal lookup', async () => {
    const soonDeadline = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString();
    goalFindAllMock.mockResolvedValue([
      {
        id: 1,
        category: 'strength',
        status: 'active',
        progressPercentage: '40',
        deadline: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
      },
      {
        id: 2,
        category: 'strength',
        status: 'completed',
        progressPercentage: '100',
        completedAt: '2026-06-01T00:00:00.000Z',
      },
      {
        id: 3,
        category: 'cardio',
        status: 'paused',
        progressPercentage: '10',
        deadline: soonDeadline,
      },
    ]);

    const app = createApp();
    const res = await request(app)
      .get('/api/goals/analytics')
      .set('Authorization', 'Bearer valid')
      .set('X-Test-User-Id', '42')
      .set('X-Test-Role', 'client');

    expect(res.status).toBe(200);
    expect(res.body.analytics).toMatchObject({
      totalGoals: 3,
      activeGoals: 1,
      completedGoals: 1,
      pausedGoals: 1,
      averageProgress: 50,
      completionRate: 33.33,
      goalsAtRisk: 1,
    });
    expect(res.body.analytics.categoryBreakdown).toEqual([
      {
        category: 'cardio',
        total: 1,
        completed: 0,
        averageProgress: 10,
      },
      {
        category: 'strength',
        total: 2,
        completed: 1,
        averageProgress: 70,
      },
    ]);
    expect(goalFindAllMock).toHaveBeenCalledWith(expect.objectContaining({
      attributes: ['id', 'category', 'status', 'progressPercentage', 'deadline', 'completedAt'],
      raw: true,
      where: expect.objectContaining({ userId: 42 }),
    }));
    expect(goalFindByPkMock).not.toHaveBeenCalled();
    expect(getGoalAnalyticsMock).not.toHaveBeenCalled();
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
