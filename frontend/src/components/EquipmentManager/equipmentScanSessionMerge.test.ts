/**
 * equipmentScanSessionMerge tests — S7 Walk-the-Gym cross-photo dedupe.
 * Pure-logic coverage: cross-batch dupe kept-once + receipt correctness,
 * possible-item dedupe, degraded-file collection, single-batch passthrough.
 */
import { describe, it, expect } from 'vitest';
import type { EquipmentItem, EquipmentScanCandidate, EquipmentScanDuplicate } from '../../hooks/useEquipmentAPI';
import type { EquipmentScanBatch } from './equipmentScanBatch';
import { countBatchDetections, mergeScanBatches } from './equipmentScanSessionMerge';

const makeItem = (id: number, name: string, category = 'free_weights', trainerLabel: string | null = null): EquipmentItem => ({
  id,
  profileId: 1,
  name,
  trainerLabel,
  category,
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

const makeCandidate = (name: string, category = 'mobility'): EquipmentScanCandidate => ({
  confidence: 0.4,
  suggestedName: name,
  suggestedCategory: category,
  suggestedExercises: [],
  boundingBox: null,
});

const makeDuplicate = (name: string, category = 'free_weights'): EquipmentScanDuplicate => ({
  ...makeCandidate(name, category),
  confidence: 0.9,
  status: 'duplicate',
});

const makeBatch = (fileName: string, overrides: Partial<EquipmentScanBatch> = {}): EquipmentScanBatch => ({
  fileName,
  createdItems: [],
  possibleItems: [],
  duplicates: [],
  ...overrides,
});

describe('mergeScanBatches', () => {
  it('passes a single batch through unchanged with an empty receipt', () => {
    const batch = makeBatch('gym.jpg', {
      createdItems: [makeItem(1, 'Squat Rack', 'rack')],
      possibleItems: [makeCandidate('Foam Roller')],
      degraded: true,
    });

    const result = mergeScanBatches([batch]);

    expect(result.merged).toBe(batch); // identity: single-photo runs are untouched
    expect(result.receipt).toEqual([]);
    expect(result.degradedFiles).toEqual(['gym.jpg']);
  });

  it('keeps the FIRST occurrence of a cross-batch duplicate and writes a receipt entry', () => {
    const photo1 = makeBatch('photo1.jpg', {
      createdItems: [makeItem(1, 'Dumbbell Rack', 'free_weights'), makeItem(2, 'Exercise Bike', 'cardio')],
    });
    const photo2 = makeBatch('photo2.jpg', {
      createdItems: [makeItem(3, 'Dumbbell Rack', 'free_weights'), makeItem(4, 'Bench', 'bench')],
    });

    const { merged, receipt } = mergeScanBatches([photo1, photo2]);

    expect(merged.createdItems.map(item => item.id)).toEqual([1, 2, 4]); // id 3 dropped, first kept
    expect(receipt).toEqual([{
      keptLabel: 'Dumbbell Rack',
      keptFile: 'photo1.jpg',
      droppedFile: 'photo2.jpg',
      key: 'dumbbell rack|free_weights',
    }]);
    expect(merged.fileName).toBe('2 photos');
  });

  it('matches on trainerLabel when present and is case/whitespace-insensitive', () => {
    const photo1 = makeBatch('a.jpg', {
      createdItems: [makeItem(1, 'AI Name', 'rack', '  Squat Rack ')],
    });
    const photo2 = makeBatch('b.jpg', {
      createdItems: [makeItem(2, 'squat rack', 'rack')],
    });

    const { merged, receipt } = mergeScanBatches([photo1, photo2]);

    expect(merged.createdItems.map(item => item.id)).toEqual([1]);
    expect(receipt).toHaveLength(1);
    expect(receipt[0].keptLabel).toBe('  Squat Rack ');
  });

  it('does NOT merge same name with a different category', () => {
    const photo1 = makeBatch('a.jpg', { createdItems: [makeItem(1, 'Rack', 'rack')] });
    const photo2 = makeBatch('b.jpg', { createdItems: [makeItem(2, 'Rack', 'bench')] });

    const { merged, receipt } = mergeScanBatches([photo1, photo2]);

    expect(merged.createdItems).toHaveLength(2);
    expect(receipt).toEqual([]);
  });

  it('preserves same-photo repeats (only CROSS-photo occurrences are dropped)', () => {
    const photo1 = makeBatch('a.jpg', {
      createdItems: [makeItem(1, 'Kettlebell', 'kettlebell'), makeItem(2, 'Kettlebell', 'kettlebell')],
    });
    const photo2 = makeBatch('b.jpg', {
      createdItems: [makeItem(3, 'Kettlebell', 'kettlebell')],
    });

    const { merged, receipt } = mergeScanBatches([photo1, photo2]);

    expect(merged.createdItems.map(item => item.id)).toEqual([1, 2]);
    expect(receipt).toHaveLength(1);
    expect(receipt[0].droppedFile).toBe('b.jpg');
  });

  it('dedupes possibleItems and duplicates in their own pools, never across pools', () => {
    const photo1 = makeBatch('a.jpg', {
      createdItems: [makeItem(1, 'Foam Roller', 'mobility')],
      possibleItems: [makeCandidate('Foam Roller', 'mobility'), makeCandidate('Stability Ball')],
      duplicates: [makeDuplicate('Dumbbell Rack')],
    });
    const photo2 = makeBatch('b.jpg', {
      possibleItems: [makeCandidate('Foam Roller', 'mobility')],
      duplicates: [makeDuplicate('Dumbbell Rack')],
    });

    const { merged, receipt } = mergeScanBatches([photo1, photo2]);

    // Cross-pool: photo1's possible Foam Roller survives beside its created twin.
    expect(merged.createdItems).toHaveLength(1);
    expect(merged.possibleItems.map(candidate => candidate.suggestedName)).toEqual(['Foam Roller', 'Stability Ball']);
    expect(merged.duplicates).toHaveLength(1);
    expect(receipt).toEqual([
      { keptLabel: 'Foam Roller', keptFile: 'a.jpg', droppedFile: 'b.jpg', key: 'foam roller|mobility' },
      { keptLabel: 'Dumbbell Rack', keptFile: 'a.jpg', droppedFile: 'b.jpg', key: 'dumbbell rack|free_weights' },
    ]);
  });

  it('collects degraded file names and never flags the merged batch degraded', () => {
    const photo1 = makeBatch('a.jpg', { createdItems: [makeItem(1, 'Rack', 'rack')], degraded: true });
    const photo2 = makeBatch('b.jpg', { createdItems: [makeItem(2, 'Bike', 'cardio')] });
    const photo3 = makeBatch('c.jpg', { createdItems: [makeItem(3, 'Bench', 'bench')], degraded: true });

    const result = mergeScanBatches([photo1, photo2, photo3]);

    expect(result.degradedFiles).toEqual(['a.jpg', 'c.jpg']);
    expect(result.merged.degraded).toBeUndefined();
  });

  it('omits scanSession on the merged batch so per-photo review sessions cannot cross-attribute', () => {
    const photo1 = makeBatch('a.jpg', {
      createdItems: [makeItem(1, 'Rack', 'rack')],
      scanSession: { reviewSessionId: 11, candidateCount: 1 },
    });
    const photo2 = makeBatch('b.jpg', {
      createdItems: [makeItem(2, 'Bike', 'cardio')],
      scanSession: { reviewSessionId: 22, candidateCount: 1 },
    });

    const { merged } = mergeScanBatches([photo1, photo2]);

    expect(merged.scanSession).toBeUndefined();
  });

  it('handles empty input without throwing', () => {
    const result = mergeScanBatches([]);
    expect(result.merged.createdItems).toEqual([]);
    expect(result.receipt).toEqual([]);
    expect(result.degradedFiles).toEqual([]);
  });
});

describe('countBatchDetections', () => {
  it('counts created + possible + duplicate detections', () => {
    const batch = makeBatch('a.jpg', {
      createdItems: [makeItem(1, 'Rack', 'rack')],
      possibleItems: [makeCandidate('Foam Roller')],
      duplicates: [makeDuplicate('Dumbbell Rack')],
    });
    expect(countBatchDetections(batch)).toBe(3);
  });
});
