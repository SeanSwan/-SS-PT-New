/**
 * Client Workout History and Progress Route Tests
 * ===============================================
 *
 * Covers cross-surface regressions where completed planned homework should
 * keep today's client workout card non-loggable after the plan cursor moves.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockEnsureClientAccess = vi.fn();
const mockWorkoutPlanFindOne = vi.fn();
const mockWorkoutPlanFindAll = vi.fn();
const mockWorkoutSessionFindAll = vi.fn();
const mockDailyWorkoutFormFindOne = vi.fn();

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
const { planDataToWorkoutDays } = await import('../services/workoutPlanShapeService.mjs');

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
      WorkoutPlan: { findOne: mockWorkoutPlanFindOne, findAll: mockWorkoutPlanFindAll },
      WorkoutSession: { findAll: mockWorkoutSessionFindAll },
      DailyWorkoutForm: { findOne: mockDailyWorkoutFormFindOne },
    },
  });
  mockWorkoutPlanFindAll.mockResolvedValue([]);
  mockWorkoutSessionFindAll.mockResolvedValue([]);
  mockDailyWorkoutFormFindOne.mockResolvedValue(null);
});

describe('clientWorkoutRoutes completed plan progress regressions', () => {
  it('keeps current workout read non-loggable after homework logging advances the plan cursor', async () => {
    const advancedPlan = {
      id: 'plan-6m',
      title: 'Six Month Foundation',
      durationWeeks: 26,
      status: 'active',
      currentWeek: 4,
      currentDay: 1,
      metadata: { planHorizon: 'six_month' },
      planData: {
        weeks: [
          { days: [] },
          { days: [] },
          { days: [] },
          { days: [{ name: 'Next Week Start', assignmentType: 'homework', exercises: [{ exerciseName: 'Split Squat' }] }] },
        ],
      },
    };
    mockWorkoutPlanFindOne.mockResolvedValue(advancedPlan);
    mockWorkoutPlanFindAll.mockResolvedValue([advancedPlan]);
    mockDailyWorkoutFormFindOne.mockResolvedValue({
      id: 'daily-form-1',
      submittedAt: '2026-06-06T12:00:00.000Z',
      formData: {
        plannedAssignment: {
          assignmentKey: 'plan-6m:w3:d2:homework',
          assignmentType: 'homework',
          title: 'Coach Homework Lower Body',
          weekNumber: 3,
          dayNumber: 2,
          exerciseCount: 1,
          firstExerciseName: 'Goblet Squat',
        },
      },
    });

    const res = await request(buildApp())
      .get('/api/workouts/42/current')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(200);
    expect(res.body.todayAssignment).toMatchObject({
      assignmentKey: 'plan-6m:w3:d2:homework',
      title: 'Coach Homework Lower Body',
      status: 'completed',
      isLoggable: false,
    });
  });
});

describe('planDataToWorkoutDays', () => {
  it('uses the current week JSONB days/sessions instead of normalized child tables', () => {
    const days = planDataToWorkoutDays({
      weeks: [
        { days: [{ dayNumber: 1, dayName: 'Week 1 Day', exercises: [] }] },
        { sessions: [{ dayNumber: 2, name: 'Week 2 Pull', exercises: [{ name: 'Row', reps: '10' }] }] },
      ],
    }, 2);

    expect(days).toHaveLength(1);
    expect(days[0].name).toBe('Week 2 Pull');
    expect(days[0].exercises[0].exerciseName).toBe('Row');
  });

  it('preserves solo non-billable assignment metadata when flattening plan days', () => {
    const days = planDataToWorkoutDays({
      weeks: [{
        days: [{
          dayNumber: 6,
          name: 'Active Recovery Homework',
          dayType: 'active_recovery',
          assignmentType: 'active_recovery',
          sessionType: 'solo',
          isBillable: false,
          shouldDeductSession: false,
          exercises: [],
        }],
      }],
    }, 1);

    expect(days[0]).toMatchObject({
      dayType: 'active_recovery',
      assignmentType: 'active_recovery',
      sessionType: 'solo',
      isBillable: false,
      shouldDeductSession: false,
    });
  });
});
