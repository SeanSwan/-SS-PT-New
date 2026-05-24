import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mocks = vi.hoisted(() => ({
  findAndCountAll: vi.fn(),
  findByPk: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: Number(req.headers['x-test-user-id'] || 42),
      role: req.headers['x-test-user-role'] || 'client',
    };
    next();
  },
}));

vi.mock('../../middleware/validationMiddleware.mjs', () => ({
  validationMiddleware: () => (_req, _res, next) => next(),
}));

vi.mock('../../models/WorkoutSession.mjs', () => ({
  default: {
    findAndCountAll: mocks.findAndCountAll,
    findByPk: mocks.findByPk,
    create: mocks.create,
  },
}));

vi.mock('../../models/WorkoutLog.mjs', () => ({
  default: {},
}));

vi.mock('../../models/User.mjs', () => ({
  default: { findByPk: vi.fn() },
}));

const { default: workoutSessionRoutes } = await import('../../routes/workoutSessionRoutes.mjs');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/workout/sessions', workoutSessionRoutes);
  return app;
};

describe('workoutSessionRoutes live-surface hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    mocks.findByPk.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: 'session-1' });
  });

  it('is mounted at the canonical workout session API path used by frontend callers', () => {
    const coreRoutes = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
    const serviceSource = readFileSync(resolve(__dirname, '../../../frontend/src/services/workout-session-service.ts'), 'utf8');

    expect(coreRoutes).toContain("app.use('/api/workout/sessions', workoutSessionRoutes)");
    expect(serviceSource).toContain("api.get('/api/workout/sessions'");
    expect(serviceSource).toContain('api.get(`/api/workout/sessions/${sessionId}`');
  });

  it('rejects malformed pagination before querying workout sessions', async () => {
    const res = await request(buildApp())
      .get('/api/workout/sessions?page=2junk&limit=10')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'Invalid page' });
    expect(mocks.findAndCountAll).not.toHaveBeenCalled();
  });

  it('rejects unapproved sort fields before querying workout sessions', async () => {
    const res = await request(buildApp())
      .get('/api/workout/sessions?sortBy=DROP_TABLE&sortDirection=desc')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'Invalid sortBy' });
    expect(mocks.findAndCountAll).not.toHaveBeenCalled();
  });

  it('does not disclose internal list errors to the client', async () => {
    mocks.findAndCountAll.mockRejectedValue(new Error('database hostname and schema detail'));

    const res = await request(buildApp())
      .get('/api/workout/sessions')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Failed to get workout sessions',
      code: 'INTERNAL_ERROR',
    });
    expect(JSON.stringify(res.body)).not.toContain('database hostname and schema detail');
  });

  it('does not disclose internal detail errors to the client', async () => {
    mocks.findByPk.mockRejectedValue(new Error('private lookup stack'));

    const res = await request(buildApp())
      .get('/api/workout/sessions/session-1')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Server error',
      code: 'INTERNAL_ERROR',
    });
    expect(JSON.stringify(res.body)).not.toContain('private lookup stack');
  });

  it('does not keep raw error.message response payloads in the route source', () => {
    const routeSource = readFileSync(resolve(__dirname, '../../routes/workoutSessionRoutes.mjs'), 'utf8');

    expect(routeSource).not.toMatch(/error:\s*error\.message/);
    expect(routeSource).not.toMatch(/message:\s*error\.message/);
  });
});
