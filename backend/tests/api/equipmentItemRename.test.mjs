/**
 * equipmentRoutes PUT /:id/items/:itemId — rename duplicate handling (P0.3b).
 * ============================================================================
 * Renaming an item to a name already held by an ACTIVE sibling used to skip any
 * duplicate check and slam into the DB partial unique index -> generic 500.
 * These tests lock the fix: an active-scoped pre-check returns 409, a rename to
 * a name held only by a SOFT-DELETED row succeeds (matching the partial index),
 * renaming to the item's own current name is a no-op success, and a lost race
 * (SequelizeUniqueConstraintError from the DB backstop) maps to 409, not 500.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';

const mocks = vi.hoisted(() => ({
  equipmentProfile: { findByPk: vi.fn() },
  equipmentItem: { findOne: vi.fn() },
  itemUpdate: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 10, role: 'trainer' }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));

vi.mock('../../models/index.mjs', () => ({
  getEquipmentProfile: () => mocks.equipmentProfile,
  getEquipmentItem: () => mocks.equipmentItem,
  getEquipmentExerciseMap: () => ({}),
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

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/equipment-profiles', equipmentRoutes);
  return app;
}

// Simulated table for profile 5:
//   #101 "Barbell" ACTIVE (the item being renamed)
//   #102 "Bench"   ACTIVE (rename collision target)
//   #103 "Rope"    SOFT-DELETED (rename to this name must be allowed)
let TABLE;

function renameItem(body) {
  return request(makeApp())
    .put('/api/equipment-profiles/5/items/101')
    .send(body);
}

describe('equipmentRoutes PUT /:id/items/:itemId rename duplicates (P0.3b)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 5, trainerId: 10, isActive: true });
    TABLE = [
      { id: 101, profileId: 5, name: 'Barbell', isActive: true, update: mocks.itemUpdate },
      { id: 102, profileId: 5, name: 'Bench', isActive: true },
      { id: 103, profileId: 5, name: 'Rope', isActive: false },
    ];
    // Behave like the real table for both getOwnedItem ({id, profileId}) and
    // the dup pre-check ({profileId, name, isActive, id: {[Op.ne]}}).
    mocks.equipmentItem.findOne.mockImplementation(async ({ where }) =>
      TABLE.find(r =>
        (where.id === undefined ||
          (typeof where.id === 'object' ? r.id !== where.id[Op.ne] : r.id === where.id)) &&
        (where.profileId === undefined || r.profileId === where.profileId) &&
        (where.name === undefined || r.name === where.name) &&
        (where.isActive === undefined || r.isActive === where.isActive)
      ) || null
    );
    mocks.itemUpdate.mockResolvedValue({});
  });

  it('rejects a rename to an ACTIVE sibling name with 409 (no write)', async () => {
    const res = await renameItem({ name: 'Bench' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(mocks.itemUpdate).not.toHaveBeenCalled();
  });

  it('allows a rename to a name held only by a SOFT-DELETED row (200)', async () => {
    const res = await renameItem({ name: 'Rope' });

    expect(res.status).toBe(200);
    expect(mocks.itemUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Rope' }));
  });

  it('renaming to the item\'s own current name is a no-op success, not a 409', async () => {
    const res = await renameItem({ name: 'Barbell', quantity: 3 });

    expect(res.status).toBe(200);
    expect(mocks.itemUpdate).toHaveBeenCalledTimes(1);
  });

  it('maps a lost unique-index race (SequelizeUniqueConstraintError) to 409, not 500', async () => {
    const raceErr = new Error('duplicate key value violates unique constraint');
    raceErr.name = 'SequelizeUniqueConstraintError';
    mocks.itemUpdate.mockRejectedValue(raceErr);

    const res = await renameItem({ name: 'Rope' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});
