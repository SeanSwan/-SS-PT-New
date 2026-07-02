/**
 * Mounted workout-plan route metadata/progressNotes privacy regressions.
 *
 * Complements the planData privacy tests by proving adjacent WorkoutPlan JSONB
 * fields do not persist direct contact details through route write paths.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

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

const unsafeProgressNotes = () => [{
  week: 1,
  note: 'Call private@example.com or 555-555-0199 before progressing.',
  coachPhone: '(555) 555-0199',
}];

const unsafeMetadata = () => ({
  planHorizon: 'six_month',
  assignmentDefault: 'trainer_session',
  contactEmail: 'private@example.com',
  emergencyPhone: '555-555-0199',
  notes: 'Backup contact is private@example.com / (555) 555-0199.',
  planPdf: {
    url: '/api/workout-plans/plan-1/pdf/content.pdf',
    fileName: 'Six Month Plan.pdf',
  },
});

const expectSanitizedJson = (value) => {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain('private@example.com');
  expect(serialized).not.toContain('555-555-0199');
  expect(serialized).not.toContain('(555) 555-0199');
  expect(serialized).toContain('[redacted]');
};

describe('workoutPlanRoutes metadata/progressNotes privacy', () => {
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
    mockSequelizeTransaction.mockResolvedValue(mockTransactionInstance);
  });

  it('sanitizes progressNotes and metadata on POST /api/workout-plans', async () => {
    const res = await auth(request(app).post('/api/workout-plans')).send({
      userId: 42,
      title: 'Private Notes Plan',
      progressNotes: unsafeProgressNotes(),
      metadata: unsafeMetadata(),
    });

    expect(res.status).toBe(201);
    const payload = mockWorkoutPlanCreate.mock.calls[0][0];
    expectSanitizedJson(payload.progressNotes);
    expectSanitizedJson(payload.metadata);
    expect(payload.metadata).toMatchObject({
      planHorizon: 'six_month',
      assignmentDefault: 'trainer_session',
      planPdf: { fileName: 'Six Month Plan.pdf' },
    });
  });

  it('sanitizes progressNotes and merged metadata on PUT /api/workout-plans/:id', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mockWorkoutPlanFindByPk.mockResolvedValue({
      id: 'plan-1',
      userId: 42,
      metadata: unsafeMetadata(),
      update,
    });

    const res = await auth(request(app).put('/api/workout-plans/plan-1')).send({
      progressNotes: unsafeProgressNotes(),
      metadata: { notes: 'Fresh note with private@example.com and 555-555-0199.' },
    });

    expect(res.status).toBe(200);
    const payload = update.mock.calls[0][0];
    expectSanitizedJson(payload.progressNotes);
    expectSanitizedJson(payload.metadata);
    expect(payload.metadata).toMatchObject({
      planHorizon: 'six_month',
      assignmentDefault: 'trainer_session',
      planPdf: { fileName: 'Six Month Plan.pdf' },
    });
  });

  it('sanitizes cloned metadata on POST /api/workout-plans/:id/duplicate', async () => {
    mockWorkoutPlanFindByPk.mockResolvedValue({
      id: 'plan-1',
      userId: 42,
      title: 'Unsafe Original',
      durationWeeks: 26,
      metadata: unsafeMetadata(),
      planData: { weeks: [] },
    });

    const res = await auth(request(app).post('/api/workout-plans/plan-1/duplicate')).send({});

    expect(res.status).toBe(201);
    const metadata = mockWorkoutPlanCreate.mock.calls[0][0].metadata;
    expectSanitizedJson(metadata);
    expect(metadata).toMatchObject({
      planHorizon: 'six_month',
      assignmentDefault: 'trainer_session',
      isPrimaryPlan: false,
      primary: false,
      duplicatedFrom: 'plan-1',
    });
    expect(metadata.planPdf).toBeUndefined();
  });

  it('sanitizes existing metadata on PUT /api/workout-plans/:id/pdf', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mockWorkoutPlanFindByPk.mockResolvedValue({
      id: 'plan-1',
      userId: 42,
      metadata: unsafeMetadata(),
      update,
    });

    const res = await auth(request(app).put('/api/workout-plans/plan-1/pdf')).send({
      pdfUrl: '/api/workout-plans/plan-1/pdf/content.pdf',
      fileName: 'Six Month Plan.pdf',
      storage: 'r2',
      storageKey: 'workout-plans/42/plan-1-existing.pdf',
    });

    expect(res.status).toBe(200);
    const metadata = update.mock.calls[0][0].metadata;
    expectSanitizedJson(metadata);
    expect(metadata).toMatchObject({
      planHorizon: 'six_month',
      assignmentDefault: 'trainer_session',
      planPdf: { fileName: 'Six Month Plan.pdf' },
    });
  });
  it('sanitizes target and sibling metadata on PUT /api/workout-plans/:id/primary', async () => {
    const targetUpdate = vi.fn().mockResolvedValue(undefined);
    const siblingUpdate = vi.fn().mockResolvedValue(undefined);
    mockWorkoutPlanFindByPk.mockResolvedValue({
      id: 'plan-9m',
      userId: 42,
      title: 'Nine Month Plan',
      status: 'active',
      metadata: unsafeMetadata(),
      update: targetUpdate,
    });
    mockWorkoutPlanFindAll.mockResolvedValue([{
      id: 'plan-6m',
      userId: 42,
      status: 'active',
      metadata: unsafeMetadata(),
      update: siblingUpdate,
    }]);

    const res = await auth(request(app).put('/api/workout-plans/plan-9m/primary')).send({});

    expect(res.status).toBe(200);
    const targetMetadata = targetUpdate.mock.calls[0][0].metadata;
    const siblingMetadata = siblingUpdate.mock.calls[0][0].metadata;
    expectSanitizedJson(targetMetadata);
    expectSanitizedJson(siblingMetadata);
    expect(targetMetadata).toMatchObject({ isPrimaryPlan: true, primary: true });
    expect(siblingMetadata).toMatchObject({ isPrimaryPlan: false, primary: false });
  });
});