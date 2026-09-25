/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/creator-add.mjs
 * PURPOSE: The main-thread end of the off-loop add-creator resolution (S1-H12).
 * PART OF: Creator Brains Console (S1-H12; unblocks slice S2)
 * ============================================================================
 *
 * ── WHY THIS WAITS, WHEN THE HEALTH PROBE DELIBERATELY DOES NOT ─────────────
 *
 * `health-probe.mjs` offers `requestProbe()` / `takeProbe()` and NOTHING that
 * waits, because a status READ can be answered with the previous reading and a
 * helper that blocked would be used. This module is the opposite case: the
 * caller is a `POST` that must return the created row. There is no useful
 * previous answer to hand back, so waiting is the contract.
 *
 * THAT IS SAFE HERE AND WAS NOT SAFE IN-PROCESS. The 1577 ms freeze S1-H12
 * measured was the engine's `execFileSync` running ON THE BRIDGE THREAD. Here it
 * runs on a worker, so the main thread's event loop keeps turning while the
 * Promise is pending — `/api/status` and the static page answer normally
 * throughout. The Promise is what lets the handler continue without blocking;
 * the worker is what makes the Promise honest.
 *
 * ── THE FAILURE LIFECYCLE, WHICH IS THE WHOLE FILE ──────────────────────────
 *
 * A worker that cannot start, dies mid-call, or goes silent must ALL produce an
 * ANSWER rather than hanging the request. Same four concerns as R2-04:
 *
 *   OWNERSHIP    worker + port live in one `channel` record, so closure is
 *                possible at all.
 *   ERROR / EXIT Without an `'error'` handler a worker that fails to load emits
 *   / TIMEOUT    an unhandled `'error'` event and NODE KILLS THE BRIDGE. `'exit'`
 *                covers death mid-call; the deadline covers a worker that neither
 *                answers nor dies. All three reject the Promise with a reason the
 *                handler turns into a 500-with-a-sentence, never a hang.
 *   EPOCH        results carry the epoch of the channel that produced them, so a
 *                late answer from a retired channel is discarded, not adopted as
 *                the answer to the next call.
 *   CLOSURE      `resetCreateChannel()` terminates and closes. A thread nobody is
 *                awaiting should not exist.
 *
 * ONE WORKER PER CALL, NOT A POOL. Adds are a deliberate, rare, human-initiated
 * action (tier T2), so there is no throughput to win and a pool would add a queue
 * whose depth nobody bounds. Each call owns its channel and closes it in `finally`.
 *
 * ── NOTHING HERE IS `unref`'d, AND THAT IS THE OPPOSITE OF THE HEALTH PROBE ──
 *
 * `health-probe.mjs` unrefs its worker and its port on purpose: a probe is never a
 * reason for the process to stay alive, and without the unref `node --test` would
 * hang on a worker whose question nobody is asking any more.
 *
 * THIS MODULE MUST DO THE REVERSE, and getting it backwards is a bug that hides
 * until the caller is the only thing running. The first draft unref'd the timer and
 * the worker "for symmetry", and the suite reported:
 *
 *     'Promise resolution is still pending but the event loop has already resolved'
 *
 * Node exited BEFORE the worker's answer arrived, because the awaited request was
 * the only pending handle and the unref told Node it did not count. An add is a
 * `POST` whose response is the whole point: while a call is in flight, the worker
 * and its deadline are the REASON to stay alive, so both are ref'd.
 *
 * The cost is that a caller who starts a create and never awaits it can hold the
 * process open until the deadline. That is the correct trade here — a bridge
 * shutting down mid-write would lose the very result the operator is waiting on —
 * and it is bounded by CREATE_TIMEOUT_MS.
 *
 * ── WHY THE DEADLINE COVERS THE RESOLVE AND NOT THE COMMIT (F04) ────────────
 *
 * The deadline exists to stop a worker wedged in a 180 s subprocess. It must NOT
 * be able to stop a worker that owns the store. Astra r1 found the first version
 * of this module doing exactly that: the worker called `addCreator`, which takes
 * the store lock, and `finish()` terminates the worker — so a `terminate()` that
 * landed between acquire and release left the lock on disk under this process's
 * OWN pid (worker threads share it), which `acquireLock` will never reclaim.
 * Permanent wedge, not contention.
 *
 * The split is therefore drawn at OWNERSHIP: the worker resolves and owns
 * nothing, and the commit runs here on the main thread where no timer can
 * preempt it. Killing the worker at any instant is now safe, and a timed-out add
 * commits nothing — so a 500 means "nothing happened", which is the only
 * honest reading of that status.
 *
 * @module creator-brains-console/lib/creator-add
 */

