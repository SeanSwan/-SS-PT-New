/**
 * sessions.mjs admin create disclosure regression tests.
 *
 * Admin schedule creation is a production-critical workflow. Generic storage
 * failures must not leak internal service, database, or host details.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createAvailableSessions,
  createRecurringSessions,
} = vi.hoisted(() => ({
  createAvailableSessions: vi.fn(),
  createRecurringSessions: vi.fn(),
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
    sequelize: {
      Sequelize: {
        Op: {},
      },
    },
  },
}));

vi.mock('../services/sessions/session.service.mjs', () => ({
  default: {
    createAvailableSessions,
    createRecurringSessions,
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

describe('mounted sessions admin create disclosure routes', () => {
  beforeEach(() => {
    createAvailableSessions.mockReset();
    createRecurringSessions.mockReset();
  });

  it('POST /api/sessions does not disclose internal create errors', async () => {
    createAvailableSessions.mockRejectedValueOnce(
      new Error('private session create storage host')
    );

    const response = await request(app)
      .post('/api/sessions')
      .send({
        sessions: [{
          sessionDate: '2026-06-07T16:00:00.000Z',
          duration: 60,
        }],
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error creating sessions',
    });
    expect(JSON.stringify(response.body)).not.toContain('private session create');
  });

  it('POST /api/sessions/recurring does not disclose internal create errors', async () => {
    createRecurringSessions.mockRejectedValueOnce(
      new Error('private recurring create storage host')
    );

    const response = await request(app)
      .post('/api/sessions/recurring')
      .send({
        startDate: '2026-06-07',
        endDate: '2026-07-07',
        startTime: '09:00',
        duration: 60,
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error creating recurring sessions',
    });
    expect(JSON.stringify(response.body)).not.toContain('private recurring create');
  });
});
