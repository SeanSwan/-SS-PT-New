/**
 * equipmentRoutes POST /:id/items — soft-deleted re-add regression (P0.3).
 * ============================================================================
 * Items are SOFT-deleted (isActive=false); the DB unique index is partial
 * (WHERE isActive=true) as of migration 20260711000000. This locks the APP
 * layer to match: the manual-add duplicate pre-check must only consider ACTIVE
 * rows, so a previously deleted/rejected name can be re-added (201), while an
 * active duplicate still 409s. The findOne mock simulates the real table: a
 * soft-deleted "Barbell" row exists, and it is only returned when the query
 * does NOT scope to isActive=true — exactly the bug being locked out.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  equipmentProfile: { findByPk: vi.fn() },
  equipmentItem: { findOne: vi.fn(), create: vi.fn(), count: vi.fn() },
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

// Simulated table state for profile 5: one SOFT-DELETED "Barbell", one ACTIVE "Bench".
const TABLE = [
  { id: 101, profileId: 5, name: 'Barbell', isActive: false },
  { id: 102, profileId: 5, name: 'Bench', isActive: true },
];

function postItem(name) {
  return request(makeApp())
    .post('/api/equipment-profiles/5/items')
    .send({ name, category: 'barbell' });
}

describe('equipmentRoutes POST /:id/items soft-deleted re-add (P0.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.equipmentProfile.findByPk.mockResolvedValue({
      id: 5, trainerId: 10, isActive: true, update: vi.fn(),
    });
    mocks.equipmentItem.count.mockResolvedValue(2);
    // Behave like the real table: honor whatever `where` the route sends.
    mocks.equipmentItem.findOne.mockImplementation(async ({ where }) =>
      TABLE.find(r =>
        r.profileId === where.profileId &&
        r.name === where.name &&
        (where.isActive === undefined || r.isActive === where.isActive)
      ) || null
    );
    mocks.equipmentItem.create.mockImplementation(async (v) => ({ id: 999, ...v }));
  });

  it('re-adds a name that only exists as a soft-deleted row (201, new row created)', async () => {
    const res = await postItem('Barbell');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(mocks.equipmentItem.create).toHaveBeenCalledTimes(1);
    // The pre-check must scope to ACTIVE rows only — matching the partial index.
    expect(mocks.equipmentItem.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
    );
  });

  it('maps a lost unique-index race on create (SequelizeUniqueConstraintError) to 409, not 500', async () => {
    const raceErr = new Error('duplicate key value violates unique constraint');
    raceErr.name = 'SequelizeUniqueConstraintError';
    mocks.equipmentItem.create.mockRejectedValue(raceErr);

    const res = await postItem('Barbell');

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('still rejects an ACTIVE duplicate with 409', async () => {
    const res = await postItem('Bench');

    expect(res.status).toBe(409);
    expect(mocks.equipmentItem.create).not.toHaveBeenCalled();
  });
});
