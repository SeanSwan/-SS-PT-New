import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  findAndCountAll: vi.fn(),
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
    DEVICE_TYPES: [
      'fitbit',
      'apple_health',
      'health_connect',
      'garmin',
      'samsung_health',
      'whoop',
      'oura',
      'polar',
      'coros',
      'manual',
    ],
    upsert: mocks.upsert,
    findAndCountAll: mocks.findAndCountAll,
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

describe('wearable data sync route', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
    mocks.upsert.mockReset();
    mocks.upsert.mockImplementation(async (record) => [{ id: 777, ...record }, true]);
    mocks.findAndCountAll.mockReset();
    mocks.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts Health Connect aggregate JSON and normalizes supported wearable fields', async () => {
    const response = await request(makeApp())
      .post('/api/wearable-data/sync')
      .send({
        deviceType: 'health_connect',
        deviceId: 'android-health-connect',
        data: [{
          recordDate: '2026-03-01',
          aggregate: {
            steps: 9312,
            distance: { inMeters: 7340.4 },
            exerciseDuration: { inSeconds: 3720 },
            totalCaloriesBurned: { inKilocalories: 2155.2 },
            activeCaloriesBurned: { inKilocalories: 456.6 },
            restingHeartRate: 58,
            heartRate: { average: 81, maximum: 146 },
            heartRateVariabilityRmssd: { inMillis: 42.4 },
            oxygenSaturation: { percentage: 0.975 },
            sleepDuration: { inMinutes: 428 },
          },
        }],
      });

    expect(response.status).toBe(200);
    expect(response.body.results).toEqual([{ recordDate: '2026-03-01', created: true, id: 777 }]);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.upsert.mock.calls[0][0]).toEqual(expect.objectContaining({
      userId: 42,
      deviceType: 'health_connect',
      deviceId: 'android-health-connect',
      recordDate: '2026-03-01',
      steps: 9312,
      distanceMeters: 7340.4,
      activeMinutes: 62,
      caloriesBurned: 2155,
      activeCalories: 457,
      restingHeartRate: 58,
      avgHeartRate: 81,
      maxHeartRate: 146,
      heartRateVariability: 42.4,
      spo2: 97.5,
      sleepDurationMinutes: 428,
      dataQuality: 1,
    }));
  });

  it('rejects impossible recordDate values before any wearable write', async () => {
    const response = await request(makeApp())
      .post('/api/wearable-data/sync')
      .send({
        deviceType: 'manual',
        recordDate: '2026-02-31',
        steps: 1000,
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('recordDate must be a real YYYY-MM-DD calendar date');
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('rejects future recordDate values beyond the one-day timezone grace', async () => {
    const response = await request(makeApp())
      .post('/api/wearable-data/sync')
      .send({
        deviceType: 'manual',
        recordDate: '2026-03-03',
        steps: 1000,
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('recordDate cannot be in the future');
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('accepts a client-local recordDate one calendar day ahead of server UTC', async () => {
    const response = await request(makeApp())
      .post('/api/wearable-data/sync')
      .send({
        deviceType: 'manual',
        recordDate: '2026-03-02',
        steps: 1000,
      });

    expect(response.status).toBe(200);
    expect(mocks.upsert.mock.calls[0][0].recordDate).toBe('2026-03-02');
  });

  it('normalizes Health Connect seconds and kilograms without unit drift', async () => {
    const response = await request(makeApp())
      .post('/api/wearable-data/sync')
      .send({
        deviceType: 'health_connect',
        recordDate: '2026-03-01',
        exerciseDurationSeconds: 1800,
        weight: { inKilograms: 80 },
        bodyFatPercentage: { percentage: 0.23 },
      });

    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.upsert.mock.calls[0][0]).toEqual(expect.objectContaining({
      activeMinutes: 30,
      bodyFatPercentage: 23,
    }));
    expect(mocks.upsert.mock.calls[0][0].weight).toBeCloseTo(176.4, 1);
  });

  it('rejects impossible wearable read date ranges before querying records', async () => {
    const response = await request(makeApp())
      .get('/api/wearable-data?startDate=2026-02-31&endDate=2026-03-01');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('startDate must be a real YYYY-MM-DD calendar date');
    expect(mocks.findAndCountAll).not.toHaveBeenCalled();
  });

  it('rejects future wearable read date ranges beyond the one-day timezone grace', async () => {
    const response = await request(makeApp())
      .get('/api/wearable-data?startDate=2026-03-01&endDate=2026-03-03');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('endDate cannot be in the future');
    expect(mocks.findAndCountAll).not.toHaveBeenCalled();
  });

  it('rejects inverted wearable read date ranges before querying records', async () => {
    const response = await request(makeApp())
      .get('/api/wearable-data?startDate=2026-03-02&endDate=2026-03-01');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('startDate cannot be after endDate');
    expect(mocks.findAndCountAll).not.toHaveBeenCalled();
  });

  it('rejects an impossible single-bound startDate before querying records', async () => {
    const response = await request(makeApp())
      .get('/api/wearable-data?startDate=2026-02-31');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('startDate must be a real YYYY-MM-DD calendar date');
    expect(mocks.findAndCountAll).not.toHaveBeenCalled();
  });

  it('rejects a future single-bound endDate before querying records', async () => {
    const response = await request(makeApp())
      .get('/api/wearable-data?endDate=2026-03-03');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('endDate cannot be in the future');
    expect(mocks.findAndCountAll).not.toHaveBeenCalled();
  });

  it('rejects a bad batch row without partially writing earlier valid rows', async () => {
    const response = await request(makeApp())
      .post('/api/wearable-data/sync')
      .send({
        deviceType: 'manual',
        data: [
          { recordDate: '2026-03-01', steps: 1000 },
          { recordDate: '2026-02-31', steps: 2000 },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('recordDate must be a real YYYY-MM-DD calendar date');
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('requires recordDate on every batch item before any wearable write', async () => {
    const response = await request(makeApp())
      .post('/api/wearable-data/sync')
      .send({
        deviceType: 'manual',
        data: [
          { recordDate: '2026-03-01', steps: 1000 },
          { steps: 2000 },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('recordDate is required for every wearable sync item');
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('rejects an explicit empty wearable sync batch instead of claiming success', async () => {
    const response = await request(makeApp())
      .post('/api/wearable-data/sync')
      .send({
        deviceType: 'manual',
        data: [],
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'At least one wearable sync item is required',
    });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
