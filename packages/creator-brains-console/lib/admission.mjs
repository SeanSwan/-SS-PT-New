/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/admission.mjs
 * PURPOSE: Refuse new work once a bridge starts draining, and know when the
 *          work already admitted has finished.
 * PART OF: Creator Brains Console (blueprint 05 §4)
 * SLICE: S0H (R4-02, Astra round 4)
 * ============================================================================
 *
 * WHY THIS EXISTS (R4-02). Shutdown released the health lease immediately after
 * asking `server.close()` to stop, and `server.close()` is ASYNCHRONOUS. Astra
 * round 4 drove the real HTTP handler with the real worker and measured:
 *
 *   shutdown returned; owners=0
 *   worker constructed; owners=0
 *   HTTP/1.1 400 Bad Request
 *   HTTP/1.1 200 OK
 *
 * The second request was a `/api/canary` sent on a surviving connection AFTER
 * shutdown had returned. It reached the health reader and constructed a worker
 * while the lease count was already zero — so the "last owner retires the worker"
 * rule retired a worker that was about to be built again. Ownership must outlive
 * the last dispatch, not the last `close()` call.
 *
 * WHY A COUNTER AND NOT JUST `server.close()`. `close()` stops new CONNECTIONS.
 * It does not stop a request already in flight on a keep-alive connection, and it
 * does not wait for a handler to finish. Two different facts, two mechanisms:
 * `close()` for the listener, this counter for the work.
 *
 * WHY `admit()` IS SYNCHRONOUS. The check-then-act must not straddle an `await`,
 * or a request can pass the check after the drain has begun — the same shape the
 * bridge's own in-process slot uses (`registerBridge` before the first `await`).
 * `admit()` therefore decides and counts in one synchronous step.
 *
 * @module creator-brains-console/lib/admission
 */

/**
 * One admission controller per bridge.
 *
 * @returns {{
 *   admit: () => boolean, done: () => void, close: () => void,
 *   settled: () => Promise<void>, count: () => number,
 * }}
 */
export function createAdmission() {
  let open = true;
  let inFlight = 0;
  let idle = null;

  const release = () => {
    if (inFlight === 0 && idle) {
      const resolve = idle;
      idle = null;
      resolve();
    }
  };

  return {
    /** Take a slot, or refuse because the drain has begun. */
    admit() {
      if (!open) return false;
      inFlight += 1;
      return true;
    },

    /** Give a slot back. MUST run on every path, including a thrown handler. */
    done() {
      inFlight -= 1;
      release();
    },

    /** Stop admitting. Idempotent — a second drain must not reopen the gate. */
    close() {
      open = false;
    },

    /**
     * Resolve once every admitted dispatch has finished.
     *
     * Called AFTER `close()`, so the count cannot grow while this waits. If
     * nothing is in flight it resolves immediately — a drain that always waited
     * for a timeout would make every shutdown take the timeout.
     */
    settled() {
      if (inFlight === 0) return Promise.resolve();
      return new Promise((resolve) => { idle = resolve; });
    },

    /** How many dispatches are in flight. Used by tests, not by the drain. */
    count() {
      return inFlight;
    },
  };
}
