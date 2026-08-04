/**
 * Regression: POST /api/macros idempotency (S0.4, nutrition blueprint
 * 2026-08-04). Before this slice a retried mobile request double-logged the
 * meal — the plain write path had no idempotency at all (only /drafts did).
 * Locks in: replay returns the original row (200, replayed:true), the unique-
 * violation race returns the winner instead of 500, and garbage keys 400.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  findAll: vi.fn(),
  createSingleMacroEntry: vi.fn(),
}));

vi.mock('../../models/DailyMacroLog.mjs', () => ({
  default: { findOne: mocks.findOne, findAll: mocks.findAll },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 42, role: 'client' };
    next();
  },
}));

vi.mock('../../services/nutrition/macroLogService.mjs', () => ({
  createSingleMacroEntry: mocks.createSingleMacroEntry,
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const dailyMacroRoutes = (await import('../../routes/dailyMacroRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/macros', dailyMacroRoutes);
  return app;
}

const validBody = (extra = {}) => ({
  description: 'Oats with berries',
  calories: 320,
  clientRequestId: 'mobile-req-0001',
  ...extra,
});

describe('POST /api/macros idempotency (S0.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findOne.mockResolvedValue(null);
    mocks.createSingleMacroEntry.mockResolvedValue({ id: 1, description: 'Oats with berries' });
  });

  it('creates normally and passes the key through to the service', async () => {
    const res = await request(makeApp()).post('/api/macros').send(validBody());
    expect(res.status).toBe(201);
    expect(mocks.createSingleMacroEntry).toHaveBeenCalledWith(
      expect.objectContaining({ clientRequestId: 'mobile-req-0001' }),
      expect.objectContaining({ userId: 42 })
    );
  });

  it('replays the original row on a retried request instead of double-logging', async () => {
    mocks.findOne.mockResolvedValue({ id: 7, description: 'Oats with berries' });

    const res = await request(makeApp()).post('/api/macros').send(validBody());
    expect(res.status).toBe(200);
    expect(res.body.replayed).toBe(true);
    expect(res.body.entry.id).toBe(7);
    expect(mocks.createSingleMacroEntry).not.toHaveBeenCalled();
  });

  it('returns the winner when two concurrent retries race past the pre-check', async () => {
    const uniqueErr = Object.assign(new Error('dup'), { name: 'SequelizeUniqueConstraintError' });
    mocks.createSingleMacroEntry.mockRejectedValue(uniqueErr);
    // Pre-check misses, post-conflict fetch finds the winner.
    mocks.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 9, description: 'Oats with berries' });

    const res = await request(makeApp()).post('/api/macros').send(validBody());
    expect(res.status).toBe(200);
    expect(res.body.replayed).toBe(true);
    expect(res.body.entry.id).toBe(9);
  });

  it('rejects malformed keys and works fine without one', async () => {
    const bad = await request(makeApp()).post('/api/macros').send(validBody({ clientRequestId: 'no spaces!' }));
    expect(bad.status).toBe(400);

    const withoutKey = await request(makeApp()).post('/api/macros').send({ description: 'Eggs', calories: 200 });
    expect(withoutKey.status).toBe(201);
    expect(mocks.findOne).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clientRequestId: expect.anything() }) })
    );
  });
});
