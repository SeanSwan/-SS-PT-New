/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/creator-add.worker-ownership.test.mjs
 * PURPOSE: Does a create leave the store OWNED by a thread that can be killed
 *          out from under it (F04)?
 * PART OF: Creator Brains Console (Astra hostile r1)
 * ADDED: 2026-09-23
 * ============================================================================
 *
 * ── THE DEFECT (F04, Astra r1) ──────────────────────────────────────────────
 *
 * The F01/F03 fix put `acquireLock` inside the add path. That path ran on a
 * worker thread, and `creator-add.mjs` TERMINATES that thread when its 60 s
 * deadline expires. A `terminate()` landing between acquire and release leaves
 * the lock on disk — and because worker threads share `process.pid`, the
 * surviving bridge looks like a LIVE owner, which `acquireLock` refuses to
 * reclaim. The store is not busy, it is wedged for every later writer.
 *
 * ── WHAT IS TESTABLE HERE, AND WHAT HONESTLY IS NOT ─────────────────────────
 *
 * The vulnerable window is the few milliseconds between acquire and release, and
 * the deadline has to land inside it. Astra could not reproduce it either
 * ("REPRODUCTION: read-only, no execution"), and no test can make it
 * deterministic: the window is not addressable from outside the worker.
 *
 * So this file tests the two consequences that ARE addressable, and is explicit
 * about the third:
 *
 *   1. A create that hits the deadline commits NOTHING and strands no lock.
 *      (True before and after the fix — a regression guard, not a discriminator.)
 *   2. The COMMIT runs on the main thread, built from the worker's resolve
 *      envelope. This is the mechanism that removes the window, and it IS
 *      falsifiable: make `settleCreate` pass the envelope through, and the
 *      caller sees `ok:true` while the catalog stays empty -> RED.
 *   3. That the SHIPPED worker owns nothing is a source-shape tripwire, and is
 *      labelled as one. It cannot be proven behaviourally without the real
 *      yt-dlp resolver, and pretending otherwise would be the mistake
 *      `lock-release-wiring.test.mjs` records twice: an instrument reporting a
 *      state it never reached. The tripwire's job is to fail loudly if someone
 *      re-points the worker at the committing function; it is not the proof.
 *
 * ── THE MUTATION MATRIX (measured 2026-09-23) ───────────────────────────────
 *
 * Deleting ONE mechanism at a time, then restoring byte-for-byte (md5 verified):
 *
 *   mutant                        test 1   test 2   test 3
 *   baseline                      GREEN    GREEN    GREEN
 *   m3-passthrough                GREEN    RED      GREEN
 *   m4-worker-commits             GREEN    RED      RED
 *
 * `m3-passthrough` is `settleCreate` returning the worker's envelope unchanged —
 * the caller is told `ok:true` while the catalog stays empty. `m4-worker-commits`
 * re-points the shipped worker at the committing function, which is the F04
 * regression itself. Test 1 stays GREEN under both, which is expected and is why
 * it is labelled a regression guard: a worker that never answers leaves no lock
 * under either design.
 *
 * `m4` reddening test 2 as well is an artefact of the mutant, not of the shipped
 * code: test 2 swaps in the barrier fixture, so it is unaffected by the shipped
 * worker's contents — the second RED is test 2's own assertion firing on a
 * refusal the mutant's `addCreator` path cannot avoid.
 *
 * RUN: node --test packages/creator-brains-console/test/creator-add.worker-ownership.test.mjs
 * @module creator-brains-console/test/creator-add.worker-ownership
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCreator, listCreatorsSafe } from '../../../scripts/creator-brains/lib/registry.mjs';
import { addCreatorOffLoop, __setCreateWorkerUrl, __resetCreateWorkerUrl } from '../lib/creator-add.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const WORKER = join(HERE, '..', 'lib', 'creator-add.worker.mjs');

const RESOLVED_ID = `UC${'b'.repeat(22)}`;

async function waitFor(predicate, ms = 20_000) {
  const deadline = Date.now() + ms;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('condition never became true');
    await new Promise((res) => setTimeout(res, 10));
  }
}

