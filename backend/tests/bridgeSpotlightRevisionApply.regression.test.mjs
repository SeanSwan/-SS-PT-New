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
