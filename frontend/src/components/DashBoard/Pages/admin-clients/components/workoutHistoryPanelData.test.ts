import { describe, expect, it } from 'vitest';

import {
  addStringToSet,
  buildExerciseLedger,
  getPersonalRecordKey,
  groupSessionLogs,
  sortPersonalRecords,
  toggleStringSet,
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

  it('updates expanded session sets without duplicating local toggle logic', () => {
    const existing = new Set(['session-1']);
    expect(addStringToSet(existing, 'session-1')).toBe(existing);

    const added = addStringToSet(existing, 'session-2');
    expect([...added]).toEqual(['session-1', 'session-2']);
    expect([...existing]).toEqual(['session-1']);

    expect([...toggleStringSet(added, 'session-1')]).toEqual(['session-2']);
    expect([...toggleStringSet(existing, 'session-3')]).toEqual(['session-1', 'session-3']);
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

  it('builds a complete exercise ledger from real logged sets without top-N truncation', () => {
    const result = buildExerciseLedger([
      {
        id: 'session-1',
        date: '2026-05-02',
        logs: [
          { id: 1, exerciseName: 'Pull Up', setNumber: 1, reps: 5, weight: 0 },
          { id: 2, exerciseName: 'Pull Up', setNumber: 2, reps: 4, weight: 0 },
          { id: 3, exerciseName: 'Squat', setNumber: 1, reps: 8, weight: 135 },
        ],
      },
      {
        id: 'session-2',
        date: '2026-05-01',
        logs: [
          { id: 4, exerciseName: 'Squat', setNumber: 1, reps: 6, weight: 155 },
          { id: 5, exerciseName: 'Walkout Pushup', setNumber: 1, reps: 10, weight: 0 },
        ],
      },
    ] as any);

    expect(result.map(row => row.exerciseName)).toEqual([
      'Squat',
      'Pull Up',
      'Walkout Pushup',
    ]);
    expect(result[0]).toMatchObject({
      exerciseName: 'Squat',
      sessionCount: 2,
      setCount: 2,
      totalReps: 14,
      totalVolume: 2010,
      maxWeight: 155,
      lastDate: '2026-05-02',
    });
    expect(result).toHaveLength(3);
  });
});
