/**
 * TEST: bootcamp generate variety — regression lock for the "same class
 * every press" bug. The generator pipeline was fully deterministic
 * (Rolodex ORDER BY difficulty/name + first-N slices, zero randomness),
 * so repeated Generate presses returned identical exercises. The fix
 * samples within a top-K quality window per muscle tier: NASM protocol
 * (muscle targeting, tier precedence, quality/intensity ordering) still
 * gates WHAT is eligible; the RNG only varies WHICH eligible pick lands.
 */
import { describe, expect, it } from 'vitest';
import { __testing__ } from '../../services/bootcamp/bootcampGenerator.mjs';

// Deterministic LCG so this suite never flakes.
const makeRng = (seedInit) => {
  let seed = seedInit >>> 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
};

const quadPool = (n) => Array.from({ length: n }, (_, i) => ({
  name: `Quad Exercise ${i + 1}`,
  key: `quad_exercise_${i + 1}`,
  primaryMuscle: 'quads',
  muscles: ['quads'],
  equipment: ['bodyweight'],
  difficulty: 300 + i,
}));

describe('selectStationExercises — variety within the protocol window', () => {
  it('different RNG sequences produce different picks from the same pool (fails when generation is deterministic)', () => {
    const pool = quadPool(20);
    const a = __testing__.selectStationExercises(pool, ['quads'], 4, new Set(), makeRng(1));
    const b = __testing__.selectStationExercises(pool, ['quads'], 4, new Set(), makeRng(987654321));
    expect(a).toHaveLength(4);
    expect(b).toHaveLength(4);
    expect(a.map(e => e.key)).not.toEqual(b.map(e => e.key));
  });

  it('keeps the NASM targeting contract: picks match the station muscle and respect usedNames/count', () => {
    const pool = [
      ...quadPool(12),
      { name: 'Bench Press', key: 'bench_press', primaryMuscle: 'chest', muscles: ['chest'], equipment: ['barbell'], difficulty: 500 },
    ];
    const used = new Set(['quad_exercise_1']);
    const picks = __testing__.selectStationExercises(pool, ['quads'], 4, used, makeRng(7));
    expect(picks).toHaveLength(4);
    for (const pick of picks) {
      expect(pick.primaryMuscle).toBe('quads');
      expect(used.has(pick.key)).toBe(false);
    }
    const keys = picks.map(p => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('fills from the primary tier before falling through (tier precedence survives the shuffle)', () => {
    const pool = [
      { name: 'Front Squat', key: 'front_squat', primaryMuscle: 'quads', muscles: ['quads'], difficulty: 400 },
      { name: 'Goblet Squat', key: 'goblet_squat', primaryMuscle: 'quads', muscles: ['quads'], difficulty: 300 },
      { name: 'Lunge', key: 'lunge', primaryMuscle: 'quads', muscles: ['quads'], difficulty: 350 },
      // Secondary-tier bait: touches quads but is not primary.
      { name: 'Deadlift', key: 'deadlift', primaryMuscle: 'hamstrings', muscles: ['hamstrings', 'quads'], difficulty: 600 },
    ];
    for (const seed of [1, 2, 3, 42, 99]) {
      const picks = __testing__.selectStationExercises(pool, ['quads'], 3, new Set(), makeRng(seed));
      expect(picks).toHaveLength(3);
      for (const pick of picks) expect(pick.primaryMuscle).toBe('quads');
    }
  });

  it('keeps non-quad-dominant power moves outside the Quads quality window', () => {
    const squatPool = Array.from({ length: 9 }, (_, index) => ({
      name: `Loaded Squat ${index}`,
      key: `loaded_squat_${index}`,
      primaryMuscle: 'quads',
      muscles: ['quads', 'glutes'],
      exerciseType: 'compound',
      category: 'squat',
      equipment: ['barbell'],
    }));
    const pool = [
      { name: 'Barbell Clean', key: 'barbell_clean', primaryMuscle: 'quads', muscles: ['quads', 'glutes'], exerciseType: 'compound', category: 'hinge', equipment: ['barbell'] },
      ...squatPool,
    ];
    const [pick] = __testing__.selectStationExercises(pool, ['quads'], 1, new Set(), () => 0);
    expect(pick.key).not.toBe('barbell_clean');
  });
  it('caps secondary-muscle matches so a named station stays primary-target dominant', () => {
    const pool = [
      { name: 'Front Squat', key: 'front_squat', primaryMuscle: 'quads', muscles: ['quads'], exerciseType: 'compound' },
      ...Array.from({ length: 5 }, (_, index) => ({
        name: `Secondary ${index}`,
        key: `secondary_${index}`,
        primaryMuscle: 'glutes',
        muscles: ['glutes', 'quads'],
        exerciseType: 'compound',
      })),
    ];
    const picks = __testing__.selectStationExercises(pool, ['quads'], 4, new Set(), makeRng(12));
    expect(picks).toHaveLength(2);
    expect(picks.filter(pick => pick.selectionTier === 'primary')).toHaveLength(1);
    expect(picks.filter(pick => pick.selectionTier === 'secondary')).toHaveLength(1);
  });
  it('returns only qualified movements from a thin pool and never dilutes station intent', () => {
    const pool = [
      { name: 'Front Squat', key: 'front_squat', primaryMuscle: 'quads', muscles: ['quads'], difficulty: 400 },
      { name: 'Bench Press', key: 'bench_press', primaryMuscle: 'chest', muscles: ['chest'], difficulty: 500 },
      { name: 'Row', key: 'row', primaryMuscle: 'back', muscles: ['back'], difficulty: 450 },
    ];
    const picks = __testing__.selectStationExercises(pool, ['quads'], 4, new Set(), makeRng(5));
    expect(picks).toHaveLength(1);
    expect(picks[0].key).toBe('front_squat');
    expect(picks.map(p => p.key)).not.toEqual(expect.arrayContaining(['bench_press', 'row']));
  });
});

describe('sampleFromWindow — the quality window itself', () => {
  it('only ever picks from the top-of-list window, keeping ranked quality', () => {
    const pool = quadPool(40);
    for (const seed of [1, 17, 3333]) {
      const picks = __testing__.sampleFromWindow(pool, 3, makeRng(seed));
      const windowKeys = new Set(pool.slice(0, 9).map(e => e.key));
      for (const pick of picks) expect(windowKeys.has(pick.key)).toBe(true);
    }
  });

  it('returns the whole pool when asked for more than it has', () => {
    const pool = quadPool(2);
    expect(__testing__.sampleFromWindow(pool, 5, makeRng(1))).toHaveLength(2);
  });
});

describe('selectFullGroupExercises — full-group classes vary too', () => {
  it('varies cardio work and honors immediate exclusions across full-group generations', () => {
    const pool = Array.from({ length: 30 }, (_, i) => ({
      name: `Exercise ${i + 1}`,
      key: `exercise_${i + 1}`,
      muscles: i % 2 === 0 ? ['quads', 'glutes'] : ['core'],
      difficulty: 300 + i,
    }));
    const first = __testing__.selectFullGroupExercises(pool, makeRng(7));
    const exclusions = new Set(first.flatMap(exercise => [exercise.key, exercise.name]));
    const second = __testing__.selectFullGroupExercises(pool, makeRng(91), exclusions);
    const firstCardio = first.filter(exercise => exercise.isCardio).map(exercise => exercise.key);
    const secondCardio = second.filter(exercise => exercise.isCardio).map(exercise => exercise.key);
    expect(firstCardio).toHaveLength(3);
    expect(secondCardio).toHaveLength(3);
    expect(firstCardio).not.toEqual(secondCardio);
    expect(second.some(exercise => exclusions.has(exercise.key) || exclusions.has(exercise.name))).toBe(false);
  });
  it('different RNG sequences produce different compound picks', () => {
    const pool = Array.from({ length: 30 }, (_, i) => ({
      name: `Compound ${i + 1}`,
      key: `compound_${i + 1}`,
      muscles: ['quads', 'glutes'],
      difficulty: 300 + i,
    }));
    const a = __testing__.selectFullGroupExercises(pool, makeRng(1)).map(e => e.key);
    const b = __testing__.selectFullGroupExercises(pool, makeRng(424242)).map(e => e.key);
    expect(a).not.toEqual(b);
  });
});

describe('buildStationWorkout - finisher reservation', () => {
  it('never duplicates a target-aligned finisher as the main station exercise', () => {
    const stations = [];
    const exercises = [];
    __testing__.buildStationWorkout(
      [{
        name: 'Squat Jumps',
        key: 'squat_jumps',
        primaryMuscle: 'quadriceps',
        muscles: ['quadriceps', 'glutes'],
        exerciseType: 'compound',
        category: 'squat',
        equipment: ['bodyweight'],
      }],
      ['quadriceps'],
      1,
      { exercisesPerStation: 2, durationSec: 30, restSec: 10 },
      new Set(),
      stations,
      exercises,
      [],
      () => 0,
      { dayTypeId: 'lower_body', totalSlots: 2, allowHighImpactFinishers: true },
    );

    expect(exercises.map(exercise => exercise.exerciseName)).toEqual(['Squat Jumps']);
    expect(new Set(exercises.map(exercise => exercise.exerciseName)).size).toBe(exercises.length);
  });
});
