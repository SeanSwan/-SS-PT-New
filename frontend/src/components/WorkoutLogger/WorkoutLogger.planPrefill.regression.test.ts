/**
 * Planner→Logger prefill — blueprint S6 sync-hardening regression.
 * Drives loadTodaysPlanIntoLogger with a mocked GET /api/workouts/:id/current
 * returning a 2-exercise current-session cursor and pins the ExerciseEntry
 * shape the logger prefills: correct set counts, weight 0 (until the S5
 * suggestion chip or the trainer fills it), plan programming carried over.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExerciseEntry } from '../../services/nasmApiService';

const { apiGetMock, toastMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  toastMock: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../services/api.service', () => ({
  ApiService: class MockApiService { get = apiGetMock; },
}));
vi.mock('react-toastify', () => ({ toast: toastMock }));

import { loadTodaysPlanIntoLogger } from './WorkoutLogger.loadTodaysPlan';

describe('planner→logger prefill regression (blueprint S6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockReset();
  });

  it('prefills two ExerciseEntry rows with plan programming and weight 0 defaults', async () => {
    let localId = 0;
    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        id: 'plan-77',
        currentSession: {
          weekNumber: 1,
          dayNumber: 2,
          dayLabel: 'Day 2',
          exercises: [
            {
              exerciseName: 'Leg Press',
              sets: [
                { setNumber: 1, reps: 12, restSeconds: 60, tempo: '2/0/2' },
                { setNumber: 2, reps: 12, restSeconds: 60, tempo: '2/0/2' },
                { setNumber: 3, reps: 12, restSeconds: 60, tempo: '2/0/2' },
              ],
            },
            { exerciseName: 'Box Squat', sets: 2, targetReps: 8, restSeconds: 90, tempo: '3/1/1' },
          ],
        },
      },
    });

    let prefilled: ExerciseEntry[] = [];
    const setExercises = vi.fn((updater: (prev: ExerciseEntry[]) => ExerciseEntry[]) => {
      prefilled = updater([]);
    });
    const setPlannedAssignment = vi.fn();

    await loadTodaysPlanIntoLogger({
      effectiveClientId: 2,
      createWorkoutLoggerLocalId: (prefix: string) => `${prefix}-${++localId}`,
      routeAssignmentKey: null,
      routeAssignmentType: null,
      scheduledSessionId: null,
      setExercises,
      setIsLoadingPlan: vi.fn(),
      setPlannedAssignment,
    });

    expect(apiGetMock).toHaveBeenCalledWith('/api/workouts/2/current');
    expect(prefilled).toHaveLength(2);

    const [legPress, boxSquat] = prefilled;
    expect(legPress.exerciseName).toBe('Leg Press');
    expect(legPress.sets).toHaveLength(3);
    expect(legPress.sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
    expect(legPress.sets.every((s) => s.weight === 0)).toBe(true); // ONLY weight left to fill
    expect(legPress.sets.every((s) => s.reps === 12)).toBe(true);
    expect(legPress.sets.every((s) => s.tempo === '2/0/2')).toBe(true);
    expect(legPress.sets.every((s) => s.restTime === 60)).toBe(true);

    expect(boxSquat.exerciseName).toBe('Box Squat');
    expect(boxSquat.sets).toHaveLength(2);
    expect(boxSquat.sets.every((s) => s.weight === 0)).toBe(true);
    expect(boxSquat.sets.every((s) => s.reps === 8)).toBe(true);
    expect(boxSquat.sets.every((s) => s.restTime === 90)).toBe(true);

    // Every row/set carries a logger identity so React keys stay stable.
    expect(prefilled.every((e) => e.loggerExerciseId && e.sets.every((s) => s.loggerSetId))).toBe(true);
    expect(toastMock.success).toHaveBeenCalledWith('Loaded 2 exercises from Week 1 — Day 2');
  });
});
