/**
 * equipmentRoutes surface-wide hostile-review regressions (P0.3e).
 * ============================================================================
 * Locks the fixes from the 2026-07-12 loop-until-dry hostile review:
 *   F1 lacrosse_ball accepted end-to-end (was silently coerced to 'other')
 *   F2 profiles: archived name re-creatable; CI dup 409; rename dup 409; race 409
 *   F3 profile create: non-string description/address -> 400 not 500
 *   F4 approve: non-string overrides -> 400; name-override dup -> 409
 *   F5 reject refreshes the cached equipmentCount
 *   F6 exercise-map POST: non-string key/name -> 400 not 500
 *   F7 non-numeric mapId -> 400 not a PG cast 500
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';

const mocks = vi.hoisted(() => ({
  equipmentProfile: { findByPk: vi.fn(), findOne: vi.fn(), create: vi.fn() },
  equipmentItem: { findOne: vi.fn(), create: vi.fn(), count: vi.fn() },
  equipmentExerciseMap: { findOne: vi.fn(), create: vi.fn(), destroy: vi.fn() },
  profileUpdate: vi.fn(),
  itemUpdate: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 10, role: 'trainer' }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));
vi.mock('../../models/index.mjs', () => ({
  getEquipmentProfile: () => mocks.equipmentProfile,
  getEquipmentItem: () => mocks.equipmentItem,
  getEquipmentExerciseMap: () => mocks.equipmentExerciseMap,
}));
vi.mock('../../database.mjs', () => ({ default: { transaction: vi.fn() } }));
vi.mock('../../services/equipmentScanService.mjs', () => ({
  isEquipmentScanConfigured: vi.fn(), scanEquipmentImageMulti: vi.fn(),
}));
vi.mock('../../services/equipmentScanV2Support.mjs', () => ({ matchExistingEquipment: vi.fn() }));
vi.mock('../../services/equipmentScanReviewPersistence.mjs', () => ({
  persistEquipmentScanReviewSession: vi.fn(),
}));
vi.mock('../../services/equipmentScanReviewOutcomeService.mjs', () => ({
  recordEquipmentScanCandidateAction: vi.fn(),
  recordEquipmentScanCandidateReview: vi.fn(),
}));
vi.mock('../../services/photoStorageService.mjs', () => ({ uploadPhoto: vi.fn() }));

const equipmentRoutes = (await import('../../routes/equipmentRoutes.mjs')).default;
const app = () => {
  const a = express();
  a.use(express.json());
  a.use('/api/equipment-profiles', equipmentRoutes);
  return a;
};

const iLikeVal = (w) => String(w[Op.iLike]).replace(/\\([\\%_])/g, '$1').toLowerCase();

// Trainer 10's profiles: one ACTIVE "Move Fitness", one ARCHIVED "Old Park".
let PROFILES;

describe('equipment surface hardening (P0.3e)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PROFILES = [
      { id: 5, trainerId: 10, name: 'Move Fitness', isActive: true, isDefault: false, update: mocks.profileUpdate },
      { id: 6, trainerId: 10, name: 'Old Park', isActive: false, isDefault: false, update: vi.fn() },
    ];
    mocks.equipmentProfile.findByPk.mockImplementation(async (id) => PROFILES.find(p => p.id === id) || null);
    mocks.equipmentProfile.findOne.mockImplementation(async ({ where }) =>
      PROFILES.find(p =>
        p.trainerId === where.trainerId &&
        (where.name === undefined || p.name.toLowerCase() === iLikeVal(where.name)) &&
        (where.isActive === undefined || p.isActive === where.isActive) &&
        (where.id === undefined || p.id !== where.id[Op.ne])
      ) || null);
    mocks.equipmentProfile.create.mockImplementation(async (v) => ({ id: 99, ...v }));
    mocks.equipmentItem.count.mockResolvedValue(4);
    mocks.equipmentItem.create.mockImplementation(async (v) => ({ id: 999, ...v }));
    mocks.equipmentItem.findOne.mockResolvedValue(null);
    mocks.profileUpdate.mockResolvedValue({});
    mocks.itemUpdate.mockResolvedValue({});
  });

  describe('F2 profile lifecycle', () => {
    it('re-creates a profile name that only exists ARCHIVED (201)', async () => {
      const res = await request(app()).post('/api/equipment-profiles').send({ name: 'Old Park' });
      expect(res.status).toBe(201);
      expect(mocks.equipmentProfile.create).toHaveBeenCalledTimes(1);
    });

    it('rejects a CASE-VARIANT active duplicate profile with 409', async () => {
      const res = await request(app()).post('/api/equipment-profiles').send({ name: 'MOVE FITNESS' });
      expect(res.status).toBe(409);
      expect(mocks.equipmentProfile.create).not.toHaveBeenCalled();
    });

    it('rejects renaming profile 6-onto-5 collision with 409 (was uncheck -> DB 500)', async () => {
      PROFILES[1].isActive = true; // make Old Park active so it can be renamed
      const res = await request(app()).put('/api/equipment-profiles/6').send({ name: 'move fitness' });
      expect(res.status).toBe(409);
    });

    it('maps a lost unique-index race on profile create to 409, not 500', async () => {
      mocks.equipmentProfile.findOne.mockResolvedValue(null);
      const raceErr = new Error('duplicate key value violates unique constraint');
      raceErr.name = 'SequelizeUniqueConstraintError';
      mocks.equipmentProfile.create.mockRejectedValue(raceErr);
      const res = await request(app()).post('/api/equipment-profiles').send({ name: 'Fresh Gym' });
      expect(res.status).toBe(409);
    });

    it('F3: non-string description/address on create are 400s, not 500 crashes', async () => {
      for (const body of [{ name: 'X', description: 123 }, { name: 'X', address: 123 }]) {
        const res = await request(app()).post('/api/equipment-profiles').send(body);
        expect(res.status).toBe(400);
      }
      expect(mocks.equipmentProfile.create).not.toHaveBeenCalled();
    });
  });

  describe('F4/F5 scan approval endpoints', () => {
    const pendingItem = () => ({
      id: 101, profileId: 5, name: 'Foam Roller', isActive: true,
      approvalStatus: 'pending', update: mocks.itemUpdate,
    });

    it('F4: non-string name override on approve is a 400, not a 500 crash', async () => {
      mocks.equipmentItem.findOne.mockResolvedValueOnce(pendingItem());
      const res = await request(app()).put('/api/equipment-profiles/5/items/101/approve').send({ name: 123 });
      expect(res.status).toBe(400);
      expect(mocks.itemUpdate).not.toHaveBeenCalled();
    });

    it('F4: approve name-override onto an active sibling is a 409 (was DB 500)', async () => {
      mocks.equipmentItem.findOne
        .mockResolvedValueOnce(pendingItem())                                  // getOwnedItem
        .mockResolvedValueOnce({ id: 102, name: 'Barbell', isActive: true }); // dup pre-check hit
      const res = await request(app()).put('/api/equipment-profiles/5/items/101/approve').send({ name: 'Barbell' });
      expect(res.status).toBe(409);
      expect(mocks.itemUpdate).not.toHaveBeenCalled();
    });

    it('F5: reject refreshes the cached equipmentCount', async () => {
      mocks.equipmentItem.findOne.mockResolvedValueOnce(pendingItem());
      mocks.equipmentExerciseMap.destroy.mockResolvedValue(0);
      mocks.equipmentItem.count.mockResolvedValue(3);
      const res = await request(app()).put('/api/equipment-profiles/5/items/101/reject').send({});
      expect(res.status).toBe(200);
      expect(mocks.profileUpdate).toHaveBeenCalledWith({ equipmentCount: 3 });
    });
  });

  describe('F1/F6/F7 items + mappings', () => {
    it('F1: lacrosse_ball is accepted as a real category, not coerced to other', async () => {
      const res = await request(app()).post('/api/equipment-profiles/5/items')
        .send({ name: 'Lacrosse Ball', category: 'lacrosse_ball' });
      expect(res.status).toBe(201);
      expect(mocks.equipmentItem.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'lacrosse_ball' }),
      );
    });

    it('F6: non-string exerciseKey/exerciseName are 400s, not 500 crashes', async () => {
      mocks.equipmentItem.findOne.mockResolvedValue({ id: 101, profileId: 5, isActive: true });
      for (const body of [{ exerciseKey: 123, exerciseName: 'Squat' }, { exerciseKey: 'squat', exerciseName: 123 }]) {
        const res = await request(app()).post('/api/equipment-profiles/5/items/101/exercises').send(body);
        expect(res.status).toBe(400);
      }
      expect(mocks.equipmentExerciseMap.create).not.toHaveBeenCalled();
    });

    it('F7: non-numeric mapId is a 400 on delete and confirm, not a PG cast 500', async () => {
      mocks.equipmentItem.findOne.mockResolvedValue({ id: 101, profileId: 5, isActive: true });
      const del = await request(app()).delete('/api/equipment-profiles/5/items/101/exercises/abc');
      const conf = await request(app()).put('/api/equipment-profiles/5/items/101/exercises/abc/confirm');
      expect(del.status).toBe(400);
      expect(conf.status).toBe(400);
      expect(mocks.equipmentExerciseMap.findOne).not.toHaveBeenCalled();
    });
  });
});
