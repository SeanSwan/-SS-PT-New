/**
 * ============================================================================
 * FILE: trainingPlanProjectionRoutes.test.mjs
 * PURPOSE: Prove mounted projection auth, batching, flags, and safe output.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  userFindAll: vi.fn(),
  assignmentFindAll: vi.fn(),
  planFindAll: vi.fn(),
  receiptFindAll: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, res, next) => {
    const id = Number(req.headers['x-test-user-id']);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    req.user = { id, role: req.headers['x-test-user-role'] || 'client' };
    return next();
  },
}));

vi.mock('../models/index.mjs', () => ({
  getAllModels: () => ({
    User: { findAll: mocks.userFindAll },
    ClientTrainerAssignment: { findAll: mocks.assignmentFindAll },
    WorkoutPlan: { findAll: mocks.planFindAll },
    WorkoutPlanCompletionReceipt: { findAll: mocks.receiptFindAll },
  }),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { error: mocks.loggerError, info: vi.fn(), warn: vi.fn() },
}));

const { default: projectionRoutes } = await import('../routes/trainingPlanProjectionRoutes.mjs');

const planId = '6ea7806d-36c8-4307-bd5d-6b04b68be849';
const client = (id) => ({
  id,
  role: 'client',
  timeZone: 'America/Los_Angeles',
  timeZoneConfigured: false,
});
const activePlan = {
  id: planId,
  userId: 42,
  trainerId: 7,
  title: 'Projection Route Plan',
  status: 'active',
  startDate: '2026-07-14',
  endDate: '2026-08-31',
  durationWeeks: 1,
  currentWeek: 1,
  currentDay: 1,
  contentRevision: 2,
  contentHash: 'b'.repeat(64),
  planData: {
    weeks: [{
      weekNumber: 1,
      days: [
        { dayNumber: 1, name: 'Day One', exercises: [{ exerciseName: 'Row' }] },
        { dayNumber: 2, name: 'Day Two', exercises: [{ exerciseName: 'Squat' }] },
      ],
    }],
  },
};

const buildApp = () => {
  const app = express();
  app.use('/api/training-plan-projections', projectionRoutes);
  return app;
};
const get = (role = 'client', id = 42, suffix = '') => request(buildApp())
  .get(`/api/training-plan-projections?startDate=2026-07-14&endDate=2026-07-20${suffix}`)
  .set('x-test-user-id', String(id))
  .set('x-test-user-role', role);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TRAINING_PLAN_SCHEDULE_PROJECTIONS = 'true';
  mocks.userFindAll.mockResolvedValue([client(42)]);
  mocks.assignmentFindAll.mockResolvedValue([{ clientId: 42 }]);
  mocks.planFindAll.mockResolvedValue([activePlan]);
  mocks.receiptFindAll.mockResolvedValue([]);
});

afterEach(() => {
  delete process.env.TRAINING_PLAN_SCHEDULE_PROJECTIONS;
});

describe('GET /api/training-plan-projections', () => {
  it('fails closed when the backend feature flag is disabled', async () => {
    process.env.TRAINING_PLAN_SCHEDULE_PROJECTIONS = 'false';
    const response = await get();

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      code: 'TRAINING_PLAN_PROJECTIONS_DISABLED',
      message: 'Training plan projections are unavailable',
    });
    expect(mocks.userFindAll).not.toHaveBeenCalled();
    expect(mocks.planFindAll).not.toHaveBeenCalled();
  });

  it('allows client self-read and emits a separate non-billing projection layer', async () => {
    const response = await get().set('X-Client-Timezone', 'Asia/Tokyo');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      page: 1,
      limit: 100,
      total: 2,
      hasMore: false,
      range: { startDate: '2026-07-14', endDate: '2026-07-20' },
    });
    expect(response.body.items[0]).toMatchObject({
      kind: 'training_plan_projection',
      source: 'training_plan',
      billingImpact: 'none',
      readOnly: true,
      clientId: 42,
      timeZone: 'Asia/Tokyo',
    });
    expect(response.body.items[0]).not.toHaveProperty('sessionId');
    expect(response.body.items[0]).not.toHaveProperty('credits');
    expect(mocks.assignmentFindAll).not.toHaveBeenCalled();
    expect(mocks.userFindAll).toHaveBeenCalledOnce();
    expect(mocks.planFindAll).toHaveBeenCalledOnce();
    expect(mocks.receiptFindAll).toHaveBeenCalledOnce();
  });

  it('rejects client cross-account reads before any database query', async () => {
    const response = await get('client', 42, '&clientIds=43');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('TRAINING_PLAN_PROJECTION_FORBIDDEN');
    expect(mocks.userFindAll).not.toHaveBeenCalled();
    expect(mocks.planFindAll).not.toHaveBeenCalled();
  });

  it('rejects a trainer plural request unless every client is actively assigned', async () => {
    mocks.assignmentFindAll.mockResolvedValue([{ clientId: 42 }]);
    const response = await get('trainer', 7, '&clientIds=42,43');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('TRAINING_PLAN_PROJECTION_FORBIDDEN');
    expect(mocks.assignmentFindAll).toHaveBeenCalledOnce();
    expect(mocks.userFindAll).not.toHaveBeenCalled();
    expect(mocks.planFindAll).not.toHaveBeenCalled();
  });

  it('batches an authorized trainer roster into one plan and one receipt query', async () => {
    mocks.assignmentFindAll.mockResolvedValue([{ clientId: 42 }, { clientId: 43 }]);
    mocks.userFindAll.mockResolvedValue([client(42), client(43)]);
    mocks.planFindAll.mockResolvedValue([
      activePlan,
      { ...activePlan, id: '79d3d711-28c8-4e72-9e49-2a726b10fda9', userId: 43 },
    ]);
    const response = await get('trainer', 7, '&clientIds=42,43');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(4);
    expect(mocks.assignmentFindAll).toHaveBeenCalledOnce();
    expect(mocks.userFindAll).toHaveBeenCalledOnce();
    expect(mocks.planFindAll).toHaveBeenCalledOnce();
    expect(mocks.receiptFindAll).toHaveBeenCalledOnce();
  });

  it('supports pagination after deterministic projection sorting', async () => {
    const response = await get('admin', 1, '&clientIds=42&page=2&limit=1');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 2, limit: 1, total: 2, hasMore: false });
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].dayNumber).toBe(2);
    expect(mocks.assignmentFindAll).not.toHaveBeenCalled();
  });

  it('rejects invalid dates before database work', async () => {
    const response = await request(buildApp())
      .get('/api/training-plan-projections?startDate=2026-02-30&endDate=2026-03-01')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('TRAINING_PLAN_PROJECTION_DATE_INVALID');
    expect(mocks.userFindAll).not.toHaveBeenCalled();
  });

  it('does not leak internal database errors', async () => {
    mocks.planFindAll.mockRejectedValue(new Error('private database hostname and SQL detail'));
    const response = await get();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      code: 'TRAINING_PLAN_PROJECTION_FAILED',
      message: 'Failed to load training plan projections',
    });
    expect(JSON.stringify(response.body)).not.toContain('hostname');
    expect(mocks.loggerError).toHaveBeenCalledOnce();
  });
});
describe('GET /api/training-plan-projections hostile access audit', () => {
  it('requires an explicit client scope for staff requests', async () => {
    const response = await get('trainer', 7);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('TRAINING_PLAN_PROJECTION_CLIENT_IDS_REQUIRED');
    expect(mocks.assignmentFindAll).not.toHaveBeenCalled();
    expect(mocks.userFindAll).not.toHaveBeenCalled();
    expect(mocks.planFindAll).not.toHaveBeenCalled();
  });

  it('treats the legacy user role as client self, not staff', async () => {
    const response = await get('user', 42);

    expect(response.status).toBe(200);
    expect(response.body.items[0].clientId).toBe(42);
    expect(mocks.assignmentFindAll).not.toHaveBeenCalled();
  });

  it('ignores a staff browser time zone and keeps the client account zone', async () => {
    const response = await get('admin', 1, '&clientIds=42')
      .set('X-Client-Timezone', 'Asia/Tokyo');

    expect(response.status).toBe(200);
    expect(response.body.items[0].timeZone).toBe('America/Los_Angeles');
  });

  it('queries only active plans and omits private plan columns', async () => {
    const response = await get();

    expect(response.status).toBe(200);
    const options = mocks.planFindAll.mock.calls[0][0];
    expect(options.where.status).toBe('active');
    expect(options.attributes).toContain('planData');
    expect(options.attributes).not.toContain('metadata');
    expect(options.attributes).not.toContain('progressNotes');
    expect(options.attributes).not.toContain('description');
  });
});