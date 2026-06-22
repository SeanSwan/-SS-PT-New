import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 42, role: 'client' };
    next();
  },
}));

vi.mock('../../middleware/verifyClientAccess.mjs', () => ({
  verifyClientAccessByUserId: () => (_req, _res, next) => next(),
}));

vi.mock('../../models/WearableData.mjs', () => ({
  default: {
    DEVICE_TYPES: ['manual', 'health_connect', 'garmin'],
    upsert: mocks.upsert,
    findAndCountAll: vi.fn(),
    getWeeklyAverages: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    findByPk: vi.fn(),
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const { default: wearableDataRoutes } = await import('../../routes/wearableDataRoutes.mjs');

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/wearable-data', wearableDataRoutes);
  return app;
};

describe('wearable sync metric guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
    mocks.upsert.mockReset();
    mocks.upsert.mockImplementation(async (record) => [{ id: 777, ...record }, true]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects a sync item with no wearable metrics before writing', async () => {
    const response = await request(makeApp())
      .post('/api/wearable-data/sync')
      .send({
        deviceType: 'manual',
        recordDate: '2026-03-01',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'At least one wearable metric is required for every sync item',
    });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('rejects a metric-empty batch row without partially writing earlier rows', async () => {
    const response = await request(makeApp())
      .post('/api/wearable-data/sync')
      .send({
        deviceType: 'manual',
        data: [
          { recordDate: '2026-03-01', steps: 0 },
          { recordDate: '2026-03-01' },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('At least one wearable metric is required for every sync item');
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('rejects device payloads that would otherwise normalize absent fields to zero', async () => {
    const response = await request(makeApp())
      .post('/api/wearable-data/sync')
      .send({
        deviceType: 'garmin',
        recordDate: '2026-03-01',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('At least one wearable metric is required for every sync item');
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('keeps zero as a valid wearable metric value', async () => {
    const response = await request(makeApp())
      .post('/api/wearable-data/sync')
      .send({
        deviceType: 'manual',
        recordDate: '2026-03-01',
        steps: 0,
      });

    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.upsert.mock.calls[0][0]).toEqual(expect.objectContaining({
      recordDate: '2026-03-01',
      steps: 0,
    }));
  });
});
