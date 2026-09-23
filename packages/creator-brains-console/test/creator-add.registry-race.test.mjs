/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/creator-add.registry-race.test.mjs
 * PURPOSE: RED-first proof that the S1-H12 off-loop add can LOSE a concurrent
 *          enable/disable on the same registry.
 * PART OF: Creator Brains Console (the S1-H12 registry-write race, r1)
 * ============================================================================
 *
 * THE DEFECT. S1-H12 was fixed by moving the engine's blocking add-creator
 * resolution onto a worker thread (`lib/creator-add.mjs` -> `creator-add.worker.mjs`).
 * That removed a 1577 ms freeze of the bridge's only thread — and introduced
 * genuine parallelism between two UNLOCKED read-modify-write operations on the
 * same `registry.json`:
 *
 *     add        -> worker thread -> registry-resolve.mjs resolveCreatorRef (validate, read, resolve)
 *                   main thread   -> registry.mjs commitResolvedCreator   (read … write)
 *     enable/dis -> main thread   -> registry.mjs setEnabled               (read … write)
 *
 * ⚠ CORRECTED 2026-09-23 — THE PARAGRAPH THAT STOOD HERE WAS TRUE WHEN WRITTEN
 * AND IS NOW FALSE. It read: "Neither takes a lock. Measured: `registry.mjs`
 * contains no `withLock` and no `acquireLock`; the engine's only lock call sites
 * are in `run-lock.mjs` and `run-journal.mjs`, which guard the DAILY RUN, not the
 * creator catalog." That was the measured state of the defect and it is kept
 * here rather than deleted, because it is the evidence the fix answers. Both
 * mutations now take the engine's cross-process lock: `commitResolvedCreator`
 * takes it with the sync `acquireLock` and gives it back through `releaseStore`,
 * and `setEnabled` — which must stay SYNCHRONOUS for its three callers — does the
 * same. See the fix note at the end of this docblock for what that does and does
 * not make this test prove.
 *
 * BEFORE THE FIX THIS COULD NOT HAPPEN. Both calls ran on the single main
 * thread, so the event loop serialised them: each ran to completion before the
 * other started. Moving the add to a worker is what created the window. So this
 * is a regression introduced by the S1-H12 remedy, not a pre-existing flaw —
 * which is why it must be closed before S2 ships the add UI on top of it.
 *
 * ── WHAT THE FIX DID, AND WHAT THIS TEST THEREFORE PROVES (measured) ────────
 *
 * Deleting ONE mechanism at a time with a mutation harness gives an orthogonal
 * pair, and the pair is the point. RE-MEASURED 2026-09-23 after the F04 split,
 * because the split moved the anchors and an inherited table would have been
 * evidence for a structure that no longer exists:
 *
 *     carry the pre-flight snapshot into the commit  ->  THIS TEST GOES RED
 *     delete the lock, keep the fresh re-read        ->  THIS TEST STAYS GREEN
 *
 * So this test proves the RE-READ — the write must be built from a read taken
 * under the lock, not from a snapshot taken before the resolver ran — and it
 * proves NOTHING about the lock. That is structural, not an oversight: the
 * barrier arms inside the resolver, which runs BEFORE any lock is taken, so the
 * interleaving below is closed by the fresh read alone. The lock's own coverage
 * lives in `creator-add.registry-lock.test.mjs`, which holds the store for real.
 * A test that cannot fail when the mechanism is deleted is not evidence for it,
 * and claiming otherwise here would be the defect this note exists to prevent.
 *
 * WHY THE FIRST MUTANT NOW SPANS TWO FILES (F04). The resolve/commit split put
 * the resolver and the read-that-feeds-the-write in different modules, so a stale
 * read can no longer be produced inside one function — the mutant has to CARRY
 * the pre-flight snapshot across the seam. That is the only remaining way to
 * reintroduce this defect, and it is a realistic refactor ("why read the file
 * twice?"), which is why it is the recorded mutant rather than a single-anchor
 * edit that no longer expresses the bug at all.
 *
 * WHAT THIS TEST DOES **NOT** ESTABLISH
 *   - It does not show the race is likely. It shows the window EXISTS and is
 *     reachable; the probability under real timing is unmeasured and not claimed.
 *   - It does not cover the lock, and it does not cover the CLI/engine path
 *     racing the console. Both are cross-process or cross-mechanism facts that
 *     this in-process interleaving cannot reach; the lock is covered by
 *     `creator-add.registry-lock.test.mjs` instead.
 *   - It is a TEST DOUBLE, not the shipped worker: the shipped worker uses the
 *     real `execFileSync` resolver and cannot be held open on command. The window
 *     it exercises is the shipped window, unmodified. The line numbers it used to
 *     cite (`registry.mjs:100/109/127`) have moved with the fix and are no longer
 *     quoted, because a line number that drifts is a claim that rots.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addCreator, setEnabled, getCreator } from '../../../scripts/creator-brains/lib/registry.mjs';
