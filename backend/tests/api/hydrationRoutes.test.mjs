import express from 'express';
import { Op } from 'sequelize';
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
  const originalDisplayTz = process.env.SWAN_DISPLAY_TZ;

  beforeEach(() => {
    process.env.SWAN_DISPLAY_TZ = 'America/Los_Angeles';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
    mocks.findAll.mockReset();
    mocks.findOrCreate.mockReset();
    mocks.update.mockReset();
    mocks.findOrCreate.mockResolvedValue([hydrationRecord(), true]);
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalDisplayTz === undefined) {
      delete process.env.SWAN_DISPLAY_TZ;
    } else {
      process.env.SWAN_DISPLAY_TZ = originalDisplayTz;
    }
  });

  it('uses the display timezone date when GET omits date', async () => {
    vi.setSystemTime(new Date('2026-06-22T06:30:00Z'));

    const response = await request(makeApp())
      .get('/api/hydration');

    expect(response.status).toBe(200);
    expect(mocks.findOrCreate.mock.calls[0][0].where).toEqual({ userId: 42, date: '2026-06-21' });
  });

  it('uses the display timezone date when PUT omits date', async () => {
    vi.setSystemTime(new Date('2026-06-22T06:30:00Z'));

    const response = await request(makeApp())
      .put('/api/hydration')
      .send({ glassesFilled: 4 });

    expect(response.status).toBe(200);
    expect(mocks.findOrCreate.mock.calls[0][0].where).toEqual({ userId: 42, date: '2026-06-21' });
  });

  it('uses the display timezone range when weekly hydration start is omitted', async () => {
    vi.setSystemTime(new Date('2026-06-22T06:30:00Z'));
    mocks.findAll.mockResolvedValue([]);

    const response = await request(makeApp())
      .get('/api/hydration/weekly');

    const whereDate = mocks.findAll.mock.calls[0][0].where.date;
    expect(response.status).toBe(200);
    expect(response.body.startDate).toBe('2026-06-15');
    expect(response.body.endDate).toBe('2026-06-21');
    expect(whereDate[Op.between]).toEqual(['2026-06-15', '2026-06-21']);
  });

  it('rejects impossible weekly start dates before querying hydration rows', async () => {
    const response = await request(makeApp())
      .get('/api/hydration/weekly?start=2026-02-31');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('date must be a real YYYY-MM-DD calendar date');
    expect(mocks.findAll).not.toHaveBeenCalled();
  });

  it('rejects weekly start dates after the display end date before querying hydration rows', async () => {
    mocks.findAll.mockResolvedValue([]);

    const response = await request(makeApp())
      .get('/api/hydration/weekly?start=2026-03-02');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('start cannot be after end date');
    expect(mocks.findAll).not.toHaveBeenCalled();
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

  it.each([
    [{ glassesFilled: 2.5 }, 'glassesFilled must be a whole number 0-30'],
    [{ glassesFilled: '2.5' }, 'glassesFilled must be a whole number 0-30'],
    [{ glassesFilled: 4, dailyGoal: 8.5 }, 'dailyGoal must be a whole number 1-30'],
    [{ glassesFilled: 4, glassOz: 8.5 }, 'glassOz must be a whole number 1-32'],
  ])('rejects fractional hydration integer fields before model access %#', async (body, expectedError) => {
    const response = await request(makeApp())
      .put('/api/hydration')
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(expectedError);
    expect(mocks.findOrCreate).not.toHaveBeenCalled();
  });

  it('accepts a client-local hydration date one calendar day ahead of server UTC', async () => {
    const response = await request(makeApp())
      .put('/api/hydration')
      .send({ date: '2026-03-02', glassesFilled: 4 });

    expect(response.status).toBe(200);
    expect(mocks.findOrCreate.mock.calls[0][0].where).toEqual({ userId: 42, date: '2026-03-02' });
  });

  it('rejects future hydration dates beyond the one-day timezone grace before model access', async () => {
    const getResponse = await request(makeApp())
      .get('/api/hydration?date=2026-03-03');

    expect(getResponse.status).toBe(400);
    expect(getResponse.body.error).toBe('date cannot be in the future');
    expect(mocks.findOrCreate).not.toHaveBeenCalled();

    mocks.findOrCreate.mockClear();

    const putResponse = await request(makeApp())
      .put('/api/hydration')
      .send({ date: '2026-03-03', glassesFilled: 4 });

    expect(putResponse.status).toBe(400);
    expect(putResponse.body.error).toBe('date cannot be in the future');
    expect(mocks.findOrCreate).not.toHaveBeenCalled();

    mocks.findAll.mockResolvedValue([]);

    const weeklyResponse = await request(makeApp())
      .get('/api/hydration/weekly?start=2026-03-03');

    expect(weeklyResponse.status).toBe(400);
    expect(weeklyResponse.body.error).toBe('date cannot be in the future');
    expect(mocks.findAll).not.toHaveBeenCalled();
  });
});
