/**
 * sessions.mjs booking disclosure regression tests.
 *
 * Booking is part of the client/trainer/admin core loop. Generic backend
 * failures must not leak private service, transaction, or storage details.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  bookSession,
  findUserByPk,
  sessionFindAll,
  transactionFactory,
  transactionRollback,
} = vi.hoisted(() => ({
  bookSession: vi.fn(),
  findUserByPk: vi.fn(),
  sessionFindAll: vi.fn(),
  transactionFactory: vi.fn(),
  transactionRollback: vi.fn(),
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 7, role: 'client' };
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
    findAll: sessionFindAll,
    sequelize: {
      transaction: transactionFactory,
      Sequelize: {
        Op: {
          gt: '$gt',
          in: '$in',
        },
      },
    },
  },
}));

vi.mock('../services/sessions/session.service.mjs', () => ({
  default: {
    bookSession,
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

vi.mock('../utils/notification.mjs', () => ({
  processSessionDeduction: vi.fn(),
  sendDeductionNotification: vi.fn(),
}));

vi.mock('../services/realTimeScheduleService.mjs', () => ({
  default: {
    broadcastSessionBooked: vi.fn(),
  },
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

describe('mounted sessions booking disclosure routes', () => {
  beforeEach(() => {
    bookSession.mockReset();
    findUserByPk.mockReset();
    sessionFindAll.mockReset();
    transactionFactory.mockReset();
    transactionRollback.mockReset();
    transactionFactory.mockResolvedValue({
      finished: false,
      LOCK: { UPDATE: 'UPDATE' },
      rollback: transactionRollback,
      commit: vi.fn(),
    });
  });

  it('POST /api/sessions/book/:userId does not disclose internal booking errors', async () => {
    bookSession.mockRejectedValueOnce(new Error('private direct booking service host'));

    const response = await request(app)
      .post('/api/sessions/book/7')
      .send({ sessionId: 42 });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error booking session',
    });
    expect(JSON.stringify(response.body)).not.toContain('private direct booking');
  });

  it('POST /api/sessions/book-recurring does not disclose internal recurring booking errors', async () => {
    findUserByPk.mockRejectedValueOnce(new Error('private recurring booking storage host'));

    const response = await request(app)
      .post('/api/sessions/book-recurring')
      .send({ sessionIds: [42, 43] });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error booking recurring sessions.',
    });
    expect(JSON.stringify(response.body)).not.toContain('private recurring booking');
    expect(transactionRollback).toHaveBeenCalled();
  });

  it('POST /api/sessions/:id/book does not disclose internal booking errors', async () => {
    bookSession.mockRejectedValueOnce(new Error('private session booking storage host'));

    const response = await request(app).post('/api/sessions/42/book').send({});

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error booking session',
    });
    expect(JSON.stringify(response.body)).not.toContain('private session booking');
  });
});
