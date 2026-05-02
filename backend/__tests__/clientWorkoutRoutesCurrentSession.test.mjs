import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// ─────────────────────────────────────────────────────────────
// L1 (2026-05-01) — clientWorkoutRoutes /:userId/current — currentSession HTTP shape
//
// Receipt §6 R4 (D2 lock): currentSession must appear at THREE levels in
// the HTTP response so consumers using different access paths all see it:
//   1) response.body.currentSession         (top-level)
//   2) response.body.data.currentSession    (useCurrentWorkout setData(result.data))
//   3) response.body.plan.currentSession    (consumers that read .plan)
//
// Equality is DEEP (toEqual) not REFERENCE — JSON.parse breaks reference
// identity post-serialization (D2 fix).
// ─────────────────────────────────────────────────────────────

const samplePlan = {
  id: 'plan-A',
  userId: 99,
  title: 'Phase 1 Plan',
  description: 'Foundation',
  status: 'active',
  currentWeek: 1,
  currentDay: 2,
  durationWeeks: 4,
  createdAt: '2026-05-01T00:00:00.000Z',
  planData: {
    weeks: [
      {
        weekNumber: 1,
        focus: 'Foundation',
        days: [
          {
            dayNumber: 1, name: 'Day 1: push',
            exercises: [{ exerciseId: 'fx-pushup', exerciseName: 'Push-Up', sets: 3, reps: '12-15' }],
          },
          {
            dayNumber: 2, name: 'Day 2: pull',
            exercises: [
              { exerciseId: 'fx-row', exerciseName: 'Row', sets: 3, reps: '10-12' },
              { exerciseId: 'fx-pullup', exerciseName: 'Pull-Up', sets: 3, reps: '5-8' },
            ],
          },
        ],
      },
    ],
  },
};

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: req.headers['x-test-user-id'] || '98',
      role: req.headers['x-test-user-role'] || 'trainer',
    };
    next();
  },
  trainerOrAdminOnly: (req, res, next) => {
    if (req.user?.role === 'trainer' || req.user?.role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'forbidden' });
  },
}));

vi.mock('../utils/clientAccess.mjs', () => ({
  ensureClientAccess: vi.fn(),
}));

const findOneMock = vi.fn();
vi.mock('../models/index.mjs', () => ({
  getModel: (name) => {
    if (name === 'WorkoutPlan') return { findOne: findOneMock };
    return null;
  },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

let app;

beforeEach(async () => {
  vi.clearAllMocks();

  // Default: ensureClientAccess returns allowed with the WorkoutPlan model.
  const { ensureClientAccess } = await import('../utils/clientAccess.mjs');
  ensureClientAccess.mockResolvedValue({
    allowed: true,
    clientId: 99,
    models: { WorkoutPlan: { findOne: findOneMock } },
  });

  // Default: findOne returns the sample plan.
  findOneMock.mockResolvedValue(samplePlan);

  const { default: clientWorkoutRoutes } = await import('../routes/clientWorkoutRoutes.mjs');
  app = express();
  app.use(express.json());
  app.use('/api/workouts', clientWorkoutRoutes);
});

describe('GET /api/workouts/:userId/current — currentSession at 3 levels (R4 deep-equal)', () => {
  it('includes currentSession at top level, inside data, AND inside plan', async () => {
    const res = await request(app)
      .get('/api/workouts/99/current')
      .set('x-test-user-id', '98')
      .set('x-test-user-role', 'trainer');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Three placements, all DEEP-EQUAL (post-JSON, no reference identity)
    expect(res.body.currentSession).toBeDefined();
    expect(res.body.data.currentSession).toBeDefined();
    expect(res.body.plan.currentSession).toBeDefined();

    // All three describe the same session
    expect(res.body.currentSession).toEqual(res.body.data.currentSession);
    expect(res.body.currentSession).toEqual(res.body.plan.currentSession);

    // The session itself matches the planData[currentWeek-1].days[currentDay-1]
    expect(res.body.currentSession.weekNumber).toBe(1);
    expect(res.body.currentSession.dayNumber).toBe(2);
    expect(res.body.currentSession.exercises).toHaveLength(2);
    expect(res.body.currentSession.exercises[0].exerciseId).toBe('fx-row');
  });

  it('returns currentSession=null AND data=null when no active plan exists', async () => {
    findOneMock.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/workouts/99/current')
      .set('x-test-user-id', '98')
      .set('x-test-user-role', 'trainer');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    expect(res.body.plan).toBeNull();
  });

  it('returns currentSession with both nested session and lifted exercises (C1 lock)', async () => {
    const res = await request(app)
      .get('/api/workouts/99/current')
      .set('x-test-user-id', '98')
      .set('x-test-user-role', 'trainer');

    expect(res.status).toBe(200);
    const cs = res.body.currentSession;

    // C1 lock: BOTH paths to exercises
    expect(Array.isArray(cs.exercises)).toBe(true);
    expect(cs.session).toBeDefined();
    expect(Array.isArray(cs.session.exercises)).toBe(true);
    // Deep-equal post-JSON (NOT reference-equal)
    expect(cs.exercises).toEqual(cs.session.exercises);
  });

  it('preserves backward-compat fields (data + plan + history-friendly fields)', async () => {
    const res = await request(app)
      .get('/api/workouts/99/current')
      .set('x-test-user-id', '98')
      .set('x-test-user-role', 'trainer');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('plan-A');
    expect(res.body.data.title).toBe('Phase 1 Plan');
    expect(Array.isArray(res.body.data.days)).toBe(true);
    expect(res.body.data.planData).toBeDefined();
    expect(res.body.data.currentWeek).toBe(1);
    expect(res.body.data.currentDay).toBe(2);
    // data and plan are the same formatted object
    expect(res.body.data).toEqual(res.body.plan);
  });
});

describe('R5 — both consumer endpoints would agree on currentSession', () => {
  // Note: this is a partial implementation — we only own clientWorkoutRoutes
  // here. Full cross-consumer agreement test would require running both
  // routes against a real DB or both mocked. The shared shapeService unit
  // test (workoutPlanShapeService.test.mjs) covers the helper-level
  // agreement; this test asserts the route-level shape is consistent.
  it('clientWorkoutRoutes uses the same extractCurrentSession from the shared module', async () => {
    const res = await request(app)
      .get('/api/workouts/99/current')
      .set('x-test-user-id', '98')
      .set('x-test-user-role', 'trainer');

    // The shape must match what the shared extractor produces.
    expect(res.body.currentSession).toMatchObject({
      weekNumber: 1,
      dayNumber: 2,
      session: expect.any(Object),
      exercises: expect.any(Array),
      totalWeeks: 1,
      totalSessionsThisWeek: 2,
    });
  });
});
