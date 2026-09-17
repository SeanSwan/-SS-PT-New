/**
 * Last-weight suggestions — blueprint S5 backend acceptance suite.
 * Covers: RBAC (403 foreign client, client self-access), 400 missing params,
 * success map shape (lowercase keys, latest session wins, zero-weight rows
 * excluded), bounded queries (LIMIT 300 sessions / 5000 logs), and the
 * fail-soft contract (history failure → 200 weights:{}, never 500).
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUser, mockSessionFindAll, mockLogFindAll, mockAssignmentFindOne } = vi.hoisted(() => ({
  mockUser: { id: 7, role: 'admin' },
  mockSessionFindAll: vi.fn(),
  mockLogFindAll: vi.fn(),
  mockAssignmentFindOne: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...mockUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));
vi.mock('../../services/voiceTranscriptionService.mjs', () => ({
  transcribeAudio: vi.fn(), extractText: vi.fn(), isAudioFile: vi.fn(() => false),
}));
vi.mock('../../services/workoutLogParserService.mjs', () => ({ parseWorkoutTranscript: vi.fn() }));
vi.mock('../../services/historicalWorkoutImportService.mjs', () => ({ previewHistoricalWorkoutImport: vi.fn() }));
vi.mock('../../models/index.mjs', () => ({
  getWorkoutSession: () => ({ findAll: mockSessionFindAll }),
  getWorkoutLog: () => ({ findAll: mockLogFindAll }),
  // The upload lanes gate on the client's AI consent, so the route module
  // imports this getter at load time. These tests exercise /last-weights,
  // which never reaches the gate — the mock only has to satisfy the import.
  getAiPrivacyProfile: () => ({ findOne: async () => null }),
  getModel: (name) => {
    if (name === 'ClientTrainerAssignment') return { findOne: mockAssignmentFindOne };
    throw new Error(`unexpected model ${name}`);
  },
}));

const routes = (await import('../../routes/workoutLogUploadRoutes.mjs')).default;
const { getLastLoggedWeights } = await import('../../services/workoutLastWeightService.mjs');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/workout-logs', routes);
  return app;
}

const seedHistory = () => {
  mockSessionFindAll.mockResolvedValue([
    { id: 11, date: '2026-07-10' },
    { id: 10, date: '2026-07-03' },
  ]);
  mockLogFindAll.mockResolvedValue([
    { sessionId: 10, exerciseName: 'Leg Press', weight: 80, reps: 12 },
    { sessionId: 11, exerciseName: 'LEG PRESS', weight: 100, reps: 11 },
    { sessionId: 11, exerciseName: 'Chest Press Machine', weight: 0, reps: 10 }, // zero-weight excluded
    { sessionId: 11, exerciseName: 'Box Squat', weight: 135, reps: 8 }, // not requested
  ]);
};

describe('GET /api/workout-logs/last-weights (blueprint S5)', () => {
  beforeEach(() => {
    mockUser.id = 7;
    mockUser.role = 'admin';
    mockSessionFindAll.mockReset();
    mockLogFindAll.mockReset();
    mockAssignmentFindOne.mockReset();
  });

  it('returns 400 when names are missing', async () => {
    const response = await request(makeApp()).get('/api/workout-logs/last-weights?clientId=84').expect(400);
    expect(response.body).toMatchObject({ success: false });
  });

  it('returns 400 when clientId is missing or malformed', async () => {
    await request(makeApp()).get('/api/workout-logs/last-weights?names=Leg%20Press').expect(400);
    await request(makeApp()).get('/api/workout-logs/last-weights?clientId=84junk&names=Leg%20Press').expect(400);
  });

  it('returns 403 for a trainer without an active assignment to the client', async () => {
    mockUser.role = 'trainer';
    mockAssignmentFindOne.mockResolvedValue(null);
    const response = await request(makeApp())
      .get('/api/workout-logs/last-weights?clientId=84&names=Leg%20Press')
      .expect(403);
    expect(response.body).toMatchObject({ success: false });
    expect(mockSessionFindAll).not.toHaveBeenCalled();
  });

  it('lets a client read ONLY their own last weights', async () => {
    mockUser.role = 'client';
    mockUser.id = 84;
    seedHistory();
    const own = await request(makeApp())
      .get('/api/workout-logs/last-weights?clientId=84&names=Leg%20Press')
      .expect(200);
    expect(own.body.success).toBe(true);
    await request(makeApp())
      .get('/api/workout-logs/last-weights?clientId=99&names=Leg%20Press')
      .expect(403);
  });

  it('returns lowercase-normalized keys with the latest logged weight winning', async () => {
    seedHistory();
    const response = await request(makeApp())
      .get('/api/workout-logs/last-weights?clientId=84&names=Leg%20Press,Chest%20Press%20Machine')
      .expect(200);
    expect(response.body).toEqual({
      success: true,
      weights: {
        'leg press': { weight: 100, reps: 11, at: '2026-07-10' },
        // chest press machine absent — its only row has weight 0
      },
    });
  });

  it('bounds both history queries (sessions LIMIT 300, logs LIMIT 5000)', async () => {
    seedHistory();
    await request(makeApp())
      .get('/api/workout-logs/last-weights?clientId=84&names=Leg%20Press')
      .expect(200);
    expect(mockSessionFindAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 300, where: { userId: 84 } }));
    expect(mockLogFindAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 5000 }));
  });

  it('fail-soft: a history query failure returns 200 with empty weights, never 500', async () => {
    mockSessionFindAll.mockRejectedValue(new Error('db down'));
    const response = await request(makeApp())
      .get('/api/workout-logs/last-weights?clientId=84&names=Leg%20Press')
      .expect(200);
    expect(response.body).toEqual({ success: true, weights: {} });
  });

  it('service: empty history and unmatched names both resolve to an empty map', async () => {
    mockSessionFindAll.mockResolvedValue([]);
    expect(await getLastLoggedWeights(84, ['Leg Press'])).toEqual({ weights: {} });
    expect(await getLastLoggedWeights(84, [])).toEqual({ weights: {} });
  });
});
