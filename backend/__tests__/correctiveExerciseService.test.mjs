/**
 * correctiveExerciseService regression tests (V3c Slice 1)
 * =========================================================
 *
 * Locks the bridge between `clientIntelligenceService`'s OHSA
 * compensation taxonomy and the V3b.3 NASM CES corrective registry.
 *
 * Coverage:
 *   - Pure mapping: compensation type → V3b.3 nasmCorrectiveCategory tags
 *   - Tag set normalization (string[] vs CIS-shape object[])
 *   - Row-tag matching (handles JSON-string + parsed-array forms)
 *   - Protocol-step grouping
 *   - End-to-end DB query path with a mocked Exercise model
 *   - includeSteps filter narrowing
 */
import { describe, it, expect, vi } from 'vitest';
import {
  mapCompensationToCesTags,
  compensationsToTagSet,
  getCorrectiveExercisesForCompensations,
  __testing__,
} from '../services/ai/correctiveExerciseService.mjs';

const { rowMatchesAnyTag, groupByProtocolStep, COMPENSATION_TO_V3B3_TAGS } = __testing__;

// ─── mapCompensationToCesTags ─────────────────────────────────────

describe('mapCompensationToCesTags', () => {
  it('returns the V3b.3 tag list for a known compensation', () => {
    expect(mapCompensationToCesTags('knee_valgus')).toEqual([
      'knees_cave',
      'pronation_distortion_syndrome',
    ]);
  });

  it('expands head_protrusion to forward_head + UCS', () => {
    expect(mapCompensationToCesTags('head_protrusion')).toEqual([
      'forward_head',
      'upper_crossed_syndrome',
    ]);
  });

  it('returns empty array for unknown types (no throw)', () => {
    expect(mapCompensationToCesTags('totally_made_up_compensation')).toEqual([]);
    expect(mapCompensationToCesTags('')).toEqual([]);
    expect(mapCompensationToCesTags(null)).toEqual([]);
    expect(mapCompensationToCesTags(undefined)).toEqual([]);
    expect(mapCompensationToCesTags(42)).toEqual([]);
  });

  it('covers every compensation type in COMPENSATION_TO_V3B3_TAGS', () => {
    for (const [comp, tags] of Object.entries(COMPENSATION_TO_V3B3_TAGS)) {
      expect(mapCompensationToCesTags(comp)).toEqual(tags);
      expect(tags.length).toBeGreaterThan(0);
    }
  });
});

// ─── compensationsToTagSet ────────────────────────────────────────

describe('compensationsToTagSet', () => {
  it('handles string[] input', () => {
    const result = compensationsToTagSet(['knee_valgus', 'low_back_arch']);
    expect(result).toEqual(expect.arrayContaining([
      'knees_cave',
      'pronation_distortion_syndrome',
      'low_back_arch',
      'lower_crossed_syndrome',
    ]));
    expect(result.length).toBe(4); // deduped
  });

  it('handles object[] input (clientIntelligenceService shape)', () => {
    const result = compensationsToTagSet([
      { type: 'knee_valgus', avgSeverity: 7, frequency: 5 },
      { type: 'arms_fall_forward', avgSeverity: 4, frequency: 3 },
    ]);
    expect(result).toEqual(expect.arrayContaining([
      'knees_cave',
      'pronation_distortion_syndrome',
      'arms_fall_forward',
      'upper_crossed_syndrome',
    ]));
  });

  it('dedupes overlapping tags (head_protrusion + shoulder_elevation share UCS)', () => {
    const result = compensationsToTagSet(['head_protrusion', 'shoulder_elevation']);
    const ucsCount = result.filter((t) => t === 'upper_crossed_syndrome').length;
    expect(ucsCount).toBe(1);
  });

  it('returns empty array for non-array / empty input', () => {
    expect(compensationsToTagSet([])).toEqual([]);
    expect(compensationsToTagSet(null)).toEqual([]);
    expect(compensationsToTagSet('not an array')).toEqual([]);
  });

  it('drops unknown compensation types silently', () => {
    const result = compensationsToTagSet([
      { type: 'knee_valgus' },
      { type: 'fictional_compensation' },
    ]);
    expect(result).toEqual([
      'knees_cave',
      'pronation_distortion_syndrome',
    ]);
  });
});

// ─── rowMatchesAnyTag ─────────────────────────────────────────────

