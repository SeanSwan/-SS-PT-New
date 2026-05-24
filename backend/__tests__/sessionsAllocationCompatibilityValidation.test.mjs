import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findUserByPk,
  userIncrement,
  userReload,
  broadcastAllocationUpdated,
} = vi.hoisted(() => ({
  findUserByPk: vi.fn(),
  userIncrement: vi.fn(),
  userReload: vi.fn(),
  broadcastAllocationUpdated: vi.fn(),
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
    count: vi.fn(),
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

vi.mock('../services/realTimeScheduleService.mjs', () => ({
  default: {
    broadcastAllocationUpdated,
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

describe('mounted sessions allocation compatibility validation', () => {
  beforeEach(() => {
    findUserByPk.mockReset();
    userIncrement.mockReset();
    userReload.mockReset();
    broadcastAllocationUpdated.mockReset();
  });

  it('rejects manual additions above the UI cap before incrementing balances', async () => {
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
      .send({ userId: 42, sessionCount: 51, reason: 'Oversized manual add' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Session count must be between 1 and 50',
    });
    expect(findUserByPk).not.toHaveBeenCalled();
    expect(userIncrement).not.toHaveBeenCalled();
  });

  it('rejects non-integer session counts instead of parseInt coercing them', async () => {
    const response = await request(app)
      .post('/api/sessions/add-to-user')
      .send({ userId: 42, sessionCount: '2abc', reason: 'Malformed manual add' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'User ID and positive session count are required',
    });
    expect(findUserByPk).not.toHaveBeenCalled();
    expect(userIncrement).not.toHaveBeenCalled();
  });

  it('broadcasts successful manual additions to real-time allocation listeners', async () => {
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
      .send({ userId: 42, sessionCount: 8, reason: 'Admin correction' });

    expect(response.status).toBe(200);
    expect(broadcastAllocationUpdated).toHaveBeenCalledWith({
      userId: 42,
      sessionsAdded: 8,
      sessionsRemaining: 10,
      packageType: 'Manual Addition',
      reason: 'Admin correction',
      allocatedBy: 7,
    });
  });

  it('does not fail the balance update if the real-time broadcast fails', async () => {
    findUserByPk.mockResolvedValue({
      id: 42,
      firstName: 'Client',
      lastName: 'One',
      availableSessions: 10,
      increment: userIncrement,
      reload: userReload,
    });
    broadcastAllocationUpdated.mockRejectedValueOnce(new Error('socket offline'));

    const response = await request(app)
      .post('/api/sessions/add-to-user')
      .send({ userId: 42, sessionCount: 8, reason: 'Admin correction' });

    expect(response.status).toBe(200);
    expect(userIncrement).toHaveBeenCalledWith('availableSessions', { by: 8 });
    expect(broadcastAllocationUpdated).toHaveBeenCalledTimes(1);
  });
});
