import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// ─────────────────────────────────────────────────────────────
// Regression test for the workoutBuilderRoutes::verifyClientAccess
// trainer-assignment guard.
//
// Codex BLOCKER 2026-04-30: the original raw SQL queried
// "ClientTrainerAssignments"."isActive" = true (non-existent table/column),
// causing every trainer to be denied access. This file adds focused tests
// that would FAIL against the obsolete SQL and PASS against the model-contract
// fix using getModel('ClientTrainerAssignment').findOne({ ..., status: 'active' }).
// ─────────────────────────────────────────────────────────────

const mockAssignmentFindOne = vi.fn();

vi.mock('../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => {
    if (req.headers['x-test-user-id']) {
      req.user = {
        id: parseInt(req.headers['x-test-user-id'], 10),
        role: req.headers['x-test-user-role'] || 'trainer',
      };
    } else {
      req.user = { id: 99, role: 'admin' };
    }
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

vi.mock('../services/workoutBuilderService.mjs', () => ({
  generateWorkout: vi.fn().mockResolvedValue({ ok: true }),
  generatePlan: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

// CRITICAL: mock getModel('ClientTrainerAssignment').findOne to capture call shape.
// If the production code regresses to raw SQL, mockAssignmentFindOne will not be
// called and the trainer-success test will fail.
vi.mock('../models/index.mjs', () => ({
  getModel: (name) => {
    if (name === 'ClientTrainerAssignment') {
      return { findOne: mockAssignmentFindOne };
    }
    return null;
  },
}));

const workoutBuilderRoutes = (await import('../routes/workoutBuilderRoutes.mjs')).default;

const app = express();
app.use(express.json());
app.use('/api/workout-builder', workoutBuilderRoutes);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('workoutBuilderRoutes::verifyClientAccess - model contract regression', () => {
  it('admin bypasses without consulting the assignment model', async () => {
    await request(app)
      .post('/api/workout-builder/generate')
      .send({ clientId: 1, category: 'full_body' })
      .set('x-test-user-id', '99')
      .set('x-test-user-role', 'admin');
    expect(mockAssignmentFindOne).not.toHaveBeenCalled();
  });

  it('trainer with active assignment passes - exercises real model contract', async () => {
    // CRITICAL: this assertion would FAIL against the obsolete raw SQL because
    // the obsolete code never invokes the model. This proves the fix is in.
    mockAssignmentFindOne.mockResolvedValue({ id: 'assignment-1', status: 'active' });
    const res = await request(app)
      .post('/api/workout-builder/generate')
      .send({ clientId: 42, category: 'full_body' })
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer');
    // Service is mocked to succeed; we just need to confirm the assignment
    // check did not 403 the request.
    expect(res.status).not.toBe(403);
    expect(mockAssignmentFindOne).toHaveBeenCalledOnce();
    const where = mockAssignmentFindOne.mock.calls[0][0].where;
    expect(where).toEqual({ trainerId: 7, clientId: 42, status: 'active' });
  });

  it('trainer assignment uses status=active, NOT isActive', async () => {
    // REGRESSION: pre-fix bug used "isActive" = true (non-existent column).
    // This test specifically asserts the where clause uses status, not isActive.
    mockAssignmentFindOne.mockResolvedValue({ id: 'a-1' });
    await request(app)
      .post('/api/workout-builder/plan')
      .send({ clientId: 42, durationWeeks: 12, primaryGoal: 'hypertrophy' })
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer');
    const where = mockAssignmentFindOne.mock.calls[0][0].where;
    expect(where).toHaveProperty('status', 'active');
    expect(where).not.toHaveProperty('isActive');
  });

  it('trainer without assignment returns 403', async () => {
    mockAssignmentFindOne.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/workout-builder/generate')
      .send({ clientId: 999, category: 'full_body' })
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer');
    expect(res.status).toBe(403);
  });

  it('trainer with model.findOne throwing fails closed (denies)', async () => {
    mockAssignmentFindOne.mockRejectedValue(new Error('connection lost'));
    const res = await request(app)
      .post('/api/workout-builder/plan')
      .send({ clientId: 42, durationWeeks: 12, primaryGoal: 'hypertrophy' })
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer');
    expect(res.status).toBe(403);
  });
});
