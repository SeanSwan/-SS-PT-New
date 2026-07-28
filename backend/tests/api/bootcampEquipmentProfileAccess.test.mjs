import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateBootcampClass = vi.fn();
const findOne = vi.fn();
const findByPk = vi.fn();
let currentUser = { id: 7, role: 'trainer' };

vi.mock('../../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = currentUser;
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

vi.mock('../../services/bootcampService.mjs', () => ({
  generateBootcampClass,
  saveBootcampTemplate: vi.fn(),
  logBootcampClass: vi.fn(),
  getClassHistory: vi.fn(),
  getTemplates: vi.fn(),
  createSpaceProfile: vi.fn(),
  getSpaceProfiles: vi.fn(),
  updateSpaceProfile: vi.fn(),
  getExerciseTrends: vi.fn(),
  approveExerciseTrend: vi.fn(),
  queryExercisesForBootcamp: vi.fn(),
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    EquipmentProfile: {
      findOne,
      findByPk,
    },
  }),
}));

const { default: bootcampRoutes } = await import('../../routes/bootcampRoutes.mjs');

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/bootcamp', bootcampRoutes);
  return app;
};

const generatePayload = (equipmentProfileId = 91) => ({
  classFormat: '4x4_r2',
  classStyle: 'standard',
  dayType: 'full_body',
  equipmentProfileId,
});

describe('POST /api/bootcamp/generate equipmentProfile access', () => {
  beforeEach(() => {
    currentUser = { id: 7, role: 'trainer' };
    generateBootcampClass.mockReset();
    generateBootcampClass.mockResolvedValue({ id: 'generated-class' });
    findOne.mockReset();
    findByPk.mockReset();
  });

  it('blocks trainer access to equipment profiles they do not own before generation', async () => {
    findOne.mockResolvedValue(null);

    const response = await request(makeApp())
      .post('/api/bootcamp/generate')
      .send(generatePayload(91));

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ success: false, error: 'Equipment profile not found or unavailable' });
    expect(findOne).toHaveBeenCalledWith({ where: { id: 91, trainerId: 7 } });
    expect(generateBootcampClass).not.toHaveBeenCalled();
  });

  it('allows a trainer to generate with their own equipment profile', async () => {
    findOne.mockResolvedValue({ id: 91, trainerId: 7 });

    const response = await request(makeApp())
      .post('/api/bootcamp/generate')
      .send(generatePayload(91));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true });
    expect(generateBootcampClass).toHaveBeenCalledWith(expect.objectContaining({
      trainerId: 7,
      equipmentProfileId: 91,
    }));
  });

  it('allows an admin to generate with an existing equipment profile without trainer ownership scope', async () => {
    currentUser = { id: 1, role: 'admin' };
    findByPk.mockResolvedValue({ id: 91, trainerId: 7 });

    const response = await request(makeApp())
      .post('/api/bootcamp/generate')
      .send(generatePayload(91));

    expect(response.status).toBe(200);
    expect(findByPk).toHaveBeenCalledWith(91);
    expect(findOne).not.toHaveBeenCalled();
    expect(generateBootcampClass).toHaveBeenCalledWith(expect.objectContaining({
      trainerId: 1,
      equipmentProfileId: 91,
    }));
  });

  it('rejects malformed equipmentProfileId values instead of forwarding NaN to generation', async () => {
    const response = await request(makeApp())
      .post('/api/bootcamp/generate')
      .send(generatePayload('not-a-number'));

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false, error: 'Valid equipmentProfileId is required when provided' });
    expect(findOne).not.toHaveBeenCalled();
    expect(findByPk).not.toHaveBeenCalled();
    expect(generateBootcampClass).not.toHaveBeenCalled();
  });
});