import { describe, expect, it, vi } from 'vitest';
import { persistEquipmentScanReviewSession } from '../../services/equipmentScanReviewPersistence.mjs';

const makeCandidate = (overrides = {}) => ({
  suggestedName: 'Adjustable Bench',
  suggestedCategory: 'bench',
  category: 'bench',
  resistanceType: 'other',
  description: 'Adjustable flat/incline bench',
  quantity: 1,
  confidence: 0.86,
  visibility: 'clear',
  boundingBox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
  suggestedExercises: ['Incline Press'],
  movementPatterns: ['push'],
  targetMuscles: ['chest'],
  alternateNames: ['Workout Bench'],
  safetyNotes: 'Inspect padding.',
  dedupeKey: 'bench_adjustable_bench',
  needsHumanReview: true,
  reasoning: 'Clearly visible bench.',
  ...overrides,
});

function makeModels({ failSession = false, failCandidates = false } = {}) {
  const createdSessions = [];
  const createdCandidates = [];
  return {
    createdSessions,
    createdCandidates,
    EquipmentScanSession: {
      create: vi.fn(async (row) => {
        if (failSession) throw new Error('table missing');
        const session = { id: 77, ...row };
        session.update = vi.fn(async (updates) => {
          Object.assign(session, updates);
          return session;
        });
        createdSessions.push(session);
        return session;
      }),
    },
    EquipmentScanCandidate: {
      bulkCreate: vi.fn(async (rows) => {
        if (failCandidates) throw new Error('candidate table missing');
        createdCandidates.push(...rows);
        return rows;
      }),
    },
  };
}

describe('equipment scan review persistence', () => {
  it('persists one scan session with created, duplicate, and possible candidate rows', async () => {
    const models = makeModels();
    const createdCandidate = makeCandidate({ suggestedName: 'Adjustable Bench', dedupeKey: 'bench_adjustable_bench' });
    const duplicateCandidate = makeCandidate({ suggestedName: 'Dumbbell Rack', suggestedCategory: 'dumbbell', category: 'dumbbell', dedupeKey: 'dumbbell_rack' });
    const possibleCandidate = makeCandidate({ suggestedName: 'Resistance Bands', suggestedCategory: 'resistance_band', category: 'resistance_band', confidence: 0.42, visibility: 'partial', dedupeKey: 'resistance_band' });

    const result = await persistEquipmentScanReviewSession({
      models,
      logger: { warn: vi.fn() },
      profile: { id: 12 },
      trainerId: 9,
      photoUrl: 'https://cdn.example/scan.jpg',
      scanSession: {
        schemaVersion: 'equipment_scan_v2',
        promptVersion: 'equipment-multi-inventory-v1',
        imageQuality: 'good',
        sceneSummary: 'Rack, bench, and bands.',
        candidates: [createdCandidate, duplicateCandidate, possibleCandidate],
        items: [createdCandidate, duplicateCandidate],
        possibleItems: [possibleCandidate],
        rawResponse: { items: [{ suggestedName: 'raw' }] },
        latencyMs: 432,
        model: 'gemini-2.5-flash',
      },
      createdCandidateRecords: [
        { candidateIndex: 0, candidate: createdCandidate, itemId: 101 },
      ],
      duplicateCandidates: [
        { ...duplicateCandidate, candidateIndex: 1, duplicateOfItemId: 201, matchType: 'dedupe_key', status: 'duplicate' },
      ],
    });

    expect(result).toEqual({ sessionId: 77, candidateRecordCount: 3 });
    expect(models.EquipmentScanSession.create).toHaveBeenCalledWith(expect.objectContaining({
      profileId: 12,
      trainerId: 9,
      photoUrl: 'https://cdn.example/scan.jpg',
      schemaVersion: 'equipment_scan_v2',
      promptVersion: 'equipment-multi-inventory-v1',
      imageQuality: 'good',
      sceneSummary: 'Rack, bench, and bands.',
      model: 'gemini-2.5-flash',
      latencyMs: 432,
      candidateCount: 3,
      reviewableCount: 2,
      possibleItemCount: 1,
      duplicateCount: 1,
      createdItemCount: 1,
      status: 'pending_review',
    }));
    expect(models.createdCandidates).toHaveLength(3);
    expect(models.createdCandidates.map((row) => row.status)).toEqual(['created_item', 'duplicate', 'possible']);
    expect(models.createdCandidates[0]).toEqual(expect.objectContaining({
      sessionId: 77,
      profileId: 12,
      equipmentItemId: 101,
      candidateIndex: 0,
      suggestedName: 'Adjustable Bench',
      dedupeKey: 'bench_adjustable_bench',
    }));
    expect(models.createdCandidates[1]).toEqual(expect.objectContaining({
      duplicateOfItemId: 201,
      matchType: 'dedupe_key',
      status: 'duplicate',
    }));
    expect(models.createdCandidates[2]).toEqual(expect.objectContaining({
      status: 'possible',
      confidence: 0.42,
      candidateData: expect.objectContaining({ suggestedName: 'Resistance Bands' }),
    }));
  });

  it('fails soft so scanning still succeeds if the optional ledger table is unavailable', async () => {
    const logger = { warn: vi.fn() };
    const models = makeModels({ failSession: true });

    const result = await persistEquipmentScanReviewSession({
      models,
      logger,
      profile: { id: 12 },
      trainerId: 9,
      photoUrl: null,
      scanSession: {
        candidates: [makeCandidate()],
        items: [makeCandidate()],
        possibleItems: [],
      },
      createdCandidateRecords: [{ candidateIndex: 0, candidate: makeCandidate(), itemId: 101 }],
      duplicateCandidates: [],
    });

    expect(result).toBeNull();
    expect(models.EquipmentScanCandidate.bulkCreate).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      '[EquipmentScanReviewPersistence] Failed to persist scan review ledger (non-fatal)',
      expect.objectContaining({ error: 'table missing', profileId: 12, trainerId: 9 }),
    );
  });


  it('marks a partially persisted scan session failed if candidate row persistence breaks', async () => {
    const logger = { warn: vi.fn() };
    const models = makeModels({ failCandidates: true });

    const result = await persistEquipmentScanReviewSession({
      models,
      logger,
      profile: { id: 12 },
      trainerId: 9,
      photoUrl: null,
      scanSession: {
        candidates: [makeCandidate()],
        items: [makeCandidate()],
        possibleItems: [],
      },
      createdCandidateRecords: [{ candidateIndex: 0, candidate: makeCandidate(), itemId: 101 }],
      duplicateCandidates: [],
    });

    expect(result).toBeNull();
    expect(models.createdSessions).toHaveLength(1);
    expect(models.createdSessions[0].update).toHaveBeenCalledWith({ status: 'failed' });
    expect(logger.warn).toHaveBeenCalledWith(
      '[EquipmentScanReviewPersistence] Failed to persist scan review ledger (non-fatal)',
      expect.objectContaining({ error: 'candidate table missing', profileId: 12, trainerId: 9 }),
    );
  });
});