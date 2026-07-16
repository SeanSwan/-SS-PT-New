/**
 * ============================================================================
 * FILE: clientWorkoutRoutes.timeZone.test.mjs
 * PURPOSE: Prove client-local assignment dates at DST and cross-role boundaries.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockEnsureClientAccess = vi.fn();
const mockWorkoutPlanFindOne = vi.fn();
const mockWorkoutPlanFindAll = vi.fn();
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

const planId = '6ea7806d-36c8-4307-bd5d-6b04b68be849';
const activePlan = {
  id: planId,
  userId: 42,
  title: 'DST Training Arc',
  status: 'active',
  currentWeek: 1,
  currentDay: 1,
  contentRevision: 2,
  durationWeeks: 4,
  metadata: { planHorizon: 'one_month', isPrimaryPlan: true },
  planData: {
    weeks: [{
      days: [{
        dayNumber: 1,
        name: 'Client Local Day',
        assignmentType: 'homework',
        exercises: [{ exerciseName: 'Goblet Squat' }],
      }],
    }],
  },
};

const buildApp = () => {
  const app = express();
  app.use('/api/workouts', clientWorkoutRoutes);
  return app;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-08T07:30:00.000Z'));
  mockWorkoutPlanFindOne.mockResolvedValue(activePlan);
  mockWorkoutPlanFindAll.mockResolvedValue([activePlan]);
  mockDailyWorkoutFormFindOne.mockResolvedValue(null);
  mockEnsureClientAccess.mockResolvedValue({
    allowed: true,
    clientId: 42,
    client: {
      id: 42,
      timeZone: 'America/Los_Angeles',
      timeZoneConfigured: false,
    },
    models: {
      WorkoutPlan: { findOne: mockWorkoutPlanFindOne, findAll: mockWorkoutPlanFindAll },
      DailyWorkoutForm: { findOne: mockDailyWorkoutFormFindOne },
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/workouts/:userId/current client-local date truth', () => {
  it('uses the client browser zone for their own unconfigured account', async () => {
    const response = await request(buildApp())
      .get('/api/workouts/42/current')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client')
      .set('X-Client-Timezone', 'Asia/Tokyo');

    expect(response.status).toBe(200);
    expect(response.body.trainingDateContext).toEqual({
      localDate: '2026-03-08',
      timeZone: 'Asia/Tokyo',
      source: 'client_header',
    });
    expect(response.body.todayAssignment).toMatchObject({
      scheduledDate: '2026-03-08',
      assignmentKey: `${planId}:w1:d1:2026-03-08:o1:r2`,
    });
  });

  it('ignores a trainer browser zone and keeps the client account date', async () => {
    const response = await request(buildApp())
      .get('/api/workouts/42/current')
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer')
      .set('X-Client-Timezone', 'Asia/Tokyo');

    expect(response.status).toBe(200);
    expect(response.body.trainingDateContext).toEqual({
      localDate: '2026-03-07',
      timeZone: 'America/Los_Angeles',
      source: 'account_default',
    });
    expect(response.body.todayAssignment).toMatchObject({
      scheduledDate: '2026-03-07',
      assignmentKey: `${planId}:w1:d1:2026-03-07:o1:r2`,
    });
  });
});