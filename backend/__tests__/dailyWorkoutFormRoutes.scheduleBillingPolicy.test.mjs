/**
 * DailyWorkoutForm scheduled-session billing policy contract.
 *
 * Locks Sean's trainer workflow rules:
 * - SwanStudios package clients deduct one paid session when a scheduled
 *   trainer-led workout is logged.
 * - A scheduled session already deducted upstream is not double-charged.
 * - Move Fitness clients are free-tracking clients: their workouts are saved
 *   and attendance is completed, but paid sessions are never deducted.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 99, role: 'admin' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
  trainerOrAdminOnly: (_req, _res, next) => next(),
  adminOnly: (_req, _res, next) => next(),
  checkTrainerClientRelationship: (_req, _res, next) => next(),
}));

vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

const mockUserFindByPk = vi.fn();
const mockUserFindOne = vi.fn();
const mockUserDecrement = vi.fn();
const mockDailyWorkoutFormFindOne = vi.fn();
const mockDailyWorkoutFormCreate = vi.fn();
const mockDailyWorkoutFormUpdate = vi.fn();
const mockWorkoutSessionFindOrCreate = vi.fn();
const mockWorkoutLogDestroy = vi.fn();
const mockWorkoutLogBulkCreate = vi.fn();
const mockSessionFindByPk = vi.fn();

vi.mock('../models/index.mjs', () => ({
  getUser: () => ({ findByPk: mockUserFindByPk, findOne: mockUserFindOne }),
  getDailyWorkoutForm: () => ({
    findOne: mockDailyWorkoutFormFindOne,
    create: mockDailyWorkoutFormCreate,
  }),
  getWorkoutSession: () => ({ findOrCreate: mockWorkoutSessionFindOrCreate }),
  getWorkoutLog: () => ({ destroy: mockWorkoutLogDestroy, bulkCreate: mockWorkoutLogBulkCreate }),
  getWorkoutPlan: () => ({ findOne: vi.fn() }),
  getSession: () => ({ findByPk: mockSessionFindByPk }),
  getClientTrainerAssignment: () => ({ findOne: vi.fn() }),
  getTrainerPermissions: () => ({ findOne: vi.fn() }),
  getBodyMeasurement: () => ({ findOne: vi.fn() }),
  getModel: vi.fn(),
}));

vi.mock('../models/TrainerPermissions.mjs', () => ({
  PERMISSION_TYPES: {
    EDIT_WORKOUTS: 'edit_workouts',
    LOG_WORKOUTS: 'log_workouts',
  },
}));

vi.mock('../database.mjs', () => ({
  default: {
    transaction: vi.fn(async () => ({
      LOCK: { UPDATE: 'UPDATE' },
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../services/awardWorkoutXP.mjs', () => ({
  awardWorkoutXP: vi.fn().mockResolvedValue(undefined),
}));

const dailyWorkoutFormRoutes = (await import('../routes/dailyWorkoutFormRoutes.mjs')).default;

const app = express();
app.use(express.json());
app.use('/api/workout-forms', dailyWorkoutFormRoutes);

const VALID_PAYLOAD = {
  clientId: 11,
  date: '2026-05-03',
  scheduledSessionId: 777,
  exercises: [
    {
      exerciseName: 'Goblet Squat',
      sets: [{ weight: 40, reps: 10 }],
    },
  ],
  sessionNotes: 'Scheduled training log',
};

function mockScheduledSession(overrides = {}) {
  const session = {
    id: 777,
    userId: 11,
    trainerId: 99,
    sessionDate: '2026-05-03T15:00:00.000Z',
    status: 'scheduled',
    attendanceStatus: null,
    checkInTime: null,
    markedPresentBy: null,
    attendanceRecordedAt: null,
    sessionDeducted: false,
    deductionDate: null,
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  mockSessionFindByPk.mockResolvedValueOnce(session);
  return session;
}

function primeScheduledWorkoutLog({
  availableSessions = 8,
  clientSource = 'swanstudios',
  scheduledSessionOverrides = {},
} = {}) {
  mockDailyWorkoutFormFindOne.mockResolvedValueOnce(null);
  mockUserFindByPk.mockResolvedValueOnce({
    id: 11,
    availableSessions,
    clientSource,
    decrement: mockUserDecrement,
  });
  const scheduledSession = mockScheduledSession(scheduledSessionOverrides);
  mockWorkoutSessionFindOrCreate.mockResolvedValueOnce([
    {
      id: 'workout-session-1',
      update: vi.fn().mockResolvedValue(undefined),
    },
    true,
  ]);
  mockDailyWorkoutFormCreate.mockResolvedValueOnce({
    id: 'daily-form-1',
    submittedAt: '2026-05-03T16:00:00.000Z',
    update: mockDailyWorkoutFormUpdate,
  });
  return scheduledSession;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserDecrement.mockResolvedValue(undefined);
  mockDailyWorkoutFormUpdate.mockResolvedValue(undefined);
  mockWorkoutLogDestroy.mockResolvedValue(undefined);
  mockWorkoutLogBulkCreate.mockResolvedValue([]);
});

describe('POST /api/workout-forms scheduled-session billing policy', () => {
  it('deducts exactly one SwanStudios paid session and stamps the linked schedule completed', async () => {
    const scheduledSession = primeScheduledWorkoutLog();

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(mockUserDecrement).toHaveBeenCalledTimes(1);
    expect(mockUserDecrement).toHaveBeenCalledWith('availableSessions', {
      by: 1,
      transaction: expect.any(Object),
    });
    expect(mockDailyWorkoutFormUpdate).toHaveBeenCalledWith(
      { sessionDeducted: true },
      { transaction: expect.any(Object) },
    );
    expect(scheduledSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        attendanceStatus: 'present',
        markedPresentBy: 99,
        sessionDeducted: true,
      }),
      { transaction: expect.any(Object) },
    );
    expect(scheduledSession.update.mock.calls[0][0].deductionDate).toBeInstanceOf(Date);
    expect(res.body.form.sessionDeducted).toBe(true);
    expect(res.body.message).toMatch(/session deducted/i);
  });

  it('does not double-deduct a SwanStudios scheduled session that was already deducted', async () => {
    const existingDeductionDate = new Date('2026-05-03T14:00:00.000Z');
    const scheduledSession = primeScheduledWorkoutLog({
      scheduledSessionOverrides: {
        sessionDeducted: true,
        deductionDate: existingDeductionDate,
      },
    });

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(mockUserDecrement).not.toHaveBeenCalled();
    expect(mockDailyWorkoutFormUpdate).toHaveBeenCalledWith(
      { sessionDeducted: true },
      { transaction: expect.any(Object) },
    );
    expect(scheduledSession.update.mock.calls[0][0]).toMatchObject({
      status: 'completed',
      attendanceStatus: 'present',
      sessionDeducted: true,
      deductionDate: existingDeductionDate,
    });
    expect(res.body.form.sessionDeducted).toBe(true);
    expect(res.body.message).toMatch(/previously deducted/i);
  });

  it('completes Move Fitness scheduled sessions without paid-session deduction', async () => {
    const scheduledSession = primeScheduledWorkoutLog({
      availableSessions: 0,
      clientSource: 'move_fitness',
    });

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(mockUserDecrement).not.toHaveBeenCalled();
    expect(mockDailyWorkoutFormUpdate).not.toHaveBeenCalled();
    expect(scheduledSession.update.mock.calls[0][0]).toMatchObject({
      status: 'completed',
      attendanceStatus: 'present',
      sessionDeducted: false,
      deductionDate: null,
    });
    expect(res.body.form.sessionDeducted).toBe(false);
    expect(res.body.message).toMatch(/without session deduction/i);
  });
});
