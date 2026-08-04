/**
 * equipmentRoutes POST /:id/scan-sessions/:sessionId/candidates/:candidateIndex/rescan
 * ============================================================================
 * "Scan this spot closer" crop re-scan (Equipment Overhaul S3). Locks:
 *   - profile ownership gate (403 for another trainer's profile)
 *   - 404 for missing session / missing candidate
 *   - 409 when the candidate is not in `possible` status
 *   - 422 when no multipart photo is attached (remote URLs are never fetched)
 *   - identified → EquipmentItem created as approvalStatus 'pending' with the
 *     /scan aiScanData field mapping + ledger candidate flipped possible→approved
 *   - still_uncertain → NO item created, candidate untouched
 *   - re-scans consume the same 10/hr scan rate limiter as /scan
 * Plus pure unit coverage for padAndClampBox (15% pad, [0,1] clamp).
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentUser: { id: 10, role: 'trainer' },
  equipmentProfile: { findByPk: vi.fn() },
  equipmentItem: { findOne: vi.fn(), create: vi.fn() },
  equipmentExerciseMap: { bulkCreate: vi.fn() },
  scanSession: { findOne: vi.fn() },
  scanCandidate: { findOne: vi.fn() },
  scan: { isEquipmentScanConfigured: vi.fn() },
  rescanRegion: vi.fn(),
  recordAction: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...mocks.currentUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));

vi.mock('../../models/index.mjs', () => ({
  getEquipmentProfile: () => mocks.equipmentProfile,
  getEquipmentItem: () => mocks.equipmentItem,
  getEquipmentExerciseMap: () => mocks.equipmentExerciseMap,
  getEquipmentScanSession: () => mocks.scanSession,
  getEquipmentScanCandidate: () => mocks.scanCandidate,
}));

vi.mock('../../database.mjs', () => ({ default: { transaction: vi.fn() } }));

vi.mock('../../services/equipmentScanService.mjs', () => ({
  isEquipmentScanConfigured: mocks.scan.isEquipmentScanConfigured,
  scanEquipmentImageMulti: vi.fn(),
}));

vi.mock('../../services/equipmentScanV2Support.mjs', () => ({
  matchExistingEquipment: vi.fn(),
}));

vi.mock('../../services/equipmentScanReviewPersistence.mjs', () => ({
  persistEquipmentScanReviewSession: vi.fn(),
}));

vi.mock('../../services/equipmentScanReviewOutcomeService.mjs', () => ({
  recordEquipmentScanCandidateAction: mocks.recordAction,
  recordEquipmentScanCandidateReview: vi.fn(),
}));

vi.mock('../../services/photoStorageService.mjs', () => ({ uploadPhoto: vi.fn() }));

vi.mock('../../services/equipmentScanCropRescan.mjs', () => ({
  rescanEquipmentRegion: mocks.rescanRegion,
}));

const equipmentRoutes = (await import('../../routes/equipmentRoutes.mjs')).default;
// Real (unmocked) module for the pure unit tests.
const { padAndClampBox } = await vi.importActual('../../services/equipmentScanCropRescan.mjs');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/equipment-profiles', equipmentRoutes);
  return app;
}

const RESCAN_PATH = '/api/equipment-profiles/5/scan-sessions/7/candidates/2/rescan';

function postRescan(path = RESCAN_PATH) {
  return request(makeApp())
    .post(path)
    .attach('photo', Buffer.from('fake-image-bytes'), { filename: 'gym.jpg', contentType: 'image/jpeg' });
}

const POSSIBLE_CANDIDATE = {
  id: 44,
  sessionId: 7,
  profileId: 5,
  candidateIndex: 2,
  status: 'possible',
  boundingBox: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 },
};

const IDENTIFIED_RESCAN = {
  outcome: 'identified',
  candidate: {
    suggestedName: 'Slam Ball',
    suggestedCategory: 'medicine_ball',
    resistanceType: 'other',
    description: 'Rubber slam ball',
    quantity: 1,
    confidence: 0.82,
    visibility: 'clear',
    boundingBox: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 },
    equipmentKind: 'slam_ball',
    alternateNames: [],
    suggestedExercises: ['Ball Slam'],
    movementPatterns: [],
    targetMuscles: [],
    safetyNotes: '',
    dedupeKey: 'medicine_ball:slam_ball',
    needsHumanReview: true,
    reasoning: 'Clearly a slam ball in the crop',
  },
  schemaVersion: 'equipment_scan_v3',
  promptVersion: 'equipment-region-rescan-v1',
  imageQuality: 'good',
  sceneSummary: 'crop of gym corner',
  croppedToRegion: true,
  regionBox: { x: 0.37, y: 0.37, w: 0.26, h: 0.26 },
  model: 'gemini-test',
  latencyMs: 120,
  rawResponse: '{}',
};

describe('POST /:id/scan-sessions/:sessionId/candidates/:candidateIndex/rescan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = { id: 10, role: 'trainer' };
    // Trainer 10 owns profile 5.
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 5, trainerId: 10, isActive: true, update: vi.fn() });
    mocks.scan.isEquipmentScanConfigured.mockReturnValue(true);
    mocks.scanSession.findOne.mockResolvedValue({ id: 7, profileId: 5, photoUrl: 'https://cdn.test/gym.jpg' });
    mocks.scanCandidate.findOne.mockResolvedValue({ ...POSSIBLE_CANDIDATE });
    mocks.equipmentItem.findOne.mockResolvedValue(null); // no stored-name duplicate
    mocks.equipmentItem.create.mockImplementation(async (v) => ({ id: 321, ...v }));
    mocks.equipmentExerciseMap.bulkCreate.mockResolvedValue([]);
    mocks.rescanRegion.mockResolvedValue(IDENTIFIED_RESCAN);
    mocks.recordAction.mockResolvedValue({ candidateId: 44, sessionId: 7, status: 'approved' });
  });

  it("403s on another trainer's profile without touching the scan ledger", async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 5, trainerId: 99, isActive: true });

    const res = await postRescan();

    expect(res.status).toBe(403);
    expect(mocks.scanSession.findOne).not.toHaveBeenCalled();
    expect(mocks.rescanRegion).not.toHaveBeenCalled();
  });

  it('404s when the scan session does not exist for this profile', async () => {
    mocks.scanSession.findOne.mockResolvedValue(null);

    const res = await postRescan();

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/session/i);
    expect(mocks.rescanRegion).not.toHaveBeenCalled();
  });

  it('404s when the candidate index does not exist in the session', async () => {
    mocks.scanCandidate.findOne.mockResolvedValue(null);

    const res = await postRescan();

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/candidate/i);
    expect(mocks.rescanRegion).not.toHaveBeenCalled();
  });

  it("409s when the candidate is not in 'possible' status", async () => {
    mocks.scanCandidate.findOne.mockResolvedValue({ ...POSSIBLE_CANDIDATE, status: 'created_item' });

    const res = await postRescan();

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/possible/);
    expect(mocks.rescanRegion).not.toHaveBeenCalled();
  });

  it('422s when no photo file is attached (remote URLs are never fetched)', async () => {
    const res = await request(makeApp())
      .post(RESCAN_PATH)
      .field('photoUrl', 'https://evil.example/steal'); // URL is ignored, not fetched

    expect(res.status).toBe(422);
    expect(mocks.rescanRegion).not.toHaveBeenCalled();
  });

  it('identified → creates a pending EquipmentItem with the /scan field mapping and flips the candidate to approved', async () => {
    const res = await postRescan();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.outcome).toBe('identified');
    expect(res.body.item.id).toBe(321);
    expect(res.body.candidate.status).toBe('approved');

    // Item created pending, with the same aiScanData shape /scan writes.
    expect(mocks.equipmentItem.create).toHaveBeenCalledTimes(1);
    const created = mocks.equipmentItem.create.mock.calls[0][0];
    expect(created).toMatchObject({
      profileId: 5,
      photoUrl: 'https://cdn.test/gym.jpg',
      name: 'Slam Ball',
      category: 'medicine_ball',
      approvalStatus: 'pending',
      isActive: true,
    });
    expect(created.aiScanData).toMatchObject({
      schemaVersion: 'equipment_scan_v3',
      promptVersion: 'equipment-region-rescan-v1',
      confidence: 0.82,
      suggestedName: 'Slam Ball',
      candidateIndex: 2,
      rescan: { sessionId: 7, sourceStatus: 'possible', croppedToRegion: true },
    });

    // The service received the uploaded buffer + the candidate's box — never a URL.
    expect(mocks.rescanRegion).toHaveBeenCalledWith(expect.objectContaining({
      imageBuffer: expect.any(Buffer),
      mimeType: 'image/jpeg',
      boundingBox: POSSIBLE_CANDIDATE.boundingBox,
    }));

    // Ledger flip through the EXISTING review-outcome service.
    expect(mocks.recordAction).toHaveBeenCalledWith(expect.objectContaining({
      profileId: 5,
      reviewSessionId: 7,
      candidateIndex: 2,
      candidateStatus: 'possible',
      reviewedBy: 10,
      status: 'approved',
      equipmentItemId: 321,
    }));

    // Model returned exercises → mapped like /scan does.
    expect(mocks.equipmentExerciseMap.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ equipmentItemId: 321, exerciseName: 'Ball Slam', isAiSuggested: true })],
      expect.objectContaining({ ignoreDuplicates: true }),
    );
  });

  it('still_uncertain → no item created, no ledger flip, candidate returned unchanged', async () => {
    mocks.rescanRegion.mockResolvedValue({ ...IDENTIFIED_RESCAN, outcome: 'still_uncertain', candidate: null });

    const res = await postRescan();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, outcome: 'still_uncertain' });
    expect(res.body.candidate.status).toBe('possible');
    expect(mocks.equipmentItem.create).not.toHaveBeenCalled();
    expect(mocks.recordAction).not.toHaveBeenCalled();
  });

  // LAST on purpose: exhausts the shared in-memory 10/hr limiter for trainer 10.
  it('counts against the existing 10/hr scan rate limiter (429 once exhausted)', async () => {
    mocks.rescanRegion.mockResolvedValue({ ...IDENTIFIED_RESCAN, outcome: 'still_uncertain', candidate: null });

    const statuses = [];
    for (let i = 0; i < 12; i++) {
      const res = await postRescan();
      statuses.push(res.status);
    }

    // Earlier tests consumed part of the budget; within 12 more attempts the
    // 10/hr cap MUST trip, and once tripped it stays 429.
    expect(statuses).toContain(429);
    expect(statuses[statuses.length - 1]).toBe(429);
    // 429s never reached the AI service.
    const okCount = statuses.filter(s => s === 200).length;
    expect(mocks.rescanRegion).toHaveBeenCalledTimes(okCount);
  });
});

describe('padAndClampBox (pure unit)', () => {
  it('expands 15% of the box dimension on each side for an interior box', () => {
    const out = padAndClampBox({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 });
    expect(out.x).toBeCloseTo(0.37, 10);
    expect(out.y).toBeCloseTo(0.37, 10);
    expect(out.w).toBeCloseTo(0.26, 10);
    expect(out.h).toBeCloseTo(0.26, 10);
  });

  it('clamps the padded box to the [0,1] frame at the top-left edge', () => {
    const out = padAndClampBox({ x: 0, y: 0, w: 0.5, h: 0.5 });
    expect(out.x).toBe(0);
    expect(out.y).toBe(0);
    expect(out.w).toBeCloseTo(0.575, 10);
    expect(out.h).toBeCloseTo(0.575, 10);
  });

  it('clamps the padded box to the [0,1] frame at the bottom-right edge', () => {
    const out = padAndClampBox({ x: 0.9, y: 0.9, w: 0.1, h: 0.1 });
    expect(out.x).toBeCloseTo(0.885, 10);
    expect(out.y).toBeCloseTo(0.885, 10);
    expect(out.x + out.w).toBeLessThanOrEqual(1);
    expect(out.y + out.h).toBeLessThanOrEqual(1);
    expect(out.w).toBeCloseTo(0.115, 10);
  });

  it('keeps a full-frame box inside [0,1]', () => {
    expect(padAndClampBox({ x: 0, y: 0, w: 1, h: 1 })).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it('returns null for missing, non-numeric, zero-area, or out-of-range boxes', () => {
    expect(padAndClampBox(null)).toBeNull();
    expect(padAndClampBox(undefined)).toBeNull();
    expect(padAndClampBox('0.4,0.4,0.2,0.2')).toBeNull();
    expect(padAndClampBox({ x: 0.4, y: 0.4, w: 0.2 })).toBeNull();          // missing h
    expect(padAndClampBox({ x: 0.4, y: '0.4', w: 0.2, h: 0.2 })).toBeNull(); // non-numeric
    expect(padAndClampBox({ x: 0.4, y: 0.4, w: 0, h: 0.2 })).toBeNull();     // zero width
    expect(padAndClampBox({ x: 1.2, y: 0.4, w: 0.2, h: 0.2 })).toBeNull();   // x out of range
    expect(padAndClampBox({ x: 0.4, y: 0.4, w: 0.2, h: NaN })).toBeNull();
  });
});
