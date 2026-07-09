/**
 * variationRoutes /suggest — equipment-profile IDOR regression (P0.5).
 * ============================================================================
 * The /suggest endpoint read equipment items by `profileId` alone, with no
 * ownership check — any trainer could pass another trainer's equipmentProfileId
 * and receive that trainer's equipment inventory back through swap suggestions.
 * These tests lock the ownership gate: a non-admin may only read a profile they
 * own (admins bypass); a foreign OR absent profile returns the same 403 with no
 * item read (no leak, no existence oracle).
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentUser: { id: 10, role: 'trainer' },
  equipmentProfile: { findByPk: vi.fn() },
  equipmentItem: { findAll: vi.fn() },
  engine: {
    getNextSessionType: vi.fn(),
    generateSwapSuggestions: vi.fn(),
    getVariationTimeline: vi.fn(),
    recordVariation: vi.fn(),
    acceptVariation: vi.fn(),
    getExerciseRegistry: vi.fn(),
    getRotationPatterns: vi.fn(),
  },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...mocks.currentUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));

vi.mock('../../models/index.mjs', () => ({
  getVariationLog: () => ({}),
  getEquipmentProfile: () => mocks.equipmentProfile,
  getEquipmentItem: () => mocks.equipmentItem,
}));

vi.mock('../../services/variationEngine.mjs', () => ({
  getNextSessionType: mocks.engine.getNextSessionType,
  generateSwapSuggestions: mocks.engine.generateSwapSuggestions,
  getVariationTimeline: mocks.engine.getVariationTimeline,
  recordVariation: mocks.engine.recordVariation,
  acceptVariation: mocks.engine.acceptVariation,
  getExerciseRegistry: mocks.engine.getExerciseRegistry,
  getRotationPatterns: mocks.engine.getRotationPatterns,
}));

vi.mock('../../services/eventBus.mjs', () => ({ default: { emit: vi.fn() } }));

const variationRoutes = (await import('../../routes/variationRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/variation', variationRoutes);
  return app;
}

const SUGGEST_BODY = {
  clientId: 99,
  templateCategory: 'upper',
  exercises: [{ name: 'Bench Press' }],
  equipmentProfileId: 5,
};

describe('variationRoutes /suggest equipment IDOR (P0.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = { id: 10, role: 'trainer' };
    mocks.engine.getVariationTimeline.mockResolvedValue([]);
    mocks.engine.getNextSessionType.mockReturnValue('switch');
    mocks.engine.generateSwapSuggestions.mockReturnValue([]);
    mocks.engine.recordVariation.mockResolvedValue({ id: 777 });
  });

  it('returns 403 and never reads items when the profile belongs to another trainer', async () => {
    // Profile #5 is owned by trainer 20; requester is trainer 10.
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 5, trainerId: 20, isActive: true });

    const res = await request(makeApp()).post('/api/variation/suggest').send(SUGGEST_BODY);

    expect(res.status).toBe(403);
    expect(mocks.equipmentItem.findAll).not.toHaveBeenCalled(); // no inventory leak
    expect(mocks.engine.recordVariation).not.toHaveBeenCalled();
  });

  it('returns the same 403 (no existence oracle) when the profile does not exist', async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue(null);

    const res = await request(makeApp()).post('/api/variation/suggest').send(SUGGEST_BODY);

    expect(res.status).toBe(403);
    expect(mocks.equipmentItem.findAll).not.toHaveBeenCalled();
  });

  it('reads and filters equipment when the trainer owns the profile', async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 5, trainerId: 10, isActive: true });
    mocks.equipmentItem.findAll.mockResolvedValue([
      { toJSON: () => ({ category: 'dumbbell', name: 'DB' }) },
    ]);

    const res = await request(makeApp()).post('/api/variation/suggest').send(SUGGEST_BODY);

    expect(res.status).toBe(200);
    expect(mocks.equipmentItem.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ profileId: 5, isActive: true }),
    }));
    expect(mocks.engine.generateSwapSuggestions).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ availableEquipment: [{ category: 'dumbbell', name: 'DB' }] }),
    );
  });

  it('lets an admin read any profile (ownership bypass preserved)', async () => {
    mocks.currentUser = { id: 1, role: 'admin' };
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 5, trainerId: 20, isActive: true });
    mocks.equipmentItem.findAll.mockResolvedValue([]);

    const res = await request(makeApp()).post('/api/variation/suggest').send(SUGGEST_BODY);

    expect(res.status).toBe(200);
    expect(mocks.equipmentItem.findAll).toHaveBeenCalled();
  });
});
