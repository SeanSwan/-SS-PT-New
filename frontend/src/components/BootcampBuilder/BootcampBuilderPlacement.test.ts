import { describe, expect, it } from 'vitest';

import {
  countMainBoardExercisesByStation,
  getMainBoardExercises,
  getMainBoardExclusionKeys,
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

  it('builds unique name and key exclusions from the current main board only', () => {
    const exclusions = getMainBoardExclusionKeys([
      { board: 'main', exerciseName: 'Front Squat' },
      { board: 'alternative', exerciseName: 'Chair Squat' },
      { board: 'main', exerciseName: 'Front Squat' },
      { board: 'main', exerciseName: 'Kroc Row' },
    ]);
    expect(exclusions).toEqual(['Front Squat', 'front_squat', 'Kroc Row', 'kroc_row']);
  });
  it('normalizes malformed station assignments in placement math', () => {
    const malformed = [
      { exerciseName: 'Battle Rope', stationIndex: -1, durationSec: 35, restSec: 15 },
      { exerciseName: 'Bear Crawl', stationIndex: 2.8, durationSec: 35, restSec: 15 },
      { exerciseName: 'Supported Bear Crawl', board: 'lowImpact', stationIndex: 2.8, durationSec: 35, restSec: 15 },
    ];

    const counts = countMainBoardExercisesByStation(malformed);

    expect(counts.get(0)).toBe(1);
    expect(counts.get(2)).toBe(1);
    expect(counts.has(-1)).toBe(false);
    expect(getNextMainBoardSortOrder(malformed, 0)).toBe(2);
    expect(getNextMainBoardSortOrder(malformed, 2)).toBe(2);
  });
});
