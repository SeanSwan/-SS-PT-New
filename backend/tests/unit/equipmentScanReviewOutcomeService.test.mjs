import { describe, expect, it, vi } from 'vitest';
import {
  recordEquipmentScanCandidateAction,
  recordEquipmentScanCandidateReview,
} from '../../services/equipmentScanReviewOutcomeService.mjs';

function makeCandidate(overrides = {}) {
  const candidate = {
    id: 55,
    sessionId: 77,
    status: 'created_item',
    update: vi.fn(async (updates) => {
      Object.assign(candidate, updates);
      return candidate;
    }),
    ...overrides,
  };
  return candidate;
}

function makeSession(overrides = {}) {
  return {
    id: 77,
    approvedCount: 0,
    rejectedCount: 0,
    createdItemCount: 1,
    ...overrides,
  };
}

function makeModels({ candidate = makeCandidate(), session = makeSession(), failFind = false } = {}) {
  return {
    candidate,
    session,
    EquipmentScanCandidate: {
      findOne: vi.fn(async () => {
        if (failFind) throw new Error('candidate table missing');
        return candidate;
      }),
    },
    EquipmentScanSession: {
      increment: vi.fn(async (deltas) => {
        for (const [field, delta] of Object.entries(deltas)) {
          session[field] = (session[field] || 0) + delta;
        }
        return [session];
      }),
      findByPk: vi.fn(async () => session),
      update: vi.fn(async () => [1]),
    },
  };
}

