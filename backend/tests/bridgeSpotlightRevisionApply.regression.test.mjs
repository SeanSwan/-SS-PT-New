/**
 * Regression suite for hostile review R5-01 (astra round 5, filed FAIL).
 *
 * THE DEFECT. `applyBridgeSpotlightRevision` answered "no-op" whenever a row existed at all,
 * assuming any row observed after a missed conditional UPDATE must carry a revision >= the
 * incoming one. That assumption is false. A delayed OLDER delivery can INSERT in the window
 * between the UPDATE and the re-read, so the helper acknowledged the newer revision and
 * discarded it:
 *
 *   A (revision 2, retracted)  UPDATE → no row → 0 rows
 *   B (revision 1, live)       INSERT revision 1, commit
 *   A                          SELECT → revision 1
 *   A                          `if (current) return no-op`   ← revision 2 silently lost
 *
 * These tests drive the helper directly, because the defect lives in its control flow and not in
 * the HTTP contract. The route-level suites mock the model in a way that cannot express the
 * window — which is exactly why the defect shipped past a green suite.
 *
 * The first case is the load-bearing one: revert the bound-and-recheck loop and it fails.
 */
import { describe, expect, it, vi } from 'vitest';
import { applyBridgeSpotlightRevision } from '../services/bridgeSpotlightRevisionApply.mjs';

const itemId = '11111111-2222-3333-4444-555555555555';

const values = (revision) => ({
  itemId,
  revision,
  retracted: true,
  headline: 'Community update',
});

describe('R5-01 — a row can appear in the window after a missed UPDATE', () => {
  it('applies a newer revision when an OLDER row appears after the UPDATE miss', async () => {
    // update(): miss, then hit on the re-check. findByPk(): revision 1 — OLDER than our 2.
    const SwanSpotlight = {
      update: vi.fn().mockResolvedValueOnce([0]).mockResolvedValueOnce([1]),
      findByPk: vi.fn().mockResolvedValue({ revision: 1 }),
      create: vi.fn(),
    };

    const result = await applyBridgeSpotlightRevision({
      SwanSpotlight, itemId, revision: 2, values: values(2),
    });

    // The whole finding: revision 2 is the newer of the two, so it must be written.
    expect(result.applied).toBe(true);
    expect(SwanSpotlight.update).toHaveBeenCalledTimes(2);
    // It must NOT reach create() — a row exists, it is simply older.
    expect(SwanSpotlight.create).not.toHaveBeenCalled();
  });

  it('does not acknowledge a revision it could not persist', async () => {
    // Every pass misses and the stored row stays older than ours. The old code returned
    // `{applied:false, storedRevision:1}` here — a 200 that lied. It must now throw.
    const SwanSpotlight = {
      update: vi.fn().mockResolvedValue([0]),
      findByPk: vi.fn().mockResolvedValue({ revision: 1 }),
      create: vi.fn(),
    };

    await expect(
      applyBridgeSpotlightRevision({ SwanSpotlight, itemId, revision: 2, values: values(2) })
    ).rejects.toThrow(/could not resolve/);
  });
});

describe('R5-01 — the pre-existing paths must not regress', () => {
  it('still returns no-op when the observed winner is newer (and writes once)', async () => {
    const SwanSpotlight = {
      update: vi.fn().mockResolvedValue([0]),
      findByPk: vi.fn().mockResolvedValue({ revision: 3 }),
      create: vi.fn(),
    };

    const result = await applyBridgeSpotlightRevision({
      SwanSpotlight, itemId, revision: 2, values: values(2),
    });

    expect(result).toEqual({ applied: false, storedRevision: 3 });
    expect(SwanSpotlight.update).toHaveBeenCalledTimes(1);
    expect(SwanSpotlight.create).not.toHaveBeenCalled();
  });

  it('still returns no-op when the observed winner is EQUAL', async () => {
    const SwanSpotlight = {
      update: vi.fn().mockResolvedValue([0]),
      findByPk: vi.fn().mockResolvedValue({ revision: 2 }),
      create: vi.fn(),
    };

    const result = await applyBridgeSpotlightRevision({
      SwanSpotlight, itemId, revision: 2, values: values(2),
    });

    expect(result).toEqual({ applied: false, storedRevision: 2 });
    expect(SwanSpotlight.update).toHaveBeenCalledTimes(1);
  });

  it('still retries the conditional write after losing the primary-key race', async () => {
    const conflict = Object.assign(new Error('duplicate key'), {
      name: 'SequelizeUniqueConstraintError',
    });
    const SwanSpotlight = {
      update: vi.fn().mockResolvedValueOnce([0]).mockResolvedValueOnce([1]),
      findByPk: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockRejectedValue(conflict),
    };

    const result = await applyBridgeSpotlightRevision({
      SwanSpotlight, itemId, revision: 2, values: values(2),
    });

    expect(result.applied).toBe(true);
    expect(SwanSpotlight.update).toHaveBeenCalledTimes(2);
    expect(SwanSpotlight.create).toHaveBeenCalledTimes(1);
  });

  it('still creates the first delivery of an item', async () => {
    const SwanSpotlight = {
      update: vi.fn().mockResolvedValue([0]),
      findByPk: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    };

    const result = await applyBridgeSpotlightRevision({
      SwanSpotlight, itemId, revision: 1, values: values(1),
    });

    expect(result).toEqual({ applied: true, created: true });
    expect(SwanSpotlight.update).toHaveBeenCalledTimes(1);
    expect(SwanSpotlight.create).toHaveBeenCalledTimes(1);
  });

  it('rethrows a non-uniqueness error from create rather than swallowing it', async () => {
    const boom = new Error('connection terminated');
    const SwanSpotlight = {
      update: vi.fn().mockResolvedValue([0]),
      findByPk: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockRejectedValue(boom),
    };

    await expect(
      applyBridgeSpotlightRevision({ SwanSpotlight, itemId, revision: 1, values: values(1) })
    ).rejects.toThrow('connection terminated');
  });
});