import { MessageChannel, Worker } from 'node:worker_threads';
import { commitResolvedCreator } from '../../../scripts/creator-brains/lib/registry.mjs';

/**
 * How long a started create-worker may stay silent before it is declared failed.
 *
 * Deliberately BELOW the engine's own 180 s `execFileSync` ceiling: the engine's
 * timeout covers the SUBPROCESS, this one covers the WORKER. Without it, a worker
 * wedged before it spawns anything would hold the HTTP request open forever — and
 * a console whose add button spins indefinitely is worse than one that says it
 * could not resolve the channel.
 */
export const CREATE_TIMEOUT_MS = 60_000;

/** The worker script. Injectable so a FAILING worker can be constructed in tests. */
let workerUrl = new URL('./creator-add.worker.mjs', import.meta.url);

/** Test seam (R2-04 discipline): swap the worker for one that misbehaves. */
export function __setCreateWorkerUrl(url) { workerUrl = url; }
/** Test seam: restore the shipped worker. */
export function __resetCreateWorkerUrl() { workerUrl = new URL('./creator-add.worker.mjs', import.meta.url); }

let epoch = 0;

/**
 * Turn the worker's RESOLVE envelope into the engine's add result, by committing
 * it here on the main thread (F04).
 *
 * The worker answers with `{ok:true, ref, resolved}` or a refusal. A refusal is
 * already the engine's own shape and passes through untouched; a success is
 * handed to `commitResolvedCreator`, which validates the payload again — it
 * arrived over a thread boundary, so its shape is re-established rather than
 * trusted — and takes the store lock.
 *
 * The two-step shape is the whole point: a worker killed by the deadline has
 * resolved at most, so a timed-out add commits NOTHING. Before this, the worker
 * held the lock and a timeout could strand it.
 */
function settleCreate(value, r) {
  if (!value || value.ok !== true) {
    return value || { ok: false, reason: 'the resolver worker answered with no result' };
  }
  return commitResolvedCreator({ r, ref: value.ref, resolved: value.resolved });
}

/**
 * Run the engine's RESOLUTION on a worker, then commit on the main thread.
 *
 * RESOLVES with `{ ok: true, creator }` or `{ ok: false, reason }` — the engine's
 * own shapes, so `addCreatorRow` needs no translation. REJECTS only when the
 * WORKER failed (start/exit/timeout), because that is a different fact from "the
 * engine refused this ref": the first is a 500, the second is a 422 carrying the
 * engine's sentence. A rejection means nothing was committed, which is why the
 * commit is not the worker's to do.
 *
 * @param {string} ref  the raw ref, already validated by the caller
 * @param {string} r    the store root
 * @returns {Promise<{ok: boolean, creator?: object, reason?: string}>}
 */
