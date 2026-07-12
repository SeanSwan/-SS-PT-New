/**
 * equipmentRoutes POST /:id/scan — atomic multi-item write regression (P0.2).
 * ============================================================================
 * The scan handler created N EquipmentItem rows + their exercise mappings in a
 * loop with NO transaction — a failure partway (e.g. item 3 of 5) left items
 * 1-2 committed while the request errored, corrupting inventory. These tests
 * lock the fix: every item + mapping write is threaded through ONE
 * sequelize.transaction, and a mid-loop failure aborts the whole operation
 * (error response, best-effort ledger never runs) so Sequelize rolls the batch
 * back atomically. (The mocked transaction can't simulate DB rollback itself;
 * the guarantee is that the writes carry `transaction: t`, so the real driver
 * rolls back, AND that a partial failure never returns success.)
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const FAKE_T = { __txSentinel: true };

const mocks = vi.hoisted(() => ({
  currentUser: { id: 10, role: 'trainer' },
  equipmentProfile: { findByPk: vi.fn() },
  // findOne backs the in-transaction stored-name duplicate pre-check
  // (queue-drain fix): null by default = no stored duplicate, creates proceed.
  equipmentItem: { findAll: vi.fn(), create: vi.fn(), findOne: vi.fn().mockResolvedValue(null) },
  equipmentExerciseMap: { bulkCreate: vi.fn() },
  transaction: vi.fn(),
  scan: { isEquipmentScanConfigured: vi.fn(), scanEquipmentImageMulti: vi.fn() },
  matchExistingEquipment: vi.fn(),
  persistReview: vi.fn(),
  uploadPhoto: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...mocks.currentUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));

vi.mock('../../models/index.mjs', () => ({
  getEquipmentProfile: () => mocks.equipmentProfile,
  getEquipmentItem: () => mocks.equipmentItem,
  getEquipmentExerciseMap: () => mocks.equipmentExerciseMap,
}));

vi.mock('../../database.mjs', () => ({ default: { transaction: mocks.transaction } }));

vi.mock('../../services/equipmentScanService.mjs', () => ({
  isEquipmentScanConfigured: mocks.scan.isEquipmentScanConfigured,
  scanEquipmentImageMulti: mocks.scan.scanEquipmentImageMulti,
}));

vi.mock('../../services/equipmentScanV2Support.mjs', () => ({
  matchExistingEquipment: mocks.matchExistingEquipment,
}));

vi.mock('../../services/equipmentScanReviewPersistence.mjs', () => ({
  persistEquipmentScanReviewSession: mocks.persistReview,
}));

vi.mock('../../services/equipmentScanReviewOutcomeService.mjs', () => ({
  recordEquipmentScanCandidateAction: vi.fn(),
  recordEquipmentScanCandidateReview: vi.fn(),
}));

vi.mock('../../services/photoStorageService.mjs', () => ({ uploadPhoto: mocks.uploadPhoto }));

const equipmentRoutes = (await import('../../routes/equipmentRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/equipment-profiles', equipmentRoutes);
  return app;
}

const TWO_ITEM_SCAN = {
  items: [
    { suggestedName: 'Dumbbell', suggestedCategory: 'dumbbell', suggestedExercises: ['Curl'], confidence: 0.9 },
    { suggestedName: 'Bench', suggestedCategory: 'bench', suggestedExercises: ['Press'], confidence: 0.8 },
  ],
  possibleItems: [],
  schemaVersion: 'v2', promptVersion: 'p1', imageQuality: 'good', sceneSummary: 'scene',
  model: 'gemini', latencyMs: 100, rawResponse: '{}',
};

function postScan() {
  return request(makeApp())
    .post('/api/equipment-profiles/5/scan')
    .attach('photo', Buffer.from('fake-image-bytes'), { filename: 'gym.jpg', contentType: 'image/jpeg' });
}

describe('equipmentRoutes /scan atomic multi-item write (P0.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = { id: 10, role: 'trainer' };
    // Trainer 10 owns profile 5.
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 5, trainerId: 10, isActive: true });
    mocks.equipmentItem.findAll.mockResolvedValue([]);
    mocks.equipmentExerciseMap.bulkCreate.mockResolvedValue([]);
    mocks.scan.isEquipmentScanConfigured.mockReturnValue(true);
    mocks.scan.scanEquipmentImageMulti.mockResolvedValue(TWO_ITEM_SCAN);
    mocks.matchExistingEquipment.mockReturnValue(null); // no duplicates
    mocks.persistReview.mockResolvedValue({ sessionId: 'sess-1', candidateRecordCount: 2 });
    mocks.uploadPhoto.mockResolvedValue({ url: 'https://cdn.test/gym.jpg' });
    // Managed transaction: run the callback with a sentinel tx, propagate throws.
    mocks.transaction.mockImplementation(async (cb) => cb(FAKE_T));
  });

  it('threads every item + mapping write through ONE transaction (happy path)', async () => {
    mocks.equipmentItem.create
      .mockResolvedValueOnce({ id: 101 })
      .mockResolvedValueOnce({ id: 102 });

    const res = await postScan();

    expect(res.status).toBe(201);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    // Both item creates carry the transaction handle → real driver commits/rolls back as one.
    expect(mocks.equipmentItem.create).toHaveBeenCalledTimes(2);
    expect(mocks.equipmentItem.create).toHaveBeenNthCalledWith(1, expect.any(Object), { transaction: FAKE_T });
    expect(mocks.equipmentItem.create).toHaveBeenNthCalledWith(2, expect.any(Object), { transaction: FAKE_T });
    // Mapping bulkCreate also inside the tx.
    expect(mocks.equipmentExerciseMap.bulkCreate).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ transaction: FAKE_T, ignoreDuplicates: true }),
    );
    // Best-effort ledger runs AFTER the committed tx.
    expect(mocks.persistReview).toHaveBeenCalledTimes(1);
  });

  it('aborts the whole batch when an item write fails mid-loop (no partial success, no ledger)', async () => {
    // Item 1 succeeds, item 2 throws → the transaction callback rejects.
    mocks.equipmentItem.create
      .mockResolvedValueOnce({ id: 101 })
      .mockRejectedValueOnce(new Error('DB write failed'));

    const res = await postScan();

    expect(res.status).toBe(500);            // failure surfaced, not a 201 with partial items
    expect(res.body.success).toBe(false);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.persistReview).not.toHaveBeenCalled(); // never reached the post-commit ledger
  });
});
