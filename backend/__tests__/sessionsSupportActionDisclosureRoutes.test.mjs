/**
 * sessions.mjs schedule support action disclosure regression tests.
 *
 * Blocked time and rescheduling are active schedule maintenance workflows.
 * Generic failures must not expose private storage or service details.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createBlockedSessions,
  sessionFindByPk,
} = vi.hoisted(() => ({
  createBlockedSessions: vi.fn(),
  sessionFindByPk: vi.fn(),
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 7, role: 'admin' };
    next();
  },
  adminOnly: (_req, _res, next) => next(),
  trainerOrAdminOnly: (_req, _res, next) => next(),
}));

vi.mock('../models/Session.mjs', () => ({
  default: {
    findByPk: sessionFindByPk,
    sequelize: {
      Sequelize: {
        Op: {},
      },
    },
  },
}));

vi.mock('../services/sessions/session.service.mjs', () => ({
  default: {
    createBlockedSessions,
    getSessionById: vi.fn(),
    getSessions: vi.fn(),
    healthCheck: vi.fn(),
  },
}));

vi.mock('../services/conflictService.mjs', () => ({
  default: {
    checkConflicts: vi.fn(),
    findAlternatives: vi.fn(),
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

const app = express();
app.use(express.json());
app.use('/api/sessions', sessionsRouter);

describe('mounted sessions support action disclosure routes', () => {
  beforeEach(() => {
    createBlockedSessions.mockReset();
    sessionFindByPk.mockReset();
  });

  it('POST /api/sessions/block does not disclose internal block-time errors', async () => {
    createBlockedSessions.mockRejectedValueOnce(
      new Error('private blocked time storage host')
    );

    const response = await request(app)
      .post('/api/sessions/block')
      .send({
        sessionDate: '2026-06-07T16:00:00.000Z',
        duration: 60,
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error blocking time',
    });
    expect(JSON.stringify(response.body)).not.toContain('private blocked time');
  });

  it('POST /api/sessions/block does not disclose substring-matched access errors', async () => {
    createBlockedSessions.mockRejectedValueOnce(
      new Error('private admin or trainer blocked-time host')
    );

    const response = await request(app)
      .post('/api/sessions/block')
      .send({
        sessionDate: '2026-06-07T16:00:00.000Z',
        duration: 60,
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Not authorized to block time',
    });
    expect(JSON.stringify(response.body)).not.toContain('private admin');
  });

  it('POST /api/sessions/block does not disclose substring-matched invalid errors', async () => {
    createBlockedSessions.mockRejectedValueOnce(
      new Error('private invalid blocked-time payload host')
    );

    const response = await request(app)
      .post('/api/sessions/block')
      .send({
        sessionDate: '2026-06-07T16:00:00.000Z',
        duration: 60,
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid blocked time request',
    });
    expect(JSON.stringify(response.body)).not.toContain('private invalid');
  });

  it('PUT /api/sessions/:id/reschedule does not disclose internal reschedule errors', async () => {
    sessionFindByPk.mockRejectedValueOnce(new Error('private reschedule storage host'));

    const response = await request(app)
      .put('/api/sessions/42/reschedule')
      .send({ newStartTime: '2026-06-07T16:00:00.000Z' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error rescheduling session',
    });
    expect(JSON.stringify(response.body)).not.toContain('private reschedule');
  });
});
