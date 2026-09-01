/**
 * approveCaptureWorkoutService — behavioral tests (blueprint Slice 1, F1/F2)
 * ==========================================================================
 * Regression targets from PLAUD-AUTO-INGEST-REBUILD-BLUEPRINT-2026-09-01.md:
 *
 *   F1 — the old seam wrote a workout_sessions UUID into
 *        approved_workout_form_id (FK → daily_workout_forms) AFTER the
 *        workout transaction had committed: guaranteed FK violation,
 *        orphaned workout, merge re-approvable. The fix is ONE transaction
 *        wrapping workout write + merge finalization, recording
 *        approved_workout_session_id (FK → workout_sessions).
 *   F2 — source='plaud_merge_segment' was handled nowhere: segment applies
 *        wrote workouts with zero merge-request validation. Segments now
 *        validate the merge under lock but do NOT finalize it (the
 *        standalone /approve endpoint closes multi-segment reviews).
 *
 * These are behavior tests against fakes — no DB, no source-text regexes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const workoutSessionCreate = vi.fn();
const workoutSessionFindOne = vi.fn();
const workoutSessionUpdate = vi.fn();
const workoutLogBulkCreate = vi.fn();

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    WorkoutSession: {
      create: (...a) => workoutSessionCreate(...a),
      findOne: (...a) => workoutSessionFindOne(...a),
      update: (...a) => workoutSessionUpdate(...a),
    },
    WorkoutLog: { bulkCreate: (...a) => workoutLogBulkCreate(...a) },
  }),
}));

const awardWorkoutXP = vi.fn();
vi.mock('../../services/awardWorkoutXP.mjs', () => ({
  awardWorkoutXP: (...a) => awardWorkoutXP(...a),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { approvePlaudMergeWorkout, MergeApprovalError } = await import(
  '../../services/workout/approveCaptureWorkoutService.mjs'
);
const { WorkoutLogError } = await import('../../services/workout/workoutLogService.mjs');

// ── Fakes ────────────────────────────────────────────────────────────────────

function makeTx() {
  return {
    committed: false,
    rolledBack: false,
    async commit() {
      if (this.rolledBack) throw new Error('cannot commit a rolled-back transaction');
      this.committed = true;
    },
    async rollback() {
      if (this.committed) throw new Error('cannot rollback a committed transaction');
      this.rolledBack = true;
    },
  };
}

function makeFakeDb({ mergeRow, updateReturns } = {}) {
  const txs = [];
  const queries = [];
  const sequelize = {
    txs,
    queries,
    async transaction() {
      const tx = makeTx();
      txs.push(tx);
      return tx;
    },
    async query(sql, opts = {}) {
      queries.push({ sql, opts });
      if (/SELECT[\s\S]*FROM\s+plaud_merge_requests[\s\S]*FOR UPDATE/i.test(sql)) {
        return [mergeRow ? [mergeRow] : []];
      }
      if (/UPDATE\s+plaud_merge_requests/i.test(sql)) {
        return [updateReturns ?? [{ id: mergeRow?.id ?? 1 }]];
      }
      return [[]];
    },
  };
  return { sequelize, txs, queries };
}

const MERGE_UUID = '3f2e1d0c-9b8a-4765-8321-0fedcba98765';

const approvableMergeRow = () => ({
  id: 7,
  status: 'completed',
  user_id: 5,
  client_id: 42,
  approved_workout_session_id: null,
});

const basePayload = (sequelize, overrides = {}) => ({
  mergeRequestId: MERGE_UUID,
  clientId: 42,
  exercises: [{ name: 'Goblet Squat', sets: [{ setNumber: 1, reps: 10, weight: 100 }] }],
  date: '2026-08-30',
  notes: null,
  title: 'PLAUD merge 2026-08-30',
  duration: 60,
  intensity: null,
  actingUserId: 5,
  actingRole: 'trainer',
  sequelize,
  finalizeMerge: true,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  workoutSessionFindOne.mockResolvedValue(null); // no duplicate-date hit
  workoutSessionCreate.mockImplementation(async (vals) => ({
    id: 'ws-uuid-0001',
    ...vals,
    update: vi.fn().mockResolvedValue(undefined),
  }));
  workoutLogBulkCreate.mockResolvedValue([]);
  awardWorkoutXP.mockResolvedValue(null); // no XP → no auto-post import
});

// ── Whole-merge approval (F1) ────────────────────────────────────────────────

describe('approvePlaudMergeWorkout — whole merge (source=plaud_merge)', () => {
  it('commits workout write and merge finalization in ONE transaction', async () => {
    const { sequelize, txs } = makeFakeDb({ mergeRow: approvableMergeRow() });

    const result = await approvePlaudMergeWorkout(basePayload(sequelize));

    // exactly one main transaction, committed
    expect(txs[0].committed).toBe(true);
    expect(txs[0].rolledBack).toBe(false);
    // the workout rows were written INSIDE that same transaction
    expect(workoutSessionCreate).toHaveBeenCalledTimes(1);
    expect(workoutSessionCreate.mock.calls[0][1].transaction).toBe(txs[0]);
    expect(workoutLogBulkCreate.mock.calls[0][1].transaction).toBe(txs[0]);
    expect(result.sessionId).toBe('ws-uuid-0001');
    expect(result.mergeApproved).toBe(true);
  });

  it('F1 regression: finalization writes approved_workout_session_id, never approved_workout_form_id', async () => {
    const { sequelize, queries } = makeFakeDb({ mergeRow: approvableMergeRow() });

    await approvePlaudMergeWorkout(basePayload(sequelize));

    const update = queries.find((q) => /UPDATE\s+plaud_merge_requests/i.test(q.sql));
    expect(update).toBeDefined();
    expect(update.sql).toMatch(/approved_workout_session_id/);
    expect(update.sql).not.toMatch(/approved_workout_form_id/);
    expect(update.opts.replacements.sessionId).toBe('ws-uuid-0001');
    // finalization runs inside the same transaction as the workout write
    const { sequelize: db2 } = makeFakeDb({ mergeRow: approvableMergeRow() });
    await approvePlaudMergeWorkout(basePayload(db2));
    const update2 = db2.queries.find((q) => /UPDATE\s+plaud_merge_requests/i.test(q.sql));
    expect(update2.opts.transaction).toBe(db2.txs[0]);
  });

  it('finalization purges the cipher payload (privacy invariant preserved from the old seam)', async () => {
    const { sequelize, queries } = makeFakeDb({ mergeRow: approvableMergeRow() });

    await approvePlaudMergeWorkout(basePayload(sequelize));

    const update = queries.find((q) => /UPDATE\s+plaud_merge_requests/i.test(q.sql));
    expect(update.sql).toMatch(/payload_cipher\s*=\s*NULL/);
    expect(update.sql).toMatch(/payload_iv\s*=\s*NULL/);
    expect(update.sql).toMatch(/payload_tag\s*=\s*NULL/);
    expect(update.sql).toMatch(/cipher_purged_at\s*=\s*NOW\(\)/);
  });

  it('atomicity: finalization failure rolls back the workout write — no orphan, no compensating DELETE', async () => {
    const { sequelize, txs, queries } = makeFakeDb({
      mergeRow: approvableMergeRow(),
      updateReturns: [], // UPDATE affects zero rows → invariant failure
    });

    await expect(approvePlaudMergeWorkout(basePayload(sequelize))).rejects.toThrow(MergeApprovalError);

    expect(txs[0].rolledBack).toBe(true);
    expect(txs[0].committed).toBe(false);
    // the workout write happened inside the rolled-back tx — nothing persists,
    // so the fragile compensating DELETE of the old seam must be gone
    expect(queries.some((q) => /DELETE\s+FROM\s+workout/i.test(q.sql))).toBe(false);
  });
});

// ── Pre-write validation gate ────────────────────────────────────────────────

describe('approvePlaudMergeWorkout — validation before any write', () => {
  it.each([
    ['unknown merge request', undefined],
    ['not completed', { ...approvableMergeRow(), status: 'processing' }],
    ['already approved', { ...approvableMergeRow(), status: 'approved' }],
    ['already linked to a workout', { ...approvableMergeRow(), approved_workout_session_id: 'ws-prev' }],
    ['wrong client', { ...approvableMergeRow(), client_id: 99 }],
  ])('rejects (%s) without touching workout tables', async (_label, mergeRow) => {
    const { sequelize, txs } = makeFakeDb({ mergeRow });

    await expect(approvePlaudMergeWorkout(basePayload(sequelize))).rejects.toThrow(MergeApprovalError);

    expect(workoutSessionCreate).not.toHaveBeenCalled();
    expect(workoutLogBulkCreate).not.toHaveBeenCalled();
    expect(txs[0].rolledBack).toBe(true);
  });

  it('rejects a non-admin actor who does not own the merge; admin bypasses ownership', async () => {
    const foreign = { ...approvableMergeRow(), user_id: 777 };

    const denied = makeFakeDb({ mergeRow: { ...foreign } });
    await expect(
      approvePlaudMergeWorkout(basePayload(denied.sequelize, { actingUserId: 5, actingRole: 'trainer' })),
    ).rejects.toThrow(MergeApprovalError);
    expect(workoutSessionCreate).not.toHaveBeenCalled();

    const allowed = makeFakeDb({ mergeRow: { ...foreign } });
    const result = await approvePlaudMergeWorkout(
      basePayload(allowed.sequelize, { actingUserId: 1, actingRole: 'admin' }),
    );
    expect(result.sessionId).toBe('ws-uuid-0001');
  });

  it('passes DUPLICATE_DATE through as WorkoutLogError and rolls everything back', async () => {
    workoutSessionFindOne.mockResolvedValue({ id: 'existing-session' });
    const { sequelize, txs } = makeFakeDb({ mergeRow: approvableMergeRow() });

    const err = await approvePlaudMergeWorkout(basePayload(sequelize)).catch((e) => e);

    expect(err).toBeInstanceOf(WorkoutLogError);
    expect(err.code).toBe('DUPLICATE_DATE');
    expect(txs[0].rolledBack).toBe(true);
    expect(txs[0].committed).toBe(false);
  });
});

// ── Segment applies (F2) ─────────────────────────────────────────────────────

describe('approvePlaudMergeWorkout — segment apply (source=plaud_merge_segment)', () => {
  it('F2 regression: validates the merge under lock, writes the workout, does NOT finalize', async () => {
    const { sequelize, txs, queries } = makeFakeDb({ mergeRow: approvableMergeRow() });

    const result = await approvePlaudMergeWorkout(
      basePayload(sequelize, { finalizeMerge: false }),
    );

    // validated: the FOR UPDATE select ran
    expect(queries.some((q) => /FOR UPDATE/i.test(q.sql))).toBe(true);
    // wrote the workout, committed
    expect(workoutSessionCreate).toHaveBeenCalledTimes(1);
    expect(txs[0].committed).toBe(true);
    // did NOT flip the merge request — the standalone /approve endpoint owns that
    expect(queries.some((q) => /UPDATE\s+plaud_merge_requests/i.test(q.sql))).toBe(false);
    expect(result.mergeApproved).toBe(false);
  });

  it('rejects a segment apply against an already-approved merge (hardening the old open door)', async () => {
    const { sequelize } = makeFakeDb({
      mergeRow: { ...approvableMergeRow(), status: 'approved' },
    });

    await expect(
      approvePlaudMergeWorkout(basePayload(sequelize, { finalizeMerge: false })),
    ).rejects.toThrow(MergeApprovalError);
    expect(workoutSessionCreate).not.toHaveBeenCalled();
  });
});

// ── Engagement side effects ──────────────────────────────────────────────────

describe('approvePlaudMergeWorkout — engagement runs post-commit, best-effort', () => {
  it('awards XP only AFTER the main transaction committed', async () => {
    const { sequelize, txs } = makeFakeDb({ mergeRow: approvableMergeRow() });
    let mainTxCommittedAtAwardTime = null;
    awardWorkoutXP.mockImplementation(async () => {
      mainTxCommittedAtAwardTime = txs[0].committed;
      return null;
    });

    await approvePlaudMergeWorkout(basePayload(sequelize));

    expect(awardWorkoutXP).toHaveBeenCalledTimes(1);
    expect(mainTxCommittedAtAwardTime).toBe(true);
  });

  it('an engagement failure never fails the approval', async () => {
    const { sequelize } = makeFakeDb({ mergeRow: approvableMergeRow() });
    awardWorkoutXP.mockRejectedValue(new Error('gamification down'));

    const result = await approvePlaudMergeWorkout(basePayload(sequelize));

    expect(result.sessionId).toBe('ws-uuid-0001');
    expect(result.xp).toBeNull();
  });
});
