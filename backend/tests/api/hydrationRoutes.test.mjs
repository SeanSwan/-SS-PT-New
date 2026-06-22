import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findAll: vi.fn(),
  findOrCreate: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 42, role: 'client' };
    next();
  },
}));

vi.mock('../../models/DailyHydration.mjs', () => ({
  default: {
    findAll: mocks.findAll,
    findOrCreate: mocks.findOrCreate,
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const { default: hydrationRoutes } = await import('../../routes/hydrationRoutes.mjs');

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/hydration', hydrationRoutes);
  return app;
};

const hydrationRecord = (overrides = {}) => ({
  id: 12,
  userId: 42,
  date: '2026-03-01',
  glassesFilled: 0,
  dailyGoal: 8,
  glassOz: 8,
  update: mocks.update,
  ...overrides,
});

describe('hydration routes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
    mocks.findAll.mockReset();
    mocks.findOrCreate.mockReset();
    mocks.update.mockReset();
    mocks.findOrCreate.mockResolvedValue([hydrationRecord(), true]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects impossible GET dates before creating hydration records', async () => {
    const response = await request(makeApp())
      .get('/api/hydration?date=2026-02-31');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('date must be a real YYYY-MM-DD calendar date');
    expect(mocks.findOrCreate).not.toHaveBeenCalled();
  });

  it('rejects impossible PUT dates before updating hydration records', async () => {
    const response = await request(makeApp())
      .put('/api/hydration')
      .send({ date: '2026-02-31', glassesFilled: 4 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('date must be a real YYYY-MM-DD calendar date');
    expect(mocks.findOrCreate).not.toHaveBeenCalled();
  });
});
