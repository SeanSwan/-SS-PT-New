/**
 * sessions.mjs detail-modal disclosure regression tests.
 *
 * Attendance, feedback, cancellation warning, and package-price routes power
 * the Universal Master Schedule detail modal. Generic failures must not expose
 * private storage, transaction, or pricing internals.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  sessionFindByPk,
  transactionFactory,
} = vi.hoisted(() => ({
  sessionFindByPk: vi.fn(),
  transactionFactory: vi.fn(),
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
      transaction: transactionFactory,
      Sequelize: {
        Op: {},
      },
    },
  },
}));

vi.mock('../services/sessions/session.service.mjs', () => ({
  default: {
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

vi.mock('../utils/notification.mjs', () => ({
  processSessionDeduction: vi.fn(),
  sendDeductionNotification: vi.fn(),
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

describe('mounted sessions detail disclosure routes', () => {
  beforeEach(() => {
    sessionFindByPk.mockReset();
    transactionFactory.mockReset();
  });

  it('PATCH /api/sessions/:id/attendance does not disclose internal attendance errors', async () => {
    transactionFactory.mockRejectedValueOnce(new Error('private attendance transaction host'));

    const response = await request(app)
      .patch('/api/sessions/42/attendance')
      .send({ attendanceStatus: 'present' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error recording attendance',
    });
    expect(JSON.stringify(response.body)).not.toContain('private attendance');
  });

  it('POST /api/sessions/:id/feedback does not disclose internal feedback errors', async () => {
    sessionFindByPk.mockRejectedValueOnce(new Error('private feedback storage host'));

    const response = await request(app)
      .post('/api/sessions/42/feedback')
      .send({ rating: 5, comment: 'Great session' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error submitting feedback',
    });
    expect(JSON.stringify(response.body)).not.toContain('private feedback');
  });

  it('GET /api/sessions/:id/cancel-warning does not disclose internal policy errors', async () => {
    sessionFindByPk.mockRejectedValueOnce(new Error('private cancellation policy host'));

    const response = await request(app).get('/api/sessions/42/cancel-warning');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error checking cancellation policy',
    });
    expect(JSON.stringify(response.body)).not.toContain('private cancellation policy');
  });

  it('GET /api/sessions/:id/client-package-price does not disclose internal pricing errors', async () => {
    sessionFindByPk.mockRejectedValueOnce(new Error('private package pricing host'));

    const response = await request(app).get('/api/sessions/42/client-package-price');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error fetching package price',
    });
    expect(JSON.stringify(response.body)).not.toContain('private package pricing');
  });
});
