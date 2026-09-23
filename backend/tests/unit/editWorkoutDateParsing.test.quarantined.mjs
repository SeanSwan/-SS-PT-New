// QUARANTINED SWA-231 2026-09-02: same real-model chain as adminWorkoutLoggerHistoryDate; db.define unavailable under vitest. Un-skip criteria: same database.mjs test stub.
/**
 * adminWorkoutLoggerController.editWorkout — Phase 15.4 date-parsing tests
 * =========================================================================
 * Locks the Phase 13.1 fix into the EDIT path. Phase 13.1 originally fixed
 * the LOG-CREATE path in `workoutLogService.logWorkoutForClient` (use
 * `parseWorkoutLogDate` for `YYYY-MM-DD` + end-of-today validation). The
 * EDIT path in `adminWorkoutLoggerController.editWorkout` was left on the
 * old `new Date(date)` + `<= new Date()` instant-vs-instant pattern, which
 * means an admin/trainer editing a workout date could:
 *
 *   1. Pick "today" from the date picker in the morning and have the
 *      controller silently drop the update because `parseWorkoutLogDate`
 *      anchors at server-local NOON, which `<= new Date()` rejects when
 *      the request lands at 09:00 server-local.
 *   2. Pick "today" or any past date as `YYYY-MM-DD` and have it stored
 *      as UTC midnight, so a PDT user re-fetching the session would see
 *      the date display as the prior calendar day.
 *
 * This test asserts the fixed contract on the EDIT path:
 *   - `YYYY-MM-DD` parses to server-local NOON of the intended day
 *   - The future-date guard uses end-of-today (server-local), not
 *     instant-vs-instant
 *   - Today's date sent in the morning is accepted, not silently dropped
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────
// Mocks (must be declared before importing the controller under test)
// ─────────────────────────────────────────────────────────────

// `clientAccess` is the gate the controller invokes first; stub it to
// always allow and return our fake models.
const fakeWorkoutSessionFindOne = vi.fn();
const fakeSequelizeTransaction = vi.fn();

vi.mock('../../utils/clientAccess.mjs', () => ({
  ensureClientAccess: vi.fn().mockResolvedValue({
    allowed: true,
    status: 200,
    clientId: 'client-uuid-1',
    models: {
      WorkoutSession: { findOne: fakeWorkoutSessionFindOne },
      WorkoutLog: { destroy: vi.fn().mockResolvedValue(0), bulkCreate: vi.fn().mockResolvedValue([]) },
    },
  }),
}));

// The controller pulls the top-level sequelize singleton and starts a
// transaction; stub both transaction primitives.
vi.mock('../../database.mjs', () => ({
  default: {
    transaction: () => fakeSequelizeTransaction(),
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Short-circuit the static import chain: workoutLogService imports
// awardWorkoutXP, which transitively initializes Sequelize models against
// the real DB connection. We never reach those code paths in the EDIT
// flow, but the static import still triggers init at module load. Stub
// both layers so the unit test stays in-memory.
vi.mock('../../services/awardWorkoutXP.mjs', () => ({
  awardWorkoutXP: vi.fn().mockResolvedValue({ alreadyAwarded: true }),
}));
vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    WorkoutSession: { findOne: fakeWorkoutSessionFindOne },
    WorkoutLog: { destroy: vi.fn(), bulkCreate: vi.fn() },
  }),
}));

// Import AFTER mocks register.
const { editWorkout } = await import('../../controllers/adminWorkoutLoggerController.mjs');

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function makeRequest(bodyDate) {
  return {
    params: { clientId: 'client-uuid-1', sessionId: 'session-uuid-1' },
    body: { date: bodyDate },
  };
}

function makeResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

beforeEach(() => {
  fakeWorkoutSessionFindOne.mockReset();
  fakeSequelizeTransaction.mockReset();

  // Default: a session exists, with a spyable `update`.
  fakeSequelizeTransaction.mockResolvedValue({
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
  });
});

function mountFakeSessionWithCapturableUpdate() {
  const updateSpy = vi.fn().mockResolvedValue(undefined);
  fakeWorkoutSessionFindOne.mockResolvedValue({
    id: 'session-uuid-1',
    update: updateSpy,
  });
  return updateSpy;
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe('editWorkout — Phase 15.4 date-only YYYY-MM-DD parsing', () => {
  it('parses YYYY-MM-DD to server-local NOON of that calendar day (not UTC midnight)', async () => {
    const updateSpy = mountFakeSessionWithCapturableUpdate();
    await editWorkout(makeRequest('2026-04-15'), makeResponse());

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const updates = updateSpy.mock.calls[0][0];
    expect(updates.date).toBeInstanceOf(Date);
    expect(updates.date.getFullYear()).toBe(2026);
    expect(updates.date.getMonth()).toBe(3); // April (0-indexed)
    expect(updates.date.getDate()).toBe(15);
    // ANTI-REGRESSION: must NOT be UTC midnight (which `new Date('2026-04-15')`
    // would produce). The local-noon anchor gives ±12h timezone safety.
    expect(updates.date.getHours()).toBe(12);
    expect(updates.date.getHours()).not.toBe(0);
    // completedAt must mirror date.
    expect(updates.completedAt).toBeInstanceOf(Date);
    expect(updates.completedAt.getTime()).toBe(updates.date.getTime());
  });

  it('accepts TODAY when the request lands in the local morning (Phase 13.1 parity)', async () => {
    const updateSpy = mountFakeSessionWithCapturableUpdate();
    // Simulate the bug: server-local time is 09:00, user picked today's date.
    // The OLD code used `<= new Date()` instant-vs-instant, which would
    // reject the local-noon parse of today's date because noon > 09:00.
    // The fix uses end-of-today (23:59:59.999) so any local-noon today is fine.
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayDateOnly = `${yyyy}-${mm}-${dd}`;

    // Pin the server clock to local 09:00 of "today" so the regression
    // would have triggered with the old code.
    const morning = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(morning);

    try {
      await editWorkout(makeRequest(todayDateOnly), makeResponse());
      expect(updateSpy).toHaveBeenCalledTimes(1);
      const updates = updateSpy.mock.calls[0][0];
      expect(updates.date).toBeInstanceOf(Date);
      expect(updates.date.getDate()).toBe(today.getDate());
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects (silently drops) a future date past end-of-today', async () => {
    const updateSpy = mountFakeSessionWithCapturableUpdate();
    // Pick a date that is unambiguously past end-of-today.
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const yyyy = future.getFullYear();
    const mm = String(future.getMonth() + 1).padStart(2, '0');
    const dd = String(future.getDate()).padStart(2, '0');

    await editWorkout(makeRequest(`${yyyy}-${mm}-${dd}`), makeResponse());

    // The controller's contract on invalid date is "silently drop the
    // date update"; updates.date must NOT be present. Since `date` was
    // the only field in the body, `updates` is empty so `update` is not
    // called at all (matches existing controller behavior for empty updates).
    if (updateSpy.mock.calls.length > 0) {
      const updates = updateSpy.mock.calls[0][0];
      expect(updates.date).toBeUndefined();
      expect(updates.completedAt).toBeUndefined();
    }
  });

  it('ANTI-REGRESSION: does not use `new Date(date)` UTC-midnight parse', async () => {
    const updateSpy = mountFakeSessionWithCapturableUpdate();
    await editWorkout(makeRequest('2026-04-15'), makeResponse());
    const updates = updateSpy.mock.calls[0][0];
    // If the bug regresses, `new Date('2026-04-15')` would yield
    // 2026-04-15T00:00:00Z. On any timezone east of UTC the local
    // hour would be > 0; on UTC it would be 0. The fix anchors at
    // local noon (12), which is unambiguous across all timezones.
    expect(updates.date.getHours()).toBe(12);
  });
});
