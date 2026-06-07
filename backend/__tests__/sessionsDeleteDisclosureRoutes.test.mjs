/**
 * sessions.mjs admin delete disclosure regression tests.
 *
 * These tests lock the active /api/sessions delete routes to generic 500
 * responses so storage internals never leak through admin schedule failures.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  sessionFindAll,
  sessionFindByPk,
  sessionDestroy,
} = vi.hoisted(() => ({
  sessionFindAll: vi.fn(),
  sessionFindByPk: vi.fn(),
  sessionDestroy: vi.fn(),
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
    destroy: sessionDestroy,
    findAll: sessionFindAll,
    findByPk: sessionFindByPk,
    sequelize: {
      Sequelize: {
        Op: {
          in: '$in',
        },
      },
    },
  },
}));

vi.mock('../services/sessions/session.service.mjs', () => ({
  default: {
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

vi.mock('../services/realTimeScheduleService.mjs', () => ({
  default: {
    broadcastEvent: vi.fn(),
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

describe('mounted sessions admin delete disclosure routes', () => {
  beforeEach(() => {
    sessionFindAll.mockReset();
    sessionFindByPk.mockReset();
    sessionDestroy.mockReset();
  });

  it('DELETE /api/sessions/bulk does not disclose internal delete errors', async () => {
    sessionFindAll.mockRejectedValueOnce(new Error('private bulk delete storage host'));

    const response = await request(app)
      .delete('/api/sessions/bulk')
      .send({ sessionIds: [42, 43] });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error deleting sessions',
    });
    expect(JSON.stringify(response.body)).not.toContain('private bulk delete');
  });

  it('DELETE /api/sessions/:id does not disclose internal delete errors', async () => {
    sessionFindByPk.mockRejectedValueOnce(new Error('private session delete storage host'));

    const response = await request(app).delete('/api/sessions/42');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error deleting session',
    });
    expect(JSON.stringify(response.body)).not.toContain('private session delete');
  });
});
