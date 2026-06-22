import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSingleMacroEntry: vi.fn(),
  assertAssignmentOrAdmin: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 42, role: 'client' };
    next();
  },
}));

vi.mock('../../middleware/verifyClientAccess.mjs', () => ({
  assertAssignmentOrAdmin: mocks.assertAssignmentOrAdmin,
}));

vi.mock('../../models/DailyMacroLog.mjs', () => ({
  default: {
    findAll: vi.fn(),
    findByPk: vi.fn(),
  },
}));

vi.mock('../../services/nutrition/macroLogService.mjs', () => ({
  createSingleMacroEntry: mocks.createSingleMacroEntry,
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import dailyMacroRoutes from '../../routes/dailyMacroRoutes.mjs';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/macros', dailyMacroRoutes);
  return app;
};

const mealPayload = (date) => ({
  date,
  mealType: 'snack',
  description: 'Greek yogurt with berries',
  calories: 240,
  protein: 22,
  carbs: 28,
  fat: 4,
});

describe('POST /api/macros local-date guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T23:30:00Z'));
    mocks.createSingleMacroEntry.mockReset();
    mocks.assertAssignmentOrAdmin.mockReset();
    mocks.createSingleMacroEntry.mockImplementation(async (entry) => ({ id: 777, ...entry }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts a client-local today that is one calendar day ahead of server UTC', async () => {
    const response = await request(makeApp())
      .post('/api/macros')
      .send(mealPayload('2026-06-21'));

    expect(response.status).toBe(201);
    expect(mocks.createSingleMacroEntry).toHaveBeenCalledTimes(1);
    expect(mocks.createSingleMacroEntry.mock.calls[0][0].date).toBe('2026-06-21');
  });

  it('still rejects dates beyond the one-day timezone grace', async () => {
    const response = await request(makeApp())
      .post('/api/macros')
      .send(mealPayload('2026-06-22'));

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/future date/i);
    expect(mocks.createSingleMacroEntry).not.toHaveBeenCalled();
  });

  it('rejects impossible rollover dates without silently writing to today', async () => {
    const response = await request(makeApp())
      .post('/api/macros')
      .send(mealPayload('2026-02-31'));

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Date must be a real YYYY-MM-DD calendar date.');
    expect(mocks.createSingleMacroEntry).not.toHaveBeenCalled();
  });

  it('rejects malformed targeted summary userIds before assignment access', async () => {
    const response = await request(makeApp())
      .get('/api/macros/summary')
      .query({ date: '2026-06-20', userId: '42abc' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid userId');
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
  });
});
