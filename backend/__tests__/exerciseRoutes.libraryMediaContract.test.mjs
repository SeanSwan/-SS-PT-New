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
const mockVideoCatalogFindAll = vi.fn();
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
const mockVideoCatalogModel = {
  rawAttributes: {
    exerciseId: {},
    title: {},
    source: {},
    youtubeVideoId: {},
    thumbnailUrl: {},
    durationSeconds: {},
    publishedAt: {},
    created_at: {},
  },
  findAll: mockVideoCatalogFindAll,
};

vi.mock('../models/index.mjs', () => ({
  getExercise: () => mockExerciseModel,
  getVideoCatalog: () => mockVideoCatalogModel,
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
    {
      id: 'ex-2',
      name: 'Catalog Only Row',
      exercise_key: 'catalog-only-row',
      exerciseType: 'compound',
      bodyPartCategory: 'back',
      primaryMuscles: '["lats"]',
      secondaryMuscles: '["biceps"]',
      difficulty: 440,
      equipmentNeeded: '["Cable"]',
      source: 'swanstudios',
      description: 'Row pattern with controlled tempo.',
    },
  ]);
  mockVideoCatalogFindAll.mockResolvedValue([
    {
      exerciseId: 'ex-2',
      title: 'Catalog Row Demo',
      source: 'youtube',
      youtubeVideoId: 'abc123XYZ',
      thumbnailUrl: 'https://img.youtube.com/vi/abc123XYZ/hqdefault.jpg',
      durationSeconds: 38,
      hostedKey: 'r2/private/catalog-row.mp4',
      thumbnailKey: 'r2/private/catalog-row.jpg',
      hlsManifestUrl: 'https://private-signed.example/hls.m3u8',
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

    const catalogOnly = res.body.exercises.find(exercise => exercise.id === 'ex-2');
    expect(catalogOnly).toMatchObject({
      id: 'ex-2',
      name: 'Catalog Only Row',
      videoUrl: null,
      imageUrl: null,
      thumbnailUrl: null,
      catalogVideoSample: {
        title: 'Catalog Row Demo',
        source: 'youtube',
        videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ',
        thumbnailUrl: 'https://img.youtube.com/vi/abc123XYZ/hqdefault.jpg',
        durationSeconds: 38,
      },
    });
    const serialized = JSON.stringify(catalogOnly);
    expect(serialized).not.toContain('hostedKey');
    expect(serialized).not.toContain('thumbnailKey');
    expect(serialized).not.toContain('hlsManifestUrl');
    expect(serialized).not.toContain('r2/private');
  });
});
