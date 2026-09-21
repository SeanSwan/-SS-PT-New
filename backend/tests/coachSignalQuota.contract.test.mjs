/**
 * CoachSignal — quota admission is serialized and transactional (D2)
 * ===================================================================
 * Split out of `coachSignalIntegrity.contract.test.mjs` for hostile review R5-08: that file was
 * 312 lines against `06-bans.md` #50's 300-line budget. The D2 concern is self-contained and so
 * is its rationale, which is why it is the half that moved; the mock rig it shares with the
 * parent lives in `helpers/coachSignalHarness.mjs` rather than being copied.
 *
 * Its `describe` block below is byte-identical to the one it was lifted from. No assertion was
 * added, removed or reworded by the split.
 */
import { describe, expect, it } from 'vitest';
import { MEMBER_AUTHOR, installCoachSignalHarness, mocks, post } from './helpers/coachSignalHarness.mjs';

// The rig — hoisted mock declarations, `vi.mock` factories, the mounted app, the per-test reset —
// lives in the harness. It cannot be hoisted from here: a factory hoisted into a helper cannot
// close over this module's locals, and re-exporting a hoisted binding fails with
// `Cannot export hoisted variable.` All three arrangements were measured; see the harness header.
const { mockQuery, mockSignalCount, mockSignalCreate, mockTransaction } = mocks;

await installCoachSignalHarness();

describe('coach signal — quota admission is serialized and transactional (D2)', () => {
  // WHAT THESE CAN AND CANNOT PROVE. Hostile review F05 found that `count` then `create`, as
  // two unserialized statements, let two concurrent requests for DISTINCT posts both observe 4
  // and both insert — six signals against a cap of five. The fix is a per-coach PostgreSQL
  // advisory lock taken inside ONE transaction.
  //
  // These tests drive the real router and assert that the lock is TAKEN with the right key and
  // that the count and the insert share ONE transaction. They CANNOT prove that PostgreSQL
  // serializes two real sessions — that needs a live database and is recorded as `[UNKNOWN]`
  // in the round-3 packet rather than asserted here. Naming the limit is the point: round 1's
  // F02 caught a case whose name advertised a race it never injected.
  const CAP = 5; // mirrors DAILY_SIGNAL_CAP in the route

  it('takes a per-coach advisory lock before counting', async () => {
    await post();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, options] = mockQuery.mock.calls[0];
    expect(sql).toContain('pg_advisory_xact_lock');
    // Scoped to the coach, so two different coaches never block each other.
    expect(options.replacements.key).toBe('coach-signal-quota:7');
  });

  it('counts and inserts inside the SAME transaction, and hands it to both', async () => {
    await post();

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    const handle = { id: 'test-transaction' };
    expect(mockSignalCount.mock.calls[0][0].transaction).toEqual(handle);
    expect(mockSignalCreate.mock.calls[0][1].transaction).toEqual(handle);
  });

  it('takes the lock BEFORE the count, so the read cannot be stale', async () => {
    const order = [];
    mockQuery.mockImplementation(async () => { order.push('lock'); return [[], 0]; });
    mockSignalCount.mockImplementation(async () => { order.push('count'); return 0; });
    mockSignalCreate.mockImplementation(async () => {
      order.push('insert');
      return { id: 99, postId: 3, memberId: MEMBER_AUTHOR, note: null, createdAt: new Date() };
    });

    await post();

    expect(order).toEqual(['lock', 'count', 'insert']);
  });

  it('does not insert when the lock-protected count is already at the cap', async () => {
    mockSignalCount.mockResolvedValue(CAP);

    const res = await post();

    expect(res.status).toBe(429);
    expect(mockSignalCreate).not.toHaveBeenCalled();
  });

  it('leaves no half-counted admission behind when the insert fails', async () => {
    const race = Object.assign(new Error('duplicate key value'), { name: 'SequelizeUniqueConstraintError' });
    mockSignalCreate.mockRejectedValue(race);

    const res = await post();

    expect(res.status).toBe(409);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });
});
