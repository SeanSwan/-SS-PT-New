/**
 * ============================================================================
 * FILE: workoutPlanPdfAutoAttach.test.mjs
 * PURPOSE: Prove canonical create commits one derivative request, never a PDF.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
  storePdf: vi.fn(),
}));
const transaction = { LOCK: { UPDATE: 'UPDATE' } };

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 7, role: 'admin' }; next(); },
  trainerOrAdminOnly: (_req, _res, next) => next(),
}));
vi.mock('../../database.mjs', () => ({
  default: {
    query: (...args) => mocks.query(...args),
    transaction: (...args) => mocks.transaction(...args),
  },
}));
vi.mock('../../models/index.mjs', () => ({
  getModel: vi.fn((name) => (name === 'WorkoutPlan'
    ? { create: mocks.create, findOne: vi.fn() }
    : { findOne: vi.fn() })),
  getWorkoutPlan: vi.fn(() => ({ create: mocks.create, findOne: vi.fn() })),
}));
vi.mock('../../services/workoutPlanShapeService.mjs', () => ({ extractCurrentSession: vi.fn() }));
vi.mock('../../services/clientTrainingReadModelService.mjs', () => ({ buildClientTrainingOverview: vi.fn() }));
vi.mock('../../services/clientTrainingAssignmentCompletionService.mjs', () => ({ readAssignmentCompletionContext: vi.fn() }));
vi.mock('../../services/clientTrainingPlanProgressService.mjs', () => ({ advancePlanDataCursor: vi.fn() }));
vi.mock('../../services/workoutPlanPdfStorageService.mjs', async (importOriginal) => ({
  ...(await importOriginal()),
  storeWorkoutPlanPdf: mocks.storePdf,
}));

const workoutPlanRoutes = (await import('../../routes/workoutPlanRoutes.mjs')).default;
const app = express();
app.use(express.json());
app.use('/api/workout-plans', workoutPlanRoutes);

const PLAN_DATA = {
  weeks: [{ days: [{ exercises: [{ exerciseName: 'Leg Press', sets: 3, reps: 12 }] }] }],
};

const planRecord = (id) => ({
  id,
  userId: 84,
  trainerId: 7,
  title: 'Leg Day Plan',
  durationWeeks: 4,
  nasmPhase: 2,
  status: 'draft',
  planData: PLAN_DATA,
  metadata: {},
});

describe('POST /api/workout-plans PDF derivative request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback(transaction));
    mocks.create.mockImplementation(async (values) => ({ ...planRecord('plan-501'), ...values }));
    mocks.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT "clientSource"')) {
        return [[{ clientSource: 'swanstudios' }]];
      }
      if (sql.includes('INSERT INTO workout_plan_pdf_derivatives')) {
        return [[{
          id: 'job-501',
          state: 'pending',
          source_type: 'generated',
          source_revision: 1,
          source_hash: 'a'.repeat(64),
          render_hash: 'b'.repeat(64),
          renderer_version: 'swan-plan-pdf-v1',
          needs_review: false,
        }]];
      }
      return [[], {}];
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('queues exactly one server derivative inside the plan transaction', async () => {
    vi.stubEnv('TRAINING_PLAN_PDF_DERIVATIVES', 'true');

    const response = await request(app)
      .post('/api/workout-plans')
      .send({ userId: 84, title: 'Leg Day Plan', nasmPhase: 2, planData: PLAN_DATA })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      pdfDerivative: {
        enabled: true,
        id: 'job-501',
        state: 'pending',
        sourceType: 'generated',
        sourceRevision: 1,
      },
    });
    const outboxCall = mocks.query.mock.calls.find(([sql]) => (
      sql.includes('INSERT INTO workout_plan_pdf_derivatives')
    ));
    expect(outboxCall).toBeTruthy();
    expect(outboxCall[1].transaction).toBe(transaction);
    expect(mocks.create.mock.calls[0][1]).toEqual({ transaction });
    expect(mocks.storePdf).not.toHaveBeenCalled();
  });

  it('returns explicit legacy mode for the one-upload browser rollback path', async () => {
    vi.stubEnv('TRAINING_PLAN_PDF_DERIVATIVES', 'false');

    const response = await request(app)
      .post('/api/workout-plans')
      .send({ userId: 84, title: 'Leg Day Plan', planData: PLAN_DATA })
      .expect(201);

    expect(response.body.pdfDerivative).toEqual({ enabled: false, state: 'legacy' });
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.storePdf).not.toHaveBeenCalled();
  });
});
