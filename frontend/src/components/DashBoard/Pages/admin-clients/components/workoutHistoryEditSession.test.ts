import { describe, expect, it } from 'vitest';

import { buildEditableWorkoutLogs } from './workoutHistoryEditSession';
import { EXERCISE_NOTE_SEPARATOR } from './workoutHistoryNotes';

describe('workoutHistoryEditSession', () => {
  it('stamps a canonical exercise note onto every row in the exercise group', () => {
    const logs = [
      { id: 1, exerciseName: 'Bench', setNumber: 1, reps: 8, weight: 100 },
      {
        id: 2,
        exerciseName: 'Bench',
        setNumber: 2,
        reps: 6,
        weight: 110,
        exerciseNote: 'shoulders stayed down',
      },
    ];

    const result = buildEditableWorkoutLogs({ logs } as any);

    expect(result.map((row) => row.exerciseNote)).toEqual([
      'shoulders stayed down',
      'shoulders stayed down',
    ]);
    expect(logs[0]).not.toHaveProperty('exerciseNote');
  });

  it('lazy-migrates only the unambiguous legacy separator shape', () => {
    const result = buildEditableWorkoutLogs({
      logs: [
        {
          id: 1,
          exerciseName: 'Curl',
          setNumber: 1,
          reps: 8,
          weight: 40,
          notes: `set grip${EXERCISE_NOTE_SEPARATOR}elbow quiet`,
        },
        {
          id: 2,
          exerciseName: 'Curl',
          setNumber: 2,
          reps: 8,
          weight: 45,
          notes: 'second set',
        },
      ],
    } as any);

    expect(result).toMatchObject([
      { notes: 'set grip', exerciseNote: 'elbow quiet' },
      { notes: 'second set', exerciseNote: 'elbow quiet' },
    ]);
  });

  it('keeps bare Coach prefixes as set notes for classification safety', () => {
    const result = buildEditableWorkoutLogs({
      logs: [
        {
          id: 1,
          exerciseName: 'Row',
          setNumber: 1,
          reps: 10,
          weight: 95,
          notes: 'Coach: literal set note',
        },
      ],
    } as any);

    expect(result).toMatchObject([
      { notes: 'Coach: literal set note' },
    ]);
    expect(result[0].exerciseNote).toBeUndefined();
  });
});
