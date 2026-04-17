/**
 * clientWorkoutRoutes mapper — unit tests
 * =======================================
 * Locks the real WorkoutSession schema contract for the LIVE client dashboard
 * workout-history surface: RevolutionaryClientDashboard → CrystallineSections →
 * EnhancedOverviewCrystalline → useWorkoutHistory → GET /api/workouts/:userId/history.
 *
 * Regression intent: the prior mapper referenced fields that never existed on
 * WorkoutSession (workoutName, durationMinutes, exercisesCompleted), so every
 * trainer-logged workout rendered as a blank "Workout" card with null duration
 * and 0 exercises. These tests pin the mapper to the real fields written by
 * workoutLogService (title, duration, totalSets, completedAt).
 */
import { describe, expect, it } from 'vitest';
import { toClientWorkoutHistoryRow } from '../../routes/clientWorkoutRoutes.mjs';

describe('toClientWorkoutHistoryRow', () => {
  it('maps a real trainer-logged WorkoutSession row to the UI shape', () => {
    const session = {
      id: 'abc-123',
      title: 'Push Day — Chest + Triceps',
      date: new Date('2026-04-10T15:30:00.000Z'),
      completedAt: new Date('2026-04-10T16:25:00.000Z'),
      createdAt: new Date('2026-04-10T15:00:00.000Z'),
      duration: 55,
      totalSets: 18,
    };
    expect(toClientWorkoutHistoryRow(session)).toEqual({
      id: 'abc-123',
      name: 'Push Day — Chest + Triceps',
      date: session.completedAt,
      duration: '55 min',
      exercises: 18,
    });
  });

  it('unwraps Sequelize instances via toJSON()', () => {
    const instance = {
      toJSON: () => ({
        id: 7,
        title: 'Leg Day',
        completedAt: '2026-04-11T10:30:00.000Z',
        duration: 45,
        totalSets: 12,
      }),
    };
    const row = toClientWorkoutHistoryRow(instance);
    expect(row.id).toBe(7);
    expect(row.name).toBe('Leg Day');
    expect(row.duration).toBe('45 min');
    expect(row.exercises).toBe(12);
  });

  it('falls back to "Workout" when title is missing or blank', () => {
    expect(toClientWorkoutHistoryRow({ id: 1, duration: 30 }).name).toBe('Workout');
    expect(toClientWorkoutHistoryRow({ id: 2, title: '   ', duration: 30 }).name).toBe('Workout');
  });

  it('returns null duration instead of "NaN min" when duration is missing or zero', () => {
    expect(toClientWorkoutHistoryRow({ id: 1, title: 'A', duration: null }).duration).toBeNull();
    expect(toClientWorkoutHistoryRow({ id: 2, title: 'B', duration: 0 }).duration).toBeNull();
    expect(toClientWorkoutHistoryRow({ id: 3, title: 'C' }).duration).toBeNull();
  });

  it('defaults exercises to 0 when totalSets is missing (not the stale exercisesCompleted field)', () => {
    expect(toClientWorkoutHistoryRow({ id: 1, title: 'A' }).exercises).toBe(0);
    // Explicitly prove we are NOT reading the legacy field that never existed on the model
    expect(toClientWorkoutHistoryRow({ id: 2, title: 'B', exercisesCompleted: 99 }).exercises).toBe(0);
  });

  it('does NOT read stale legacy field names (workoutName, durationMinutes)', () => {
    // These fields do not exist on WorkoutSession. If the mapper reads them
    // again, every trainer-logged workout silently renders blank.
    const staleShape = {
      id: 42,
      workoutName: 'SHOULD_NOT_APPEAR',
      durationMinutes: 60,
      exercisesCompleted: 10,
    };
    const row = toClientWorkoutHistoryRow(staleShape);
    expect(row.name).toBe('Workout');
    expect(row.duration).toBeNull();
    expect(row.exercises).toBe(0);
  });

  it('prefers completedAt > date > createdAt for the date field', () => {
    const full = {
      id: 1, title: 'A', duration: 30,
      completedAt: '2026-04-10T12:00:00.000Z',
      date: '2026-04-09T00:00:00.000Z',
      createdAt: '2026-04-08T00:00:00.000Z',
    };
    expect(toClientWorkoutHistoryRow(full).date).toBe('2026-04-10T12:00:00.000Z');

    const noCompletedAt = { id: 1, title: 'A', duration: 30, date: '2026-04-09T00:00:00.000Z', createdAt: '2026-04-08T00:00:00.000Z' };
    expect(toClientWorkoutHistoryRow(noCompletedAt).date).toBe('2026-04-09T00:00:00.000Z');

    const onlyCreated = { id: 1, title: 'A', duration: 30, createdAt: '2026-04-08T00:00:00.000Z' };
    expect(toClientWorkoutHistoryRow(onlyCreated).date).toBe('2026-04-08T00:00:00.000Z');
  });
});
