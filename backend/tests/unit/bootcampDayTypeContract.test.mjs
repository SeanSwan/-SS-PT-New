/**
 * SWA-105 Slice 1 — day-type contract, small-class collapse, equipment
 * feasibility. The D1 regression lives here: the exact exercise shape that
 * passed the old `.some()` filter must now be rejected.
 */
import { describe, expect, it } from 'vitest';

import {
  toCoreMovement, applyDayTypeContract, budgetGate,
} from '../../services/bootcamp/dayTypeContract.mjs';
import {
  buildEquipmentCountMap, collapseStationCountForParticipants, assessEquipmentFeasibility,
} from '../../services/bootcamp/bootcampCapacity.mjs';
import { __testing__ } from '../../services/bootcamp/bootcampGenerator.mjs';

const UPPERS = [
  { key: 'db_bench', muscles: ['chest', 'triceps'], category: 'push' },
  { key: 'row', muscles: ['lats', 'biceps'], category: 'pull' },
  { key: 'curl', muscles: ['biceps'], category: 'pull' },
  { key: 'ohp', name: 'Overhead Press', muscles: ['anterior_deltoid', 'triceps'], category: 'push' },
];

describe('D1 regression — the day-type contract replaces the .some() filter', () => {
  it('rejects a core-tagged squat on upper day (the exact shape that passed before)', () => {
    const gobletSquat = { key: 'goblet_squat', muscles: ['quads', 'core'], category: 'squat' };
    const result = applyDayTypeContract([...UPPERS, gobletSquat], 'upper_body', 3);

    expect(result.ladderStep).toBe('contract');
    expect(result.pool.map((e) => e.key)).not.toContain('goblet_squat');
    expect(result.rejected.excludedPattern + result.rejected.wrongRegion).toBeGreaterThan(0);
  });

  it('rejects a squat on upper day even when mis-tagged with an upper primary muscle', () => {
    // Muscle tags lie; the pattern exclusion is the backstop.
    const liar = { key: 'sneaky_squat', muscles: ['anterior_deltoid'], category: 'squat' };
    const result = applyDayTypeContract([...UPPERS, liar], 'upper_body', 3);
    expect(result.pool.map((e) => e.key)).not.toContain('sneaky_squat');
  });

  it('ADMITS a traps-primary pull the old filter wrongly dropped', () => {
    // DAY_TYPE_MUSCLES upper list has no `traps`, so `.some()` excluded shrugs
    // from upper day. The region map knows better.
    const shrug = { key: 'db_shrug', muscles: ['traps'], category: 'pull' };
    const result = applyDayTypeContract([...UPPERS, shrug], 'upper_body', 3);
    expect(result.pool.map((e) => e.key)).toContain('db_shrug');
  });

  it('rejects presses and rows on lower day', () => {
    const lowers = [
      { key: 'back_squat', muscles: ['quads', 'glutes'], category: 'squat' },
      { key: 'rdl', muscles: ['hamstrings', 'glutes'], category: 'hinge' },
    ];
    const bench = { key: 'db_bench', muscles: ['chest'], category: 'push' };
    const result = applyDayTypeContract([...lowers, bench], 'lower_body', 2);
    expect(result.pool.map((e) => e.key)).not.toContain('db_bench');
    expect(result.pool.length).toBe(2);
  });

  it('excludes unclassifiable exercises instead of guessing them in', () => {
    const mystery = { key: 'mystery', muscles: ['unknown_token'], category: 'push' };
    const result = applyDayTypeContract([...UPPERS, mystery], 'upper_body', 3);
    expect(result.pool.map((e) => e.key)).not.toContain('mystery');
    expect(result.rejected.unclassified).toBe(1);
  });

  it('annotates admitted exercises with their core movement for downstream gates', () => {
    const result = applyDayTypeContract(UPPERS, 'upper_body', 3);
    for (const exercise of result.pool) {
      expect(exercise.coreMovement?.primaryRegion).toBe('upper');
    }
  });
});

describe('the fail-open ladder — the class always generates', () => {
  it('drops pattern exclusions when the strict pool cannot fill the class', () => {
    // Region-legal but pattern-excluded on upper day: squats tagged upper.
    const patternExcluded = [
      { key: 'landmine_squat_press', muscles: ['anterior_deltoid'], category: 'squat' },
      { key: 'thruster', muscles: ['anterior_deltoid'], category: 'squat' },
    ];
    const result = applyDayTypeContract([UPPERS[0], ...patternExcluded], 'upper_body', 3);
    expect(result.ladderStep).toBe('no_pattern_exclusions');
    expect(result.pool.length).toBe(3);
    expect(result.explanation).toMatch(/RELAXED/);
  });

  it('falls back to the unfiltered pool, loudly, when even the relaxed pool starves', () => {
    const wrongDay = [
      { key: 'back_squat', muscles: ['quads'], category: 'squat' },
      { key: 'rdl', muscles: ['hamstrings'], category: 'hinge' },
    ];
    const result = applyDayTypeContract(wrongDay, 'upper_body', 4);
    expect(result.ladderStep).toBe('unfiltered');
    expect(result.pool.length).toBe(2);
    expect(result.explanation).toMatch(/could not fill/);
  });
});

