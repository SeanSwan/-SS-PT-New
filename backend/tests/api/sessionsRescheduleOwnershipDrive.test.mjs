/**
 * Launch audit lane 5 — dry-loop round 1 (2026-08-03).
 *
 * NEW VANTAGE: the companion test (sessionsRescheduleOwnership.test.mjs) only
 * asserts on route SOURCE. Source assertions cannot prove the guard actually
 * runs, returns 403, and blocks the write/notification at runtime. This file
 * BOOTS the real router and drives PUT /api/sessions/:id/reschedule as an
 * attacking trainer, an owning trainer, and an admin.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sessionFindByPk, sessionUpdate, createNotificationMock, checkConflictsMock, getSessionByIdMock } =
  vi.hoisted(() => ({
    sessionFindByPk: vi.fn(),
    sessionUpdate: vi.fn(),
    createNotificationMock: vi.fn(),
    checkConflictsMock: vi.fn(),
    getSessionByIdMock: vi.fn(),
  }));

const currentUser = { id: '7', role: 'trainer' };

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...currentUser }; next(); },
  adminOnly: (_req, _res, next) => next(),
  trainerOrAdminOnly: (req, res, next) =>
    (req.user?.role === 'trainer' || req.user?.role === 'admin')
      ? next()
      : res.status(403).json({ success: false }),
}));

vi.mock('../../models/Session.mjs', () => ({ default: { findByPk: sessionFindByPk } }));
vi.mock('../../models/SessionType.mjs', () => ({ default: {} }));
vi.mock('../../models/User.mjs', () => ({ default: {} }));
vi.mock('../../models/AdminAccountAuditLog.mjs', () => ({ default: {} }));
vi.mock('../../models/index.mjs', () => ({
  getOrder: () => ({}), getOrderItem: () => ({}), getStorefrontItem: () => ({}),
}));
vi.mock('../../services/sessions/session.service.mjs', () => ({
  default: { getSessionById: getSessionByIdMock },
}));
vi.mock('../../services/conflictService.mjs', () => ({
  default: { checkConflicts: checkConflictsMock, findAlternatives: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../services/TrainerAssignmentService.mjs', () => ({ default: {} }));
vi.mock('../../services/sessionBillingPolicy.mjs', () => ({ isNonDeductingClient: () => false }));
vi.mock('../../services/sessionAnalyticsFavoriteExercisesService.mjs', () => ({
  getSessionAnalyticsFavoriteExercises: vi.fn(),
}));
vi.mock('../../controllers/notificationController.mjs', () => ({
  createNotification: createNotificationMock,
}));
vi.mock('../../utils/cancellationPricing.mjs', () => ({ getClientPackagePricing: vi.fn() }));
vi.mock('../../services/sessions/sessionCancellationReviewService.mjs', () => ({
  recordCancellationBillingDecision: vi.fn(),
}));
vi.mock('../../services/realTimeScheduleService.mjs', () => ({
  default: { broadcastEvent: vi.fn(), broadcastSessionRequest: vi.fn() },
}));
vi.mock('../../utils/notification.mjs', () => ({
  processSessionDeduction: vi.fn(), sendDeductionNotification: vi.fn(),
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const sessionsRouter = (await import('../../routes/sessions.mjs')).default;

const VICTIM_TRAINER_ID = 99;
const ATTACKER_TRAINER_ID = 7;

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/sessions', sessionsRouter);
  return app;
};

const makeSession = (trainerId) => ({
  id: 4242,
  userId: 555,              // the victim client
  trainerId,
  duration: 60,
  notifyClient: true,
  update: sessionUpdate,
});

describe('PUT /api/sessions/:id/reschedule — driven at runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser.id = String(ATTACKER_TRAINER_ID);
    currentUser.role = 'trainer';
    checkConflictsMock.mockResolvedValue([]);
    getSessionByIdMock.mockResolvedValue({ id: 4242 });
    sessionUpdate.mockResolvedValue(undefined);
    // The route calls createNotification(...).catch(...) — the mock must be
    // thenable or the allow-path 500s inside the notification tail.
    createNotificationMock.mockResolvedValue(undefined);
  });

  it('403s a trainer who does not own the session, and writes nothing', async () => {
    sessionFindByPk.mockResolvedValue(makeSession(VICTIM_TRAINER_ID));

    await request(makeApp())
      .put('/api/sessions/4242/reschedule')
      .send({ newStartTime: '2026-09-01T17:00:00.000Z' })
      .expect(403);

    expect(sessionUpdate).not.toHaveBeenCalled();
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it('403s the ownership-theft attempt (body trainerId pointing at the attacker)', async () => {
    sessionFindByPk.mockResolvedValue(makeSession(VICTIM_TRAINER_ID));

    await request(makeApp())
      .put('/api/sessions/4242/reschedule')
      .send({ newStartTime: '2026-09-01T17:00:00.000Z', trainerId: ATTACKER_TRAINER_ID })
      .expect(403);

    expect(sessionUpdate).not.toHaveBeenCalled();
  });

  it('lets the owning trainer reschedule, but ignores a body trainerId', async () => {
    sessionFindByPk.mockResolvedValue(makeSession(ATTACKER_TRAINER_ID));

    await request(makeApp())
      .put('/api/sessions/4242/reschedule')
      .send({ newStartTime: '2026-09-01T17:00:00.000Z', trainerId: VICTIM_TRAINER_ID })
      .expect(200);

    expect(sessionUpdate).toHaveBeenCalledTimes(1);
    // Ownership must stay with the real owner, never the body value.
    expect(sessionUpdate.mock.calls[0][0].trainerId).toBe(ATTACKER_TRAINER_ID);
  });

  it('still lets an admin reassign the trainer deliberately', async () => {
    currentUser.id = '1';
    currentUser.role = 'admin';
    sessionFindByPk.mockResolvedValue(makeSession(VICTIM_TRAINER_ID));

    await request(makeApp())
      .put('/api/sessions/4242/reschedule')
      .send({ newStartTime: '2026-09-01T17:00:00.000Z', trainerId: 12345 })
      .expect(200);

    expect(sessionUpdate.mock.calls[0][0].trainerId).toBe(12345);
  });

  it('string JWT ids still match numeric trainer columns (no type-drift bypass)', async () => {
    currentUser.id = '7';                       // protect() sets ids as STRINGS
    sessionFindByPk.mockResolvedValue(makeSession(7)); // column is a NUMBER

    await request(makeApp())
      .put('/api/sessions/4242/reschedule')
      .send({ newStartTime: '2026-09-01T17:00:00.000Z' })
      .expect(200);

    expect(sessionUpdate).toHaveBeenCalledTimes(1);
  });

  it('does not let a trainer touch an unassigned (trainerId null) session', async () => {
    sessionFindByPk.mockResolvedValue(makeSession(null));

    await request(makeApp())
      .put('/api/sessions/4242/reschedule')
      .send({ newStartTime: '2026-09-01T17:00:00.000Z' })
      .expect(403);

    expect(sessionUpdate).not.toHaveBeenCalled();
  });
});
