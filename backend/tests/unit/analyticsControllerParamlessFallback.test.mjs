import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  calculateExerciseTotals,
  calculateSessionUsageStats,
  calculateVolumeOverTime,
  getExerciseHistoryFromLogs,
  getExerciseVarietyFromLogs,
  getPersonalRecords,
  getWorkoutFrequency,
} = vi.hoisted(() => ({
  calculateExerciseTotals: vi.fn(),
  calculateSessionUsageStats: vi.fn(),
  calculateVolumeOverTime: vi.fn(),
  getExerciseHistoryFromLogs: vi.fn(),
  getExerciseVarietyFromLogs: vi.fn(),
  getPersonalRecords: vi.fn(),
  getWorkoutFrequency: vi.fn(),
}));

vi.mock('../../services/analyticsService.mjs', () => ({
  calculateExerciseTotals,
  calculateSessionUsageStats,
  calculateVolumeOverTime,
  getPersonalRecords,
  getWorkoutFrequency,
}));

vi.mock('../../services/analyticsExerciseHistoryService.mjs', () => ({
  getExerciseHistoryFromLogs,
  getExerciseVarietyFromLogs,
}));

vi.mock('../../services/nasmProgressionService.mjs', () => ({
  getPhaseRecommendations: vi.fn(() => []),
  updateClientProgress: vi.fn(),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const {
  getAnalyticsDashboard,
  getClientPersonalRecords,
} = await import('../../controllers/analyticsController.mjs');

function buildParamlessClientAnalyticsApp(routePath, handler, userId = 42) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: userId, role: 'client' };
    next();
  });
  app.use((req, _res, next) => {
    req.params.userId = String(userId);
    next();
  });
  app.get(routePath, handler);
  return app;
}

function buildExplicitAnalyticsApp(routePath, handler, authUserId = 1) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: authUserId, role: 'admin' };
    next();
  });
  app.get(routePath, handler);
  return app;
}

describe('analyticsController paramless client route fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calculateExerciseTotals.mockResolvedValue({ categories: {}, totalVolume: 0 });
    calculateSessionUsageStats.mockResolvedValue({ total: 0 });
    calculateVolumeOverTime.mockResolvedValue([]);
    getExerciseHistoryFromLogs.mockResolvedValue({ items: [] });
    getExerciseVarietyFromLogs.mockResolvedValue({ items: [] });
    getPersonalRecords.mockResolvedValue([]);
    getWorkoutFrequency.mockResolvedValue({ totalWorkouts: 0 });
  });

  it('personal-records falls back to req.user.id after Express resets paramless route params', async () => {
    const app = buildParamlessClientAnalyticsApp('/personal-records', getClientPersonalRecords, 42);

    const res = await request(app).get('/personal-records');

    expect(res.status).toBe(200);
    expect(getPersonalRecords).toHaveBeenCalledWith('42');
    expect(getPersonalRecords).not.toHaveBeenCalledWith(undefined);
  });

  it('dashboard falls back to req.user.id before calling getPersonalRecords', async () => {
    const app = buildParamlessClientAnalyticsApp('/dashboard', getAnalyticsDashboard, 42);

    const res = await request(app).get('/dashboard');

    expect(res.status).toBe(200);
    expect(getPersonalRecords).toHaveBeenCalledWith('42');
  });

  it('explicit /:userId analytics route keeps the path user id for admin/trainer views', async () => {
    const app = buildExplicitAnalyticsApp('/:userId/personal-records', getClientPersonalRecords, 1);

    const res = await request(app).get('/123/personal-records');

    expect(res.status).toBe(200);
    expect(getPersonalRecords).toHaveBeenCalledWith('123');
  });
});
