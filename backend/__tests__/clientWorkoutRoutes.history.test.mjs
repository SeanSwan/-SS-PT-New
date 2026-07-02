/**
 * Client Workout History Route Tests
 * ==================================
 *
 * Locks the legacy `/api/workouts/:userId/history` safety contract after the
 * current-workout test file was split to stay under the 300-line cap.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockEnsureClientAccess = vi.fn();
const mockWorkoutSessionFindAll = vi.fn();
const mockDailyWorkoutFormModel = { name: 'DailyWorkoutForm' };

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

beforeEach(() => {
  vi.clearAllMocks();
  mockEnsureClientAccess.mockResolvedValue({
    allowed: true,
    clientId: 42,
    models: {
      WorkoutSession: { findAll: mockWorkoutSessionFindAll },
      DailyWorkoutForm: mockDailyWorkoutFormModel,
    },
  });
  mockWorkoutSessionFindAll.mockResolvedValue([]);
});

describe('clientWorkoutRoutes GET /:userId/history', () => {
  it('rejects malformed history limits before querying workout history', async () => {
    const res = await request(buildApp())
      .get('/api/workouts/42/history?limit=7junk')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Invalid limit',
    });
    expect(mockWorkoutSessionFindAll).not.toHaveBeenCalled();
  });

  it('does not disclose internal errors from the workout history lookup', async () => {
    mockWorkoutSessionFindAll.mockRejectedValue(new Error('sql detail: private table name'));

    const res = await request(buildApp())
      .get('/api/workouts/42/history')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Server error fetching workout history',
      code: 'INTERNAL_ERROR',
    });
    expect(JSON.stringify(res.body)).not.toContain('sql detail: private table name');
  });
  it('returns planned-assignment context from joined daily workout forms', async () => {
    mockWorkoutSessionFindAll.mockResolvedValue([{
      id: 'session-1',
      title: 'Personal Training Session - 2026-06-06',
      completedAt: '2026-06-06T12:30:00.000Z',
      duration: 42,
      totalSets: 6,
      dailyForms: [{
        formData: {
          plannedAssignment: {
            assignmentKey: 'plan-6m:w4:d2:homework',
            assignmentType: 'homework',
            title: 'Coach Homework Lower Body',
            weekNumber: 4,
            dayNumber: 2,
            firstExerciseName: 'Goblet Squat',
          },
          exercises: [{ exerciseName: 'Goblet Squat' }],
        },
      }],
    }]);

    const res = await request(buildApp())
      .get('/api/workouts/42/history')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(200);
    expect(mockWorkoutSessionFindAll).toHaveBeenCalledWith(expect.objectContaining({
      include: [expect.objectContaining({
        model: mockDailyWorkoutFormModel,
        as: 'dailyForms',
        attributes: ['id', 'formData', 'createdAt'],
      })],
    }));
    expect(res.body.data[0]).toMatchObject({
      id: 'session-1',
      name: 'Coach Homework Lower Body',
      plannedAssignment: {
        assignmentKey: 'plan-6m:w4:d2:homework',
        assignmentType: 'homework',
        title: 'Coach Homework Lower Body',
        weekNumber: 4,
        dayNumber: 2,
        firstExerciseName: 'Goblet Squat',
      },
      exerciseCount: 1,
      exerciseNames: ['Goblet Squat'],
    });
  });
});