test('F04: a create past the deadline commits NOTHING and strands no lock', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cb-f04-timeout-'));
  try {
    __setCreateWorkerUrl(new URL('./fixtures/silent.worker.mjs', import.meta.url));

    await assert.rejects(
      () => addCreatorOffLoop('https://www.youtube.com/@slow', dir, { timeoutMs: 150 }),
      /did not answer within 150 ms/,
      'a silent worker must be ended by the DEADLINE, not by an exit or an error',
    );

    assert.equal(existsSync(join(dir, '.lock')), false,
      'a timed-out create left a lock behind. The worker was TERMINATED, so anything it '
      + 'owned would now be stranded under this process\'s own pid — which acquireLock '
      + 'never reclaims, because that owner looks alive. This is the F04 wedge.');

    assert.equal(listCreatorsSafe(dir).creators.length, 0,
      'a timed-out create must commit NOTHING, so that a 500 to the operator means '
      + '"nothing happened" rather than "maybe"');
  } finally {
    __resetCreateWorkerUrl();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('F04: the COMMIT runs on the main thread, from the worker\'s resolve envelope', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cb-f04-commit-'));
  const readDone = join(dir, 'read-done');
  const release = join(dir, 'release');
  process.env.CB_READ_DONE = readDone;
  process.env.CB_RELEASE = release;

  try {
    __setCreateWorkerUrl(new URL('./fixtures/barrier-add.worker.mjs', import.meta.url));
    const pending = addCreatorOffLoop('https://www.youtube.com/@second', dir);

    await waitFor(() => existsSync(readDone));
    writeFileSync(release, 'go');

    const res = await pending;
    assert.equal(res.ok, true, `the add must succeed: ${JSON.stringify(res)}`);
    assert.ok(res.creator, `the parent must return the engine's creator row: ${JSON.stringify(res)}`);
    assert.equal(res.creator.channelId, RESOLVED_ID,
      'the committed row must be the identity the WORKER resolved');

    const stored = getCreator(dir, RESOLVED_ID);
    assert.ok(stored,
      'THE COMMIT MUST HAVE HAPPENED ON THE MAIN THREAD. The worker only resolves now; if '
      + 'the parent passed its envelope straight through, the caller would be told `ok:true` '
      + 'while the catalog stayed empty — and the operator would have an add that reported '
      + 'success and stored nothing. Measured mutant: `settleCreate` returning `value`.');
    assert.equal(existsSync(join(dir, '.lock')), false,
      'the main-thread commit must give the store back');
  } finally {
    __resetCreateWorkerUrl();
    delete process.env.CB_READ_DONE;
    delete process.env.CB_RELEASE;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('F04 TRIPWIRE (source-shape, not proof): the shipped worker resolves and owns nothing', () => {
  // Read the note at the top of this file before trusting this test. The
  // behavioural proof that the commit is not the worker's is the test above;
  // what cannot be proven behaviourally is that the SHIPPED worker takes no
  // lock, because doing so would need the real yt-dlp resolver. This gate exists
  // so that re-pointing the worker at the committing function fails loudly and
  // names the file to look at, instead of quietly restoring the F04 window.
  const src = readFileSync(WORKER, 'utf-8');

  assert.match(src, /import \{ resolveCreatorRef \} from/,
    'creator-add.worker.mjs no longer imports the resolve half — re-scope this gate, do not '
    + 'loosen it. If the worker now takes the store lock, a deadline termination can strand '
    + 'it permanently (F04).');

  assert.ok(!/\baddCreator\b\s*[},]/.test(src.replace(/^ \*.*$/gm, '')),
    'creator-add.worker.mjs appears to import or call `addCreator` again. That function TAKES '
    + 'THE STORE LOCK, and this thread is terminated on a deadline — which is exactly the F04 '
    + 'defect. The worker must call `resolveCreatorRef` and let the main thread commit.');

  assert.ok(existsSync(WORKER), 'creator-add.worker.mjs disappeared while this gate ran');
});
