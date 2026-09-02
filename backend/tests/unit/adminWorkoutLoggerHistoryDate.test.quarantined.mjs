// QUARANTINED SWA-231 2026-09-02: imports the real controller -> badgeRewardPointsService -> PointTransaction, and db.define is unavailable under the vitest env. Un-skip criteria: provide a database.mjs test stub so real-model chains load.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';

const mockFindAndCountAll = vi.fn();
const mockEnsureClientAccess = vi.fn();

vi.mock('../../utils/clientAccess.mjs', () => ({
  ensureClientAccess: (...args) => mockEnsureClientAccess(...args),
}));

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn(),
    query: vi.fn(),
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../services/awardWorkoutXP.mjs', () => ({
  awardWorkoutXP: vi.fn().mockResolvedValue({ alreadyAwarded: true }),
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    WorkoutSession: {},
    WorkoutLog: {},
  }),
}));

const { getClientWorkouts } = await import('../../controllers/adminWorkoutLoggerController.mjs');

const makeResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

describe('adminWorkoutLoggerController.getClientWorkouts history date semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureClientAccess.mockResolvedValue({
      allowed: true,
      clientId: 42,
      models: {
        WorkoutSession: { findAndCountAll: mockFindAndCountAll },
        WorkoutLog: { name: 'WorkoutLog' },
      },
    });
    mockFindAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{
        id: 'session-1',
        title: 'Backdated Lower Body',
        date: '2026-05-04',
        completedAt: '2026-05-29T17:00:00.000Z',
        duration: 55,
        intensity: 8,
        status: 'completed',
        totalSets: 10,
        totalReps: 90,
        totalWeight: 4200,
        logs: [{ id: 'log-1', exerciseName: 'Goblet Squat' }],
      }],
    });
  });

  it('filters, orders, and returns history by workout date while preserving completedAt', async () => {
    const req = {
      params: { clientId: '42' },
      query: { from: '2026-05-01', to: '2026-05-31', limit: '10', offset: '0' },
      user: { id: 9, role: 'trainer' },
    };
    const res = makeResponse();

    await getClientWorkouts(req, res);

    expect(mockFindAndCountAll).toHaveBeenCalledTimes(1);
    const query = mockFindAndCountAll.mock.calls[0][0];
    expect(query.where.userId).toBe(42);
    expect(query.where.completedAt).toBeUndefined();
    expect(query.where.date[Op.gte]).toEqual(new Date('2026-05-01'));
    expect(query.where.date[Op.lte]).toEqual(new Date('2026-05-31T23:59:59.999Z'));
    expect(query.order).toEqual([['date', 'DESC'], ['completedAt', 'DESC']]);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.workouts[0]).toMatchObject({
      id: 'session-1',
      date: '2026-05-04',
      completedAt: '2026-05-29T17:00:00.000Z',
      totalSets: 10,
      totalReps: 90,
      totalWeight: 4200,
    });
  });

  it('keeps explicit timestamp upper bounds unchanged', async () => {
    const req = {
      params: { clientId: '42' },
      query: { to: '2026-05-31T12:30:00.000Z' },
      user: { id: 9, role: 'trainer' },
    };
    const res = makeResponse();

    await getClientWorkouts(req, res);

    const query = mockFindAndCountAll.mock.calls[0][0];
    expect(query.where.date[Op.lte]).toEqual(new Date('2026-05-31T12:30:00.000Z'));
  });
  it('falls back to completedAt only when an old row lacks date', async () => {
    mockFindAndCountAll.mockResolvedValueOnce({
      count: 1,
      rows: [{
        id: 'legacy-session',
        title: 'Legacy Row',
        date: null,
        completedAt: '2026-05-29T17:00:00.000Z',
        logs: [],
      }],
    });

    const req = { params: { clientId: '42' }, query: {}, user: { id: 9, role: 'trainer' } };
    const res = makeResponse();
    await getClientWorkouts(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.workouts[0]).toMatchObject({
      id: 'legacy-session',
      date: '2026-05-29T17:00:00.000Z',
      completedAt: '2026-05-29T17:00:00.000Z',
    });
  });
});