describe('rowMatchesAnyTag', () => {
  it('matches when row has at least one requested tag (parsed array)', () => {
    expect(rowMatchesAnyTag(
      ['knees_cave', 'pronation_distortion_syndrome'],
      ['knees_cave'],
    )).toBe(true);
  });

  it('matches when row tags come as a JSON string', () => {
    expect(rowMatchesAnyTag(
      '["upper_crossed_syndrome","forward_head"]',
      ['forward_head'],
    )).toBe(true);
  });

  it('returns false when row has no overlap with requested tags', () => {
    expect(rowMatchesAnyTag(
      ['low_back_arch'],
      ['knees_cave'],
    )).toBe(false);
  });

  it('returns false for null / empty / malformed row tags', () => {
    expect(rowMatchesAnyTag(null, ['x'])).toBe(false);
    expect(rowMatchesAnyTag([], ['x'])).toBe(false);
    expect(rowMatchesAnyTag('not json', ['x'])).toBe(false);
    expect(rowMatchesAnyTag('{}', ['x'])).toBe(false); // parsed but not an array
  });

  it('returns false for empty requested tags', () => {
    expect(rowMatchesAnyTag(['knees_cave'], [])).toBe(false);
    expect(rowMatchesAnyTag(['knees_cave'], null)).toBe(false);
  });
});

// ─── groupByProtocolStep ──────────────────────────────────────────

describe('groupByProtocolStep', () => {
  it('groups rows by their cesProtocolStep', () => {
    const rows = [
      { id: '1', name: 'Foam Roll Pec', cesProtocolStep: 'inhibit' },
      { id: '2', name: 'Doorway Pec Stretch', cesProtocolStep: 'lengthen' },
      { id: '3', name: 'Wall Slides', cesProtocolStep: 'activate' },
      { id: '4', name: 'Squat to Row', cesProtocolStep: 'integrate' },
    ];
    const grouped = groupByProtocolStep(rows);
    expect(grouped.inhibit).toHaveLength(1);
    expect(grouped.lengthen).toHaveLength(1);
    expect(grouped.activate).toHaveLength(1);
    expect(grouped.integrate).toHaveLength(1);
  });

  it('drops rows whose cesProtocolStep is missing or invalid', () => {
    const rows = [
      { id: '1', name: 'A', cesProtocolStep: 'inhibit' },
      { id: '2', name: 'B', cesProtocolStep: null },
      { id: '3', name: 'C', cesProtocolStep: 'invalid_step' },
      { id: '4', name: 'D' /* missing */ },
    ];
    const grouped = groupByProtocolStep(rows);
    expect(grouped.inhibit).toHaveLength(1);
    expect(grouped.lengthen).toHaveLength(0);
    expect(grouped.activate).toHaveLength(0);
    expect(grouped.integrate).toHaveLength(0);
  });
});

// ─── getCorrectiveExercisesForCompensations (DB integration with mock) ─

function makeFixtureRows() {
  return [
    {
      id: '1', name: 'Foam Roll TFL', exercise_key: 'ces-foam-roll-tfl',
      exerciseType: 'flexibility', bodyPartCategory: 'recovery',
      primaryMuscles: '["TFL"]', secondaryMuscles: '[]',
      nasmCorrectiveCategory: ['lower_crossed_syndrome', 'low_back_arch', 'knees_cave'],
      cesProtocolStep: 'inhibit', sourceCitation: 'NASM-CES Ch. 7', difficulty: 100,
    },
    {
      id: '2', name: 'Lateral Band Walks', exercise_key: 'ces-lateral-band-walks',
      exerciseType: 'injury_prevention', bodyPartCategory: 'recovery',
      primaryMuscles: '["Gluteus Medius"]', secondaryMuscles: '[]',
      nasmCorrectiveCategory: '["pronation_distortion_syndrome","knees_cave"]', // JSON-string form
      cesProtocolStep: 'activate', sourceCitation: 'NASM-CES Ch. 7', difficulty: 200,
    },
    {
      id: '3', name: 'Foam Roll Pec', exercise_key: 'ces-foam-roll-pec',
      exerciseType: 'flexibility', bodyPartCategory: 'recovery',
      primaryMuscles: '["Pectoralis Major"]', secondaryMuscles: '[]',
      nasmCorrectiveCategory: ['upper_crossed_syndrome', 'forward_head'],
      cesProtocolStep: 'inhibit', sourceCitation: 'NASM-CPT 7th ed.', difficulty: 100,
    },
    {
      id: '4', name: 'Squat to Row (Cable)', exercise_key: 'ces-squat-to-row-cable',
      exerciseType: 'compound', bodyPartCategory: 'core',
      primaryMuscles: '["Glutes","Lats"]', secondaryMuscles: '[]',
      nasmCorrectiveCategory: ['upper_crossed_syndrome', 'lower_crossed_syndrome', 'pronation_distortion_syndrome'],
      cesProtocolStep: 'integrate', sourceCitation: 'NASM-CES Ch. 8', difficulty: 350,
    },
  ];
}

