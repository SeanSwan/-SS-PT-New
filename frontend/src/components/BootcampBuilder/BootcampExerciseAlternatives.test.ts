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
