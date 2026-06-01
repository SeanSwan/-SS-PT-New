import { describe, expect, it } from 'vitest';

import { buildBootcampExerciseFromRolodex, getLowImpactSwap } from './BootcampExerciseAlternatives';

describe('Bootcamp exercise alternatives', () => {
  it('adds joint-friendly and low-impact fallbacks to manual rolodex additions', () => {
    const exercise = buildBootcampExerciseFromRolodex(
      {
        id: '360-jump',
        name: '360 Jump',
        exerciseType: 'compound',
        difficulty: 620,
        primaryMuscles: ['cardio'],
        equipmentNeeded: ['Bodyweight'],
        bodyPartCategory: 'cardio',
      },
      {
        durationSec: 50,
        restSec: 15,
        sortOrder: 1,
        stationIndex: 2,
      },
    );

    expect(exercise.board).toBe('main');
    expect(exercise.stationIndex).toBe(2);
    expect(exercise.kneeMod).toMatch(/step/i);
    expect(exercise.ankleMod).toMatch(/no-jump/i);
    expect(getLowImpactSwap(exercise)).toMatch(/step/i);
  });

  it('keeps jump/cardio Board 2 alternatives low-impact instead of low-hop', () => {
    const exercise = buildBootcampExerciseFromRolodex(
      {
        id: '360-jump',
        name: '360 Jump',
        exerciseType: 'cardio',
        difficulty: 720,
        primaryMuscles: ['cardio'],
        equipmentNeeded: ['Bodyweight'],
      },
      {
        durationSec: 50,
        restSec: 15,
        sortOrder: 1,
        stationIndex: 0,
      },
    );

    expect(exercise.easyVariation).toMatch(/step|march/i);
    expect(exercise.mediumVariation).toMatch(/step|march/i);
    expect(exercise.mediumVariation).not.toMatch(/hop|jump|bound/i);
    expect([exercise.kneeMod, exercise.ankleMod, exercise.footMod].join(' ')).toMatch(/no-jump|march|step/i);
  });

  it('preserves authored alternatives from the exercise library', () => {
    const exercise = buildBootcampExerciseFromRolodex(
      {
        id: 'split-squat',
        name: 'Split Squat',
        exerciseType: 'compound',
        difficulty: 360,
        primaryMuscles: ['legs'],
        equipmentNeeded: ['Dumbbell'],
        easyVariation: 'Bodyweight split squat',
        kneeMod: 'Short-range reverse lunge',
      },
      {
        durationSec: 45,
        restSec: 15,
        sortOrder: 1,
        stationIndex: 0,
      },
    );

    expect(exercise.easyVariation).toBe('Bodyweight split squat');
    expect(exercise.kneeMod).toBe('Short-range reverse lunge');
  });
});
