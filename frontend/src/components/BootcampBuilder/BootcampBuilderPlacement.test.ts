import { describe, expect, it } from 'vitest';

import {
  countMainBoardExercisesByStation,
  getMainBoardExercises,
  getMainBoardWorkoutSeconds,
  getNextMainBoardSortOrder,
} from './BootcampBuilderPlacement';

describe('BootcampBuilder placement helpers', () => {
  const exercises = [
    { exerciseName: 'Squat', board: 'main', stationIndex: 0, durationSec: 35, restSec: 15 },
    { exerciseName: 'Step-Up', board: 'alternative', stationIndex: 0, durationSec: 35, restSec: 15 },
    { exerciseName: 'Supported Step-Up', board: 'lowImpact', stationIndex: 0, durationSec: 35, restSec: 15 },
    { exerciseName: 'Push Up', stationIndex: 1, durationSec: 40, restSec: 10 },
  ];

  it('filters generated alternative board copies out of manual and hybrid placement math', () => {
    expect(getMainBoardExercises(exercises).map(ex => ex.exerciseName)).toEqual(['Squat', 'Push Up']);
  });

  it('counts only Board 1 exercises when deciding whether a station can receive a new exercise', () => {
    const counts = countMainBoardExercisesByStation(exercises);

    expect(counts.get(0)).toBe(1);
    expect(counts.get(1)).toBe(1);
  });

  it('keeps workout duration based on the main class board instead of duplicate alternative boards', () => {
    expect(getMainBoardWorkoutSeconds(exercises, 30, 15)).toBe(100);
  });

  it('assigns the next station sort order from main-board exercises only', () => {
    expect(getNextMainBoardSortOrder(exercises, 0)).toBe(2);
  });
});
