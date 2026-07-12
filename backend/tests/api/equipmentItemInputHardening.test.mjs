/**
 * equipmentRoutes item input hardening — malformed-body regression (P0.3c).
 * ============================================================================
 * PUT /:id/items/:itemId destructured body fields straight into string methods:
 * `name: null` / `name: 123` threw TypeError -> 500, `name: ""` silently wrote
 * an empty item name AND bypassed the duplicate pre-check, and non-string
 * trainerLabel/description 500'd on both PUT and POST. These tests lock the
 * fix: malformed name is a 400 (never a 500, never a silent empty write) and
 * non-string optional fields are rejected as 400 instead of crashing.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  equipmentProfile: { findByPk: vi.fn() },
  equipmentItem: { findOne: vi.fn(), create: vi.fn(), count: vi.fn() },
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

const put = (body) => request(makeApp()).put('/api/equipment-profiles/5/items/101').send(body);
const post = (body) => request(makeApp()).post('/api/equipment-profiles/5/items').send(body);

describe('equipment item input hardening (P0.3c)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 5, trainerId: 10, isActive: true, update: vi.fn() });
    mocks.equipmentItem.count.mockResolvedValue(1);
    mocks.equipmentItem.findOne.mockImplementation(async ({ where }) =>
      where.name === undefined // owned-item lookup vs duplicate pre-check
        ? { id: 101, profileId: 5, name: 'Barbell', isActive: true, update: mocks.itemUpdate }
        : null // no duplicates
    );
    mocks.equipmentItem.create.mockImplementation(async (v) => ({ id: 999, ...v }));
    mocks.itemUpdate.mockResolvedValue({});
  });

  describe('PUT rename malformed name', () => {
    it.each([[null], [123], [{ evil: true }], [['a']]])('name=%o is a 400, not a 500 crash', async (bad) => {
      const res = await put({ name: bad });
      expect(res.status).toBe(400);
      expect(mocks.itemUpdate).not.toHaveBeenCalled();
    });

    it('empty/whitespace name is a 400, never a silent empty-name write', async () => {
      for (const bad of ['', '   ']) {
        const res = await put({ name: bad });
        expect(res.status).toBe(400);
      }
      expect(mocks.itemUpdate).not.toHaveBeenCalled();
    });

    it('valid rename still works after hardening (200)', async () => {
      const res = await put({ name: 'Kettlebell' });
      expect(res.status).toBe(200);
      expect(mocks.itemUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Kettlebell' }));
    });
  });

  describe('non-string optional fields', () => {
    it('PUT trainerLabel=123 is a 400, not a 500 crash', async () => {
      const res = await put({ trainerLabel: 123 });
      expect(res.status).toBe(400);
      expect(mocks.itemUpdate).not.toHaveBeenCalled();
    });

    it('PUT description=123 is a 400, not a 500 crash', async () => {
      const res = await put({ description: 123 });
      expect(res.status).toBe(400);
      expect(mocks.itemUpdate).not.toHaveBeenCalled();
    });

    it('POST description=123 is a 400, not a 500 crash', async () => {
      const res = await post({ name: 'Rope', description: 123 });
      expect(res.status).toBe(400);
      expect(mocks.equipmentItem.create).not.toHaveBeenCalled();
    });

    it('PUT profile description=123 / address=123 are 400s, not 500 crashes (sibling sweep)', async () => {
      const profileUpdate = vi.fn();
      mocks.equipmentProfile.findByPk.mockResolvedValue({
        id: 5, trainerId: 10, isActive: true, update: profileUpdate,
      });
      for (const body of [{ description: 123 }, { address: 123 }]) {
        const res = await request(makeApp()).put('/api/equipment-profiles/5').send(body);
        expect(res.status).toBe(400);
      }
      expect(profileUpdate).not.toHaveBeenCalled();
    });

    it('PUT null trainerLabel/description still clear the fields (200)', async () => {
      const res = await put({ trainerLabel: null, description: null });
      expect(res.status).toBe(200);
      expect(mocks.itemUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ trainerLabel: null, description: null }),
      );
    });
  });
});
