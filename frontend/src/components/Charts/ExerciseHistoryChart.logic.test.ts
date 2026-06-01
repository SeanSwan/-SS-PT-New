import { describe, expect, it } from 'vitest';
import {
  clampExerciseHistoryPercent,
  getExerciseHistoryBarLabel,
  getExerciseHistoryBarValue,
  sanitizeExerciseHistoryItems,
  toNonNegativeFinite,
} from './ExerciseHistoryChart.logic';

describe('ExerciseHistoryChart logic', () => {
  it('sanitizes raw exercise-history API rows before bar math', () => {
    const rows = sanitizeExerciseHistoryItems([
      {
        exerciseId: '101',
        exerciseName: '  Push Up  ',
        primaryMuscles: '',
        category: 'compound',
        timesPerformed: '12',
        maxWeight: '0',
        maxReps: '25',
        totalVolume: 'bad',
        lastPerformedDate: '2026-05-30',
        firstPerformedDate: '2026-05-01',
      },
      { exerciseId: 102, exerciseName: 'Infinite Row', timesPerformed: Infinity },
      { exerciseId: 103, exerciseName: '', timesPerformed: 5 },
      { exerciseId: 104, exerciseName: 'No work', timesPerformed: 0, totalVolume: 0 },
      { exerciseId: 105, exerciseName: 'Deadlift', timesPerformed: 3, totalVolume: 9000 },
    ]);

    expect(rows).toEqual([
      {
        exerciseId: 101,
        exerciseName: 'Push Up',
        primaryMuscles: 'Unknown',
        category: 'compound',
        timesPerformed: 12,
        maxWeight: 0,
        maxReps: 25,
        totalVolume: 0,
        lastPerformedDate: '2026-05-30',
        firstPerformedDate: '2026-05-01',
      },
      {
        exerciseId: 105,
        exerciseName: 'Deadlift',
        primaryMuscles: 'Unknown',
        category: 'Unknown',
        timesPerformed: 3,
        maxWeight: 0,
        maxReps: 0,
        totalVolume: 9000,
        lastPerformedDate: '',
        firstPerformedDate: '',
      },
    ]);
  });

  it('returns finite labels, values, and percentages for chart rendering', () => {
    const item = sanitizeExerciseHistoryItems([
      { exerciseId: 1, exerciseName: 'Deadlift', timesPerformed: 3, totalVolume: 9000 },
    ])[0];

    expect(getExerciseHistoryBarValue(item, 'timesPerformed')).toBe(3);
    expect(getExerciseHistoryBarValue(item, 'totalVolume')).toBe(9000);
    expect(getExerciseHistoryBarLabel(item, 'timesPerformed')).toBe('3x');
    expect(getExerciseHistoryBarLabel(item, 'totalVolume')).toBe('9.0k lbs');
    expect(clampExerciseHistoryPercent(Infinity)).toBe(0);
    expect(clampExerciseHistoryPercent(250)).toBe(100);
    expect(toNonNegativeFinite(Number.NaN)).toBe(0);
  });
});
