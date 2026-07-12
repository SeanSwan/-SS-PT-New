/**
 * equipmentRoutes review-loop regressions (2026-07-12 queue-drain pass).
 * ============================================================================
 * Locks four fixes from the Sean-directed review-queue drain loop:
 *   R1 profile POST: name sliced to the STRING(100) column BEFORE store and
 *      the duplicate pre-check runs on that stored form (unsliced name was a
 *      PG "value too long" 500).
 *   R2 item POST: duplicate pre-check compares the TRUNCATED stored form —
 *      re-adding a >150-char name whose slice already exists is a clean 409
 *      from the pre-check, not an index-race fallthrough.
 *   R3 profile list auto-seed: guarded by the trainer's UNFILTERED profile
 *      count — an empty FILTERED result (?locationType=...) must not re-seed
 *      defaults for a trainer who owns renamed/archived profiles.
 *   R4 scan route: source contract for the stored-name duplicate pre-check
 *      inside the scan transaction + the unique-violation 409 backstop
 *      (collision used to abort the whole scan as a 500).
 */
import express from 'express';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';

const mocks = vi.hoisted(() => ({
  equipmentProfile: {
    findByPk: vi.fn(), findOne: vi.fn(), create: vi.fn(),
    findAll: vi.fn(), count: vi.fn(), bulkCreate: vi.fn(),
  },
  equipmentItem: { findOne: vi.fn(), create: vi.fn(), count: vi.fn() },
  equipmentExerciseMap: { findOne: vi.fn(), create: vi.fn(), destroy: vi.fn() },
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTE_SOURCE = readFileSync(resolve(__dirname, '../../routes/equipmentRoutes.mjs'), 'utf8');
const iLikeVal = (w) => String(w[Op.iLike]).replace(/\\([\\%_])/g, '$1');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('R1 — profile POST already rejects over-length names (verified, no code change)', () => {
  it('400s a >100-char profile name before any DB access (STRING(100) column protected)', async () => {
    const res = await request(app())
      .post('/api/equipment-profiles')
      .send({ name: 'P'.repeat(140) });

    expect(res.status).toBe(400);
    expect(mocks.equipmentProfile.findOne).not.toHaveBeenCalled();
    expect(mocks.equipmentProfile.create).not.toHaveBeenCalled();
  });
});

describe('R2 — item POST pre-checks the truncated stored form', () => {
  it('409s from the pre-check when a >150-char name re-adds its stored slice', async () => {
    const longName = 'Adjustable Bench '.repeat(12); // > 150 chars
    mocks.equipmentProfile.findByPk.mockResolvedValue({
      id: 5, trainerId: 10, isActive: true, update: vi.fn(),
    });
    mocks.equipmentItem.findOne.mockResolvedValue({ id: 9, name: longName.slice(0, 150) });

    const res = await request(app())
      .post('/api/equipment-profiles/5/items')
      .send({ name: longName, category: 'other' });

    expect(res.status).toBe(409);
    expect(mocks.equipmentItem.create).not.toHaveBeenCalled();
    const preCheckWhere = mocks.equipmentItem.findOne.mock.calls[0][0].where;
    expect(iLikeVal(preCheckWhere.name)).toBe(longName.trim().slice(0, 150));
  });
});

describe('R3 — auto-seed guards on the UNFILTERED trainer profile count', () => {
  it('does NOT seed defaults when a locationType filter is empty but the trainer owns profiles', async () => {
    mocks.equipmentProfile.findAll.mockResolvedValue([]);
    mocks.equipmentProfile.count.mockResolvedValue(4); // renamed/archived defaults exist

    const res = await request(app()).get('/api/equipment-profiles?locationType=custom');

    expect(res.status).toBe(200);
    expect(res.body.profiles).toEqual([]);
    expect(mocks.equipmentProfile.count).toHaveBeenCalledWith({ where: { trainerId: 10 } });
    expect(mocks.equipmentProfile.bulkCreate).not.toHaveBeenCalled();
  });

  it('still seeds defaults for a genuinely profile-less trainer', async () => {
    mocks.equipmentProfile.findAll.mockResolvedValue([]);
    mocks.equipmentProfile.count.mockResolvedValue(0);
    mocks.equipmentProfile.bulkCreate.mockResolvedValue([]);

    const res = await request(app()).get('/api/equipment-profiles');

    expect(res.status).toBe(200);
    expect(mocks.equipmentProfile.bulkCreate).toHaveBeenCalledTimes(1);
  });
});

describe('R4 — scan route duplicate hardening (source contract)', () => {
  it('pre-checks the stored name inside the scan transaction before creating', () => {
    const loopStart = ROUTE_SOURCE.indexOf('matchExistingEquipment(candidate, existingItems)');
    expect(loopStart).toBeGreaterThan(-1);
    const scanLoop = ROUTE_SOURCE.slice(loopStart, loopStart + 3000);
    expect(scanLoop).toMatch(/storedNameDuplicate/);
    expect(scanLoop).toMatch(/escapeLikeLiteral\(candidate\.suggestedName\)/);
    expect(scanLoop).toMatch(/matchType: 'stored_name'/);
    expect(scanLoop).toMatch(/transaction: t/);
  });

  it('maps a scan-time unique violation to 409, never a whole-scan 500', () => {
    const scanCatch = ROUTE_SOURCE.slice(
      ROUTE_SOURCE.indexOf("logger.error('[EquipmentRoutes] Scan error:'"),
      ROUTE_SOURCE.indexOf("'Equipment scan failed. Try again or add manually.'"),
    );
    expect(scanCatch).toMatch(/SequelizeUniqueConstraintError/);
    expect(scanCatch).toMatch(/409/);
    // Concurrent opposite-order scans can deadlock on the unique index —
    // PG 40P01 is a clean retry, not a server failure.
    expect(scanCatch).toMatch(/40P01/);
  });
});
