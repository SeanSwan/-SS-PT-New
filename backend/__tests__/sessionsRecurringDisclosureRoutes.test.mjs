/**
 * sessions.mjs recurring-series disclosure regression tests.
 *
 * Recurring updates/deletes are active Universal Master Schedule actions.
 * Generic service failures must not leak storage or infrastructure details.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  updateRecurringSeries,
  deleteRecurringSeries,
} = vi.hoisted(() => ({
  updateRecurringSeries: vi.fn(),
  deleteRecurringSeries: vi.fn(),
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
    updateRecurringSeries,
    deleteRecurringSeries,
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

describe('mounted sessions recurring-series disclosure routes', () => {
  beforeEach(() => {
    updateRecurringSeries.mockReset();
    deleteRecurringSeries.mockReset();
  });

  it('PUT /api/sessions/recurring/:groupId does not disclose internal update errors', async () => {
    updateRecurringSeries.mockRejectedValueOnce(
      new Error('private recurring update storage host')
    );

    const response = await request(app)
      .put('/api/sessions/recurring/series-abc')
      .send({ duration: 45 });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error updating recurring series',
    });
    expect(JSON.stringify(response.body)).not.toContain('private recurring update');
  });

  it('DELETE /api/sessions/recurring/:groupId does not disclose internal delete errors', async () => {
    deleteRecurringSeries.mockRejectedValueOnce(
      new Error('private recurring delete storage host')
    );

    const response = await request(app).delete('/api/sessions/recurring/series-abc');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error cancelling recurring series',
    });
    expect(JSON.stringify(response.body)).not.toContain('private recurring delete');
  });
});