export function addCreatorOffLoop(ref, r, { timeoutMs = CREATE_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const { port1, port2 } = new MessageChannel();
    const myEpoch = ++epoch;
    let settled = false;
    let worker;

    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { port1.close(); } catch { /* already closed */ }
      try { worker.terminate(); } catch { /* already gone */ }
      fn(arg);
    };

    const timer = setTimeout(
      () => finish(reject, new Error(`the resolver did not answer within ${timeoutMs} ms`)),
      timeoutMs,
    );
    // DELIBERATELY REF'D, unlike the health probe's timer. The deadline is what
    // guarantees an ANSWER, so it must be able to outlive every other handle — if it
    // unrefs, Node exits first and the awaited caller never gets its rejection.

    try {
      worker = new Worker(workerUrl, { workerData: { port: port2 }, transferList: [port2] });
    } catch (e) {
      // A SYNCHRONOUS CONSTRUCTION FAILURE (bad URL, no thread support) never
      // reaches the 'error' event, so it is caught here or not at all.
      finish(reject, new Error(`the resolver worker could not start: ${e.message}`));
      return;
    }

    // A WORKER THAT CANNOT RUN MUST STILL PRODUCE AN ANSWER. Three separate ways
    // this can fail, and each needs its own handler:
    //
    //   'error'  a worker that fails to LOAD. Node emits an unhandled 'error' event
    //            for this, and an unhandled 'error' on a Worker is an UNCAUGHT
    //            EXCEPTION — it takes the bridge down with it. This handler is not
    //            defensive decoration; it is the difference between a 500 and a
    //            dead console, and the suite CONSTRUCTS this failure rather than
    //            asserting the handler exists.
    //   'exit'   a worker that died mid-call. Guarded by `settled`, because a
    //            worker that answered and THEN exited has already resolved this
    //            promise and must not have its good answer overwritten by a
    //            "exited before answering".
    //   timeout  a worker that neither answers nor dies. Handled by the timer above.
    //
    // Covered by `test/creator-add.failure.test.mjs`, which builds each case with a
    // deliberately broken worker script.
    worker.on('error', (e) => finish(reject, new Error(`the resolver worker failed: ${e.message}`)));
    worker.on('exit', (code) => {
      if (!settled) finish(reject, new Error(`the resolver worker exited before answering (code ${code})`));
    });

    // DELIBERATELY NOT unref'd, unlike the health probe's worker. While a create is
    // outstanding this worker IS the reason the process should stay alive — unref'ing
    // it lets Node exit before the answer and leaves the caller's Promise pending
    // forever. `finish()` terminates it on every settled path, so it never outlives
    // the call by more than the deadline.

    // ── THE PORT IS THE CHANNEL, NOT THE WORKER ──────────────────────────────
    //
    // This is the one line the first draft of this file got wrong, and it failed
    // SILENTLY: the worker loaded, came online, and never answered, because the
    // request went to the Worker's own message channel while the worker listens on
    // the port it was handed via `workerData`. `health-probe.mjs:205` sends on
    // `ch.port.postMessage(...)` — the PORT — and that is why it works. A `Worker`
    // and a `MessagePort` are two DIFFERENT channels; posting on the wrong one
    // produces no error, no 'error' event, and no answer: only the timeout.
    //
    // Receiving is symmetric: the worker posts on its end of the same port, so the
    // main thread receives on `port1`. There is no `worker.on('message')` here, and
    // adding one would be dead code that looks like a second delivery route.
    port1.on('message', (msg) => {
      if (!msg || msg.epoch !== myEpoch) return; // a retired epoch's answer
      // THE STRADDLE GUARD (G9 hostile review, major 4): arguments evaluate
      // BEFORE `finish` runs, so a reply already queued on this port when the
      // deadline fired still ran `settleCreate` — committing a creator after
      // the caller had already received the timeout rejection that promised
      // nothing happened. A settled call drops the answer: the worker's work
      // is a pure resolve, the commit lives in `settleCreate` below, and the
      // module's invariant ("a timed-out add commits nothing") holds again.
      if (settled) return;
      // THE COMMIT HAPPENS HERE, ON A THREAD NOTHING TERMINATES (F04).
      //
      // `finish()` terminates the worker, so a lock taken on the worker could be
      // stranded mid-acquire by the deadline — permanently, since worker threads
      // share this process's pid and a live-looking owner is never reclaimed.
      // The worker therefore only resolves; the store is taken here, after the
      // terminable thread is done, in a synchronous critical section the timer
      // cannot interrupt (JS cannot preempt it mid-call, and `finish` below
      // clears the timer on the same tick).
      //
      // THIS IS A SYNCHRONOUS WRITE ON THE BRIDGE, which is a real cost and a
      // deliberate one: it is a read plus an atomic write of a small JSON file —
      // not the 1577 ms `execFileSync` this module exists to get off the loop —
      // and the PATCH path already pays exactly the same cost via `setEnabled`.
      finish(resolve, settleCreate(msg.value, r));
    });

    // Send the request AFTER the handlers are attached. The worker cannot answer
    // before it has received this, but attaching first means a worker that throws
    // during load still has somewhere for its 'error' to land.
    port1.postMessage({ go: true, ref, r, epoch: myEpoch });
  });
}

/** True when a worker-backed create is appropriate for these options. */
export function shouldUseWorker(deps) {
  return !deps || Object.keys(deps).length === 0;
}