/**
 * MOCK SOUNDNESS — can the mocks make this helper claim a DB-unreachable success?
 *
 * Added 2026-09-21 after the R6-01 lesson (a suite that stayed green when the feature was
 * deleted). The `[UNKNOWN]` on live-PostgreSQL serialization cannot be closed without a
 * database, but the weaker question CAN be answered here: does the mock surface admit a
 * `applied:true` that PostgreSQL could not have produced?
 *
 * The answer these tests pin down is NO, and the reason is structural rather than lucky —
 * `findByPk` is consulted ONLY on the miss branch, and the `applied > 0` exit never consults
 * it at all. Shape A is the control: given a store that is internally inconsistent (the
 * predicate should have matched but the write reports zero), the helper FAILS CLOSED.
 *
 * These cases are what the /c/tmp probe measured, moved into the suite so they are not lost.
 * They do NOT close R5-03/R5-04; see REVISION-APPLY-MOCK-SOUNDNESS-PROBE-2026-09-21.md §6.
 */
describe('mock soundness — no DB-unreachable success is reachable', () => {
  it('fails closed on an inconsistent store instead of reporting a success', async () => {
    // update never matches, yet the stored row stays OLDER than ours — a shape a real
    // PostgreSQL cannot hold (`WHERE revision < 2` would have matched a stored 1). The helper
    // must not paper over the contradiction by acknowledging our revision.
    const SwanSpotlight = {
      update: vi.fn().mockResolvedValue([0]),
      findByPk: vi.fn().mockResolvedValue({ revision: 1 }),
      create: vi.fn(),
    };

    await expect(
      applyBridgeSpotlightRevision({ SwanSpotlight, itemId, revision: 2, values: values(2) })
    ).rejects.toThrow(/could not resolve[\s\S]*stored revision: 1/);
  });

  it('consults the re-read ONLY on the miss branch, so a stale fixed read cannot decide a hit', async () => {
    // `findByPk` is pinned to an older revision for the whole call. The success must still be
    // driven by the SECOND update returning [1], with findByPk read exactly once.
    const SwanSpotlight = {
      update: vi.fn().mockResolvedValueOnce([0]).mockResolvedValueOnce([1]),
      findByPk: vi.fn().mockResolvedValue({ revision: 1 }),
      create: vi.fn(),
    };

    const result = await applyBridgeSpotlightRevision({
      SwanSpotlight, itemId, revision: 2, values: values(2),
    });

    expect(result).toEqual({ applied: true, created: false });
    expect(SwanSpotlight.update).toHaveBeenCalledTimes(2);
    // The structural claim: the winning write is not corroborated by a re-read at all.
    expect(SwanSpotlight.findByPk).toHaveBeenCalledTimes(1);
  });

  it('reports the newer winner when the conditional write misses and a NEWER row is stored', async () => {
    // A newer revision landed between our read and our write, so the predicate matched
    // nothing and the re-read reports the revision that won. `create` is deliberately NOT
    // reached: the helper short-circuits on `current.revision >= revision` (line 135) because
    // a row exists and it already supersedes ours. Asserting `create` was called would be
    // asserting a path the helper correctly avoids.
    const SwanSpotlight = {
      update: vi.fn().mockResolvedValue([0]),
      findByPk: vi.fn().mockResolvedValue({ revision: 5 }),
      create: vi.fn(),
    };

    const result = await applyBridgeSpotlightRevision({
      SwanSpotlight, itemId, revision: 2, values: values(2),
    });

    expect(result).toEqual({ applied: false, storedRevision: 5 });
    expect(SwanSpotlight.update).toHaveBeenCalledTimes(1);
    expect(SwanSpotlight.create).not.toHaveBeenCalled();
  });
});

describe('R5-03 — the sentinel survives the whole call, not just the splitter', () => {
  it('omits `imageUrl` from the UPDATE payload when the caller passes a sentinel', async () => {
    const SENTINEL = Symbol('preserve');
    const SwanSpotlight = {
      update: vi.fn().mockResolvedValue([1]),
      findByPk: vi.fn().mockResolvedValue({ revision: 1 }),
      create: vi.fn(),
    };

    await applyBridgeSpotlightRevision({
      SwanSpotlight, itemId, revision: 2, values: { ...values(2), imageUrl: SENTINEL },
    });

    const payload = SwanSpotlight.update.mock.calls[0][0];
    expect(payload).not.toHaveProperty('imageUrl');
    // And the sentinel itself must never be written as a value.
    expect(Object.values(payload)).not.toContain(SENTINEL);
  });

  it('DOES write an explicit `imageUrl: null` — the distinction is by value, not presence', async () => {
    const SwanSpotlight = {
      update: vi.fn().mockResolvedValue([1]),
      findByPk: vi.fn().mockResolvedValue({ revision: 1 }),
      create: vi.fn(),
    };

    await applyBridgeSpotlightRevision({
      SwanSpotlight, itemId, revision: 2, values: { ...values(2), imageUrl: null },
    });

    const payload = SwanSpotlight.update.mock.calls[0][0];
    expect(payload).toHaveProperty('imageUrl');
    expect(payload.imageUrl).toBeNull();
  });
});