import { addCreatorOffLoop, __setCreateWorkerUrl, __resetCreateWorkerUrl } from '../lib/creator-add.mjs';

const SEED_ID = `UC${'a'.repeat(22)}`;
const seedResolver = () => ({ channelId: SEED_ID });

test('an off-loop add must not lose a concurrent enable (S1-H12 registry-write race)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cb-registry-race-'));
  const readDone = join(dir, 'read-done');
  const release = join(dir, 'release');
  process.env.CB_READ_DONE = readDone;
  process.env.CB_RELEASE = release;

  try {
    // Seed one creator via the engine itself, so the registry has a real shape.
    const seeded = await addCreator({
      ref: 'https://www.youtube.com/@seed', r: dir, deps: { resolveCreator: seedResolver },
    });
    assert.equal(seeded.ok, true, `seed add must succeed: ${JSON.stringify(seeded)}`);
    assert.equal(getCreator(dir, SEED_ID).enabled, false, 'precondition: the seed arrives DISABLED');

    __setCreateWorkerUrl(new URL('./fixtures/barrier-add.worker.mjs', import.meta.url));
    const pending = addCreatorOffLoop('https://www.youtube.com/@second', dir);

    // 1. Wait until the worker has done its PRE-FLIGHT read and is inside the
    //    resolver. The read that FEEDS THE WRITE has not happened yet: since the
    //    F04 split it lives in `commitResolvedCreator`, on this thread, after
    //    step 3.
    const deadline = Date.now() + 20_000;
    while (!existsSync(readDone)) {
      if (Date.now() > deadline) throw new Error('the barrier never armed — the worker did not reach the resolver');
      await new Promise((res) => setTimeout(res, 10));
    }

    // 2. Mutate the SAME registry on the main thread, inside the open window.
    setEnabled(dir, SEED_ID, true);
    assert.equal(getCreator(dir, SEED_ID).enabled, true, 'precondition: setEnabled landed');

    // 3. Release the worker so it returns the resolved identity. `addCreatorOffLoop`
    //    then commits it HERE, on this thread (F04) — which is where the write,
    //    and therefore the question of WHICH read it is built from, now lives.
    writeFileSync(release, 'go');
    const res = await pending;
    assert.equal(res.ok, true, `the off-loop add must succeed: ${JSON.stringify(res)}`);

    // 4. THE INVARIANT: a serialised implementation preserves BOTH mutations.
    //    A losing implementation writes from the pre-flight snapshot and reverts
    //    the enable. Measured mutant: carry that snapshot into the commit.
    const after = getCreator(dir, SEED_ID);
    assert.equal(
      after.enabled, true,
      'LOST UPDATE: the off-loop add wrote a snapshot taken before `setEnabled`, '
      + 'so the enable was silently reverted. `commitResolvedCreator` must build its '
      + 'write from a read taken UNDER the lock, never from the resolve half\'s '
      + 'pre-flight snapshot — see lib/registry-resolve.mjs vs lib/registry.mjs.',
    );
  } finally {
    __resetCreateWorkerUrl();
    delete process.env.CB_READ_DONE;
    delete process.env.CB_RELEASE;
    rmSync(dir, { recursive: true, force: true });
  }
});
