/**
 * POST /api/bootcamp/generate profile-ownership regression coverage.
 *
 * Security invariant: a trainer may only generate from equipment and space
 * profiles they own. Admins retain the intentional cross-owner bypass. These
 * tests exercise the real route and generator together so authorization errors
 * cannot be hidden by the generator's equipment fallbacks or route error map.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentUser: { id: 10, role: 'trainer' },
  classLog: { findAll: vi.fn() },
  equipmentProfile: { findByPk: vi.fn() },
  equipmentItem: { findAll: vi.fn() },
  spaceProfile: { findByPk: vi.fn() },
  queryExercises: vi.fn(),
}));

vi.mock('../../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { ...mocks.currentUser };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

vi.mock('../../models/index.mjs', () => ({
  getBootcampClassLog: () => mocks.classLog,
  getBootcampSpaceProfile: () => mocks.spaceProfile,
  getAllModels: () => ({
    EquipmentProfile: mocks.equipmentProfile,
    EquipmentItem: mocks.equipmentItem,
  }),
}));

vi.mock('../../services/variationEngine.mjs', () => ({
  getExerciseRegistry: () => ({}),
}));

vi.mock('../../services/exerciseQualityGate.mjs', () => ({
  applyExerciseQualityGate: (exercises) => ({ allowed: exercises, rejected: [] }),
}));

vi.mock('../../services/bootcamp/exerciseRolodexBridge.mjs', () => ({
  estimateSetupTime: () => 0,
  queryExercisesForBootcamp: mocks.queryExercises,
}));

vi.mock('../../services/bootcamp/flowOptimizer.mjs', () => ({
  optimizeStationFlow: () => ({ orderedStations: [], totalSetupTimeSec: 0 }),
}));

vi.mock('../../services/bootcamp/classStyleModifiers.mjs', () => ({
  generateBoard2: () => [],
  applyClassStyle: vi.fn(),
  generateStretches: () => [],
}));

vi.mock('../../services/bootcamp/painAwareGating.mjs', () => ({
  applyPainAwareGating: () => [],
}));

vi.mock('../../services/bootcampService.mjs', async () => {
  const { generateBootcampClass } = await vi.importActual(
    '../../services/bootcamp/bootcampGenerator.mjs',
  );
  return {
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
  };
});

vi.mock('../../services/eventBus.mjs', () => ({
  default: { safeEmit: vi.fn() },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const bootcampRoutes = (await import('../../routes/bootcampRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/bootcamp', bootcampRoutes);
  return app;
}

const PROFILE_BODY = {
  equipmentProfileId: 101,
  spaceProfileId: 202,
};

describe('POST /api/bootcamp/generate profile ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = { id: 10, role: 'trainer' };
    mocks.classLog.findAll.mockResolvedValue([]);
    mocks.equipmentProfile.findByPk.mockResolvedValue({
      id: 101,
      trainerId: 10,
      isActive: true,
    });
    mocks.equipmentItem.findAll.mockResolvedValue([]);
    mocks.spaceProfile.findByPk.mockResolvedValue({
      id: 202,
      trainerId: 10,
      maxStations: 6,
      maxPerStation: 4,
    });
    mocks.queryExercises.mockResolvedValue([]);
  });

  it('returns 403 before reading inventory for another trainer equipment profile', async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue({
      id: 101,
      trainerId: 20,
      isActive: true,
    });

    const response = await request(makeApp())
      .post('/api/bootcamp/generate')
      .send({ equipmentProfileId: 101 });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false,
      code: 'BOOTCAMP_PROFILE_ACCESS_DENIED',
      error: 'Access denied',
    });
    expect(mocks.equipmentItem.findAll).not.toHaveBeenCalled();
  });

  it('returns 403 for another trainer space profile', async () => {
    mocks.spaceProfile.findByPk.mockResolvedValue({
      id: 202,
      trainerId: 20,
      maxStations: 6,
      maxPerStation: 4,
    });

    const response = await request(makeApp())
      .post('/api/bootcamp/generate')
      .send({ spaceProfileId: 202 });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false,
      code: 'BOOTCAMP_PROFILE_ACCESS_DENIED',
      error: 'Access denied',
    });
  });

  it('still generates when the trainer owns both profiles', async () => {
    mocks.currentUser = { id: '10', role: 'trainer' };

    const response = await request(makeApp())
      .post('/api/bootcamp/generate')
      .send(PROFILE_BODY);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mocks.equipmentItem.findAll).toHaveBeenCalled();
  });

  it('still lets an admin generate with profiles owned by another trainer', async () => {
    mocks.currentUser = { id: 1, role: 'admin' };
    mocks.equipmentProfile.findByPk.mockResolvedValue({
      id: 101,
      trainerId: 20,
      isActive: true,
    });
    mocks.spaceProfile.findByPk.mockResolvedValue({
      id: 202,
      trainerId: 20,
      maxStations: 6,
      maxPerStation: 4,
    });

    const response = await request(makeApp())
      .post('/api/bootcamp/generate')
      .send(PROFILE_BODY);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mocks.equipmentItem.findAll).toHaveBeenCalled();
  });
});
