import { describe, expect, it, vi } from 'vitest';
import {
  groupWorkoutLogsToEntries,
  repeatLastSessionIntoLogger,
  type RawWorkoutLog,
} from './WorkoutLogger.repeatLastSession';

const { apiGetMock } = vi.hoisted(() => ({ apiGetMock: vi.fn() }));
vi.mock('../../services/api.service', () => ({
  ApiService: class {
    get = apiGetMock;
  },
}));
vi.mock('react-toastify', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

describe('groupWorkoutLogsToEntries', () => {
  const ids = () => {
    let n = 0;
    return () => `id-${n++}`;
  };

  it('groups logs by exercise in first-seen order and orders sets by setNumber', () => {
    const logs: RawWorkoutLog[] = [
      { exerciseName: 'Squat', setNumber: 2, weight: 135, reps: 5 },
      { exerciseName: 'Bench', setNumber: 1, weight: 95, reps: 8 },
      { exerciseName: 'Squat', setNumber: 1, weight: 135, reps: 5 },
      { exerciseName: 'Squat', setNumber: 3, weight: 145, reps: 4 },
    ];
    const entries = groupWorkoutLogsToEntries(logs, ids(), ids());

    expect(entries.map(e => e.exerciseName)).toEqual(['Squat', 'Bench']);
    expect(entries[0].sets.map(s => s.weight)).toEqual([135, 135, 145]);
    expect(entries[0].sets.map(s => s.setNumber)).toEqual([1, 2, 3]);
    expect(entries[1].sets).toHaveLength(1);
  });

  it('never carries forward subjective ratings', () => {
    const logs: RawWorkoutLog[] = [
      { exerciseName: 'Deadlift', setNumber: 1, weight: 225, reps: 5, ...({ rpe: 9 } as object) },
    ];
    const [entry] = groupWorkoutLogsToEntries(logs, ids(), ids());
    expect(entry.formRating).toBeNull();
    expect(entry.painLevel).toBe(0);
    expect(entry.sets[0].rpe).toBeNull();
    expect(entry.sets[0].formQuality).toBeNull();
    expect(entry.sets[0].notes).toBe('');
  });

  it('carries the prescription forward as a starting point', () => {
    const logs: RawWorkoutLog[] = [
      { exerciseName: 'Row', setNumber: 1, weight: 70, reps: 12, tempo: '2-0-2', rest: 45 },
    ];
    const [entry] = groupWorkoutLogsToEntries(logs, ids(), ids());
    expect(entry.sets[0]).toMatchObject({ weight: 70, reps: 12, tempo: '2-0-2', restTime: 45 });
  });

  it('accepts either rest or restTime and defaults rest to 60 when absent', () => {
    const logs: RawWorkoutLog[] = [
      { exerciseName: 'A', setNumber: 1, restTime: 30 },
      { exerciseName: 'B', setNumber: 1 },
    ];
    const entries = groupWorkoutLogsToEntries(logs, ids(), ids());
    expect(entries[0].sets[0].restTime).toBe(30);
    expect(entries[1].sets[0].restTime).toBe(60);
  });

  it('coerces string numerics and skips nameless rows', () => {
    const logs: RawWorkoutLog[] = [
      { exerciseName: '  ', setNumber: 1, weight: 100, reps: 5 },
      { exerciseName: 'Curl', setNumber: '1', weight: '40', reps: '10' },
    ];
    const entries = groupWorkoutLogsToEntries(logs, ids(), ids());
    expect(entries).toHaveLength(1);
    expect(entries[0].sets[0]).toMatchObject({ weight: 40, reps: 10, setNumber: 1 });
  });

  it('returns an empty array for empty, null, or undefined input', () => {
    expect(groupWorkoutLogsToEntries([], ids(), ids())).toEqual([]);
    expect(groupWorkoutLogsToEntries(null, ids(), ids())).toEqual([]);
    expect(groupWorkoutLogsToEntries(undefined, ids(), ids())).toEqual([]);
  });

  it('assigns unique logger row ids from the provided generators', () => {
    const logs: RawWorkoutLog[] = [
      { exerciseName: 'X', setNumber: 1 },
      { exerciseName: 'Y', setNumber: 1 },
    ];
    const entries = groupWorkoutLogsToEntries(logs, ids(), ids());
    const exIds = entries.map(e => e.loggerExerciseId);
    expect(new Set(exIds).size).toBe(exIds.length);
    expect(entries[0].exerciseId).toBe('repeat-x');
  });
});

describe('repeatLastSessionIntoLogger admin-endpoint guard', () => {
  it('short-circuits in client self-mode before touching the admin endpoint', async () => {
    apiGetMock.mockClear();
    const setExercises = vi.fn();
    const setLoading = vi.fn();
    await repeatLastSessionIntoLogger({
      effectiveClientId: 42,
      isClientSelfMode: true,
      createWorkoutLoggerLocalId: () => 'x',
      setExercises,
      setIsRepeatingSession: setLoading,
    });
    expect(apiGetMock).not.toHaveBeenCalled();
    expect(setLoading).not.toHaveBeenCalled();
    expect(setExercises).not.toHaveBeenCalled();
  });

  it('does call the admin endpoint for trainer/admin mode', async () => {
    apiGetMock.mockReset();
    apiGetMock.mockResolvedValue({ data: { workouts: [] } });
    const setLoading = vi.fn();
    await repeatLastSessionIntoLogger({
      effectiveClientId: 42,
      isClientSelfMode: false,
      createWorkoutLoggerLocalId: () => 'x',
      setExercises: vi.fn(),
      setIsRepeatingSession: setLoading,
    });
    expect(apiGetMock).toHaveBeenCalledWith('/api/admin/clients/42/workouts?limit=1');
    expect(setLoading).toHaveBeenCalledWith(true);
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });
});