describe('equipment scan review outcome persistence', () => {
  it('records approval corrections on the scan candidate linked to the equipment item', async () => {
    const models = makeModels();
    const reviewedAt = new Date('2026-06-30T18:00:00.000Z');

    const result = await recordEquipmentScanCandidateReview({
      models,
      now: () => reviewedAt,
      logger: { warn: vi.fn() },
      profileId: 12,
      equipmentItemId: 101,
      reviewedBy: 9,
      status: 'approved',
      trainerCorrection: {
        name: 'Incline Bench',
        trainerLabel: 'Swan bench',
        category: 'bench',
        resistanceType: 'other',
      },
    });

    expect(result).toEqual({ candidateId: 55, sessionId: 77, status: 'approved' });
    expect(models.EquipmentScanCandidate.findOne).toHaveBeenCalledWith({
      where: { equipmentItemId: 101, profileId: 12 },
      order: [['createdAt', 'DESC']],
    });
    expect(models.candidate.update).toHaveBeenCalledWith({
      status: 'approved',
      reviewedAt,
      reviewedBy: 9,
      trainerCorrection: {
        name: 'Incline Bench',
        trainerLabel: 'Swan bench',
        category: 'bench',
        resistanceType: 'other',
      },
    });
    expect(models.EquipmentScanSession.increment).toHaveBeenCalledWith(
      { approvedCount: 1 },
      { where: { id: 77 } },
    );
    expect(models.EquipmentScanSession.update).toHaveBeenCalledWith(
      { status: 'reviewed' },
      { where: { id: 77, status: 'pending_review' } },
    );
  });

  it('keeps the parent session pending until every created scan item is reviewed', async () => {
    const models = makeModels({ session: makeSession({ createdItemCount: 2 }) });

    await recordEquipmentScanCandidateReview({
      models,
      logger: { warn: vi.fn() },
      profileId: 12,
      equipmentItemId: 101,
      reviewedBy: 9,
      status: 'approved',
      trainerCorrection: {},
    });

    expect(models.EquipmentScanSession.increment).toHaveBeenCalledWith(
      { approvedCount: 1 },
      { where: { id: 77 } },
    );
    expect(models.EquipmentScanSession.update).not.toHaveBeenCalled();
  });

  it('adjusts session counters idempotently when a candidate outcome changes', async () => {
    const models = makeModels({
      candidate: makeCandidate({ status: 'approved' }),
      session: makeSession({ approvedCount: 1, rejectedCount: 0, createdItemCount: 1 }),
    });

    await recordEquipmentScanCandidateReview({
      models,
      logger: { warn: vi.fn() },
      profileId: 12,
      equipmentItemId: 101,
      reviewedBy: 9,
      status: 'rejected',
      trainerCorrection: { rejectionReason: 'trainer_rejected_scan' },
    });

    expect(models.EquipmentScanSession.increment).toHaveBeenCalledWith(
      { approvedCount: -1, rejectedCount: 1 },
      { where: { id: 77 } },
    );
  });

  it('fails soft when the optional review candidate row is unavailable', async () => {
    const logger = { warn: vi.fn() };
    const models = makeModels({ failFind: true });

    const result = await recordEquipmentScanCandidateReview({
      models,
      logger,
      profileId: 12,
      equipmentItemId: 101,
      reviewedBy: 9,
      status: 'rejected',
      trainerCorrection: { rejectionReason: 'trainer_rejected_scan' },
    });

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      '[EquipmentScanReviewOutcome] Failed to record scan candidate review outcome (non-fatal)',
      expect.objectContaining({ error: 'candidate table missing', profileId: 12, equipmentItemId: 101, reviewedBy: 9 }),
    );
  });

  it('returns null without warning when no scan candidate is linked to the item', async () => {
    const logger = { warn: vi.fn() };
    const models = makeModels({ candidate: null });

    const result = await recordEquipmentScanCandidateReview({
      models,
      logger,
      profileId: 12,
      equipmentItemId: 101,
      reviewedBy: 9,
      status: 'approved',
      trainerCorrection: {},
    });

    expect(result).toBeNull();
    expect(logger.warn).not.toHaveBeenCalled();
  });
  it('records possible-candidate promotion by review session and candidate index', async () => {
    const models = makeModels({
      candidate: makeCandidate({ status: 'possible', equipmentItemId: null }),
      session: makeSession({ reviewableCount: 2, createdItemCount: 1, approvedCount: 1 }),
    });
    const reviewedAt = new Date('2026-06-30T19:00:00.000Z');

    const result = await recordEquipmentScanCandidateAction({
      models,
      now: () => reviewedAt,
      logger: { warn: vi.fn() },
      profileId: 12,
      reviewSessionId: 77,
      candidateIndex: 4,
      candidateStatus: 'possible',
      reviewedBy: 9,
      status: 'approved',
      equipmentItemId: 41,
      trainerCorrection: {
        name: 'Foam Roller',
        category: 'mobility',
        resistanceType: 'bodyweight',
      },
    });

    expect(result).toEqual({ candidateId: 55, sessionId: 77, status: 'approved' });
    expect(models.EquipmentScanCandidate.findOne).toHaveBeenCalledWith({
      where: { sessionId: 77, profileId: 12, candidateIndex: 4, status: 'possible' },
      order: [['createdAt', 'DESC']],
    });
    expect(models.candidate.update).toHaveBeenCalledWith({
      status: 'approved',
      reviewedAt,
      reviewedBy: 9,
      equipmentItemId: 41,
      trainerCorrection: {
        name: 'Foam Roller',
        category: 'mobility',
        resistanceType: 'bodyweight',
      },
    });
    expect(models.EquipmentScanSession.update).toHaveBeenCalledWith(
      { status: 'reviewed' },
      { where: { id: 77, status: 'pending_review' } },
    );
  });

  it('records duplicate merge by review session and duplicate target', async () => {
    const models = makeModels({ candidate: makeCandidate({ status: 'duplicate', duplicateOfItemId: 7 }) });

    await recordEquipmentScanCandidateAction({
      models,
      logger: { warn: vi.fn() },
      profileId: 12,
      reviewSessionId: 77,
      candidateIndex: 2,
      candidateStatus: 'duplicate',
      reviewedBy: 9,
      status: 'approved',
      equipmentItemId: 7,
      duplicateOfItemId: 7,
      trainerCorrection: {
        name: 'Adjustable Dumbbells',
        category: 'dumbbell',
        resistanceType: 'dumbbell',
      },
    });

    expect(models.EquipmentScanCandidate.findOne).toHaveBeenCalledWith({
      where: { sessionId: 77, profileId: 12, candidateIndex: 2, status: 'duplicate' },
      order: [['createdAt', 'DESC']],
    });
    expect(models.candidate.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'approved',
      equipmentItemId: 7,
      duplicateOfItemId: 7,
      reviewedBy: 9,
    }));
  });
});