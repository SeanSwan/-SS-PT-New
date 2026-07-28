import { describe, expect, it } from 'vitest';

import {
  buildStrictEquipmentEvidence,
  filterExercisesForStrictEquipment,
  summarizeBootcampSelectionEvidence,
} from '../../services/bootcamp/bootcampIntelligenceEngine.mjs';

const exercise = (overrides = {}) => ({
  key: 'goblet_squat',
  name: 'Goblet Squat',
  equipment: ['dumbbell'],
  muscles: ['quads', 'glutes'],
  videoUrl: null,
  previewVideoUrl: null,
  thumbnailUrl: null,
  ...overrides,
});

describe('bootcampIntelligenceEngine strict equipment evidence', () => {
  it('rejects exercises that require equipment missing from the selected location profile', () => {
    const result = filterExercisesForStrictEquipment([
      exercise({ key: 'cable_row', name: 'Cable Row', equipment: ['cable machine'] }),
      exercise({ key: 'push_up', name: 'Push Up', equipment: ['bodyweight'] }),
    ], {
      availableEquipment: ['bodyweight', 'dumbbell'],
      equipmentMappings: [],
      strictEquipment: true,
    });

    expect(result.allowed.map((item) => item.key)).toEqual(['push_up']);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].missingEquipment).toEqual(['cable machine']);
  });

  it('uses confirmed Equipment Manager mappings as authoritative location evidence', () => {
    const evidence = buildStrictEquipmentEvidence(
      exercise({ key: 'sled_push', name: 'Sled Push', equipment: ['sled'] }),
      {
        availableEquipment: ['bodyweight'],
        equipmentMappings: [
          { exerciseKey: 'sled_push', exerciseName: 'Sled Push', confirmed: true, equipmentItemId: 42 },
        ],
        strictEquipment: true,
      },
    );

    expect(evidence.allowed).toBe(true);
    expect(evidence.missingEquipment).toEqual([]);
    expect(evidence.matchedEquipment).toContain('equipment-map:42');
    expect(evidence.selectionReason).toContain('confirmed equipment mapping');
  });

  it('adds selection evidence and media status to allowed exercises', () => {
    const result = filterExercisesForStrictEquipment([
      exercise({
        key: 'goblet_squat',
        name: 'Goblet Squat',
        equipment: ['dumbbell'],
        previewVideoUrl: 'https://cdn.example.com/goblet-loop.webm',
      }),
    ], {
      availableEquipment: ['dumbbell'],
      equipmentMappings: [],
      strictEquipment: true,
    });

    expect(result.allowed).toHaveLength(1);
    expect(result.allowed[0].equipmentEvidence).toEqual(['dumbbell']);
    expect(result.allowed[0].missingEquipment).toEqual([]);
    expect(result.allowed[0].mediaStatus).toBe('preview_video');
    expect(result.allowed[0].selectionReason).toContain('available equipment');
    expect(result.allowed[0].scoreBreakdown.equipment).toBeGreaterThan(0);
  });

  it('summarizes missing equipment counts from rejected candidates', () => {
    const result = filterExercisesForStrictEquipment([
      exercise({ key: 'cable_row', name: 'Cable Row', equipment: ['cable machine'] }),
      exercise({ key: 'lat_pulldown', name: 'Lat Pulldown', equipment: ['cable machine'] }),
      exercise({ key: 'bench_press', name: 'Bench Press', equipment: ['bench', 'barbell'] }),
    ], {
      availableEquipment: ['bodyweight', 'dumbbell'],
      equipmentMappings: [],
      strictEquipment: true,
    });

    expect(result.missingEquipmentCounts).toEqual({
      'cable machine': 2,
      bench: 1,
      barbell: 1,
    });
  });

  it('summarizes the strict equipment pass for coach-facing explanations', () => {
    const summary = summarizeBootcampSelectionEvidence({
      strictEquipment: true,
      allowedCount: 9,
      rejectedCount: 3,
    });

    expect(summary.type).toBe('equipment');
    expect(summary.message).toContain('9 location-compatible exercises');
    expect(summary.message).toContain('3 unavailable-equipment candidates removed');
  });

  it('returns first-class insufficient_equipment metadata when strict equipment leaves too few planned slots', () => {
    const summary = summarizeBootcampSelectionEvidence({
      strictEquipment: true,
      allowedCount: 2,
      rejectedCount: 5,
      missingEquipmentCounts: {
        'cable machine': 3,
        bench: 2,
      },
    }, { requiredSlots: 12 });

    expect(summary).toMatchObject({
      type: 'insufficient_equipment',
      code: 'insufficient_equipment',
      severity: 'warning',
      allowedCount: 2,
      rejectedCount: 5,
      requiredSlots: 12,
      missingEquipmentCounts: {
        'cable machine': 3,
        bench: 2,
      },
    });
    expect(summary.message).toContain('Only 2 location-compatible exercises for 12 planned non-cardio slots');
    expect(summary.message).toContain('Missing most often: cable machine (3), bench (2)');
  });
});
