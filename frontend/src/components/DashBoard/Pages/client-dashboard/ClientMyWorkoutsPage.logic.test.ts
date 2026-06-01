import { describe, expect, it } from 'vitest';
import { CLIENT_WORKOUTS_PAGE_LIMIT, groupWorkoutLogsByExercise } from './ClientMyWorkoutsPage.logic';

describe('ClientMyWorkoutsPage logic', () => {
  it('keeps the canonical workout-history page window explicit', () => {
    expect(CLIENT_WORKOUTS_PAGE_LIMIT).toBe(50);
  });

  it('groups workout logs by exercise name and sorts sets numerically', () => {
    const grouped = groupWorkoutLogsByExercise([
      { id: 1, exerciseName: 'Bench Press', setNumber: 3, reps: 6, weight: 205 },
      { id: 2, exerciseName: '', setNumber: 1, reps: 10, weight: 0 },
      { id: 3, exerciseName: 'Bench Press', setNumber: 1, reps: 10, weight: 185 },
      { id: 4, exerciseName: 'Bench Press', setNumber: 2, reps: 8, weight: 195 },
    ]);

    expect(Object.keys(grouped)).toEqual(['Bench Press', 'Unknown Exercise']);
    expect(grouped['Bench Press'].map((set) => set.setNumber)).toEqual([1, 2, 3]);
    expect(grouped['Unknown Exercise']).toHaveLength(1);
  });
});
