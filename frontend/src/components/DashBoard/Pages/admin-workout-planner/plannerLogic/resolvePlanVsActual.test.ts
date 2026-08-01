/**
 * resolvePlanVsActual.test.ts — S25 fence: the 3-state pill logic and the
 * per-exercise delta notes (matched/reduced/increased/skipped/added).
 */
import { describe, expect, it } from 'vitest';
import { resolvePlanVsActual } from './resolvePlanVsActual';

const planned = [{
  dayNumber: 1,
  exercises: [
    { name: 'Bench Press', sets: 3, reps: 8, weight: 185 },
    { name: 'Row', sets: 3, reps: 10 },
  ],
}, {
  dayNumber: 2,
  exercises: [{ name: 'Squat', sets: 5, reps: 5, weight: 225 }],
}];

describe('S25 resolvePlanVsActual', () => {
  it('marks a matched day done', () => {
    const result = resolvePlanVsActual([planned[0]], [{
      date: '2026-08-01',
      exercises: [
        { exerciseName: 'bench press', sets: [{ weight: 185, reps: 8 }, { weight: 185, reps: 8 }, { weight: 185, reps: 8 }] },
        { exerciseName: 'Row', sets: [{ weight: 95, reps: 10 }, { weight: 95, reps: 10 }, { weight: 95, reps: 10 }] },
      ],
    }]);
    expect(result[0].status).toBe('done');
  });

  it('marks reduced load modified with the reason on the row', () => {
    const result = resolvePlanVsActual([planned[0]], [{
      date: '2026-08-01',
      exercises: [
        { exerciseName: 'Bench Press', sets: [{ weight: 175, reps: 8 }, { weight: 175, reps: 8 }, { weight: 175, reps: 8 }] },
        { exerciseName: 'Row', sets: [{ weight: 95, reps: 10 }, { weight: 95, reps: 10 }, { weight: 95, reps: 10 }] },
      ],
    }]);
    expect(result[0].status).toBe('modified');
    expect(result[0].deltas[0]).toMatchObject({ name: 'Bench Press', note: 'reduced', planned: '3×8@185' });
  });

  it('marks an unlogged day missed and unplanned work added', () => {
    const result = resolvePlanVsActual(planned, [{
      date: '2026-08-01',
      exercises: [
        { exerciseName: 'Bench Press', sets: [{ weight: 185, reps: 8 }] },
        { exerciseName: 'Curls', sets: [{ weight: 30, reps: 12 }] },
      ],
    }]);
    expect(result[0].status).toBe('modified');
    expect(result[0].deltas.find(d => d.name === 'Curls')?.note).toBe('added');
    expect(result[0].deltas.find(d => d.name === 'Row')?.note).toBe('skipped');
    expect(result[1].status).toBe('missed');
  });
});
