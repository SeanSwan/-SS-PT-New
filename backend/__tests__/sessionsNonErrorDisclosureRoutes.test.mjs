/**
 * sessions.mjs non-Error disclosure regression tests.
 *
 * Hostile-review coverage for service failures that reject strings instead of
 * Error instances. Route handlers must still classify safely and never expose
 * raw service/storage text to dashboard clients.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  allocateSessionsFromOrder,
  assignTrainer,
  cancelSession,
  completeSession,
  confirmSession,
  getClients,
  getSessionById,
} = vi.hoisted(() => ({
  allocateSessionsFromOrder: vi.fn(),
  assignTrainer: vi.fn(),
  cancelSession: vi.fn(),
  completeSession: vi.fn(),
  confirmSession: vi.fn(),
  getClients: vi.fn(),
  getSessionById: vi.fn(),
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

vi.mock('../models/User.mjs', () => ({
  default: {
    findByPk: vi.fn(),
  },
}));

vi.mock('../models/index.mjs', () => ({
  getOrder: vi.fn(),
  getOrderItem: vi.fn(),
  getStorefrontItem: vi.fn(),
}));

vi.mock('../services/sessions/session.service.mjs', () => ({
  default: {
    allocateSessionsFromOrder,
    assignTrainer,
    cancelSession,
    completeSession,
    confirmSession,
    getClients,
    getSessionById,
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
    broadcastAllocationUpdated: vi.fn(),
    broadcastSessionRequest: vi.fn(),
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

const unsafeText = (response) => JSON.stringify(response.body);

describe('mounted sessions non-Error disclosure routes', () => {
  beforeEach(() => {
    allocateSessionsFromOrder.mockReset();
    assignTrainer.mockReset();
    cancelSession.mockReset();
    completeSession.mockReset();
    confirmSession.mockReset();
    getClients.mockReset();
    getSessionById.mockReset();
  });

  it('GET /api/sessions/users/clients safely handles string privilege failures', async () => {
    getClients.mockRejectedValueOnce('private privileges required storage host');

    const response = await request(app).get('/api/sessions/users/clients');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Trainer or admin privileges required',
    });
    expect(unsafeText(response)).not.toContain('private privileges');
  });

  it('GET /api/sessions/:id safely handles string permission failures', async () => {
    getSessionById.mockRejectedValueOnce('private permission lookup host');

    const response = await request(app).get('/api/sessions/42');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Not authorized to view this session',
    });
    expect(unsafeText(response)).not.toContain('private permission');
  });

  it('PATCH /api/sessions/:id/cancel safely handles string permission failures', async () => {
    cancelSession.mockRejectedValueOnce('private permission storage host');

    const response = await request(app).patch('/api/sessions/42/cancel').send({});

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Not authorized to cancel this session',
    });
    expect(unsafeText(response)).not.toContain('private permission');
  });

  it('PATCH /api/sessions/:id/confirm safely handles string privilege failures', async () => {
    confirmSession.mockRejectedValueOnce('private privileges required storage host');

    const response = await request(app).patch('/api/sessions/42/confirm').send({});

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Not authorized to confirm this session',
    });
    expect(unsafeText(response)).not.toContain('private privileges');
  });

  it('PATCH /api/sessions/:id/complete safely handles string privilege failures', async () => {
    completeSession.mockRejectedValueOnce('private can only complete storage host');

    const response = await request(app).patch('/api/sessions/42/complete').send({});

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Not authorized to complete this session',
    });
    expect(unsafeText(response)).not.toContain('private can only complete');
  });

  it('PATCH /api/sessions/:id/assign safely handles string validation failures', async () => {
    assignTrainer.mockRejectedValueOnce('private required trainer storage host');

    const response = await request(app).patch('/api/sessions/42/assign').send({ trainerId: 9 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Required assignment field missing',
    });
    expect(unsafeText(response)).not.toContain('private required');
  });

  it('POST /api/sessions/allocate safely handles string order failures', async () => {
    allocateSessionsFromOrder.mockRejectedValueOnce('private order not completed storage host');

    const response = await request(app)
      .post('/api/sessions/allocate')
      .send({ orderId: 10, userId: 7 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Order not found or not completed',
    });
    expect(unsafeText(response)).not.toContain('private order');
  });
});
