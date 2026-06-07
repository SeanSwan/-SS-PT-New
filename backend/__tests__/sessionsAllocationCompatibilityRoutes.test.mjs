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
  checkConflicts,
  findAlternatives,
  getAllSessions,
  getScheduleStats,
  getTrainers,
  getClients,
  sessionFindAll,
  userIncrement,
  userReload,
  sessionCount,
} = vi.hoisted(() => ({
  findUserByPk: vi.fn(),
  checkConflicts: vi.fn(),
  findAlternatives: vi.fn(),
  getAllSessions: vi.fn(),
  getScheduleStats: vi.fn(),
  getTrainers: vi.fn(),
  getClients: vi.fn(),
  sessionFindAll: vi.fn(),
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
    findAll: sessionFindAll,
    sequelize: {
      Sequelize: {
        Op: {
          gt: '$gt',
          lte: '$lte',
          notIn: '$notIn',
          or: '$or',
        },
      },
    },
  },
}));

vi.mock('../services/sessions/session.service.mjs', () => ({
  default: {
    getAllSessions,
    getSessions: vi.fn(),
    getScheduleStats,
    checkConflicts: vi.fn(),
    allocateSessionsFromOrder: vi.fn(),
    getTrainers,
    getClients,
    healthCheck: vi.fn(),
  },
}));

vi.mock('../services/conflictService.mjs', () => ({
  default: {
    checkConflicts,
    findAlternatives,
  },
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
const unifiedSessionService = (await import('../services/sessions/session.service.mjs')).default;

const app = express();
app.use(express.json());
app.use('/api/sessions', sessionsRouter);

describe('mounted sessions allocation compatibility routes', () => {
  beforeEach(() => {
    findUserByPk.mockReset();
    checkConflicts.mockReset();
    findAlternatives.mockReset();
    getAllSessions.mockReset();
    getScheduleStats.mockReset();
    getTrainers.mockReset();
    getClients.mockReset();
    sessionFindAll.mockReset();
    userIncrement.mockReset();
    userReload.mockReset();
    sessionCount.mockReset();
  });

  it('GET /api/sessions does not disclose internal list errors', async () => {
    unifiedSessionService.getAllSessions.mockRejectedValueOnce(
      new Error('database hostname and schema detail')
    );

    const response = await request(app).get('/api/sessions');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error fetching sessions',
    });
    expect(JSON.stringify(response.body)).not.toContain('database hostname');
  });

  it('GET /api/sessions/stats does not disclose internal stats errors', async () => {
    unifiedSessionService.getScheduleStats.mockRejectedValueOnce(
      new Error('private schedule statistics stack')
    );

    const response = await request(app).get('/api/sessions/stats');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error fetching statistics',
    });
    expect(JSON.stringify(response.body)).not.toContain('private schedule');
  });

  it('POST /api/sessions/check-conflicts does not disclose internal conflict errors', async () => {
    checkConflicts.mockRejectedValueOnce(new Error('private conflict engine host detail'));

    const response = await request(app)
      .post('/api/sessions/check-conflicts')
      .send({
        startTime: '2026-06-07T14:00:00.000Z',
        endTime: '2026-06-07T15:00:00.000Z',
        trainerId: 7,
        clientId: 42,
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error checking conflicts',
    });
    expect(JSON.stringify(response.body)).not.toContain('private conflict engine');
  });

  it('GET /api/sessions/users/trainers does not disclose internal dropdown errors', async () => {
    unifiedSessionService.getTrainers.mockRejectedValueOnce(
      new Error('private trainer directory host detail')
    );

    const response = await request(app).get('/api/sessions/users/trainers');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error fetching trainers',
    });
    expect(JSON.stringify(response.body)).not.toContain('private trainer directory');
  });

  it('GET /api/sessions/users/clients does not disclose internal dropdown errors', async () => {
    unifiedSessionService.getClients.mockRejectedValueOnce(
      new Error('private client directory schema detail')
    );

    const response = await request(app).get('/api/sessions/users/clients');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error fetching clients',
    });
    expect(JSON.stringify(response.body)).not.toContain('private client directory');
  });

  it('GET /api/sessions/upcoming/:userId does not disclose internal client-card errors', async () => {
    sessionFindAll.mockRejectedValueOnce(new Error('private upcoming sessions shard detail'));

    const response = await request(app).get('/api/sessions/upcoming/42?limit=3');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error fetching upcoming sessions',
    });
    expect(JSON.stringify(response.body)).not.toContain('private upcoming sessions');
  });

  it('GET /api/sessions/history/:userId does not disclose internal client-card errors', async () => {
    sessionFindAll.mockRejectedValueOnce(new Error('private history sessions schema detail'));

    const response = await request(app).get('/api/sessions/history/42?limit=5');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error fetching session history',
    });
    expect(JSON.stringify(response.body)).not.toContain('private history sessions');
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
