/**
 * sessions.mjs compatibility endpoint regression tests.
 *
 * The canonical admin session allocation UI still calls the legacy
 * /api/sessions/add-to-user and /api/sessions/user-summary/:userId paths.
 * These tests lock those paths onto the mounted unified sessions router.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findUserByPk,
  userIncrement,
  userReload,
  sessionCount,
} = vi.hoisted(() => ({
  findUserByPk: vi.fn(),
  userIncrement: vi.fn(),
  userReload: vi.fn(),
  sessionCount: vi.fn(),
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 7, role: 'admin' };
    next();
  },
  adminOnly: (_req, _res, next) => next(),
  trainerOrAdminOnly: (_req, _res, next) => next(),
}));

vi.mock('../models/User.mjs', () => ({
  default: {
    findByPk: findUserByPk,
  },
}));

vi.mock('../models/Session.mjs', () => ({
  default: {
    count: sessionCount,
  },
}));

vi.mock('../services/sessions/session.service.mjs', () => ({
  default: {
    getSessions: vi.fn(),
    getScheduleStats: vi.fn(),
    checkConflicts: vi.fn(),
    allocateSessionsFromOrder: vi.fn(),
    getTrainers: vi.fn(),
    getClients: vi.fn(),
    healthCheck: vi.fn(),
  },
}));

vi.mock('../services/conflictService.mjs', () => ({
  default: {},
}));

vi.mock('../services/TrainerAssignmentService.mjs', () => ({
  default: {
    healthCheck: vi.fn(),
  },
}));

vi.mock('../controllers/notificationController.mjs', () => ({
  createNotification: vi.fn(),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const sessionsRouter = (await import('../routes/sessions.mjs')).default;

const app = express();
app.use(express.json());
app.use('/api/sessions', sessionsRouter);

describe('mounted sessions allocation compatibility routes', () => {
  beforeEach(() => {
    findUserByPk.mockReset();
    userIncrement.mockReset();
    userReload.mockReset();
    sessionCount.mockReset();
  });

  it('POST /api/sessions/add-to-user adds credits on the mounted router', async () => {
    findUserByPk.mockResolvedValue({
      id: 42,
      firstName: 'Client',
      lastName: 'One',
      availableSessions: 10,
      increment: userIncrement,
      reload: userReload,
    });

    const response = await request(app)
      .post('/api/sessions/add-to-user')
      .send({ userId: 42, sessionCount: 8, reason: 'Regression test' });

    expect(response.status).toBe(200);
    expect(userIncrement).toHaveBeenCalledWith('availableSessions', { by: 8 });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        userId: 42,
        added: 8,
        availableSessions: 10,
      },
    });
  });

  it('GET /api/sessions/user-summary/:userId returns availableSessions from User', async () => {
    findUserByPk.mockResolvedValue({
      id: 42,
      availableSessions: 12,
    });
    sessionCount
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);

    const response = await request(app).get('/api/sessions/user-summary/42');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        userId: 42,
        available: 12,
        scheduled: 2,
        completed: 3,
        cancelled: 1,
        total: 18,
      },
    });
  });
});
