/**
 * workoutLogService — Phase 15.0 exerciseNote stamping tests
 * ===========================================================
 * Locks the canonical Phase 15.0 contract that `buildLogRows` stamps
 * the exercise-level note on EVERY row of an exercise group, not just
 * set 1. This is the bug fix for Phase 13.2's fragile set-1 anchor,
 * which silently lost data when set 1 was deleted in the admin edit
 * flow.
 *
 * Strategy: `buildLogRows` is module-private, so the test exercises
 * it through the `logWorkoutForClient` public entry point with a
 * mocked Sequelize transaction. We intercept the `bulkCreate` call
 * to capture the rows that would have been inserted, then assert
 * the stamping invariant on them.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logWorkoutForClient } from '../../services/workout/workoutLogService.mjs';

// ─────────────────────────────────────────────────────────────
// Mock the sequelize model registry + transaction primitives
// ─────────────────────────────────────────────────────────────

// `logWorkoutForClient` calls `getAllModels()` at invocation time, which
// returns the real WorkoutSession / WorkoutLog constructors. We replace
// that module-level helper with a fake that returns spy objects we can
// observe — no DB round-trip, pure in-memory capture.
vi.mock('../../models/index.mjs', () => {
  const makeFakeSession = () => ({
    id: 'fake-session-uuid-1',
    update: vi.fn().mockResolvedValue(undefined),
  });
  const fakeWorkoutSession = {
    findOne: vi.fn().mockResolvedValue(null), // no duplicate
    create: vi.fn().mockImplementation(async (attrs) => ({
      id: 'fake-session-uuid-1',
      ...attrs,
      update: vi.fn().mockResolvedValue(undefined),
    })),
    update: vi.fn().mockResolvedValue([1]),
  };
  const fakeWorkoutLog = {
    bulkCreate: vi.fn().mockResolvedValue([]),
  };
  return {
    getAllModels: () => ({
      WorkoutSession: fakeWorkoutSession,
      WorkoutLog: fakeWorkoutLog,
    }),
  };
});

// awardWorkoutXP is called best-effort after the main write; stub it
// so we don't need to mock gamification state.
vi.mock('../../services/awardWorkoutXP.mjs', () => ({
  awardWorkoutXP: vi.fn().mockResolvedValue({ alreadyAwarded: true }),
}));

// Build a minimal sequelize stub: query() for any raw calls (unused
// here but future-proof), plus transaction() returning a tx with
// commit/rollback.
function makeFakeSequelize() {
  const tx = {
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
  };
  return {
    transaction: vi.fn().mockResolvedValue(tx),
    query: vi.fn().mockResolvedValue([[]]),
  };
}

// Pull the same mocked WorkoutLog reference to inspect bulkCreate args.
import { getAllModels } from '../../models/index.mjs';

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe('workoutLogService — Phase 15.0 exerciseNote stamping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('nested format: stamps exerciseNote on EVERY row of the group', async () => {
    const sequelize = makeFakeSequelize();
    await logWorkoutForClient({
      clientId: 42,
      trainerId: 7,
      date: '2026-04-10T12:00:00.000Z',
      title: 'Lower Body',
      duration: 50,
      intensity: 7,
      sequelize,
      exercises: [
        {
          name: 'Goblet Squat',
          exerciseNote: 'knees caved on last set',
          sets: [
            { setNumber: 1, reps: 10, weight: 40 },
            { setNumber: 2, reps: 10, weight: 40 },
            { setNumber: 3, reps: 10, weight: 40 },
          ],
        },
      ],
    });

    const { WorkoutLog } = getAllModels();
    expect(WorkoutLog.bulkCreate).toHaveBeenCalledTimes(1);
    const rows = WorkoutLog.bulkCreate.mock.calls[0][0];
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.exerciseNote).toBe('knees caved on last set');
    }
    // set notes were NOT populated — the canonical contract keeps them
    // strictly set-level.
    expect(rows[0].notes).toBeNull();
    expect(rows[1].notes).toBeNull();
    expect(rows[2].notes).toBeNull();
  });

  it('nested format: accepts legacy parser `performanceNotes` as a fallback', async () => {
    // The Phase 13.2 parser output used `performanceNotes`. The service
    // keeps that input path working so older call sites don't need an
    // immediate rename — both shapes land on the same column.
    const sequelize = makeFakeSequelize();
    await logWorkoutForClient({
      clientId: 42,
      trainerId: 7,
      date: '2026-04-10T12:00:00.000Z',
      title: 'Bench Day',
      duration: 45,
      intensity: 6,
      sequelize,
      exercises: [
        {
          name: 'Bench Press',
          performanceNotes: 'shoulder clicking',
          sets: [
            { setNumber: 1, reps: 5, weight: 185 },
            { setNumber: 2, reps: 5, weight: 185 },
          ],
        },
      ],
    });

    const { WorkoutLog } = getAllModels();
    const rows = WorkoutLog.bulkCreate.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.exerciseNote).toBe('shoulder clicking');
    }
  });

  it('nested format: exerciseNote wins over performanceNotes when both are present', async () => {
    const sequelize = makeFakeSequelize();
    await logWorkoutForClient({
      clientId: 42,
      trainerId: 7,
      date: '2026-04-10T12:00:00.000Z',
      title: 'Test',
      duration: 30,
      intensity: 5,
      sequelize,
      exercises: [
        {
          name: 'Deadlift',
          exerciseNote: 'canonical note',
          performanceNotes: 'legacy note',
          sets: [{ setNumber: 1, reps: 5, weight: 225 }],
        },
      ],
    });

    const { WorkoutLog } = getAllModels();
    const rows = WorkoutLog.bulkCreate.mock.calls[0][0];
    expect(rows[0].exerciseNote).toBe('canonical note');
  });

  it('nested format: set-level notes survive alongside exerciseNote without merging', async () => {
    const sequelize = makeFakeSequelize();
    await logWorkoutForClient({
      clientId: 42,
      trainerId: 7,
      date: '2026-04-10T12:00:00.000Z',
      title: 'Split Squat Day',
      duration: 40,
      intensity: 6,
      sequelize,
      exercises: [
        {
          name: 'Split Squat',
          exerciseNote: 'knees caved throughout',
          sets: [
            { setNumber: 1, reps: 10, weight: 30 },
            { setNumber: 2, reps: 10, weight: 30 },
            { setNumber: 3, reps: 10, weight: 30, notes: 'tempo breakdown' },
          ],
        },
      ],
    });

    const { WorkoutLog } = getAllModels();
    const rows = WorkoutLog.bulkCreate.mock.calls[0][0];
    expect(rows).toHaveLength(3);
    // Every row has the exercise note.
    for (const row of rows) expect(row.exerciseNote).toBe('knees caved throughout');
    // But the set-level note is only on set 3 — no merging, no
    // string acrobatics.
    expect(rows[0].notes).toBeNull();
    expect(rows[1].notes).toBeNull();
    expect(rows[2].notes).toBe('tempo breakdown');
  });

  it('flat (AI command) format: stamps exerciseNote on every expanded set row', async () => {
    const sequelize = makeFakeSequelize();
    await logWorkoutForClient({
      clientId: 42,
      trainerId: 7,
      date: '2026-04-10T12:00:00.000Z',
      title: 'Voice Log',
      duration: 50,
      intensity: 7,
      sequelize,
      exercises: [
        {
          name: 'Pull-up',
          exerciseNote: 'grip fatigue by set 3',
          sets: 3, // flat count, not an array
          reps: 5,
          weight: 0,
        },
      ],
    });

    const { WorkoutLog } = getAllModels();
    const rows = WorkoutLog.bulkCreate.mock.calls[0][0];
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.exerciseNote).toBe('grip fatigue by set 3');
    }
  });

  it('no exerciseNote input → exerciseNote is null on every row (not empty string)', async () => {
    const sequelize = makeFakeSequelize();
    await logWorkoutForClient({
      clientId: 42,
      trainerId: 7,
      date: '2026-04-10T12:00:00.000Z',
      title: 'Nothing to note',
      duration: 30,
      intensity: 5,
      sequelize,
      exercises: [
        {
          name: 'Row',
          sets: [
            { setNumber: 1, reps: 10, weight: 100 },
            { setNumber: 2, reps: 10, weight: 100 },
          ],
        },
      ],
    });

    const { WorkoutLog } = getAllModels();
    const rows = WorkoutLog.bulkCreate.mock.calls[0][0];
    for (const row of rows) {
      expect(row.exerciseNote).toBeNull();
    }
  });
});
