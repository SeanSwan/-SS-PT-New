/**
 * Exercise library media contract
 * ===============================
 *
 * Locks the client-safe `/api/exercises/library` payload used by the shared
 * WorkoutLogger Rolodex. The trainer, client, and Swan Coach-assisted logger
 * all depend on this route for fast exercise lookup before logging data.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 99, role: 'client' }; next(); },
  authorize: () => (_req, _res, next) => next(),
  authorizeResourceAccess: () => (_req, _res, next) => next(),
  trainerOrAdminOnly: (_req, _res, next) => next(),
}));

vi.mock('../middleware/rateLimiter.mjs', () => ({
  apiLimiter: (_req, _res, next) => next(),
}));

vi.mock('../database.mjs', async () => {
  const sequelize = await import('sequelize');
  return {
    default: { /* sequelize instance unused by this route test */ },
    Op: sequelize.Op,
    sequelize: { where: vi.fn(), cast: vi.fn(), col: vi.fn() },
  };
});

const mockFindAll = vi.fn();
const mockExerciseModel = {
  rawAttributes: {
    id: {},
    name: {},
    exerciseType: {},
    primaryMuscles: {},
    secondaryMuscles: {},
    exercise_key: {},
    bodyPartCategory: {},
    difficulty: {},
    equipmentNeeded: {},
    source: {},
    description: {},
    videoUrl: {},
    imageUrl: {},
    thumbnailUrl: {},
    defaultTempo: {},
    defaultRestSeconds: {},
    recommendedSets: {},
    recommendedReps: {},
    recommendedDuration: {},
    restInterval: {},
    optPhases: {},
    nasmMovementPattern: {},
    canBePerformedAtHome: {},
    easyVariation: {},
    hardVariation: {},
    kneeMod: {},
  },
  findAll: mockFindAll,
};

vi.mock('../models/index.mjs', () => ({
  getExercise: () => mockExerciseModel,
  getModel: vi.fn(),
}));

vi.mock('../controllers/workoutController.mjs', () => ({
  default: {
    getExerciseRecommendations: (_req, res) => res.json({ stubbed: true }),
  },
}));

vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

const exerciseRoutes = (await import('../routes/exerciseRoutes.mjs')).default;
const app = express();
app.use(express.json());
app.use('/api/exercises', exerciseRoutes);

beforeEach(() => {
  vi.clearAllMocks();
  mockFindAll.mockResolvedValue([
    {
      id: 'ex-1',
      name: 'Low Poly Squat',
      exercise_key: 'nasm-low-poly-squat',
      exerciseType: 'compound',
      bodyPartCategory: 'legs',
      primaryMuscles: '["glutes","quadriceps"]',
      secondaryMuscles: '["core"]',
      difficulty: 420,
      equipmentNeeded: '["Dumbbells"]',
      source: 'swanstudios',
      description: 'Squat pattern with controlled tempo.',
      videoUrl: 'https://cdn.swanstudios.test/exercises/squat.webm',
      imageUrl: 'https://cdn.swanstudios.test/exercises/squat.jpg',
      thumbnailUrl: 'https://cdn.swanstudios.test/exercises/squat.gif',
      defaultTempo: '3/1/1',
      defaultRestSeconds: 60,
      recommendedSets: 3,
      recommendedReps: 10,
      recommendedDuration: 45,
      restInterval: 60,
      optPhases: '[1,2]',
      nasmMovementPattern: 'squat',
      canBePerformedAtHome: true,
      easyVariation: 'Box squat',
      hardVariation: 'Front squat',
      kneeMod: 'Use a shorter range of motion.',
    },
  ]);
});

describe('exercise library media contract', () => {
  it('returns media, poster, and logging defaults for the shared workout Rolodex', async () => {
    const res = await request(app).get('/api/exercises/library');

    expect(res.status).toBe(200);
    expect(mockFindAll).toHaveBeenCalled();
    expect(mockFindAll.mock.calls[0][0].attributes).toEqual(expect.arrayContaining([
      'videoUrl',
      'imageUrl',
      'thumbnailUrl',
      'defaultTempo',
      'defaultRestSeconds',
      'recommendedSets',
      'recommendedReps',
      'recommendedDuration',
      'restInterval',
      'optPhases',
      'nasmMovementPattern',
      'canBePerformedAtHome',
    ]));
    expect(mockFindAll.mock.calls[0][0].attributes).not.toEqual(expect.arrayContaining([
      'elbowMod',
      'footMod',
      'hipMod',
    ]));

    expect(res.body.exercises[0]).toMatchObject({
      id: 'ex-1',
      name: 'Low Poly Squat',
      exerciseKey: 'nasm-low-poly-squat',
      videoUrl: 'https://cdn.swanstudios.test/exercises/squat.webm',
      imageUrl: 'https://cdn.swanstudios.test/exercises/squat.jpg',
      thumbnailUrl: 'https://cdn.swanstudios.test/exercises/squat.gif',
      defaultTempo: '3/1/1',
      defaultRestSeconds: 60,
      recommendedSets: 3,
      recommendedReps: 10,
      recommendedDuration: 45,
      restInterval: 60,
      optPhases: [1, 2],
      nasmMovementPattern: 'squat',
      canBePerformedAtHome: true,
      primaryMuscles: ['glutes', 'quadriceps'],
      secondaryMuscles: ['core'],
      equipment: ['Dumbbells'],
    });
  });
});
