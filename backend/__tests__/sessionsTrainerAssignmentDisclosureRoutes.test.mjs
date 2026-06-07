/**
 * sessions.mjs trainer-assignment disclosure regression tests.
 *
 * These compatibility endpoints are used by the admin schedule surface for
 * trainer/client assignment management. Generic failures must not expose
 * private service, storage, or deployment details to dashboard clients.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  assignTrainerToClient,
  getClientAssignments,
  getTrainerAssignments,
  healthCheck,
  removeTrainerAssignment,
} = vi.hoisted(() => ({
  assignTrainerToClient: vi.fn(),
  getClientAssignments: vi.fn(),
  getTrainerAssignments: vi.fn(),
  healthCheck: vi.fn(),
  removeTrainerAssignment: vi.fn(),
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
    assignTrainerToClient,
    getClientAssignments,
    getTrainerAssignments,
    healthCheck,
    removeTrainerAssignment,
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

describe('mounted sessions trainer-assignment disclosure routes', () => {
  beforeEach(() => {
    assignTrainerToClient.mockReset();
    getClientAssignments.mockReset();
    getTrainerAssignments.mockReset();
    healthCheck.mockReset();
    removeTrainerAssignment.mockReset();
  });

  it('POST /api/sessions/assign-trainer does not disclose internal assignment errors', async () => {
    assignTrainerToClient.mockRejectedValueOnce(new Error('private assignment storage host'));

    const response = await request(app)
      .post('/api/sessions/assign-trainer')
      .send({ trainerId: 9, clientId: 12, sessionIds: [42] });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Failed to assign trainer',
    });
    expect(JSON.stringify(response.body)).not.toContain('private assignment');
  });

  it('POST /api/sessions/remove-trainer-assignment does not disclose internal removal errors', async () => {
    removeTrainerAssignment.mockRejectedValueOnce(new Error('private removal storage host'));

    const response = await request(app)
      .post('/api/sessions/remove-trainer-assignment')
      .send({ sessionIds: [42] });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Failed to remove trainer assignment',
    });
    expect(JSON.stringify(response.body)).not.toContain('private removal');
  });

  it('GET /api/sessions/trainer-assignment-health does not disclose internal health errors', async () => {
    healthCheck.mockRejectedValueOnce(new Error('private assignment health host'));

    const response = await request(app).get('/api/sessions/trainer-assignment-health');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Failed to get trainer assignment health',
    });
    expect(JSON.stringify(response.body)).not.toContain('private assignment');
  });

  it('GET /api/sessions/trainer-assignments/:trainerId does not disclose internal trainer read errors', async () => {
    getTrainerAssignments.mockRejectedValueOnce(new Error('private trainer assignment host'));

    const response = await request(app).get('/api/sessions/trainer-assignments/9');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Failed to get trainer assignments',
    });
    expect(JSON.stringify(response.body)).not.toContain('private trainer');
  });

  it('GET /api/sessions/client-assignments/:clientId does not disclose internal client read errors', async () => {
    getClientAssignments.mockRejectedValueOnce(new Error('private client assignment host'));

    const response = await request(app).get('/api/sessions/client-assignments/12');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Failed to get client assignments',
    });
    expect(JSON.stringify(response.body)).not.toContain('private client');
  });
});
