/**
 * Phase 16 (2026-04-16) — workoutLogService null-honest intensity tests
 * ======================================================================
 * Locks the Phase 16 contract on the admin/transcript-log lane:
 *
 *   - body.intensity undefined → persist null (not phantom 5)
 *   - body.intensity null      → persist null (defensive symmetry)
 *   - body.intensity 7         → persist 7
 *   - body.intensity 0         → validation error (below clamp range)
 *   - body.intensity 11        → validation error (above clamp range)
 *
 * This complements `phase16DailyWorkoutFormWriterTruthfulness.test.mjs`
 * (T1), which locks the same contract on the primary client-facing
 * /api/workout-forms backend. Both lanes must agree: null-ingest
 * produces a null DB row.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────
// Mocks — same pattern as phase15ExerciseNoteGuard test to bypass
// the real Sequelize model registry at import time.
// ─────────────────────────────────────────────────────────────

vi.mock('../../models/index.mjs', () => {
  const fakeSession = {
    id: 'fake-session-uuid-1',
    update: vi.fn().mockResolvedValue(undefined),
  };
  const fakeWorkoutSession = {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async (attrs) => ({ ...fakeSession, ...attrs })),
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

vi.mock('../../services/awardWorkoutXP.mjs', () => ({
  awardWorkoutXP: vi.fn().mockResolvedValue({ alreadyAwarded: true }),
}));

const { logWorkoutForClient, WorkoutLogError } = await import(
  '../../services/workout/workoutLogService.mjs'
);
const { getAllModels } = await import('../../models/index.mjs');

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function makeFakeSequelize() {
  return {
    transaction: vi.fn().mockResolvedValue({
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
    }),
    query: vi.fn().mockResolvedValue([[]]),
  };
}

const MIN_VALID_ARGS = {
  clientId: 42,
  exercises: [{ name: 'Bench', sets: [{ setNumber: 1, reps: 10, weight: 100 }] }],
  trainerId: 99,
};

beforeEach(() => {
  const { WorkoutSession } = getAllModels();
  WorkoutSession.findOne.mockClear().mockResolvedValue(null);
  WorkoutSession.create.mockClear().mockImplementation(async (attrs) => ({
    id: 'fake-session-uuid-1',
    ...attrs,
    update: vi.fn().mockResolvedValue(undefined),
  }));
});

async function getCreatedSessionAttrs() {
  const { WorkoutSession } = getAllModels();
  expect(WorkoutSession.create).toHaveBeenCalledTimes(1);
  return WorkoutSession.create.mock.calls[0][0];
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe('Phase 16 — logWorkoutForClient intensity null-honest contract', () => {
  it('persists null when intensity key is undefined', async () => {
    const sequelize = makeFakeSequelize();
    await logWorkoutForClient({ ...MIN_VALID_ARGS, sequelize });
    const attrs = await getCreatedSessionAttrs();
    expect(attrs.intensity).toBeNull();
  });

  it('persists null when intensity key is explicit null (defensive symmetry)', async () => {
    const sequelize = makeFakeSequelize();
    await logWorkoutForClient({ ...MIN_VALID_ARGS, intensity: null, sequelize });
    const attrs = await getCreatedSessionAttrs();
    expect(attrs.intensity).toBeNull();
  });

  it('persists 7 when caller provides intensity: 7', async () => {
    const sequelize = makeFakeSequelize();
    await logWorkoutForClient({ ...MIN_VALID_ARGS, intensity: 7, sequelize });
    const attrs = await getCreatedSessionAttrs();
    expect(attrs.intensity).toBe(7);
  });

  it('rejects intensity: 0 (below clamp range)', async () => {
    const sequelize = makeFakeSequelize();
    await expect(
      logWorkoutForClient({ ...MIN_VALID_ARGS, intensity: 0, sequelize }),
    ).rejects.toThrow(/intensity must be between 1 and 10/);
  });

  it('rejects intensity: 11 (above clamp range)', async () => {
    const sequelize = makeFakeSequelize();
    await expect(
      logWorkoutForClient({ ...MIN_VALID_ARGS, intensity: 11, sequelize }),
    ).rejects.toThrow(/intensity must be between 1 and 10/);
  });

  it('ANTI-REGRESSION: does not substitute 5 when intensity is missing', async () => {
    const sequelize = makeFakeSequelize();
    await logWorkoutForClient({ ...MIN_VALID_ARGS, sequelize });
    const attrs = await getCreatedSessionAttrs();
    // The pre-Phase-16 code path did `Number(intensity ?? 5)` which
    // would stamp 5 onto every un-rated session. Explicit check that
    // we no longer do that.
    expect(attrs.intensity).not.toBe(5);
    expect(attrs.intensity).toBeNull();
  });
});
