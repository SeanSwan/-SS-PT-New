import express from 'express';
import { Op } from 'sequelize';
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
    findOne: vi.fn(),
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
import DailyMacroLog from '../../models/DailyMacroLog.mjs';

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
  const originalDisplayTz = process.env.SWAN_DISPLAY_TZ;

  beforeEach(() => {
    process.env.SWAN_DISPLAY_TZ = 'America/Los_Angeles';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T23:30:00Z'));
    mocks.createSingleMacroEntry.mockReset();
    mocks.assertAssignmentOrAdmin.mockReset();
    mocks.createSingleMacroEntry.mockImplementation(async (entry) => ({ id: 777, ...entry }));
    DailyMacroLog.findAll.mockReset();
    DailyMacroLog.findAll.mockResolvedValue([]);
    DailyMacroLog.findOne.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalDisplayTz === undefined) {
      delete process.env.SWAN_DISPLAY_TZ;
    } else {
      process.env.SWAN_DISPLAY_TZ = originalDisplayTz;
    }
  });

  it('uses the display timezone date when a macro write omits date', async () => {
    vi.setSystemTime(new Date('2026-06-22T06:30:00Z'));

    const response = await request(makeApp())
      .post('/api/macros')
      .send(mealPayload(undefined));

    expect(response.status).toBe(201);
    expect(mocks.createSingleMacroEntry.mock.calls[0][0].date).toBe('2026-06-21');
  });

  it('uses the display timezone date when a macro read omits date', async () => {
    vi.setSystemTime(new Date('2026-06-22T06:30:00Z'));

    const response = await request(makeApp())
      .get('/api/macros');

    expect(response.status).toBe(200);
    expect(response.body.date).toBe('2026-06-21');
    expect(DailyMacroLog.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42, date: '2026-06-21' },
    }));
  });

  it('uses the display timezone range when weekly macro dates are omitted', async () => {
    vi.setSystemTime(new Date('2026-06-22T06:30:00Z'));

    const response = await request(makeApp())
      .get('/api/macros/weekly');

    const whereDate = DailyMacroLog.findAll.mock.calls[0][0].where.date;
    expect(response.status).toBe(200);
    expect(response.body.startDate).toBe('2026-06-15');
    expect(response.body.endDate).toBe('2026-06-21');
    expect(whereDate[Op.between]).toEqual(['2026-06-15', '2026-06-21']);
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

  it('rejects impossible entry read dates before querying macro rows', async () => {
    const response = await request(makeApp())
      .get('/api/macros')
      .query({ date: '2026-02-31' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Date must be a real YYYY-MM-DD calendar date.');
    expect(DailyMacroLog.findAll).not.toHaveBeenCalled();
  });

  it('rejects future entry read dates before querying macro rows', async () => {
    const response = await request(makeApp())
      .get('/api/macros')
      .query({ date: '2026-06-22' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/future date/i);
    expect(DailyMacroLog.findAll).not.toHaveBeenCalled();
  });

  it('rejects impossible summary dates before target assignment or macro queries', async () => {
    const response = await request(makeApp())
      .get('/api/macros/summary')
      .query({ date: '2026-02-31', userId: '101' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Date must be a real YYYY-MM-DD calendar date.');
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(DailyMacroLog.findAll).not.toHaveBeenCalled();
  });

  it('rejects future summary dates before target assignment or macro queries', async () => {
    const response = await request(makeApp())
      .get('/api/macros/summary')
      .query({ date: '2026-06-22', userId: '101' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/future date/i);
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(DailyMacroLog.findAll).not.toHaveBeenCalled();
  });

  it('rejects impossible weekly range dates before target assignment or macro queries', async () => {
    const response = await request(makeApp())
      .get('/api/macros/weekly')
      .query({ start: '2026-02-31', end: '2026-06-20', userId: '101' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Date must be a real YYYY-MM-DD calendar date.');
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(DailyMacroLog.findAll).not.toHaveBeenCalled();
  });

  it('rejects future weekly range dates before target assignment or macro queries', async () => {
    const response = await request(makeApp())
      .get('/api/macros/weekly')
      .query({ start: '2026-06-20', end: '2026-06-22', userId: '101' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/future date/i);
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(DailyMacroLog.findAll).not.toHaveBeenCalled();
  });

  it('patch ignores client date/source/provenance drift and forces verified false', async () => {
    const savedEntry = {
      id: 777,
      userId: 42,
      date: '2026-06-20',
      mealType: 'breakfast',
      description: 'Original breakfast',
      calories: 210,
      source: 'manual',
      aiConversationId: 'server-owned-thread',
      verified: true,
    };
    const update = vi.fn(async (updates) => {
      Object.assign(savedEntry, updates);
      return savedEntry;
    });
    savedEntry.update = update;
    DailyMacroLog.findOne.mockResolvedValue(savedEntry);

    const response = await request(makeApp())
      .patch('/api/macros/777')
      .send({
        date: '2026-06-22',
        mealType: 'lunch',
        description: 'Greek yogurt bowl',
        calories: '321.24',
        source: 'ai-chat',
        aiConversationId: 'client-supplied-thread',
        verified: true,
      });

    expect(response.status).toBe(200);
    expect(DailyMacroLog.findOne).toHaveBeenCalledWith({
      where: { id: 777, userId: 42 },
    });
    expect(update).toHaveBeenCalledWith({
      mealType: 'lunch',
      description: 'Greek yogurt bowl',
      calories: 321.2,
      verified: false,
    });
    const updateKeys = Object.keys(update.mock.calls[0][0]);
    expect(updateKeys).not.toContain('date');
    expect(updateKeys).not.toContain('source');
    expect(updateKeys).not.toContain('aiConversationId');
    expect(response.body.entry.date).toBe('2026-06-20');
    expect(response.body.entry.source).toBe('manual');
    expect(response.body.entry.aiConversationId).toBe('server-owned-thread');
    expect(response.body.entry.verified).toBe(false);
  });
});
