/**
 * A booked session is logged under ITS OWN LOCAL DAY (client time zone), not its
 * UTC day. Found by the 2026-09-24 hostile review of Swan Coach Floor: the route
 * took `new Date(sessionDate).toISOString()` (UTC) and then refused anything
 * "in the future" of the client's local date, so every booking from ~5 PM
 * Pacific (00:00 UTC) on could never be logged against its booking — in the
 * Workout Logger's own "log this session" flow as well as Floor mode.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
const mockSessionTypeFindByPk = vi.fn();
const mockWorkoutPlanFindOne = vi.fn();
const mockWorkoutPlanFindByPk = vi.fn();
const mockWorkoutPlanUpdate = vi.fn();
const mockCompletionReceiptFindOrCreate = vi.fn(async ({ defaults }) => [
  { id: 'receipt-scheduled-route', ...defaults },
  true,
]);

vi.mock('../models/index.mjs', () => ({
  getUser: () => ({ findByPk: mockUserFindByPk, findOne: mockUserFindOne }),
  getDailyWorkoutForm: () => ({
    findOne: mockDailyWorkoutFormFindOne,
    create: mockDailyWorkoutFormCreate,
  }),
  getWorkoutSession: () => ({ findOrCreate: mockWorkoutSessionFindOrCreate }),
  getWorkoutLog: () => ({ destroy: mockWorkoutLogDestroy, bulkCreate: mockWorkoutLogBulkCreate }),
  getWorkoutPlan: () => ({
    findOne: mockWorkoutPlanFindOne,
    findByPk: mockWorkoutPlanFindByPk,
  }),
  getWorkoutPlanCompletionReceipt: () => ({ findOrCreate: mockCompletionReceiptFindOrCreate }),
  getSession: () => ({ findByPk: mockSessionFindByPk }),
  getSessionType: () => ({ findByPk: mockSessionTypeFindByPk }),
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
    // C4a: the route takes a pg advisory lock before the same-day dedupe.
    query: vi.fn().mockResolvedValue([[], undefined]),
  },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../services/badgeGamificationBridge.mjs', () => ({
  fireWorkoutBadgeChecks: vi.fn().mockResolvedValue([]),
}));
vi.mock('../services/awardWorkoutXP.mjs', () => ({
  awardWorkoutXP: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../services/gamification/challengeWorkoutCompletionBridge.mjs', () => ({
  applyDailyWorkoutFormChallengeProgress: vi.fn().mockResolvedValue(null),
}));

vi.mock('../services/gamification/challengeProgressImpactReceipt.mjs', () => ({
  buildChallengeProgressImpactReceipt: vi.fn(() => ({
    status: 'processed',
    updatedCount: 0,
    skippedCount: 0,
    headline: null,
    updates: [],
  })),
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

const TRAINER_SESSION_ASSIGNMENT = {
  assignmentKey: '6ea7806d-36c8-4307-bd5d-6b04b68be849:w4:d2:trainer_session',
  planId: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
  assignmentType: 'trainer_session',
  source: 'workout_plan',
  isBillable: true,
  shouldDeductSession: true,
  weekNumber: 4,
  dayNumber: 2,
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
  mockWorkoutPlanFindOne.mockResolvedValue(null);
  mockSessionTypeFindByPk.mockResolvedValue(null);
});

afterEach(() => vi.useRealTimers());

describe('POST /api/workout-forms — a booked session keeps its local day', () => {
  it('a 5:30 PM Pacific booking logged at 6 PM saves under that day, not the next UTC day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-25T01:00:00.000Z')); // 6:00 PM PDT, Sept 24
    const scheduledSession = primeScheduledWorkoutLog({
      scheduledSessionOverrides: { sessionDate: '2026-09-25T00:30:00.000Z' }, // 5:30 PM PDT, Sept 24
    });

    const res = await request(app).post('/api/workout-forms').send({ ...VALID_PAYLOAD, date: '2026-09-24' });

    expect(res.status).toBe(201);
    expect(mockDailyWorkoutFormCreate.mock.calls[0][0].date).toBe('2026-09-24');
    expect(scheduledSession.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }), expect.any(Object));
  });

  it('the client time zone decides the day: an 8:30 AM Tokyo booking is Sept 26, though UTC still says Sept 25', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-26T03:00:00.000Z')); // 12:00 noon JST, Sept 26
    mockDailyWorkoutFormFindOne.mockResolvedValueOnce(null);
    mockUserFindByPk.mockResolvedValueOnce({
      id: 11, availableSessions: 8, clientSource: 'swanstudios', decrement: mockUserDecrement,
      timeZone: 'Asia/Tokyo', timeZoneConfigured: true,
    });
    mockScheduledSession({ sessionDate: '2026-09-25T23:30:00.000Z' }); // 8:30 AM JST, Sept 26
    mockWorkoutSessionFindOrCreate.mockResolvedValueOnce([{ id: 'workout-session-1', update: vi.fn().mockResolvedValue(undefined) }, true]);
    mockDailyWorkoutFormCreate.mockResolvedValueOnce({ id: 'daily-form-2', submittedAt: '2026-09-26T03:00:00.000Z', update: mockDailyWorkoutFormUpdate });

    const res = await request(app).post('/api/workout-forms').send({ ...VALID_PAYLOAD, date: '2026-09-26' });

    expect(res.status).toBe(201);
    expect(mockDailyWorkoutFormCreate.mock.calls[0][0].date).toBe('2026-09-26');
  });

  it('CONTROL: a booking that is genuinely tomorrow (local) is still refused as future', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-24T20:00:00.000Z')); // 1:00 PM PDT, Sept 24
    primeScheduledWorkoutLog({ scheduledSessionOverrides: { sessionDate: '2026-09-25T16:00:00.000Z' } }); // 9 AM PDT, Sept 25

    const res = await request(app).post('/api/workout-forms').send({ ...VALID_PAYLOAD, date: '2026-09-25' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/future/i);
    expect(mockDailyWorkoutFormCreate).not.toHaveBeenCalled();
  });
});
