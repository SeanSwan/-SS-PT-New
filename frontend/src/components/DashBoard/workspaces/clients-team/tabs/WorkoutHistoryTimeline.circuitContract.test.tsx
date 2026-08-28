import { describe, expect, it } from 'vitest';
import { groupWorkoutLogsByCircuit } from './workoutHistoryGrouping';

describe('workout history circuit grouping', () => {
  it('keeps primary, drop, and active-recovery movements in one ordered circuit', () => {
    const groups = groupWorkoutLogsByCircuit([
      { id: 1, exerciseName: 'High Row', setNumber: 2, reps: 10, weight: 30, circuitName: 'Circuit 1', circuitOrder: 1, exerciseRole: 'primary', setType: 'dropset' },
      { id: 2, exerciseName: 'Reverse Fly', setNumber: 1, reps: 12, weight: 20, circuitName: 'Circuit 1', circuitOrder: 2, exerciseRole: 'drop-movement', setType: 'dropset' },
      { id: 3, exerciseName: 'BOSU Slam', setNumber: 1, reps: 12, weight: 10, circuitName: 'Circuit 1', circuitOrder: 3, exerciseRole: 'active-recovery', setType: 'working' },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Circuit 1');
    expect(groups[0].exercises.map(exercise => exercise.name)).toEqual(['High Row', 'Reverse Fly', 'BOSU Slam']);
    expect(groups[0].exercises[0].sets.map(set => set.setNumber)).toEqual([2]);
  });
});
