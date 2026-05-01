/**
 * Mounted-route test for backend/routes/workoutPlanRoutes.mjs.
 *
 * Codex hostile review 2026-04-30 (post-Phase-B): the unit tests for
 * verifyClientAccess prove the helper behavior in isolation, but they do
 * not prove behavior of the live route stack which is:
 *
 *   protect -> trainerOrAdminOnly -> verifyClientAccess* -> handler
 *
 * The most important consequence is that CLIENT-role users never reach
 * verifyClientAccess on workoutPlanRoutes because trainerOrAdminOnly 403s
 * them upstream. Earlier summary text claimed "client own-plans-only" for
 * this route family — that was wrong at the mounted scope.
 *
 * This test file proves the actual mounted behavior so the claim can stand
 * (or be narrowed) on real evidence.
 *
 * Coverage:
 *   - Client (valid auth) -> 403 from trainerOrAdminOnly
 *   - Trainer + assigned client -> 200 on GET /client/:userId
 *   - Trainer + unassigned client -> 404 on GET /client/:userId
 *   - Admin (any client) -> 200 on GET /client/:userId (assertAssignmentOrAdmin bypass)
 *   - Trainer + assigned plan -> 200 on GET /:id
 *   - Trainer + plan owned by unassigned client -> 404 on GET /:id (existence-leak protection)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// ─────────────────────────────────────────────────────────────
// Module mocks (must precede SUT import).
// ─────────────────────────────────────────────────────────────

// Mock auth middleware: fake `protect` that injects req.user from headers,
// real-equivalent `trainerOrAdminOnly` that 403s clients.
vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    if (req.headers['x-test-user-id']) {
      req.user = {
        id: parseInt(req.headers['x-test-user-id'], 10),
        role: req.headers['x-test-user-role'] || 'client',
      };
    }
    next();
  },
  trainerOrAdminOnly: (req, res, next) => {
    if (req.user && (req.user.role === 'trainer' || req.user.role === 'admin')) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: 'Access denied: Trainer or Admin only',
    });
  },
}));

const mockAssignmentFindOne = vi.fn();
const mockWorkoutPlanFindByPk = vi.fn();
const mockWorkoutPlanFindAll = vi.fn();
const mockWorkoutPlanFindOne = vi.fn();

vi.mock('../models/index.mjs', () => ({
  getModel: (name) => {
    if (name === 'ClientTrainerAssignment') {
      return { findOne: mockAssignmentFindOne };
    }
    if (name === 'WorkoutPlan') {
      return {
        findByPk: mockWorkoutPlanFindByPk,
        findAll: mockWorkoutPlanFindAll,
        findOne: mockWorkoutPlanFindOne,
      };
    }
    return null;
  },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const workoutPlanRoutes = (await import('../routes/workoutPlanRoutes.mjs')).default;

const app = express();
app.use(express.json());
app.use('/api/workout-plans', workoutPlanRoutes);

beforeEach(() => {
  vi.clearAllMocks();
  // Defaults: no assignment, no plan.
  mockAssignmentFindOne.mockResolvedValue(null);
  mockWorkoutPlanFindByPk.mockResolvedValue(null);
  mockWorkoutPlanFindAll.mockResolvedValue([]);
  mockWorkoutPlanFindOne.mockResolvedValue(null);
});

describe('workoutPlanRoutes — mounted route stack', () => {

  // ─────────────────────────────────────────────────────────────
  // Critical claim narrowing: client never reaches the assignment
  // middleware because trainerOrAdminOnly fires upstream.
  // ─────────────────────────────────────────────────────────────
  describe('client role (mounted)', () => {
    it('client GET /client/42 -> 403 from trainerOrAdminOnly (does NOT reach assertAssignmentOrAdmin)', async () => {
      const res = await request(app)
        .get('/api/workout-plans/client/42')
        .set('x-test-user-id', '42')
        .set('x-test-user-role', 'client');
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Trainer or Admin/i);
      // Proof that the assignment helper was never consulted at the mounted scope.
      expect(mockAssignmentFindOne).not.toHaveBeenCalled();
      expect(mockWorkoutPlanFindByPk).not.toHaveBeenCalled();
    });

    it('client GET /:id -> 403 from trainerOrAdminOnly (no plan lookup)', async () => {
      const res = await request(app)
        .get('/api/workout-plans/some-uuid')
        .set('x-test-user-id', '42')
        .set('x-test-user-role', 'client');
      expect(res.status).toBe(403);
      expect(mockWorkoutPlanFindByPk).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Trainer assignment gate at mounted scope.
  // ─────────────────────────────────────────────────────────────
  describe('trainer role (mounted)', () => {
    it('trainer + assigned client GET /client/:userId -> reaches handler (assignment lookup fired with status=active)', async () => {
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });
      // Handler returns the active plan (or 404 if none); 200 + plan body proves
      // the handler ran past the middleware chain.
      mockWorkoutPlanFindOne.mockResolvedValue({
        id: 'plan-1',
        userId: 42,
        title: 'Active plan',
        status: 'active',
        planData: { mesocycles: [] },
      });
      const res = await request(app)
        .get('/api/workout-plans/client/42')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer');
      expect(res.status).toBe(200);
      // Assignment lookup used the real model contract
      expect(mockAssignmentFindOne).toHaveBeenCalledOnce();
      const where = mockAssignmentFindOne.mock.calls[0][0].where;
      expect(where).toEqual({ trainerId: 7, clientId: 42, status: 'active' });
      expect(where).not.toHaveProperty('isActive');
    });

    it('trainer WITHOUT assignment GET /client/:userId -> 404 (existence-leak protection)', async () => {
      mockAssignmentFindOne.mockResolvedValue(null);
      const res = await request(app)
        .get('/api/workout-plans/client/999')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer');
      expect(res.status).toBe(404);
      expect(res.status).not.toBe(403); // 404, not 403, per receipt
      // Handler never reached (middleware blocked) — findOne not called for plan
      expect(mockWorkoutPlanFindOne).not.toHaveBeenCalled();
    });

    it('trainer GET /:id where plan owned by unassigned client -> 404', async () => {
      mockWorkoutPlanFindByPk.mockResolvedValue({ id: 'plan-1', userId: 999 });
      mockAssignmentFindOne.mockResolvedValue(null); // no assignment to user 999
      const res = await request(app)
        .get('/api/workout-plans/plan-1')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer');
      expect(res.status).toBe(404);
      // Assignment was checked against plan.userId, not against the request param
      expect(mockAssignmentFindOne).toHaveBeenCalledOnce();
      const where = mockAssignmentFindOne.mock.calls[0][0].where;
      expect(where.clientId).toBe(999);
    });

    it('trainer + assigned plan GET /:id -> reaches handler', async () => {
      mockWorkoutPlanFindByPk.mockResolvedValue({
        id: 'plan-1',
        userId: 42,
        title: 'Test plan',
        status: 'active',
        planData: { mesocycles: [] },
      });
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });
      const res = await request(app)
        .get('/api/workout-plans/plan-1')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer');
      expect(res.status).toBe(200);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Admin bypass.
  // ─────────────────────────────────────────────────────────────
  describe('admin role (mounted)', () => {
    it('admin GET /client/:userId -> reaches handler WITHOUT consulting assignment model', async () => {
      // Admin should reach the handler regardless of assignment.
      // findOne returns null → handler returns 404 ("No active workout plan found")
      // which proves the handler ran (vs being blocked at the middleware layer).
      mockWorkoutPlanFindOne.mockResolvedValue(null);
      const res = await request(app)
        .get('/api/workout-plans/client/999')
        .set('x-test-user-id', '1')
        .set('x-test-user-role', 'admin');
      // 404 from the handler proves it executed; the test target is "no
      // assertAssignmentOrAdmin lookup," not the response status.
      expect([200, 404]).toContain(res.status);
      expect(mockWorkoutPlanFindOne).toHaveBeenCalledOnce();
      // Admin bypass: no SQL lookup against ClientTrainerAssignment
      expect(mockAssignmentFindOne).not.toHaveBeenCalled();
    });

    it('admin GET /:id -> reaches handler regardless of plan ownership', async () => {
      mockWorkoutPlanFindByPk.mockResolvedValue({
        id: 'plan-1',
        userId: 999,
        title: 'Some plan',
        status: 'active',
        planData: { mesocycles: [] },
      });
      const res = await request(app)
        .get('/api/workout-plans/plan-1')
        .set('x-test-user-id', '1')
        .set('x-test-user-role', 'admin');
      expect(res.status).toBe(200);
      expect(mockAssignmentFindOne).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Unauthenticated.
  // ─────────────────────────────────────────────────────────────
  describe('unauthenticated', () => {
    it('GET /client/:userId without auth -> 403 from trainerOrAdminOnly (no req.user)', async () => {
      // The faked protect middleware does not set req.user when no header is present;
      // trainerOrAdminOnly then 403s. In production, the real protect would 401 first.
      const res = await request(app).get('/api/workout-plans/client/42');
      expect(res.status).toBe(403);
    });
  });
});
