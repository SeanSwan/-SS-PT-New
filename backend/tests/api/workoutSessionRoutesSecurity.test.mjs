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

  it('documents production route ownership for the workout session history path', () => {
    const coreRoutes = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
    const workoutRoutes = readFileSync(resolve(__dirname, '../../routes/workoutRoutes.mjs'), 'utf8');
    const serviceSource = readFileSync(resolve(__dirname, '../../../frontend/src/services/workout-session-service.ts'), 'utf8');
    const workoutMountIndex = coreRoutes.indexOf("app.use('/api/workout', workoutRoutes)");
    const workoutSessionMountIndex = coreRoutes.indexOf("app.use('/api/workout/sessions', workoutSessionRoutes)");

    expect(workoutMountIndex).toBeGreaterThanOrEqual(0);
    expect(workoutSessionMountIndex).toBeGreaterThan(workoutMountIndex);
    expect(workoutRoutes).toContain("router.get('/sessions', protect, workoutController.getWorkoutSessions)");
    expect(coreRoutes).toContain("app.use('/api/workout/sessions', workoutSessionRoutes)");
    expect(serviceSource).toContain("api.get('/api/workout/sessions'");
    expect(serviceSource).toContain('api.get(`/api/workout/sessions/${sessionId}`');
  });

  it('keeps frontend statistics reads off the shadowed sessions-statistics alias', () => {
    const serviceSource = readFileSync(resolve(__dirname, '../../../frontend/src/services/workout-session-service.ts'), 'utf8');

    expect(serviceSource).toContain('api.get(`/api/workout/statistics/${userId}`');
    expect(serviceSource).not.toContain('/api/workout/sessions/statistics');
  });

  // REMOVED 2026-07-30 (SWA-75): these four covered GET / and GET /:id on this
  // router. Those routes were UNREACHABLE — /api/workout is mounted ahead of
  // /api/workout/sessions — and have now been deleted. The tests passed only
  // because they mounted this router DIRECTLY, bypassing the real mount order,
  // so they were asserting security properties on code no request could reach.
  //
  // Where the coverage went, against the endpoint that actually serves traffic:
  //   pagination + sort rejection -> tests/api/workoutSessionsListValidation.test.mjs
  //   internal-error non-disclosure -> utils/responseUtils.errorResponse gates
  //     detail on NODE_ENV !== 'production' (verified), and the live controller
  //     routes every 500 through it.

  it('does not keep raw error.message response payloads in the route source', () => {
    const routeSource = readFileSync(resolve(__dirname, '../../routes/workoutSessionRoutes.mjs'), 'utf8');

    expect(routeSource).not.toMatch(/error:\s*error\.message/);
    expect(routeSource).not.toMatch(/message:\s*error\.message/);
  });
});
