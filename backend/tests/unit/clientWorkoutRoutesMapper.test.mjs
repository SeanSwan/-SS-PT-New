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
 *
 * Phase 1 Slice 1.2 (2026-05-03): mapper output renamed for accuracy.
 *   - `exercises: <totalSets>` (semantic mismatch — totalSets is sets, not exercises)
 *     became `setsCount: <totalSets>`
 *   - New `exerciseCount: <distinct count>` derived from joined
 *     DailyWorkoutForm.formData.exercises.length, null when not joined
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
      setsCount: 18,
      exerciseCount: null, // No joined dailyForms
      // Slice 1.2 Codex R1 MEDIUM 1: deprecated `exercises` alias.
      // When exerciseCount is null, falls back to totalSets (the
      // pre-Slice-1.2 wrong-but-stable behavior). When known, uses
      // the truthful exerciseCount value.
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
    expect(row.setsCount).toBe(12);
    expect(row.exerciseCount).toBeNull();
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

  it('defaults setsCount to 0 when totalSets is missing (not the stale exercisesCompleted field)', () => {
    expect(toClientWorkoutHistoryRow({ id: 1, title: 'A' }).setsCount).toBe(0);
    // Explicitly prove we are NOT reading the legacy field that never existed on the model
    expect(toClientWorkoutHistoryRow({ id: 2, title: 'B', exercisesCompleted: 99 }).setsCount).toBe(0);
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
    expect(row.setsCount).toBe(0);
    expect(row.exerciseCount).toBeNull();
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

  // ─── Phase 1 Slice 1.2 (2026-05-03) — exerciseCount via joined dailyForms ───

  it('derives exerciseCount from the first joined dailyForms.formData.exercises[]', () => {
    const session = {
      id: 'a',
      title: 'Push Day',
      duration: 60,
      totalSets: 24,
      completedAt: '2026-05-03T12:00:00.000Z',
      dailyForms: [
        {
          formData: {
            exercises: [
              { exerciseName: 'Bench Press', sets: [{}, {}, {}, {}] },
              { exerciseName: 'Overhead Press', sets: [{}, {}, {}] },
              { exerciseName: 'Cable Fly', sets: [{}, {}, {}] },
              { exerciseName: 'Tricep Pushdown', sets: [{}, {}, {}, {}] },
              { exerciseName: 'Lateral Raise', sets: [{}, {}, {}] },
              { exerciseName: 'Tricep Extension', sets: [{}, {}, {}, {}] },
            ],
          },
        },
      ],
    };
    const row = toClientWorkoutHistoryRow(session);
    expect(row.exerciseCount).toBe(6); // 6 distinct exercises
    expect(row.setsCount).toBe(24);     // 24 total sets
  });

  it('handles JSON-stringified formData (raw query results)', () => {
    const session = {
      id: 'b',
      title: 'Leg Day',
      totalSets: 16,
      dailyForms: [
        {
          formData: JSON.stringify({
            exercises: [{}, {}, {}, {}], // 4 exercises
          }),
        },
      ],
    };
    expect(toClientWorkoutHistoryRow(session).exerciseCount).toBe(4);
  });

  it('returns exerciseCount=null when dailyForms is empty array', () => {
    const session = {
      id: 'c',
      title: 'A',
      totalSets: 0,
      dailyForms: [],
    };
    expect(toClientWorkoutHistoryRow(session).exerciseCount).toBeNull();
  });

  it('returns exerciseCount=null when dailyForms is missing entirely (no join)', () => {
    const session = { id: 'd', title: 'A', totalSets: 5 };
    expect(toClientWorkoutHistoryRow(session).exerciseCount).toBeNull();
  });

  it('returns exerciseCount=null on malformed JSON-string formData', () => {
    const session = {
      id: 'e',
      title: 'A',
      totalSets: 0,
      dailyForms: [{ formData: 'not valid json {{{' }],
    };
    expect(toClientWorkoutHistoryRow(session).exerciseCount).toBeNull();
  });

  it('returns exerciseCount=null when formData has no exercises array', () => {
    const session = {
      id: 'f',
      title: 'A',
      totalSets: 0,
      dailyForms: [{ formData: { sessionNotes: 'no exercises field at all' } }],
    };
    expect(toClientWorkoutHistoryRow(session).exerciseCount).toBeNull();
  });

  // Slice 1.2 Codex R1 MEDIUM 1: keep `exercises` as a deprecated
  // alias for one release. Out-of-tree consumers (mobile app,
  // internal tools, cached frontend builds) read this name; ripping
  // it out is too aggressive. When exerciseCount is known, alias
  // uses the truthful value; when unknown, falls back to totalSets
  // (the pre-Slice-1.2 wrong-but-stable behavior).
  it('emits `exercises` as a deprecated alias preferring exerciseCount when known', () => {
    const sessionWithJoin = {
      id: 'a',
      title: 'A',
      totalSets: 24,
      dailyForms: [{ formData: { exercises: [{}, {}, {}, {}, {}, {}] } }], // 6 distinct
    };
    const rowWithJoin = toClientWorkoutHistoryRow(sessionWithJoin);
    // exerciseCount is the truth; alias matches.
    expect(rowWithJoin.exerciseCount).toBe(6);
    expect(rowWithJoin.exercises).toBe(6);
    expect(rowWithJoin.setsCount).toBe(24);
  });

  it('emits `exercises` as fallback to totalSets when exerciseCount is null', () => {
    // Old-shape data without dailyForms join → exerciseCount=null.
    // Alias preserves pre-Slice-1.2 behavior (= totalSets) so legacy
    // consumers don't see undefined.
    const session = { id: 1, title: 'A', totalSets: 5 };
    const row = toClientWorkoutHistoryRow(session);
    expect(row.exerciseCount).toBeNull();
    expect(row.setsCount).toBe(5);
    expect(row.exercises).toBe(5);
  });
});
