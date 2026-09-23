/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/fixtures/barrier-add.worker.mjs
 * PURPOSE: A test double for creator-add.worker.mjs that BLOCKS the engine's
 *          add-creator RESOLUTION at a chosen point, so the commit can be
 *          interleaved DETERMINISTICALLY with a main-thread mutation.
 * PART OF: Creator Brains Console (the S1-H12 registry-write race, r1)
 * ============================================================================
 *
 * WHY A BARRIER AND NOT A RACE. A test that merely starts an add and a
 * `setEnabled` at the same time and hopes they interleave is a flaky test: it
 * passes when the scheduler happens to serialise them, which is most of the
 * time, and proves nothing when it passes. The defect under test is a
 * read-modify-write window, and a window can be held open on purpose.
 *
 * ── WHERE THE WINDOW IS NOW, AFTER THE F04 SPLIT ────────────────────────────
 *
 * The add path is two halves in two files:
 *
 *     registry-resolve.mjs   resolveCreatorRef    validate, pre-flight read,
 *                                                 then call the resolver
 *     registry.mjs           commitResolvedCreator take the lock, RE-READ,
 *                                                 mutate, write, release
 *
 * The resolver is therefore invoked AFTER the pre-flight read and BEFORE the
 * authoritative read, and blocking inside it holds that gap open while the main
 * thread mutates the same registry. What the commit then does with its own read
 * is the entire question this test asks: a FRESH read inside the lock preserves
 * the concurrent enable, and a stale one destroys it.
 *
 * (An earlier revision of this comment cited `registry.mjs:100/109/127` as the
 * window. Those line numbers were from the PRE-FIX file, where one unlocked
 * function did the read, the resolve and the write. They are gone, and a stale
 * line number is worse than none — it reads as evidence.)
 *
 * PROTOCOL: identical to the shipped worker (`{ go: true, ref, r, epoch }` in,
 * `{ value, atMs, epoch }` out) because `addCreatorOffLoop` is the caller and it
 * is not modified for the test. Since F04 the `value` is a RESOLVE envelope —
 * `{ok:true, ref, resolved}` — which the main thread commits, and that is exactly
 * what makes the barrier meaningful: the commit happens on the main thread after
 * this worker has been released. The only difference from the shipped worker is
 * the injected resolver.
 *
 * The two barrier paths arrive through `process.env`, because `addCreatorOffLoop`
 * constructs the worker with `workerData: { port }` only — the ref and root come
 * over the port, so env is the one channel left for test-controlled paths.
 */
import { workerData } from 'node:worker_threads';
import { writeFileSync, existsSync } from 'node:fs';
import { resolveCreatorRef } from '../../../../scripts/creator-brains/lib/registry-resolve.mjs';

const port = workerData.port;
const READ_DONE = process.env.CB_READ_DONE;
const RELEASE = process.env.CB_RELEASE;

if (!READ_DONE || !RELEASE) {
  // Fail loudly rather than silently behaving like the shipped worker — a double
  // that quietly degrades into the real thing makes the test pass for no reason.
  throw new Error('barrier worker requires CB_READ_DONE and CB_RELEASE');
}

/** A well-formed channel id, so `isChannelId` accepts it. */
const CHANNEL_ID = `UC${'b'.repeat(22)}`;

const resolveCreator = () => {
  // The PRE-FLIGHT read has already happened by the time we get here
  // (registry-resolve.mjs: the read precedes the resolver call). The read that
  // FEEDS THE WRITE has not: it is inside the commit, on the main thread.
  writeFileSync(READ_DONE, 'read-done');

  // Block THIS THREAD until the main thread has finished its own mutation. A
  // synchronous spin is deliberate: it blocks the worker's event loop, which is
  // exactly what makes the interleaving deterministic rather than probabilistic.
  const deadline = Date.now() + 30_000;
  while (!existsSync(RELEASE)) {
    if (Date.now() > deadline) throw new Error('barrier was never released');
  }

  return { channelId: CHANNEL_ID };
};

port.on('message', async (msg) => {
  if (!msg || msg.go !== true) return;

  let value;
  try {
    value = resolveCreatorRef({ ref: msg.ref, r: msg.r, deps: { resolveCreator } });
  } catch (e) {
    value = { ok: false, reason: `the resolver threw: ${e.message}` };
  }

  port.postMessage({ value, atMs: Date.now(), epoch: msg.epoch });
});
