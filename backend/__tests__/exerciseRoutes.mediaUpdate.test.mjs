import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

let mockRole = 'trainer';

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 99, role: mockRole };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
  authorizeResourceAccess: () => (_req, _res, next) => next(),
  trainerOrAdminOnly: (req, res, next) => {
    if (['admin', 'trainer'].includes(req.user?.role)) return next();
    return res.status(403).json({ success: false, message: 'Trainer or admin access required' });
  },
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

const mockUpdate = vi.fn();
const mockFindByPk = vi.fn();
const mockExerciseModel = {
  rawAttributes: {
    id: {},
    name: {},
    videoUrl: {},
    previewVideoUrl: {},
    thumbnailUrl: {},
  },
  findByPk: mockFindByPk,
};

vi.mock('../models/index.mjs', () => ({
  getExercise: () => mockExerciseModel,
  getVideoCatalog: () => null,
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
  mockRole = 'trainer';
  mockUpdate.mockImplementation(async function update(values) {
    Object.assign(this, values);
    return this;
  });
  mockFindByPk.mockResolvedValue({
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Goblet Squat',
    videoUrl: null,
    previewVideoUrl: null,
    thumbnailUrl: null,
    update: mockUpdate,
  });
});

describe('exercise media update route', () => {
  it('lets trainers set full, preview-loop, and thumbnail media on a Rolodex exercise', async () => {
    const res = await request(app)
      .put('/api/exercises/11111111-1111-4111-8111-111111111111/media')
      .send({
        videoUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat.mp4',
        previewVideoUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat-loop.webm',
        thumbnailUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat.jpg',
      });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      videoUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat.mp4',
      previewVideoUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat-loop.webm',
      thumbnailUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat.jpg',
    });
    expect(res.body.exercise).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Goblet Squat',
      videoUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat.mp4',
      previewVideoUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat-loop.webm',
      thumbnailUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat.jpg',
    });
  });

  it('blocks clients before updating Rolodex media', async () => {
    mockRole = 'client';

    const res = await request(app)
      .put('/api/exercises/11111111-1111-4111-8111-111111111111/media')
      .send({ videoUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat.mp4' });

    expect(res.status).toBe(403);
    expect(mockFindByPk).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects non-http media URLs', async () => {
    const res = await request(app)
      .put('/api/exercises/11111111-1111-4111-8111-111111111111/media')
      .send({ previewVideoUrl: 'javascript:alert(1)' });

    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
