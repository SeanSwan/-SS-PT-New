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
const mockWorkoutPlanCreate = vi.fn();
const mockDailyWorkoutFormFindAll = vi.fn();
const mockSequelizeTransaction = vi.fn();
let mockTransactionInstance;

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
        create: mockWorkoutPlanCreate,
      };
    }
    if (name === 'DailyWorkoutForm') {
      return { findAll: mockDailyWorkoutFormFindAll };
    }
    return null;
  },
}));

vi.mock('../database.mjs', () => ({
  default: {
    transaction: (...args) => mockSequelizeTransaction(...args),
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
  mockWorkoutPlanCreate.mockResolvedValue({ id: 'plan-copy-1' });
  mockDailyWorkoutFormFindAll.mockResolvedValue([]);
  mockTransactionInstance = {
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    LOCK: { UPDATE: 'UPDATE' },
  };
  mockSequelizeTransaction.mockResolvedValue(mockTransactionInstance);
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
    it('trainer + assigned client POST / creates an unspecified-status plan as draft', async () => {
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });

      const res = await request(app)
        .post('/api/workout-plans')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer')
        .send({
          userId: 42,
          title: 'Coach Review Draft',
          durationWeeks: 4,
          planData: { weeks: [] },
        });

      expect(res.status).toBe(201);
      expect(mockWorkoutPlanCreate).toHaveBeenCalledWith(expect.objectContaining({
        userId: 42,
        trainerId: 7,
        title: 'Coach Review Draft',
        durationWeeks: 4,
        status: 'draft',
      }));
    });

    it('trainer + assigned client POST / cannot bypass activation by sending active status', async () => {
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });

      const res = await request(app)
        .post('/api/workout-plans')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer')
        .send({
          userId: 42,
          title: 'Direct Active Bypass Attempt',
          durationWeeks: 4,
          status: 'active',
          planData: { weeks: [] },
        });

      expect(res.status).toBe(201);
      expect(mockWorkoutPlanCreate).toHaveBeenCalledWith(expect.objectContaining({
        userId: 42,
        trainerId: 7,
        title: 'Direct Active Bypass Attempt',
        durationWeeks: 4,
        status: 'draft',
      }));
    });

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

    it('trainer + assigned client GET /client/:userId returns plan catalog when no active plan exists', async () => {
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });
      const draftPlan = {
        id: 'plan-8w-draft',
        userId: 42,
        title: 'Eight Week Strength Ramp',
        status: 'draft',
        durationWeeks: 8,
        currentWeek: 1,
        currentDay: 1,
        metadata: {},
        planData: { weeks: [] },
      };
      mockWorkoutPlanFindOne.mockResolvedValue(null);
      mockWorkoutPlanFindAll.mockResolvedValue([draftPlan]);

      const res = await request(app)
        .get('/api/workout-plans/client/42')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        plan: null,
        currentSession: null,
        todayAssignment: {
          assignmentType: 'none',
          sessionType: 'solo',
          isLoggable: false,
          shouldDeductSession: false,
        },
        trainingPlanCatalog: {
          defaultHorizonKey: 'six_month',
          primaryPlanId: 'plan-8w-draft',
          primaryHorizonKey: 'three_month',
          filledHorizonKeys: ['three_month'],
        },
      });
      expect(res.body.trainingPlanCatalog.slots).toHaveLength(7);
      expect(res.body.trainingPlanCatalog.slots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            horizonKey: 'three_month',
            isFilled: true,
            isPrimary: true,
            plan: expect.objectContaining({
              id: 'plan-8w-draft',
              horizonKey: 'three_month',
              durationWeeks: 8,
            }),
          }),
        ]),
      );
      expect(mockWorkoutPlanFindAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 42, status: ['active', 'paused', 'draft'] },
      }));
    });

    it('trainer + assigned client GET /client/:userId overlays logged planned-assignment completion and homework summary', async () => {
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });
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
      mockDailyWorkoutFormFindAll.mockResolvedValue([{
        id: 'form-1',
        date: '2026-06-07',
        formData: {
          plannedAssignment: {
            assignmentKey: 'plan-1:w1:d1:homework',
            assignmentType: 'homework',
            title: 'ClientNameMustNotLeak Homework',
            weekNumber: 1,
            dayNumber: 1,
            dayLabel: 'ClientNameMustNotLeak Homework',
            exerciseCount: 1,
            firstExerciseName: 'Goblet Squat',
          },
        },
        submittedAt: '2026-06-07T15:00:00.000Z',
      }]);

      const res = await request(app)
        .get('/api/workout-plans/client/42')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer');

      expect(res.status).toBe(200);
      expect(mockDailyWorkoutFormFindAll).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          clientId: 42,
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        },
      }));
      expect(res.body.todayAssignment).toMatchObject({
        assignmentKey: 'plan-1:w1:d1:homework',
        status: 'completed',
        isLoggable: false,
        ctaLabel: 'Review Workout',
        completion: {
          source: 'daily_workout_form',
          formId: 'form-1',
          completedAt: '2026-06-07T15:00:00.000Z',
        },
      });
      expect(res.body.homeworkSummary).toMatchObject({
        assignmentType: 'homework',
        todayStatus: 'completed',
        todayIsCompleted: true,
        todayIsLoggable: false,
        recentCompletedCount: 1,
        recentCompletions: [
          expect.objectContaining({
            assignmentType: 'homework',
            weekNumber: 1,
            dayNumber: 1,
            exerciseCount: 1,
            firstExerciseName: 'Goblet Squat',
          }),
        ],
      });
      expect(JSON.stringify(res.body.homeworkSummary)).not.toContain('ClientNameMustNotLeak');
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

    it('trainer + assigned plan PUT /:id merges plan-use metadata without dropping existing PDF or flags', async () => {
      const update = vi.fn().mockResolvedValue(undefined);
      mockWorkoutPlanFindByPk.mockResolvedValue({
        id: 'plan-1',
        userId: 42,
        title: 'Legacy saved plan',
        status: 'draft',
        metadata: {
          planHorizon: 'three_month',
          painAware: true,
          planPdf: {
            url: '/api/workout-plans/plan-1/pdf/content.pdf',
            fileName: 'Legacy Plan.pdf',
          },
        },
        update,
      });
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });

      const res = await request(app)
        .put('/api/workout-plans/plan-1')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer')
        .send({
          durationWeeks: 26,
          metadata: {
            planHorizon: 'six_month',
            assignmentDefault: 'trainer_session',
            billingIntent: 'trainer_led_scheduled_flow',
            defaultShouldDeductSession: false,
          },
        });

      expect(res.status).toBe(200);
      expect(update).toHaveBeenCalledWith(expect.objectContaining({
        durationWeeks: 26,
        metadata: {
          planHorizon: 'six_month',
          painAware: true,
          planPdf: {
            url: '/api/workout-plans/plan-1/pdf/content.pdf',
            fileName: 'Legacy Plan.pdf',
          },
          assignmentDefault: 'trainer_session',
          billingIntent: 'trainer_led_scheduled_flow',
          defaultShouldDeductSession: false,
        },
      }));
    });

    it('trainer + assigned plan PUT /:id/advance follows explicit numbered week/day cursors', async () => {
      const update = vi.fn().mockResolvedValue(undefined);
      mockWorkoutPlanFindByPk.mockResolvedValue({
        id: 'plan-1',
        userId: 42,
        title: 'Sparse Arc',
        status: 'active',
        currentWeek: 2,
        currentDay: 3,
        planData: {
          weeks: [{
            weekNumber: 2,
            days: [
              { dayNumber: 3, name: 'Sparse Homework', exercises: [{ exerciseName: 'Step-Up' }] },
              { dayNumber: 5, name: 'Next Numbered Day', exercises: [{ exerciseName: 'Row' }] },
            ],
          }],
        },
        update,
      });
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });

      const res = await request(app)
        .put('/api/workout-plans/plan-1/advance')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer')
        .send({ trainerNotes: 'Clean tempo' });

      expect(res.status).toBe(200);
      expect(update).toHaveBeenCalledWith(expect.objectContaining({
        currentWeek: 2,
        currentDay: 5,
        status: 'active',
      }));
      const updatePayload = update.mock.calls[0][0];
      expect(updatePayload.planData.weeks[0].days[0]).toMatchObject({
        completed: true,
        trainerNotes: 'Clean tempo',
      });
      expect(res.body.previousSession).toEqual({ week: 2, day: 3 });
      expect(res.body.planCompleted).toBe(false);
      expect(res.body.nextSession).toMatchObject({
        weekNumber: 2,
        dayNumber: 5,
        dayLabel: 'Next Numbered Day',
      });
    });

    it('trainer + assigned plan PUT /:id/advance supports top-level planData.days', async () => {
      const update = vi.fn().mockResolvedValue(undefined);
      mockWorkoutPlanFindByPk.mockResolvedValue({
        id: 'plan-1',
        userId: 42,
        title: 'Top Level Arc',
        status: 'active',
        currentWeek: 1,
        currentDay: 2,
        durationWeeks: 1,
        planData: {
          days: [
            { dayNumber: 1, name: 'Prep Day', exercises: [] },
            { dayNumber: 2, name: 'Top-Level Homework', exercises: [{ exerciseName: 'Dead Bug' }] },
            { dayNumber: 4, name: 'Next Top-Level Day', exercises: [{ exerciseName: 'Carry' }] },
          ],
        },
        update,
      });
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });

      const res = await request(app)
        .put('/api/workout-plans/plan-1/advance')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer');

      expect(res.status).toBe(200);
      const updatePayload = update.mock.calls[0][0];
      expect(updatePayload).toMatchObject({
        currentWeek: 1,
        currentDay: 4,
        status: 'active',
      });
      expect(updatePayload.planData.days[1]).toMatchObject({ completed: true });
      expect(res.body.nextSession).toMatchObject({
        weekNumber: 1,
        dayNumber: 4,
        dayLabel: 'Next Top-Level Day',
      });
    });

    it('trainer + assigned plan PUT /:id/pdf renames an existing protected PDF without replacing existing metadata', async () => {
      const update = vi.fn().mockResolvedValue(undefined);
      mockWorkoutPlanFindByPk.mockResolvedValue({
        id: 'plan-1',
        userId: 42,
        title: 'Six Month Plan',
        status: 'active',
        metadata: {
          planHorizon: 'six_month',
          painAware: true,
          planPdf: {
            url: '/api/workout-plans/plan-1/pdf/content.pdf',
            fileName: 'Old Plan.pdf',
            contentType: 'application/pdf',
            storage: 'r2',
            storageKey: 'workout-plans/42/plan-1-existing.pdf',
            size: 123,
          },
        },
        update,
      });
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });

      const res = await request(app)
        .put('/api/workout-plans/plan-1/pdf')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer')
        .send({
          pdfUrl: '/api/workout-plans/plan-1/pdf/content.pdf',
          fileName: ' Six Month Foundation.pdf ',
        });

      expect(res.status).toBe(200);
      expect(update).toHaveBeenCalledWith({
        metadata: {
          planHorizon: 'six_month',
          painAware: true,
          planPdf: {
            url: '/api/workout-plans/plan-1/pdf/content.pdf',
            fileName: 'Six Month Foundation.pdf',
            contentType: 'application/pdf',
            storage: 'r2',
            storageKey: 'workout-plans/42/plan-1-existing.pdf',
            size: 123,
            updatedBy: 7,
            updatedAt: expect.any(String),
          },
        },
      });
      expect(res.body.planPdf).toMatchObject({
        url: '/api/workout-plans/plan-1/pdf/content.pdf',
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
        'https://cdn.swanstudios.com/plans/public-plan.pdf',
        'plans/bare-relative.pdf',
        '//cdn.swanstudios.com/plans/protocol-relative.pdf',
        'https://cdn.swanstudios.com/plans/not-a-pdf.txt',
        '/uploads/workout-plans/plan-1.pdf',
        '/uploads/workout-plans/plan-1.pdf\r\n',
        '/api/workout-plans/other-plan/pdf/content.pdf',
        '/api/workout-plans/plan-1/pdf/content.pdf?download=1',
      ];

      for (const pdfUrl of unsafeUrls) {
        const res = await request(app)
          .put('/api/workout-plans/plan-1/pdf')
          .set('x-test-user-id', '7')
          .set('x-test-user-role', 'trainer')
          .send({ pdfUrl, fileName: 'Plan.pdf' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/protected app pdf url|storage key/i);
      }
    });

    it('trainer + assigned plan PUT /:id/pdf attaches an existing private R2 key behind the app proxy', async () => {
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
        .send({
          pdfUrl: '/api/workout-plans/plan-1/pdf/content.pdf',
          fileName: 'Plan 1',
          storage: 'r2',
          storageKey: 'workout-plans/42/plan-1-imported-plan.pdf',
        });

      expect(res.status).toBe(200);
      expect(update).toHaveBeenCalledWith({
        metadata: {
          planPdf: {
            url: '/api/workout-plans/plan-1/pdf/content.pdf',
            fileName: 'Plan 1.pdf',
            contentType: 'application/pdf',
            storage: 'r2',
            storageKey: 'workout-plans/42/plan-1-imported-plan.pdf',
            updatedBy: 7,
            updatedAt: expect.any(String),
          },
        },
      });
    });

    it('trainer + assigned plan PUT /:id/pdf rejects a private key scoped to a different plan', async () => {
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
        .send({
          pdfUrl: '/api/workout-plans/plan-1/pdf/content.pdf',
          fileName: 'Plan 1',
          storage: 'r2',
          storageKey: 'workout-plans/42/plan-2-imported-plan.pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/storage key/i);
      expect(update).not.toHaveBeenCalled();
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
        metadata: { planHorizon: 'nine_month', isPrimaryPlan: false, primary: false, painAware: true },
        update: targetUpdate,
      });
      mockWorkoutPlanFindAll.mockResolvedValue([
        {
          id: 'plan-6m',
          userId: 42,
          metadata: { planHorizon: 'six_month', isPrimaryPlan: true, primary: true },
          update: siblingUpdate,
        },
      ]);
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });

      const res = await request(app)
        .put('/api/workout-plans/plan-9m/primary')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer');

      expect(res.status).toBe(200);
      expect(mockSequelizeTransaction).toHaveBeenCalledOnce();
      expect(targetUpdate).toHaveBeenCalledWith({
        metadata: { planHorizon: 'nine_month', isPrimaryPlan: true, primary: true, painAware: true },
      }, { transaction: mockTransactionInstance });
      expect(siblingUpdate).toHaveBeenCalledWith({
        metadata: { planHorizon: 'six_month', isPrimaryPlan: false, primary: false },
      }, { transaction: mockTransactionInstance });
      expect(mockTransactionInstance.commit).toHaveBeenCalledOnce();
      expect(mockTransactionInstance.rollback).not.toHaveBeenCalled();
      expect(res.body.trainingPlanCatalog).toMatchObject({
        primaryPlanId: 'plan-9m',
        primaryHorizonKey: 'nine_month',
      });
    });

    it('trainer + assigned plan POST /:id/duplicate preserves plan-use metadata without copying stale PDF or primary state', async () => {
      mockWorkoutPlanFindByPk.mockResolvedValue({
        id: 'plan-1',
        userId: 42,
        title: 'Six Month Strength Arc',
        description: 'Trainer-led plan',
        nasmPhase: 2,
        durationWeeks: 26,
        currentWeek: 3,
        currentDay: 2,
        planData: {
          assignmentDefaults: {
            defaultAssignmentType: 'trainer_session',
            billingIntent: 'trainer_led_scheduled_flow',
            shouldDeductSession: false,
          },
          weeks: [{ weekNumber: 1, sessions: [] }],
        },
        metadata: {
          planHorizon: 'six_month',
          assignmentDefault: 'trainer_session',
          billingIntent: 'trainer_led_scheduled_flow',
          defaultShouldDeductSession: false,
          isPrimaryPlan: true,
          primary: true,
          planPdf: {
            url: '/api/workout-plans/plan-1/pdf/content.pdf',
            fileName: 'Six Month Strength Arc.pdf',
          },
        },
      });
      mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });

      const res = await request(app)
        .post('/api/workout-plans/plan-1/duplicate')
        .set('x-test-user-id', '7')
        .set('x-test-user-role', 'trainer')
        .send({});

      expect(res.status).toBe(201);
      expect(mockWorkoutPlanCreate).toHaveBeenCalledWith(expect.objectContaining({
        userId: 42,
        trainerId: 7,
        status: 'draft',
        currentWeek: 1,
        currentDay: 1,
        progressNotes: [],
        metadata: expect.objectContaining({
          planHorizon: 'six_month',
          assignmentDefault: 'trainer_session',
          billingIntent: 'trainer_led_scheduled_flow',
          defaultShouldDeductSession: false,
          isPrimaryPlan: false,
          primary: false,
          duplicatedFrom: 'plan-1',
          copiedFromClientId: 42,
          targetClientId: 42,
          copyHorizonWeeks: 26,
        }),
      }));
      const duplicatePayload = mockWorkoutPlanCreate.mock.calls[0][0];
      expect(duplicatePayload.metadata.planPdf).toBeUndefined();
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
