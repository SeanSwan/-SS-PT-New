/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/creator-add.registry-lock.test.mjs
 * PURPOSE: The OTHER half of the S1-H12 registry-write fix — the cross-process
 *          lock itself, which the deterministic race reproduction cannot reach.
 * PART OF: Creator Brains Console (the S1-H12 registry-write race, r1)
 * ============================================================================
 *
 * WHY THIS FILE EXISTS, AND WHY THE RACE TEST IS NOT ENOUGH.
 *
 * `creator-add.registry-race.test.mjs` reproduces the lost update with a barrier
 * worker, and it goes green once the write is built from a FRESH read. Measured
 * with a mutation harness, deleting ONE mechanism at a time:
 *
 *     delete the fresh re-read, keep the lock   ->  race test RED
 *     delete the lock, keep the fresh re-read   ->  race test GREEN
 *
 * So the race test proves the RE-READ and proves nothing at all about the lock.
 * That is not a defect in it: the barrier arms inside the resolver, which runs
 * BEFORE any lock is taken, so its interleaving is closed by the re-read alone.
 * The race test's own docblock says the same thing from the other side — "It
 * does not cover the CLI/engine path racing the console."
 *
 * What the lock adds is exactly what an in-process test cannot reach: the lock is
 * CROSS-PROCESS. It is what stops the console losing an update to `cli.mjs enable`
 * or to a daily run, neither of which is a thread in this process. So the lock is
 * covered HERE, by holding the store for real and measuring the refusal.
 *
 * ── THE TWO TRAPS THIS FILE IS WRITTEN AROUND ───────────────────────────────
 *
 * 1. AN ABSENCE ASSERTION IS SATISFIED BY THE INSTRUMENT NEVER RUNNING. "The
 *    refused write did not land" is also satisfied by a `setEnabled` that throws
 *    unconditionally, or by a typo that means the write is never reached. So the
 *    refusal arms are paired with a POSITIVE control: after the holder releases,
 *    the SAME calls must succeed and the change must be readable. A mutation that
 *    makes the mutation paths refuse everything reddens the positive arm.
 *
 * 2. "NEVER ATTEMPTED" IS NOT "DECLINED". A held store means the engine did not
 *    look at the ref or the channel id at all. The console must therefore answer
 *    409 RUN_LOCKED and not 422 REFUSED — a 422 would send the operator to check
 *    their input when the truth is that the store was busy. This is the same
 *    distinction S1-H12 drew when it made a dead resolver a 503, and it is
 *    asserted here rather than left to the error mapping.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addCreator, setEnabled, getCreator } from '../../../scripts/creator-brains/lib/registry.mjs';
import { acquireLock } from '../../../scripts/creator-brains/lib/lock.mjs';
import { addCreatorRow, setCreatorEnabled } from '../lib/creators.mjs';

const SEED_ID = `UC${'a'.repeat(22)}`;
const SECOND_ID = `UC${'b'.repeat(22)}`;
const seedResolver = () => ({ channelId: SEED_ID, title: 'Seed' });
const secondResolver = () => ({ channelId: SECOND_ID, title: 'Second' });

function freshStore() {
  return mkdtempSync(join(tmpdir(), 'cb-registry-lock-'));
}

test('a held store refuses BOTH creator mutations, and neither writes (the lock, not the re-read)', async () => {
  const dir = freshStore();
  try {
    const seeded = await addCreator({ ref: '@seed', r: dir, deps: { resolveCreator: seedResolver } });
    assert.equal(seeded.ok, true, `precondition: seed add must succeed: ${JSON.stringify(seeded)}`);
    assert.equal(getCreator(dir, SEED_ID).enabled, false, 'precondition: the seed arrives DISABLED');

    // A REAL foreign holder — a second process would take exactly this lock.
    const foreign = acquireLock(dir, { runId: 'foreign-holder' });
    assert.equal(foreign.ok, true, 'precondition: could not take the store to hold it');

    try {
      // ARM 1 — the synchronous path refuses, and says WHY in a way the console
      // can branch on (`locked`), rather than only throwing something.
      assert.throws(
        () => setEnabled(dir, SEED_ID, true),
        (e) => e && e.locked === true && /locked by another run/.test(e.message),
        'setEnabled must refuse with `locked: true` while another writer owns the store',
      );

      // ARM 2 — the async path refuses as a VALUE, keeping the `{ok, reason}`
      // contract every caller already handles.
      const res = await addCreator({
        ref: '@second', r: dir, deps: { resolveCreator: secondResolver },
      });
      assert.equal(res.ok, false, `a held store must refuse the add: ${JSON.stringify(res)}`);
      assert.equal(res.locked, true, 'the refusal must be marked as a lock, not a bad ref');

      // AND NEITHER REFUSAL WROTE — asserted while the holder still owns the store,
      // so this cannot be confused with the positive control below.
      assert.equal(
        getCreator(dir, SEED_ID).enabled, false,
        'the refused enable must NOT have landed — a refusal that still writes is the worst outcome',
      );
      assert.equal(getCreator(dir, SECOND_ID), null, 'the refused add must NOT have landed');
    } finally {
      foreign.release();
    }

    // ── POSITIVE CONTROL. Without this, an implementation that refuses EVERY
    // write would satisfy both arms above. The store is free, so the identical
    // calls must now land and be readable.
    const c = setEnabled(dir, SEED_ID, true);
    assert.equal(c.enabled, true, 'once the holder releases, the write must land');
    assert.equal(getCreator(dir, SEED_ID).enabled, true, 'and it must be readable');

    const after = await addCreator({
      ref: '@second', r: dir, deps: { resolveCreator: secondResolver },
    });
    assert.equal(after.ok, true, 'once the holder releases, the add must land');
    assert.ok(getCreator(dir, SECOND_ID), 'and the second creator must be in the catalog');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a held store answers 409 RUN_LOCKED, never 422 REFUSED (never-attempted != declined)', async () => {
  const dir = freshStore();
  try {
    await addCreator({ ref: '@seed', r: dir, deps: { resolveCreator: seedResolver } });
    const foreign = acquireLock(dir, { runId: 'foreign-holder' });
    assert.equal(foreign.ok, true, 'precondition: could not take the store to hold it');

    try {
      assert.throws(
        () => setCreatorEnabled(SEED_ID, true, { r: dir }),
        (e) => e && e.code === 'RUN_LOCKED',
        'PATCH must map a held store to RUN_LOCKED (409), not REFUSED (422)',
      );
      await assert.rejects(
        () => addCreatorRow('@second', { r: dir, deps: { resolveCreator: secondResolver } }),
        (e) => e && e.code === 'RUN_LOCKED',
        'POST must map a held store to RUN_LOCKED (409), not REFUSED (422)',
      );
    } finally {
      foreign.release();
    }

    // POSITIVE CONTROL — the same two calls, store free, must succeed.
    const row = setCreatorEnabled(SEED_ID, true, { r: dir });
    assert.equal(row.enabled, true, 'the PATCH must succeed once the store is free');
    const created = await addCreatorRow('@second', {
      r: dir, deps: { resolveCreator: secondResolver },
    });
    assert.equal(created.channelId, SECOND_ID, 'the POST must succeed once the store is free');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
