/**
 * reapplyGhostPreFill tests (Phase 2.1b)
 *
 * Locks the cold-cache fix for ghost prefill on newly added exercises:
 * the warm history patches ONLY the just-added exercise's single untouched
 * zero set — never user-entered values, never extra sets, never other rows.
 */
import { describe, expect, it } from 'vitest';
import { reapplyGhostPreFill } from './WorkoutLogger.ghostReapply';

const entry = (loggerExerciseId: string, sets: Array<Record<string, unknown>>) => ({
  loggerExerciseId,
  exerciseName: 'Barbell Squat',
  sets: sets.map((s, i) => ({ id: `s${i}`, setNumber: i + 1, weight: 0, reps: 0, completed: false, ...s })),
});

const warm = { weight: 135, reps: 8, tempo: '2-0-2-0', restTime: 90 };

describe('reapplyGhostPreFill', () => {
  it('patches the untouched single zero set of the target exercise with warm ghost values', () => {
    const out = reapplyGhostPreFill([entry('a', [{}]), entry('b', [{}])], 'b', warm);
    expect(out[0].sets[0]).toMatchObject({ weight: 0, reps: 0 });
    expect(out[1].sets[0]).toMatchObject({ weight: 135, reps: 8, tempo: '2-0-2-0', restTime: 90 });
    expect(out[1].sets[0].id).toBe('s0'); // same set identity — no remount churn
  });

  it('never clobbers user-entered values, completed sets, or multi-set rows', () => {
    const typed = reapplyGhostPreFill([entry('a', [{ weight: 100 }])], 'a', warm);
    expect(typed[0].sets[0].weight).toBe(100);

    const done = reapplyGhostPreFill([entry('a', [{ completed: true }])], 'a', warm);
    expect(done[0].sets[0].weight).toBe(0);

    const multi = reapplyGhostPreFill([entry('a', [{}, {}])], 'a', warm);
    expect(multi[0].sets).toHaveLength(2);
    expect(multi[0].sets[0].weight).toBe(0);
  });

  it('is a no-op for null/empty ghost data and unknown ids', () => {
    const pool = [entry('a', [{}])];
    expect(reapplyGhostPreFill(pool, 'a', null)).toBe(pool);
    expect(reapplyGhostPreFill(pool, 'a', { weight: 0, reps: 0 })).toBe(pool);
    expect(reapplyGhostPreFill(pool, 'zzz', warm)[0].sets[0].weight).toBe(0);
  });
});
