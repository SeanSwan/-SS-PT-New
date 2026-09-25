/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/fixtures/early-answer.worker.mjs
 * PURPOSE: A test double for creator-add.worker.mjs that answers IMMEDIATELY,
 *          so the reply is already in flight while the main thread's deadline
 *          clock is still running (G9 review major 4: the straddle window).
 * PART OF: Creator Brains Console (the S1-H12 add path)
 * ============================================================================
 *
 * WHY "EARLY" AND NOT SILENT. `silent.worker.mjs` drives the deadline branch
 * with an answer that never comes; the straddle defect needs the OPPOSITE — an
 * answer that is QUEUED on the port when the deadline fires, because the defect
 * is what happens to that reply afterwards. Paired with a main-thread busy-wait
 * across the deadline in the test, the interleaving is deterministic: both the
 * answer and the expiry are queued while the loop is frozen, and Node's phase
 * order (timers before message delivery) runs the deadline first.
 *
 * PROTOCOL: identical to the shipped worker (`{ go: true, ref, r, epoch }` in,
 * `{ value, atMs, epoch }` out), because `addCreatorOffLoop` is the caller.
 * The resolved value is well-formed so `commitResolvedCreator` — which the
 * STRADDLE would call — accepts it: a malformed value would make the commit
 * fail for the wrong reason and the test would pass while blind.
 */

/** A well-formed channel id, so the commit's re-validation accepts it. */
const CHANNEL_ID = `UC${'c'.repeat(22)}`;

import { workerData } from 'node:worker_threads';

const port = workerData.port;

port.on('message', (msg) => {
  if (!msg || msg.go !== true) return;
  port.postMessage({
    value: { ok: true, ref: msg.ref, resolved: { channelId: CHANNEL_ID } },
    atMs: Date.now(),
    epoch: msg.epoch,
  });
});
