import { describe, expect, it } from 'vitest';

import type { BootcampExercise } from '../../hooks/useBootcampAPI';
import { duplicateMainExercise, moveMainExercise, replaceMainExercise } from './BootcampDraftOps';

const exercise = (exerciseName: string, stationIndex: number, sortOrder: number): BootcampExercise => ({
  exerciseName,
  stationIndex,
  sortOrder,
  board: 'main',
  durationSec: 35,
  restSec: 15,
  isCardioFinisher: false,
  muscleTargets: '',
  easyVariation: null,
  mediumVariation: null,
  hardVariation: null,
  kneeMod: null,
  shoulderMod: null,
  ankleMod: null,
  wristMod: null,
  backMod: null,
  elbowMod: null,
  footMod: null,
  hipMod: null,
  description: null,
  equipmentRequired: null,
});

describe('Bootcamp draft operations', () => {
  const current = [
    exercise('Front Squat', 0, 1),
    exercise('Split Squat', 0, 2),
    exercise('Band Chest Press', 1, 1),
    { ...exercise('Wall Push-Up', 1, 2), board: 'alternative' as const },
  ];

  it('moves a main-board exercise into a selected station without touching alternative boards', () => {
    const moved = moveMainExercise(current, 1, 1);

    expect(moved.map(item => [item.exerciseName, item.stationIndex, item.sortOrder, item.board])).toEqual([
      ['Front Squat', 0, 1, 'main'],
      ['Split Squat', 1, 2, 'main'],
      ['Band Chest Press', 1, 1, 'main'],
      ['Wall Push-Up', 1, 2, 'alternative'],
    ]);
  });

  it('replaces an exercise while retaining its station, timing, and slot order', () => {
    const replacement = exercise('Goblet Squat', 9, 99);
    const replaced = replaceMainExercise(current, 0, replacement);

    expect(replaced[0]).toMatchObject({
      exerciseName: 'Goblet Squat',
      stationIndex: 0,
      sortOrder: 1,
      durationSec: 35,
      restSec: 15,
      board: 'main',
    });
  });

  it('duplicates a main-board exercise immediately after its source slot', () => {
    const duplicated = duplicateMainExercise(current, 0);

    expect(duplicated.slice(0, 3).map(item => [item.exerciseName, item.stationIndex, item.sortOrder])).toEqual([
      ['Front Squat', 0, 1],
      ['Front Squat', 0, 2],
      ['Split Squat', 0, 3],
    ]);
    expect(duplicated[4]).toMatchObject({ exerciseName: 'Wall Push-Up', board: 'alternative', sortOrder: 2 });
  });
});
