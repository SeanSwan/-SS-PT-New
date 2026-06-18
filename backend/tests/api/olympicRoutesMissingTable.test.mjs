import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  OlympicEvent: {
    findOne: vi.fn(),
    count: vi.fn(),
    findAll: vi.fn(),
  },
  Gamification: {
    findOne: vi.fn(),
  },
  User: {},
}));

vi.mock('../../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 103, role: 'client' };
    next();
  },
}));

vi.mock('../../models/OlympicEvent.mjs', () => ({
  default: mocks.OlympicEvent,
}));

vi.mock('../../models/Gamification.mjs', () => ({
  default: mocks.Gamification,
}));

vi.mock('../../models/User.mjs', () => ({
  default: mocks.User,
}));

const { default: olympicRoutes } = await import('../../routes/olympicRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/olympics', olympicRoutes);
  return app;
}

function missingOlympicEventsTableError() {
  const error = new Error('relation "olympic_events" does not exist');
  error.name = 'SequelizeDatabaseError';
  error.parent = { code: '42P01', message: error.message };
  error.original = { code: '42P01', message: error.message };
  return error;
}

describe('Olympics read routes with missing event table', () => {
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('returns static events with empty stats instead of 500 when olympic_events is absent', async () => {
    const tableError = missingOlympicEventsTableError();
    mocks.OlympicEvent.findOne.mockRejectedValue(tableError);
    mocks.OlympicEvent.count.mockRejectedValue(tableError);

    const res = await request(buildApp()).get('/api/olympics/events');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: [
        {
          eventType: 'pullups',
          label: 'Pull-ups',
          metric: 'reps (higher is better)',
          userBest: null,
          totalAttempts: 0,
          totalParticipants: 0,
        },
        {
          eventType: 'pushups',
          label: 'Push-ups',
          metric: 'reps (higher is better)',
          userBest: null,
          totalAttempts: 0,
          totalParticipants: 0,
        },
        {
          eventType: 'sprint',
          label: 'Sprint',
          metric: 'seconds (lower is better)',
          userBest: null,
          totalAttempts: 0,
          totalParticipants: 0,
        },
      ],
    });
  });

  it('returns an empty leaderboard instead of 500 when olympic_events is absent', async () => {
    const tableError = missingOlympicEventsTableError();
    mocks.OlympicEvent.findAll.mockRejectedValue(tableError);
    mocks.OlympicEvent.findOne.mockRejectedValue(tableError);

    const res = await request(buildApp()).get('/api/olympics/leaderboard/pullups');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        leaderboard: [],
        userRank: null,
        userBestScore: null,
      },
    });
  });

  it('returns no ghost recordings instead of 500 when olympic_events is absent', async () => {
    const tableError = missingOlympicEventsTableError();
    mocks.OlympicEvent.findAll.mockRejectedValue(tableError);
    mocks.OlympicEvent.findOne.mockRejectedValue(tableError);

    const res = await request(buildApp()).get('/api/olympics/ghosts/pullups');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        ghosts: [],
        selfGhost: null,
      },
    });
  });
});
