import { describe, expect, it } from 'vitest';
import {
  buildEquipmentScanBatch,
  buildDuplicateQuantityMerge,
  buildManualItemDraftFromCandidate,
  findDuplicateMatchedItem,
  formatScanConfidence,
  getBatchBoundingBoxes,
  removeBatchDuplicateItem,
  removeBatchPossibleItem,
  replaceBatchItem,
  shouldAutoOpenScanApproval,
  updateBatchItemStatus,
} from './equipmentScanBatch';
import type { EquipmentItem, EquipmentScanResponse } from '../../hooks/useEquipmentAPI';

const makeItem = (id: number, name: string): EquipmentItem => ({
  id,
  profileId: 1,
  name,
  trainerLabel: null,
  category: 'free_weights',
  resistanceType: null,
  description: null,
  photoUrl: null,
  aiScanData: null,
  approvalStatus: 'pending',
  approvedAt: null,
  isActive: true,
  quantity: 1,
  createdAt: '',
  updatedAt: '',
});

describe('equipment scan batch helpers', () => {
  it('preserves multiple created items plus possible and duplicate candidates', () => {
    const response: EquipmentScanResponse = {
      success: true,
      item: makeItem(1, 'Squat Rack'),
      items: [makeItem(1, 'Squat Rack'), makeItem(2, 'Exercise Bike')],
      scanResult: {
        confidence: 0.92,
        suggestedName: 'Squat Rack',
        suggestedCategory: 'rack',
        suggestedExercises: [],
        boundingBox: null,
      },
      possibleItems: [{
        confidence: 0.42,
        suggestedName: 'Foam Roller',
        suggestedCategory: 'mobility',
        suggestedExercises: [],
        boundingBox: null,
      }],
      duplicates: [{
        confidence: 0.91,
        suggestedName: 'Dumbbell Rack',
        suggestedCategory: 'free_weights',
        suggestedExercises: [],
        boundingBox: null,
        status: 'duplicate',
      }],
      scanSession: { candidateCount: 4, possibleItemCount: 1, duplicateCount: 1 },
    };

    const batch = buildEquipmentScanBatch(response, 'gym.jpg');

    expect(batch?.createdItems.map(item => item.name)).toEqual(['Squat Rack', 'Exercise Bike']);
    expect(batch?.possibleItems).toHaveLength(1);
    expect(batch?.duplicates).toHaveLength(1);
    expect(shouldAutoOpenScanApproval(batch)).toBe(false);
  });

  it('keeps duplicate-only failed scans reviewable instead of collapsing to a plain error', () => {
    const batch = buildEquipmentScanBatch({
      success: false,
      error: 'Detected equipment already exists in this profile.',
      duplicates: [{
        confidence: 0.88,
        suggestedName: 'Dumbbell Rack',
        suggestedCategory: 'free_weights',
        suggestedExercises: [],
        boundingBox: null,
        status: 'duplicate',
      }],
    }, 'duplicate.jpg');

    expect(batch?.createdItems).toHaveLength(0);
    expect(batch?.duplicates[0].suggestedName).toBe('Dumbbell Rack');
    expect(formatScanConfidence(0.876)).toBe('88% confidence');
  });
  it('replaces a batch item with the approved API response', () => {
    const batch = buildEquipmentScanBatch({
      success: true,
      item: makeItem(1, 'Squat Rack'),
      items: [makeItem(1, 'Squat Rack'), makeItem(2, 'Exercise Bike')],
      scanResult: null,
    }, 'gym.jpg');

    const updated = replaceBatchItem(batch, { ...makeItem(2, 'Trainer Bike'), approvalStatus: 'approved' });

    expect(updated?.createdItems.map(item => `${item.name}:${item.approvalStatus}`)).toEqual([
      'Squat Rack:pending',
      'Trainer Bike:approved',
    ]);
  });

  it('normalizes V2 candidate bounding boxes for photo overlays', () => {
    const rack = {
      ...makeItem(1, 'Squat Rack'),
      aiScanData: {
        confidence: 0.92,
        boundingBox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
        suggestedName: 'Squat Rack',
        suggestedCategory: 'rack',
        suggestedExercises: [],
        rawResponse: {},
        latencyMs: 1,
        model: 'gemini',
        scannedAt: '',
      },
    };
    const batch = buildEquipmentScanBatch({
      success: true,
      item: rack,
      items: [rack],
      scanResult: null,
      possibleItems: [{
        confidence: 0.42,
        suggestedName: 'Foam Roller',
        suggestedCategory: 'mobility',
        suggestedExercises: [],
        boundingBox: { x: 74, y: 64, w: 18, h: 16 },
      }],
    }, 'gym.jpg');

    expect(batch ? getBatchBoundingBoxes(batch) : []).toEqual([
      expect.objectContaining({ label: 'Squat Rack', left: 10, top: 20, width: 30, height: 40 }),
      expect.objectContaining({ label: 'Foam Roller', left: 74, top: 64, width: 18, height: 16 }),
    ]);
  });

  it('maps possible scan candidates into manual item drafts and removes them after add', () => {
    const batch = buildEquipmentScanBatch({
      success: true,
      item: null,
      items: [],
      scanResult: null,
      possibleItems: [{
        confidence: 0.42,
        suggestedName: 'Foam Roller',
        suggestedCategory: 'mobility',
        resistanceType: 'bodyweight',
        description: 'Soft tissue work',
        quantity: 2.4,
        suggestedExercises: [],
        boundingBox: null,
      }],
    }, 'gym.jpg');

    expect(buildManualItemDraftFromCandidate(batch!.possibleItems[0])).toEqual({
      name: 'Foam Roller',
      category: 'mobility',
      resistanceType: 'bodyweight',
      description: 'Soft tissue work',
      quantity: 2,
    });
    expect(removeBatchPossibleItem(batch, 0)).toBeNull();
  });

  it('maps duplicate scan candidates into matched item quantity merges', () => {
    const matchedItem = { ...makeItem(7, 'Adjustable Dumbbells'), approvalStatus: 'manual' as const, quantity: 1 };
    const batch = buildEquipmentScanBatch({
      success: true,
      item: null,
      items: [],
      scanResult: null,
      duplicates: [{
        confidence: 0.91,
        suggestedName: 'Adjustable Dumbbells',
        suggestedCategory: 'dumbbell',
        resistanceType: 'dumbbell',
        quantity: 2,
        duplicateOfItemId: 7,
        suggestedExercises: [],
        boundingBox: null,
        status: 'duplicate',
      }],
    }, 'gym.jpg');

    expect(findDuplicateMatchedItem([matchedItem], batch!.duplicates[0])).toEqual(matchedItem);
    expect(buildDuplicateQuantityMerge(matchedItem, batch!.duplicates[0])).toEqual({ quantity: 3 });
    expect(removeBatchDuplicateItem(batch, 0)).toBeNull();
  });
  it('updates batch item status after approval without mutating other pending items', () => {
    const batch = buildEquipmentScanBatch({
      success: true,
      item: makeItem(1, 'Squat Rack'),
      items: [makeItem(1, 'Squat Rack'), makeItem(2, 'Exercise Bike')],
      scanResult: null,
    }, 'gym.jpg');

    const updated = updateBatchItemStatus(batch, 2, 'approved');

    expect(updated?.createdItems.map(item => item.approvalStatus)).toEqual(['pending', 'approved']);
  });
});