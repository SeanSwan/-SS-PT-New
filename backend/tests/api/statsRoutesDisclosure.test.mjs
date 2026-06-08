import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const {
  ensureClientAccessMock,
  workoutSessionCountMock,
} = vi.hoisted(() => ({
  ensureClientAccessMock: vi.fn(),
  workoutSessionCountMock: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 42, role: 'client' };
    next();
  },
}));

vi.mock('../../utils/clientAccess.mjs', () => ({
  ensureClientAccess: ensureClientAccessMock,
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    error: vi.fn(),
  },
}));

import statsRoutes from '../../routes/statsRoutes.mjs';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/stats', statsRoutes);
  return app;
}

describe('stats route disclosure handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureClientAccessMock.mockResolvedValue({
      allowed: true,
      clientId: 42,
      models: {
        WorkoutSession: { count: workoutSessionCountMock },
        Session: null,
        ProgressReport: null,
      },
    });
  });

  it('does not disclose internal model errors in the client stats summary response', async () => {
    workoutSessionCountMock.mockRejectedValue(new Error('database password leaked detail'));

    const res = await request(createApp()).get('/api/stats/42/summary');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Server error fetching client stats summary',
    });
  });
});