describe('volume budget gate — one region cannot eat the class', () => {
  it('caps lower-body on full-body day once the share is spent', () => {
    const lower = { primaryRegion: 'lower', regions: ['lower'], pattern: 'squat', joints: [], impact: 'low' };
    // full_body caps lower at 0.45; 6 slots => max(1, floor(2.7)) = 2.
    const gate = budgetGate('full_body', [lower, lower], 6);
    expect(gate({ coreMovement: lower })).toBe(false);
    expect(gate({ coreMovement: { ...lower, primaryRegion: 'upper' } })).toBe(true);
  });

  it('never blocks an unclassified candidate (budget only budgets)', () => {
    const gate = budgetGate('full_body', [], 6);
    expect(gate({ key: 'mystery' })).toBe(true);
  });
});

describe('small-class collapse (R10.4 — the real 6am class is 4 people)', () => {
  it('collapses 4 stations to 2 for 4 participants', () => {
    expect(collapseStationCountForParticipants(4, 4)).toEqual({ stationCount: 2, collapsed: true });
  });

  it('collapses to a single station for 3 participants', () => {
    expect(collapseStationCountForParticipants(4, 3)).toEqual({ stationCount: 1, collapsed: true });
  });

  it('leaves a well-attended class alone', () => {
    expect(collapseStationCountForParticipants(4, 12)).toEqual({ stationCount: 4, collapsed: false });
  });

  it('never touches full_group (stationCount 0) or nonsense inputs', () => {
    expect(collapseStationCountForParticipants(0, 4).collapsed).toBe(false);
    expect(collapseStationCountForParticipants(4, 0).collapsed).toBe(false);
  });
});

describe('equipment feasibility on real quantities (§5.8)', () => {
  const items = [
    { name: 'Kettlebell 16kg', category: 'kettlebell', quantity: 2 },
    { name: 'Adjustable Dumbbells', category: 'dumbbell', quantity: 8 },
    { name: 'Flat Bench', category: 'bench' }, // no quantity -> conservative 1
  ];

  it('sums quantities per normalized token', () => {
    const counts = buildEquipmentCountMap(items);
    expect(counts.kettlebell).toBe(2);
    expect(counts.dumbbell).toBe(8);
    expect(counts.bench).toBe(1);
  });

  it('flags a station whose implement count is below people-per-station', () => {
    const stations = [
      { stationName: 'Station 1: Quads', equipmentTokens: ['kettlebell'] },
      { stationName: 'Station 2: Chest', equipmentTokens: ['dumbbell'] },
    ];
    const findings = assessEquipmentFeasibility({
      stations,
      equipmentCounts: buildEquipmentCountMap(items),
      expectedParticipants: 14,
      stationCount: 3, // ~5 people per station
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/kettlebell x2/);
    expect(stations[0].equipmentTight).toBe(true);
    expect(stations[1].equipmentTight).toBeUndefined();
  });

  it('skips bodyweight and unknown tokens — unknown is not zero', () => {
    const stations = [{ stationName: 'S', equipmentTokens: ['bodyweight', 'battle_rope'] }];
    const findings = assessEquipmentFeasibility({
      stations, equipmentCounts: { kettlebell: 2 }, expectedParticipants: 12, stationCount: 2,
    });
    expect(findings).toHaveLength(0);
  });

  it('cannot judge without counts (null map = no findings, never false confidence)', () => {
    const stations = [{ stationName: 'S', equipmentTokens: ['kettlebell'] }];
    expect(assessEquipmentFeasibility({
      stations, equipmentCounts: null, expectedParticipants: 12, stationCount: 2,
    })).toHaveLength(0);
  });
});

describe('selection fallback honors the budget gate', () => {
  it('prefers budget-legal picks in the fallback and never starves a slot', () => {
    const lowerMove = { primaryRegion: 'lower', regions: ['lower'], pattern: 'squat', joints: [], impact: 'low' };
    const upperMove = { primaryRegion: 'upper', regions: ['upper'], pattern: 'push_horizontal', joints: [], impact: 'low' };
    const pool = [
      { key: 'squat_a', muscles: ['quads'], coreMovement: lowerMove },
      { key: 'squat_b', muscles: ['quads'], coreMovement: lowerMove },
      { key: 'bench_a', muscles: ['chest'], coreMovement: upperMove },
    ];
    // Station themed on a muscle none of these carry -> everything lands in the
    // fallback, which is exactly the D1 leak path.
    const gate = budgetGate('full_body', [lowerMove, lowerMove], 6); // lower spent
    const picks = __testing__.selectStationExercises(pool, ['hip_flexors'], 3, new Set(), () => 0.5, gate);
    expect(picks.map((p) => p.key)).toEqual(['bench_a']);
  });
});
