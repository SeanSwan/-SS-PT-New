/**
 * sessions.mjs admin/request/allocation disclosure regression tests.
 *
 * These endpoints power analytics, custom session requests, cancellation
 * review, and paid-session allocation. Generic failures must not expose
 * private storage, model, or service details.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  allocateSessionsFromOrder,
  favoriteExercises,
  sessionFindAll,
  sessionFindAndCountAll,
  userFindByPk,
} = vi.hoisted(() => ({
  allocateSessionsFromOrder: vi.fn(),
  favoriteExercises: vi.fn(),
  sessionFindAll: vi.fn(),
  sessionFindAndCountAll: vi.fn(),
  userFindByPk: vi.fn(),
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
    findByPk: userFindByPk,
  },
}));

vi.mock('../models/Session.mjs', () => ({
  default: {
    count: vi.fn(),
    findAll: sessionFindAll,
    findAndCountAll: sessionFindAndCountAll,
    sequelize: {
      Sequelize: {
        Op: {},
      },
    },
  },
}));

vi.mock('../services/sessionAnalyticsFavoriteExercisesService.mjs', () => ({
  getSessionAnalyticsFavoriteExercises: favoriteExercises,
}));

vi.mock('../services/sessions/session.service.mjs', () => ({
  default: {
    allocateSessionsFromOrder,
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

describe('mounted sessions admin/request/allocation disclosure routes', () => {
  beforeEach(() => {
    allocateSessionsFromOrder.mockReset();
    favoriteExercises.mockReset();
    sessionFindAll.mockReset();
    sessionFindAndCountAll.mockReset();
    userFindByPk.mockReset();
  });

  it('GET /api/sessions/analytics does not disclose internal analytics errors', async () => {
    favoriteExercises.mockRejectedValueOnce(new Error('private analytics database host'));

    const response = await request(app).get('/api/sessions/analytics');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error fetching analytics',
    });
    expect(JSON.stringify(response.body)).not.toContain('private analytics');
  });

  it('POST /api/sessions/request does not disclose internal request errors', async () => {
    userFindByPk.mockRejectedValueOnce(new Error('private request storage host'));

    const response = await request(app)
      .post('/api/sessions/request')
      .send({ start: '2027-06-08T16:00:00.000Z' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error creating session request',
    });
    expect(JSON.stringify(response.body)).not.toContain('private request');
  });

  it('GET /api/sessions/admin/cancelled does not disclose internal cancelled-session errors', async () => {
    sessionFindAndCountAll.mockRejectedValueOnce(new Error('private cancelled queue host'));

    const response = await request(app).get('/api/sessions/admin/cancelled');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error fetching cancelled sessions',
    });
    expect(JSON.stringify(response.body)).not.toContain('private cancelled');
  });

  it('POST /api/sessions/allocate-from-order does not disclose allocation service errors', async () => {
    allocateSessionsFromOrder.mockRejectedValueOnce(new Error('private allocation order host'));

    const response = await request(app)
      .post('/api/sessions/allocate-from-order')
      .send({ orderId: 10, userId: 7 });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Failed to allocate sessions from order',
    });
    expect(JSON.stringify(response.body)).not.toContain('private allocation');
  });

  it('POST /api/sessions/add-to-user does not disclose manual allocation errors', async () => {
    userFindByPk.mockRejectedValueOnce(new Error('private manual allocation host'));

    const response = await request(app)
      .post('/api/sessions/add-to-user')
      .send({ userId: 7, sessionCount: 2 });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Failed to add sessions',
    });
    expect(JSON.stringify(response.body)).not.toContain('private manual allocation');
  });

  it('GET /api/sessions/user-summary/:userId does not disclose summary errors', async () => {
    userFindByPk.mockRejectedValueOnce(new Error('private user summary host'));

    const response = await request(app).get('/api/sessions/user-summary/7');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Failed to get session summary',
    });
    expect(JSON.stringify(response.body)).not.toContain('private user summary');
  });

  it('POST /api/sessions/allocate does not disclose legacy allocation errors', async () => {
    allocateSessionsFromOrder.mockRejectedValueOnce(new Error('private legacy allocation host'));

    const response = await request(app)
      .post('/api/sessions/allocate')
      .send({ orderId: 10, userId: 7 });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error allocating sessions',
    });
    expect(JSON.stringify(response.body)).not.toContain('private legacy allocation');
  });

  it('POST /api/sessions/allocate does not disclose substring-matched order errors', async () => {
    allocateSessionsFromOrder.mockRejectedValueOnce(new Error('private order not completed storage host'));

    const response = await request(app)
      .post('/api/sessions/allocate')
      .send({ orderId: 10, userId: 7 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Order not found or not completed',
    });
    expect(JSON.stringify(response.body)).not.toContain('private order');
  });
});
