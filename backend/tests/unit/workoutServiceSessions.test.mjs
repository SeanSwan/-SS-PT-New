/**
 * workoutService.getWorkoutSessions — unit tests
 * ================================================
 * Locks the canonical runtime owner contract for the client workout-history
 * surface (GET /api/workout/sessions via workoutRoutes.mjs:201 →
 * workoutController.getWorkoutSessions → workoutService.getWorkoutSessions).
 *
 * Regression intent (from canonical-surface audit 2026-04-12):
 *   - The admin workout logger writes detail rows into WorkoutLog, NOT
 *     WorkoutExercise. Before this fix, the canonical owner included only
 *     `exercises` (nested WorkoutExercise rows), so `session.logs` was
 *     undefined on the frontend and every expanded workout card showed
 *     "No exercise data recorded for this session".
 *   - Default sort was `startedAt DESC`. Admin logger leaves `startedAt = null`,
 *     so trainer-logged sessions sorted to the bottom via Postgres NULLS LAST.
 *   - Controller ignored `page` query param, so pagination beyond page 1
 *     silently returned the first window again.
 *
 * Mocking strategy: the service uses getAllModels() lazy loading and the
 * database connection. Both are mocked so the test never touches Postgres
 * and asserts on the exact options passed to WorkoutSession.findAll.
 *
 * join-multiplication safety: WorkoutSession has two independent hasMany
 * relations (WorkoutExercise as 'exercises', WorkoutLog as 'logs'). Including
 * both in a single findAll with LIMIT requires `separate: true` on at least
 * the child relations, or Sequelize produces row multiplication that breaks
 * LIMIT semantics. Tests assert `separate: true` is set on both.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findAllMock,
  WorkoutSessionStub,
  WorkoutLogStub,
  WorkoutExerciseStub,
  ExerciseStub,
  MuscleGroupStub,
  SetStub,
  literalSpy,
} = vi.hoisted(() => {
  const findAllMock = vi.fn();
  return {
    findAllMock,
    WorkoutSessionStub: { findAll: findAllMock, name: 'WorkoutSession' },
    WorkoutLogStub: { name: 'WorkoutLog' },
    WorkoutExerciseStub: { name: 'WorkoutExercise' },
    ExerciseStub: { name: 'Exercise' },
    MuscleGroupStub: { name: 'MuscleGroup' },
    SetStub: { name: 'Set' },
    literalSpy: vi.fn((fragment) => ({ __literal: fragment })),
  };
});

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    WorkoutSession: WorkoutSessionStub,
    WorkoutLog: WorkoutLogStub,
    WorkoutExercise: WorkoutExerciseStub,
    Exercise: ExerciseStub,
    MuscleGroup: MuscleGroupStub,
    Set: SetStub,
    // Equipment intentionally absent — matches production reality
  }),
}));

vi.mock('../../database.mjs', () => ({
  default: {
    literal: literalSpy,
  },
}));

import workoutService from '../../services/workoutService.mjs';

const findIncludeByAlias = (includes, alias) =>
  (includes || []).find((inc) => inc.as === alias);

describe('workoutService.getWorkoutSessions', () => {
  beforeEach(() => {
    findAllMock.mockReset();
    literalSpy.mockClear();
    findAllMock.mockResolvedValue([]);
  });

  it('calls WorkoutSession.findAll exactly once with userId in the where clause', async () => {
    await workoutService.getWorkoutSessions(42);
    expect(findAllMock).toHaveBeenCalledTimes(1);
    const [opts] = findAllMock.mock.calls[0];
    expect(opts.where).toMatchObject({ userId: 42 });
  });

  it('includes WorkoutLog as "logs" with separate:true (join-multiplication safe)', async () => {
    await workoutService.getWorkoutSessions(42);
    const [opts] = findAllMock.mock.calls[0];
    const logsInclude = findIncludeByAlias(opts.include, 'logs');
    expect(logsInclude).toBeDefined();
    expect(logsInclude.model).toBe(WorkoutLogStub);
    expect(logsInclude.separate).toBe(true);
    expect(Array.isArray(logsInclude.order)).toBe(true);
    expect(logsInclude.order[0][0]).toBe('setNumber');
    expect(logsInclude.attributes).toEqual(
      expect.arrayContaining(['exerciseName', 'setNumber', 'reps', 'weight', 'tempo', 'rest', 'rpe']),
    );
  });

  it('keeps WorkoutExercise as "exercises" but marks it separate:true for the same reason', async () => {
    await workoutService.getWorkoutSessions(42);
    const [opts] = findAllMock.mock.calls[0];
    const exercisesInclude = findIncludeByAlias(opts.include, 'exercises');
    expect(exercisesInclude).toBeDefined();
    expect(exercisesInclude.model).toBe(WorkoutExerciseStub);
    expect(exercisesInclude.separate).toBe(true);
  });

  it('default order prefers completedAt then date then startedAt with NULLS LAST — admin-logged rows not buried', async () => {
    await workoutService.getWorkoutSessions(42);
    const [opts] = findAllMock.mock.calls[0];
    // Accept two shapes: (a) a single sequelize.literal carrying the full ORDER BY fragment,
    // (b) an array of sequelize.literal entries. Both must include completedAt + NULLS LAST.
    expect(literalSpy).toHaveBeenCalled();
    const literalCalls = literalSpy.mock.calls.map((call) => call[0]);
    const joinedLiterals = literalCalls.join(' | ');
    expect(joinedLiterals).toMatch(/completedAt/i);
    expect(joinedLiterals).toMatch(/DESC/i);
    expect(joinedLiterals).toMatch(/NULLS LAST/i);
    // Must reference date as a tiebreaker so self-logged rows are not pushed behind null startedAt
    expect(joinedLiterals).toMatch(/"date"/i);
  });

  it('respects an explicit sort/order option when the caller provides one', async () => {
    await workoutService.getWorkoutSessions(42, { sort: 'intensity', order: 'ASC' });
    const [opts] = findAllMock.mock.calls[0];
    // Explicit caller sort should NOT go through the literal fallback
    expect(opts.order).toEqual([['intensity', 'ASC']]);
  });

  it('passes limit and offset through unchanged when provided by the caller', async () => {
    await workoutService.getWorkoutSessions(42, { limit: 25, offset: 50 });
    const [opts] = findAllMock.mock.calls[0];
    expect(opts.limit).toBe(25);
    expect(opts.offset).toBe(50);
  });

  it('defaults limit to 10 and offset to 0 when caller omits them', async () => {
    await workoutService.getWorkoutSessions(42);
    const [opts] = findAllMock.mock.calls[0];
    expect(opts.limit).toBe(10);
    expect(opts.offset).toBe(0);
  });

  it('applies status filter when status option is provided', async () => {
    await workoutService.getWorkoutSessions(42, { status: 'completed' });
    const [opts] = findAllMock.mock.calls[0];
    expect(opts.where).toMatchObject({ userId: 42, status: 'completed' });
  });
});