function makeMockExercise(rows) {
  return {
    findAll: vi.fn().mockResolvedValue(rows),
  };
}

describe('getCorrectiveExercisesForCompensations', () => {
  it('throws when Exercise model is missing', async () => {
    await expect(
      getCorrectiveExercisesForCompensations({
        compensations: ['knee_valgus'],
        Exercise: undefined,
      }),
    ).rejects.toThrow(/Exercise model is required/);
  });

  it('returns empty groups for empty compensations', async () => {
    const Exercise = makeMockExercise(makeFixtureRows());
    const result = await getCorrectiveExercisesForCompensations({
      compensations: [],
      Exercise,
    });
    expect(result.tags).toEqual([]);
    expect(result.matchedCount).toBe(0);
    expect(result.inhibit).toEqual([]);
    expect(result.activate).toEqual([]);
    // Should NOT have hit the DB.
    expect(Exercise.findAll).not.toHaveBeenCalled();
  });

  it('returns matching ces-* rows grouped by protocol step', async () => {
    const Exercise = makeMockExercise(makeFixtureRows());
    const result = await getCorrectiveExercisesForCompensations({
      compensations: ['knee_valgus'],
      Exercise,
    });
    // knee_valgus → ['knees_cave', 'pronation_distortion_syndrome']
    expect(result.tags).toEqual(['knees_cave', 'pronation_distortion_syndrome']);
    // Foam Roll TFL has knees_cave → inhibit
    // Lateral Band Walks has knees_cave + PDS → activate
    // Squat to Row has PDS → integrate
    // Foam Roll Pec is UCS-only → not matched
    expect(result.matchedCount).toBe(3);
    expect(result.inhibit.map((r) => r.name)).toEqual(['Foam Roll TFL']);
    expect(result.activate.map((r) => r.name)).toEqual(['Lateral Band Walks']);
    expect(result.integrate.map((r) => r.name)).toEqual(['Squat to Row (Cable)']);
    expect(result.lengthen).toEqual([]);
  });

  it('handles compensations in clientIntelligenceService object shape', async () => {
    const Exercise = makeMockExercise(makeFixtureRows());
    const result = await getCorrectiveExercisesForCompensations({
      compensations: [
        { type: 'head_protrusion', avgSeverity: 6, frequency: 4 },
      ],
      Exercise,
    });
    // head_protrusion → ['forward_head', 'upper_crossed_syndrome']
    // Foam Roll Pec has UCS+forward_head → inhibit
    // Squat to Row has UCS → integrate
    expect(result.matchedCount).toBe(2);
    expect(result.inhibit.map((r) => r.name)).toEqual(['Foam Roll Pec']);
    expect(result.integrate.map((r) => r.name)).toEqual(['Squat to Row (Cable)']);
  });

  it('respects includeSteps filter (narrows output)', async () => {
    const Exercise = makeMockExercise(makeFixtureRows());
    const result = await getCorrectiveExercisesForCompensations({
      compensations: ['knee_valgus'],
      Exercise,
      includeSteps: ['inhibit'],
    });
    expect(result.inhibit.length).toBeGreaterThan(0);
    expect(result.activate).toEqual([]);
    expect(result.integrate).toEqual([]);
    expect(result.lengthen).toEqual([]);
  });

  it('returns empty for unknown-only compensations (no DB hit)', async () => {
    const Exercise = makeMockExercise(makeFixtureRows());
    const result = await getCorrectiveExercisesForCompensations({
      compensations: ['nonexistent_compensation'],
      Exercise,
    });
    expect(result.tags).toEqual([]);
    expect(result.matchedCount).toBe(0);
    expect(Exercise.findAll).not.toHaveBeenCalled();
  });
});
