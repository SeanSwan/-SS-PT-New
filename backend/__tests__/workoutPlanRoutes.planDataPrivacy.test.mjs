/**
 * Mounted workout-plan route privacy regressions.
 *
 * Proves every backend planData write path strips contact details before
 * WorkoutPlan.planData can persist or propagate into planner/logger/PDF reads.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { hashWorkoutPlanContent } from '../services/workoutPlanRevisionService.mjs';

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: Number(req.headers['x-test-user-id'] || 7),
      role: req.headers['x-test-user-role'] || 'trainer',
    };
    next();
  },
  trainerOrAdminOnly: (req, res, next) => (
    req.user?.role === 'trainer' || req.user?.role === 'admin'
      ? next()
      : res.status(403).json({ success: false })
  ),
}));

const mockAssignmentFindOne = vi.fn();
const mockWorkoutPlanFindByPk = vi.fn();
const mockWorkoutPlanFindAll = vi.fn();
const mockWorkoutPlanFindOne = vi.fn();
const mockWorkoutPlanCreate = vi.fn();
const mockDailyWorkoutFormFindAll = vi.fn();
const mockSequelizeTransaction = vi.fn();
let mockTransactionInstance;

vi.mock('../models/index.mjs', () => ({
  getModel: (name) => {
    if (name === 'ClientTrainerAssignment') return { findOne: mockAssignmentFindOne };
    if (name === 'DailyWorkoutForm') return { findAll: mockDailyWorkoutFormFindAll };
    if (name === 'WorkoutPlan') {
      return {
        findByPk: mockWorkoutPlanFindByPk,
        findAll: mockWorkoutPlanFindAll,
        findOne: mockWorkoutPlanFindOne,
        create: mockWorkoutPlanCreate,
      };
    }
    return null;
  },
}));

vi.mock('../database.mjs', () => ({
  default: { transaction: (...args) => mockSequelizeTransaction(...args) },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const workoutPlanRoutes = (await import('../routes/workoutPlanRoutes.mjs')).default;

const app = express();
app.use(express.json());
app.use('/api/workout-plans', workoutPlanRoutes);

const auth = (req) => req
  .set('x-test-user-id', '7')
  .set('x-test-user-role', 'trainer');

const unsafePlanData = () => ({
  planSummary: {
    durationWeeks: 4,
    email: 'private@example.com',
    phoneNumber: '555-555-0199',
  },
  recommendations: ['Email private@example.com or call (555) 555-0199.'],
  weeks: [{
    weekNumber: 1,
    days: [{
      dayNumber: 1,
      exercises: [{ exerciseName: 'Cable Row', notes: 'Backup: 555-555-0199' }],
    }],
  }],
});

const expectSanitizedPlanData = (planData) => {
  const serialized = JSON.stringify(planData);
  expect(serialized).not.toContain('private@example.com');
  expect(serialized).not.toContain('555-555-0199');
  expect(serialized).not.toContain('(555) 555-0199');
  expect(serialized).toContain('Cable Row');
  expect(serialized).toContain('[redacted]');
};

describe('workoutPlanRoutes planData privacy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssignmentFindOne.mockResolvedValue({ id: 'assign-1', status: 'active' });
    mockWorkoutPlanFindByPk.mockResolvedValue(null);
    mockWorkoutPlanFindAll.mockResolvedValue([]);
    mockWorkoutPlanFindOne.mockResolvedValue(null);
    mockWorkoutPlanCreate.mockResolvedValue({ id: 'plan-created' });
    mockDailyWorkoutFormFindAll.mockResolvedValue([]);
    mockTransactionInstance = {
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      LOCK: { UPDATE: 'UPDATE' },
    };
    mockSequelizeTransaction.mockImplementation(async (callback) => (
      typeof callback === 'function'
        ? callback(mockTransactionInstance)
        : mockTransactionInstance
    ));
  });

  it('sanitizes planData on POST /api/workout-plans', async () => {
    const res = await auth(request(app).post('/api/workout-plans')).send({
      userId: 42,
      title: 'Privacy Boundary Plan',
      planData: unsafePlanData(),
    });

    expect(res.status).toBe(201);
    const [payload, options] = mockWorkoutPlanCreate.mock.calls[0];
    expectSanitizedPlanData(payload.planData);
    expect(payload).toMatchObject({
      contentRevision: 1,
      contentHash: hashWorkoutPlanContent(payload.planData),
    });
    expect(options).toEqual({ transaction: mockTransactionInstance });
  });

  it('sanitizes planData on PUT /api/workout-plans/:id', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mockWorkoutPlanFindByPk.mockResolvedValue({
      id: 'plan-1',
      userId: 42,
      metadata: {},
      update,
    });

    const res = await auth(request(app).put('/api/workout-plans/plan-1')).send({
      planData: unsafePlanData(),
    });

    expect(res.status).toBe(200);
    const [payload, options] = update.mock.calls[0];
    expectSanitizedPlanData(payload.planData);
    expect(payload).toMatchObject({
      contentRevision: 1,
      contentHash: hashWorkoutPlanContent(payload.planData),
    });
    expect(options).toEqual({ transaction: mockTransactionInstance });
  });

  it('sanitizes cloned planData on POST /api/workout-plans/:id/duplicate', async () => {
    mockWorkoutPlanFindByPk.mockResolvedValue({
      id: 'plan-1',
      userId: 42,
      title: 'Unsafe Original',
      durationWeeks: 4,
      metadata: {},
      planData: unsafePlanData(),
    });

    const res = await auth(request(app).post('/api/workout-plans/plan-1/duplicate')).send({});

    expect(res.status).toBe(201);
    const [payload, options] = mockWorkoutPlanCreate.mock.calls[0];
    expectSanitizedPlanData(payload.planData);
    expect(payload).toMatchObject({
      contentRevision: 1,
      contentHash: hashWorkoutPlanContent(payload.planData),
    });
    expect(options).toEqual({ transaction: mockTransactionInstance });
  });

  it('sanitizes advanced planData without changing its prescribed-content revision', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const planData = {
      weeks: [{
        weekNumber: 1,
        days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Cable Row' }] }],
      }],
    };
    mockWorkoutPlanFindByPk.mockResolvedValue({
      id: 'plan-1',
      userId: 42,
      status: 'active',
      currentWeek: 1,
      currentDay: 1,
      planData,
      contentRevision: 4,
      contentHash: hashWorkoutPlanContent(planData),
      update,
    });

    const res = await auth(request(app).put('/api/workout-plans/plan-1/advance')).send({
      trainerNotes: 'Follow up at private@example.com or 555-555-0199.',
    });

    expect(res.status).toBe(200);
    const [payload, options] = update.mock.calls[0];
    expectSanitizedPlanData(payload.planData);
    expect(payload).toMatchObject({
      contentRevision: 4,
      contentHash: hashWorkoutPlanContent(payload.planData),
    });
    expect(options).toEqual({ transaction: mockTransactionInstance });
  });
});