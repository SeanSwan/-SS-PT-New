/**
 * PDF auto-attach pin — blueprint S6 verification (feature shipped
 * 2026-07-14 @ 41d07423d..de31a5b91; this test PINS it, it does not rebuild).
 * POST /api/workout-plans with planData must come back with
 * plan.metadata.planPdf attached (route → refreshWorkoutPlanPdfAttachment →
 * plan.update). PDF build + storage leaves are mocked; the route and the
 * attachment service run REAL.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreate, mockStorePdf, mockTransaction, transactionInstance } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockStorePdf: vi.fn(),
  mockTransaction: vi.fn(),
  transactionInstance: { LOCK: { UPDATE: 'UPDATE' } },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 7, role: 'admin' }; next(); },
  trainerOrAdminOnly: (_req, _res, next) => next(),
}));
vi.mock('../../database.mjs', () => ({
  default: {
    query: vi.fn(),
    QueryTypes: {},
    transaction: (...args) => mockTransaction(...args),
  },
}));
vi.mock('../../models/index.mjs', () => ({
  getModel: vi.fn((name) => (name === 'WorkoutPlan'
    ? { create: mockCreate, findOne: vi.fn() }
    : { findOne: vi.fn() })),
}));
// Read-model/service imports unrelated to the create path stay inert.
vi.mock('../../services/workoutPlanShapeService.mjs', () => ({ extractCurrentSession: vi.fn() }));
vi.mock('../../services/clientTrainingReadModelService.mjs', () => ({ buildClientTrainingOverview: vi.fn() }));
vi.mock('../../services/clientTrainingAssignmentCompletionService.mjs', () => ({ readAssignmentCompletionContext: vi.fn() }));
vi.mock('../../services/clientTrainingPlanProgressService.mjs', () => ({ advancePlanDataCursor: vi.fn() }));
// PDF leaves: build + brand + storage are mocked; the attachment service runs REAL.
vi.mock('../../services/workoutPlanServerPdfService.mjs', () => ({
  buildWorkoutPlanPdfFile: vi.fn(async () => ({ buffer: Buffer.from('%PDF-fake'), fileName: 'plan.pdf', mimetype: 'application/pdf' })),
}));
vi.mock('../../services/workoutPlanExerciseGuideService.mjs', () => ({
  resolveWorkoutPlanPdfBrandForClient: vi.fn(async () => 'swanstudios'),
  buildWorkoutPlanExerciseGuideLines: vi.fn(async () => []),
}));
vi.mock('../../services/workoutPlanPdfStorageService.mjs', async (importOriginal) => ({
  ...(await importOriginal()),
  storeWorkoutPlanPdf: mockStorePdf,
}));

const workoutPlanRoutes = (await import('../../routes/workoutPlanRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/workout-plans', workoutPlanRoutes);
  return app;
}

const PLAN_DATA = {
  days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Leg Press', sets: 3, reps: 12 }] }],
};

describe('POST /api/workout-plans PDF auto-attach pin (blueprint S6)', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockStorePdf.mockReset();
    mockTransaction.mockReset();
    mockTransaction.mockImplementation(async (callback) => callback(transactionInstance));
  });

  it('returns the created plan with metadata.planPdf attached', async () => {
    const planRecord = {
      id: 501,
      userId: 84,
      trainerId: 7,
      title: 'Leg Day Plan',
      durationWeeks: 4,
      nasmPhase: 2,
      planData: PLAN_DATA,
      metadata: {},
      update: vi.fn(async function update(fields) { Object.assign(this, fields); return this; }),
    };
    mockCreate.mockResolvedValue(planRecord);
    mockStorePdf.mockResolvedValue({
      url: '/uploads/workout-plans/plan-501.pdf',
      fileName: 'plan-501.pdf',
      uploadedAt: '2026-07-14T00:00:00.000Z',
    });

    const response = await request(makeApp())
      .post('/api/workout-plans')
      .send({ userId: 84, title: 'Leg Day Plan', nasmPhase: 2, planData: PLAN_DATA })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        contentRevision: 1,
        contentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      { transaction: transactionInstance },
    );
    expect(response.body.plan.metadata.planPdf).toMatchObject({
      url: '/uploads/workout-plans/plan-501.pdf',
      fileName: 'plan-501.pdf',
    });
    expect(mockStorePdf).toHaveBeenCalledWith(expect.objectContaining({ planId: 501, clientId: 84 }));
    expect(planRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ planPdf: expect.any(Object) }),
    }));
  });

  it('stays non-fatal: a PDF storage failure still creates the plan (no planPdf)', async () => {
    const planRecord = {
      id: 502, userId: 84, trainerId: 7, title: 'Plan', durationWeeks: 4,
      planData: PLAN_DATA, metadata: {}, update: vi.fn(),
    };
    mockCreate.mockResolvedValue(planRecord);
    mockStorePdf.mockRejectedValue(new Error('R2 down'));

    const response = await request(makeApp())
      .post('/api/workout-plans')
      .send({ userId: 84, title: 'Plan', planData: PLAN_DATA })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.plan.metadata?.planPdf).toBeUndefined();
  });
});
