/**
 * GET /api/workouts/:userId/plans/:planId — client-scoped FULL plan read.
 *
 * The security case is the reason this file exists: an authenticated client can
 * always pass their OWN :userId (ensureClientAccess will happily allow it), so
 * the ONLY thing standing between them and a stranger's training program is the
 * ownership predicate in the query (userId is part of the where clause).
 * If someone ever "optimizes" that to findByPk(planId), these tests must fail.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockEnsureClientAccess = vi.fn();
const mockWorkoutPlanFindOne = vi.fn();

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: Number(req.headers['x-test-user-id'] || 42),
      role: req.headers['x-test-user-role'] || 'client',
    };
    next();
  },
}));

vi.mock('../utils/clientAccess.mjs', () => ({
  ensureClientAccess: (...args) => mockEnsureClientAccess(...args),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { default: clientWorkoutRoutes } = await import('../routes/clientWorkoutRoutes.mjs');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/workouts', clientWorkoutRoutes);
  return app;
};

const multiWeekPlan = {
  id: 7,
  userId: 42,
  title: '12-Week Strength Base',
  description: 'Foundation block',
  status: 'active',
  durationWeeks: 12,
  difficulty: 'intermediate',
  currentWeek: 2,
  currentDay: 1,
  createdAt: '2026-07-01T00:00:00.000Z',
  planData: {
    weeks: [
      {
        weekNumber: 1,
        focus: 'Stabilization',
        days: [
          { dayNumber: 1, dayName: 'Lower', exercises: [{ exerciseName: 'Goblet Squat', sets: 3 }] },
          { dayNumber: 2, dayName: 'Upper', exercises: [{ exerciseName: 'Push-Up', sets: 3 }] },
        ],
      },
      {
        weekNumber: 2,
        focus: 'Strength Endurance',
        days: [
          { dayNumber: 1, dayName: 'Full Body', exercises: [{ exerciseName: 'Deadlift', sets: 4 }] },
        ],
      },
    ],
  },
  toJSON() { return { ...this }; },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockEnsureClientAccess.mockResolvedValue({
    allowed: true,
    clientId: 42,
    models: { WorkoutPlan: { findOne: mockWorkoutPlanFindOne } },
  });
});

describe('GET /:userId/plans/:planId — full plan read', () => {
  it('returns EVERY week (not just the current one) with days and exercises', async () => {
    mockWorkoutPlanFindOne.mockResolvedValue(multiWeekPlan);

    const res = await request(buildApp()).get('/api/workouts/42/plans/7');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // The whole point: /current would have returned ONLY week 2.
    expect(res.body.data.weeks).toHaveLength(2);
    expect(res.body.data.weeks[0].weekNumber).toBe(1);
    expect(res.body.data.weeks[0].focus).toBe('Stabilization');
    expect(res.body.data.weeks[0].days).toHaveLength(2);
    expect(res.body.data.weeks[1].weekNumber).toBe(2);
    expect(res.body.data.weeks[1].days[0].exercises[0].exerciseName).toBe('Deadlift');
    // "You are here" markers for the modal.
    expect(res.body.data.currentWeek).toBe(2);
    expect(res.body.data.currentDay).toBe(1);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.title).toBe('12-Week Strength Base');
  });

  it('SECURITY: scopes the lookup by owner — a client cannot read a foreign plan id', async () => {
    // Sequelize returns null because userId is part of the WHERE clause.
    mockWorkoutPlanFindOne.mockResolvedValue(null);

    const res = await request(buildApp())
      .get('/api/workouts/42/plans/999')          // 999 belongs to someone else
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    // 404 (not 403): never confirm that a foreign plan id exists.
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);

    // The ownership predicate MUST be in the query itself.
    const where = mockWorkoutPlanFindOne.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: 999, userId: 42 });
  });

  it('SECURITY: honors ensureClientAccess denial (cannot read another user\'s plans at all)', async () => {
    mockEnsureClientAccess.mockResolvedValue({
      allowed: false,
      status: 403,
      message: 'Not authorized',
    });

    const res = await request(buildApp()).get('/api/workouts/99/plans/7');

    expect(res.status).toBe(403);
    expect(mockWorkoutPlanFindOne).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric plan id without touching the database', async () => {
    const res = await request(buildApp()).get('/api/workouts/42/plans/not-a-number');

    expect(res.status).toBe(400);
    expect(mockWorkoutPlanFindOne).not.toHaveBeenCalled();
  });

  it.each(['0', '-1', '9007199254740992'])('rejects unsafe or out-of-range plan id %s before access or database work', async (planId) => {
    const res = await request(buildApp()).get(`/api/workouts/42/plans/${planId}`);

    expect(res.status).toBe(400);
    expect(mockEnsureClientAccess).not.toHaveBeenCalled();
    expect(mockWorkoutPlanFindOne).not.toHaveBeenCalled();
  });

  it('is READ-ONLY: the router exposes no client-side write path for plans', async () => {
    // Trainer-indispensability doctrine: only a trainer/admin may switch or edit
    // a plan. If someone adds a client-scoped activate/edit route, this fails.
    const app = buildApp();
    const put = await request(app).put('/api/workouts/42/plans/7');
    const post = await request(app).post('/api/workouts/42/plans/7/activate');

    expect(put.status).toBe(404);
    expect(post.status).toBe(404);
  });
});
