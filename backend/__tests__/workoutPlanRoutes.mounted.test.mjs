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
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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
const mockWorkoutPlanUpdate = vi.fn();

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
        update: mockWorkoutPlanUpdate,
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

let routeUploadsRoot;

beforeEach(async () => {
  vi.clearAllMocks();
  routeUploadsRoot = await mkdtemp(path.join(os.tmpdir(), 'swan-workout-plan-route-'));
  process.env.SWAN_WORKOUT_PLAN_UPLOAD_ROOT = routeUploadsRoot;
  // Defaults: no assignment, no plan.
  mockAssignmentFindOne.mockResolvedValue(null);
  mockWorkoutPlanFindByPk.mockResolvedValue(null);
  mockWorkoutPlanFindAll.mockResolvedValue([]);
  mockWorkoutPlanFindOne.mockResolvedValue(null);
  mockWorkoutPlanUpdate.mockResolvedValue([0]);
});

afterEach(async () => {
  delete process.env.SWAN_WORKOUT_PLAN_UPLOAD_ROOT;
  if (routeUploadsRoot) {
    await rm(routeUploadsRoot, { recursive: true, force: true });
  }
  routeUploadsRoot = undefined;
});

describe('workoutPlanRoutes — mounted route stack', () => {
  describe('list filters', () => {
    it('admin GET /?clientId=42junk -> 400 and never queries plans', async () => {
      const res = await request(app)
        .get('/api/workout-plans?clientId=42junk')
        .set('x-test-user-id', '1')
        .set('x-test-user-role', 'admin');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/clientId/i);
      expect(mockWorkoutPlanFindAll).not.toHaveBeenCalled();
    });

    it('admin GET /?trainerId=7junk -> 400 and never queries plans', async () => {
      const res = await request(app)
        .get('/api/workout-plans?trainerId=7junk')
        .set('x-test-user-id', '1')
        .set('x-test-user-role', 'admin');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/trainerId/i);
      expect(mockWorkoutPlanFindAll).not.toHaveBeenCalled();
    });
  });

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
      const activePlan = {
        id: 'plan-1',
        userId: 42,
        title: 'Active plan',
        status: 'active',
        durationWeeks: 26,
        currentWeek: 1,
        currentDay: 1,
        metadata: { planHorizon: 'six_month' },
        planData: {
          weeks: [{
            days: [{
              dayLabel: 'Coach Homework',
              assignmentType: 'homework',
              exercises: [{ exerciseName: 'Goblet Squat' }],
            }],
          }],
        },
      };
      mockWorkoutPlanFindOne.mockResolvedValue(activePlan);
      mockWorkoutPlanFindAll.mockResolvedValue([activePlan]);
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
      expect(res.body.todayAssignment).toMatchObject({
        assignmentType: 'homework',
        sessionType: 'solo',
        isLoggable: true,
        shouldDeductSession: false,
        exerciseCount: 1,
      });
      expect(res.body.trainingPlanCatalog).toMatchObject({
        defaultHorizonKey: 'six_month',
        primaryPlanId: 'plan-1',
      });
      expect(res.body.trainingPlanCatalog.slots).toHaveLength(7);
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

    it('trainer + assigned plan PUT /:id/pdf stores sanitized PDF metadata without replacing existing metadata', async () => {
      const update = vi.fn().mockResolvedValue(undefined);
      mockWorkoutPlanFindByPk.mockResolvedValue({
        id: 'plan-1',
        userId: 42,
        title: 'Six Month Plan',
        status: 'active',
        metadata: { planHorizon: 'six_month', painAware: true },
        update,
      });
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });

      const res = await request(app)
        .put('/api/workout-plans/plan-1/pdf')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer')
        .send({
          pdfUrl: ' https://cdn.swanstudios.com/plans/six-month-foundation.pdf ',
          fileName: ' Six Month Foundation.pdf ',
        });

      expect(res.status).toBe(200);
      expect(update).toHaveBeenCalledWith({
        metadata: {
          planHorizon: 'six_month',
          painAware: true,
          planPdf: {
            url: 'https://cdn.swanstudios.com/plans/six-month-foundation.pdf',
            fileName: 'Six Month Foundation.pdf',
            contentType: 'application/pdf',
            updatedBy: 7,
            updatedAt: expect.any(String),
          },
        },
      });
      expect(res.body.planPdf).toMatchObject({
        url: 'https://cdn.swanstudios.com/plans/six-month-foundation.pdf',
        fileName: 'Six Month Foundation.pdf',
        contentType: 'application/pdf',
      });
    });

    it('trainer + assigned plan PUT /:id/pdf rejects non-PDF, insecure, or ambiguous URLs', async () => {
      mockWorkoutPlanFindByPk.mockResolvedValue({
        id: 'plan-1',
        userId: 42,
        metadata: {},
        update: vi.fn(),
      });
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });

      const unsafeUrls = [
        'javascript:alert(1)',
        'http://cdn.swanstudios.com/plans/plain-http.pdf',
        'plans/bare-relative.pdf',
        '//cdn.swanstudios.com/plans/protocol-relative.pdf',
        'https://cdn.swanstudios.com/plans/not-a-pdf.txt',
        '/uploads/workout-plans/plan-1.pdf\r\n',
      ];

      for (const pdfUrl of unsafeUrls) {
        const res = await request(app)
          .put('/api/workout-plans/plan-1/pdf')
          .set('x-test-user-id', '7')
          .set('x-test-user-role', 'trainer')
          .send({ pdfUrl, fileName: 'Plan.pdf' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/pdf url/i);
      }
    });

    it('trainer + assigned plan PUT /:id/pdf allows root-relative app PDF URLs', async () => {
      const update = vi.fn().mockResolvedValue(undefined);
      mockWorkoutPlanFindByPk.mockResolvedValue({
        id: 'plan-1',
        userId: 42,
        metadata: {},
        update,
      });
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });

      const res = await request(app)
        .put('/api/workout-plans/plan-1/pdf')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer')
        .send({ pdfUrl: '/uploads/workout-plans/plan-1.pdf?download=1', fileName: 'Plan 1' });

      expect(res.status).toBe(200);
      expect(update).toHaveBeenCalledWith({
        metadata: {
          planPdf: {
            url: '/uploads/workout-plans/plan-1.pdf?download=1',
            fileName: 'Plan 1.pdf',
            contentType: 'application/pdf',
            updatedBy: 7,
            updatedAt: expect.any(String),
          },
        },
      });
    });

    it('trainer + assigned plan POST /:id/pdf/upload stores a multipart PDF as plan metadata', async () => {
      const update = vi.fn().mockResolvedValue(undefined);
      mockWorkoutPlanFindByPk.mockResolvedValue({
        id: 'plan-1',
        userId: 42,
        title: 'Six Month Plan',
        metadata: { planHorizon: 'six_month', painAware: true },
        update,
      });
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });

      const res = await request(app)
        .post('/api/workout-plans/plan-1/pdf/upload')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer')
        .attach(
          'pdf',
          Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n'),
          { filename: 'Six Month Foundation.pdf', contentType: 'application/pdf' },
        );

      expect(res.status).toBe(200);
      expect(update).toHaveBeenCalledWith({
        metadata: {
          planHorizon: 'six_month',
          painAware: true,
          planPdf: expect.objectContaining({
            url: '/api/workout-plans/plan-1/pdf/content.pdf',
            fileName: 'Six Month Foundation.pdf',
            contentType: 'application/pdf',
            storage: 'local',
            storageKey: expect.stringMatching(/^workout-plans\/42\/plan-1-/),
            size: expect.any(Number),
            updatedBy: 7,
            updatedAt: expect.any(String),
          }),
        },
      });
      expect(res.body.planPdf).toMatchObject({
        url: '/api/workout-plans/plan-1/pdf/content.pdf',
        fileName: 'Six Month Foundation.pdf',
        contentType: 'application/pdf',
        storage: 'local',
      });
    });

    it('trainer + assigned plan GET /:id/pdf/content.pdf streams the stored local PDF after access checks', async () => {
      const storageKey = 'workout-plans/42/plan-1-upload.pdf';
      await mkdir(path.join(routeUploadsRoot, 'workout-plans', '42'), { recursive: true });
      await writeFile(
        path.join(routeUploadsRoot, storageKey),
        Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n'),
      );

      mockWorkoutPlanFindByPk.mockResolvedValue({
        id: 'plan-1',
        userId: 42,
        title: 'Six Month Plan',
        metadata: {
          planPdf: {
            url: '/api/workout-plans/plan-1/pdf/content.pdf',
            fileName: 'Six Month Foundation.pdf',
            contentType: 'application/pdf',
            storage: 'local',
            storageKey,
          },
        },
      });
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });

      const res = await request(app)
        .get('/api/workout-plans/plan-1/pdf/content.pdf')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer');

      expect(res.status).toBe(200);
      expect(mockAssignmentFindOne).toHaveBeenCalledOnce();
      expect(res.headers['content-type']).toMatch(/^application\/pdf/);
      expect(res.headers['content-disposition']).toMatch(/inline/);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('trainer + assigned plan PUT /:id/primary marks only that plan as the primary client arc', async () => {
      const targetUpdate = vi.fn().mockResolvedValue(undefined);
      const siblingUpdate = vi.fn().mockResolvedValue(undefined);
      mockWorkoutPlanFindByPk.mockResolvedValue({
        id: 'plan-9m',
        userId: 42,
        title: 'Nine Month Plan',
        metadata: { planHorizon: 'nine_month', isPrimaryPlan: false, painAware: true },
        update: targetUpdate,
      });
      mockWorkoutPlanFindAll.mockResolvedValue([
        {
          id: 'plan-6m',
          userId: 42,
          metadata: { planHorizon: 'six_month', isPrimaryPlan: true },
          update: siblingUpdate,
        },
      ]);
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });

      const res = await request(app)
        .put('/api/workout-plans/plan-9m/primary')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer');

      expect(res.status).toBe(200);
      expect(targetUpdate).toHaveBeenCalledWith({
        metadata: { planHorizon: 'nine_month', isPrimaryPlan: true, painAware: true },
      });
      expect(siblingUpdate).toHaveBeenCalledWith({
        metadata: { planHorizon: 'six_month', isPrimaryPlan: false },
      });
      expect(res.body.trainingPlanCatalog).toMatchObject({
        primaryPlanId: 'plan-9m',
        primaryHorizonKey: 'nine_month',
      });
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
