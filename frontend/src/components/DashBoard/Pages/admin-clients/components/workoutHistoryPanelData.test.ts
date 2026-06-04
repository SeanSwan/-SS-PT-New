import { describe, expect, it } from 'vitest';

import {
  getPersonalRecordKey,
  groupSessionLogs,
  sortPersonalRecords,
} from './workoutHistoryPanelData';

describe('workoutHistoryPanelData', () => {
  it('sorts personal records by weight, reps, exercise, then date without mutating input', () => {
    const input = [
      { exercise: 'Curl', weight: 50, reps: 8, date: '2026-05-03' },
      { exercise: 'Bench', weight: 100, reps: 5, date: '2026-05-02' },
      { exercise: 'Bench', weight: 100, reps: 8, date: '2026-05-01' },
    ];

    const result = sortPersonalRecords(input);

    expect(result.map((record) => `${record.exercise}:${record.reps}`)).toEqual([
      'Bench:8',
      'Bench:5',
      'Curl:8',
    ]);
    expect(input[0].exercise).toBe('Curl');
  });

  it('builds stable personal record keys from record identity fields', () => {
    expect(getPersonalRecordKey({
      exercise: 'Bench',
      weight: 100,
      reps: 8,
      date: '2026-05-01',
      estimated1RM: 125,
    })).toBe('pr|Bench|2026-05-01|100|8|125');
  });

  it('groups session logs by exercise and includes estimated one-rep max per set', () => {
    const result = groupSessionLogs({
      logs: [
        { id: 1, exerciseName: 'Bench', setNumber: 1, reps: 8, weight: 100, rpe: 8 },
        { id: 2, exerciseName: 'Bench', setNumber: 2, reps: 6, weight: 110, tempo: '3-1-1' },
        { id: 3, exerciseName: 'Squat', setNumber: 1, reps: 5, weight: 135, rest: 90 },
      ],
    } as any);

    expect(result).toEqual([
      ['Bench', {
        sets: [
          { setNumber: 1, reps: 8, weight: 100, rpe: 8, est1RM: 124 },
          { setNumber: 2, reps: 6, weight: 110, tempo: '3-1-1', est1RM: 128 },
        ],
      }],
      ['Squat', {
        sets: [
          { setNumber: 1, reps: 5, weight: 135, rest: 90, est1RM: 152 },
        ],
      }],
    ]);
  });
});
