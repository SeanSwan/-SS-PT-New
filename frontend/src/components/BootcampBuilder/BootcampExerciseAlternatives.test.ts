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

  it('carries Rolodex media into manual and hybrid bootcamp exercises', () => {
    const exercise = buildBootcampExerciseFromRolodex(
      {
        id: 42,
        name: 'Goblet Squat',
        exerciseType: 'compound',
        difficulty: 460,
        primaryMuscles: ['glutes', 'quads'],
        equipmentNeeded: ['Dumbbell'],
        videoUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat.mp4',
        imageUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat.jpg',
        thumbnailUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat-thumb.jpg',
      },
      {
        durationSec: 45,
        restSec: 15,
        sortOrder: 1,
        stationIndex: 0,
      },
    );

    expect(exercise.exerciseLibraryId).toBe(42);
    expect(exercise.videoUrl).toBe('https://cdn.swanstudios.test/exercises/goblet-squat.mp4');
    expect(exercise.imageUrl).toBe('https://cdn.swanstudios.test/exercises/goblet-squat.jpg');
    expect(exercise.thumbnailUrl).toBe('https://cdn.swanstudios.test/exercises/goblet-squat-thumb.jpg');
  });
});
