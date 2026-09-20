/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/lifecycle.mjs
 * PURPOSE: Own a STARTED bridge — its live handle, its signal handlers, and its
 *          shutdown.
 * PART OF: Creator Brains Console (blueprint 05 §4)
 * SLICE: S0H (extracted by R4-02)
 * ============================================================================
 *
 * WHY THIS IS ITS OWN MODULE. `server.mjs` passed the repo's 300-line cap
 * (CLAUDE.md rule 4) when the R4-02 drain was added to it. The seam was already
 * there: that file builds and binds a server, while this one owns a server that
 * is ALREADY LIVE — the handle the registry holds, the signals that end it, and
 * the teardown that must not outrun the work. Extracting at that seam kept the
 * cap where it was rather than raising it.
 *
 * @module creator-brains-console/lib/lifecycle
 */

import { releaseInstance, unregisterBridge } from './instance.mjs';
import { WEB_DIST } from './http.mjs';
import { acquireHealthOwner, releaseHealthOwner } from './health-lease.mjs';

/**
 * How long the drain waits for the listener to close on its own before it
 * force-closes whatever is left (R4-02b). See `shutdown` step 3 for why this is
 * a bound rather than an await, and why the bound is safe.
 */
const HTTP_CLOSE_GRACE_MS = 250;

/**
 * A cancellable `ms` delay for the drain's bounded wait (R4-02b).
 *
 * Deliberately NOT `unref`ed: a bound that an empty event loop can skip is not a
 * bound, and if the grace period is the only thing left that can make progress,
 * it must be allowed to elapse. `cancel` removes it the moment `close()` wins
 * the race, so it never holds the process open after the drain is done.
 */
function settle(ms) {
  let timer = null;
  const promise = new Promise((res) => { timer = setTimeout(res, ms); });
  return { promise, cancel: () => { if (timer) clearTimeout(timer); } };
}

/**
 * Attach the live handle, its signal handlers and its shutdown to `handle`.
 *
 * @param admission the bridge's admission controller (R4-02) — see
 *        `lib/admission.mjs`. Shutdown closes it, waits for it to settle, and
 *        only then releases the lease.
 */
export function finishStart({
  r, handle, storeKey, server, url, port, pid, admission,
}) {
  // R3-03: this bridge OWNS a lease on the shared probe worker and health cache
  // for as long as it lives. Both are process-global, so only the LAST owner to
  // release retires them — resetting on every shutdown would let one bridge tear
  // the worker out from under another. Acquired HERE, on the success path only:
  // `startBridge`'s failure path never reaches this function, so it has no lease
  // to give back.
  acquireHealthOwner();
  let stopped = false;
  let drain = null;

  /**
   * Stop the bridge: refuse new work, DRAIN, then release. Idempotent.
   *
   * RETURNS A PROMISE (R4-02), and the SAME one on every call, so a second
   * caller awaits the existing drain rather than racing a second release. The
   * release used to run synchronously after `server.close()`, which is
   * asynchronous — Astra round 4 drove the real handler and measured a
   * `/api/canary` constructing a worker while the lease count was already zero.
   */
  const shutdown = () => {
    if (stopped) return drain;
    stopped = true;

    // 1. STOP ADMITTING. Synchronous, so nothing can slip in behind it.
    admission.close();
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);

    // 2. CLOSE THE LISTENER. Its callback fires when the last connection closes,
    //    which is NOT the same fact as "no handler is still running" — hence 3.
    const closed = new Promise((res) => {
      try { server.close(() => res()); } catch { res(); /* already closed */ }
    });

    // 2b. RETIRE PARKED CONNECTIONS (R4-02b). `close()` waits for EVERY
    //     connection to end, and it waits exactly as long for a socket that is
    //     merely PARKED OPEN by a client's keep-alive pool as for one with a
    //     request in flight. Nothing in this bridge ever closes those, so on its
    //     own `close()`'s callback can never fire and the drain HANGS. A shutdown
    //     that never completes is strictly worse than the too-early release this
    //     drain was added to fix.
    //
    //     MEASURED, not theorised: the console suite's own `getJson` uses global
    //     `fetch`, whose undici pool parks one socket per origin. `T-B23c` hung
    //     on precisely this — `Promise resolution is still pending but the event
    //     loop has already resolved`, cancelled by node:test after 3 s, taking
    //     four sibling tests down with it. Any real client that keeps a
    //     connection alive (a browser tab, `curl` with a reused handle) does the
    //     same thing to a production shutdown.
    //
    //     `closeIdleConnections` retires parked sockets and leaves a connection
    //     that is serving a request alone — which is the right distinction, but
    //     NOT sufficient on its own; step 3 handles the connection it therefore
    //     refuses to touch. It is a SWEEP rather than one call because "idle"
    //     is a state a connection can ENTER after the first call: one that was
    //     mid-dispatch at t0 becomes idle when its response finishes, and a
    //     client can open a fresh one during the drain. A single pass misses
    //     both. The interval stops the moment `close()` fires; `unref` keeps it
    //     from holding the process open on its own.
    const evictIdle = () => {
      try { server.closeIdleConnections(); } catch { /* closed, or not a server */ }
    };
    evictIdle();
    const sweeper = setInterval(evictIdle, 10);
    if (typeof sweeper.unref === 'function') sweeper.unref();
    closed.then(() => clearInterval(sweeper));

    // 3. THE DRAIN, IN THE ORDER THE FACTS ACTUALLY DEPEND ON EACH OTHER.
    //
    //    `closeIdleConnections` is NOT sufficient on its own, and the second
    //    measured case is the one that makes that matter. A connection whose
    //    request body was never fully received is not "idle" to Node — it still
    //    has a request in progress — so the sweep skips it and `close()` waits
    //    for it. Measured on this tree with a socket-level probe: a 4 MB POST is
    //    answered `400` after 192 KB, the peer stops writing mid-body, and the
    //    socket then sits with `destroyed=false, _httpMessage=false,
    //    bytesRead=196567` while `closeIdleConnections()` leaves it untouched and
    //    `close()` does not fire. The only thing that ends it is Node's default
    //    `requestTimeout` — so the effective shutdown latency would be FIVE
    //    MINUTES, held open by a peer that stopped talking. A drain a client can
    //    veto is not a drain.
    //
    //    So the wait is split by what each fact is FOR:
    //
    //      * `admission.settled()` is the correctness property — OUR work. It is
    //        awaited with NO bound, because a handler that is still running is
    //        exactly what must not be outrun.
    //      * HTTP closure is a tidiness property, and it is awaited with a
    //        BOUND. Once every admitted dispatch has settled, no connection can
    //        be serving admitted work — any dispatch that was running has
    //        finished by definition — so whatever is left is safe to destroy.
    //        That is why the force-close below cannot resurrect the defect this
    //        drain exists to fix.
    //
    //    The grace period is not ceremony: it lets a well-behaved close finish
    //    and lets an already-written response flush, so the force-close is the
    //    exception rather than the normal path.
    drain = (async () => {
      await admission.settled();
      const grace = settle(HTTP_CLOSE_GRACE_MS);
      await Promise.race([closed, grace.promise]);
      grace.cancel();
      try { server.closeAllConnections(); } catch { /* already closed */ }
      await closed;
      // 4. RELEASED EXACTLY ONCE, and only now. A bridge that still has a handler
      //    running must still own the worker that handler may answer from.
      releaseInstance(r, { pid });
      unregisterBridge(storeKey, handle);
      releaseHealthOwner();
    })();
    return drain;
  };

  /**
   * A signal asks THIS bridge to shut down. It does not end the process (R5-03).
   *
   * The previous handler had TWO independent exits and both were wrong:
   *
   *   Promise.resolve(shutdown()).then(() => process.exit(0));
   *   setTimeout(() => process.exit(0), 2_000).unref();
   *
   * The timer fired `exit(0)` with work still admitted, which MANUFACTURES a
   * successful stop over abandoned dispatches — the defect this drain exists to
   * prevent, reached by a different door. And the handler is registered PER BRIDGE,
   * so one signal runs every registered handler: in a two-bridge process the IDLE
   * bridge's promise resolved immediately and killed the process while the BUSY
   * bridge still owned an admitted dispatch. Removing the timer alone does not fix
   * that row, which is why both exits are gone.
   *
   * A standalone process now exits NATURALLY once the listener, the worker and the
   * drain have all retired — the only exit that proves nothing was abandoned. An
   * embedded bridge must never terminate its host or a sibling bridge.
   */
  const onSignal = () => {
    shutdown().then(
      () => { /* settled — the event loop empties and a standalone process exits */ },
      (err) => {
        // A drain that FAILS must not be reported as a clean stop.
        process.exitCode = 1;
        try {
          process.stderr.write(`[bridge] shutdown failed: ${(err && err.message) || err}\n`);
        } catch { /* stderr already gone */ }
      },
    );
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  // MUTATE the already-registered object rather than replacing it: the registry
  // holds this identity, and `shutdown`'s ownership comparison depends on it.
  Object.assign(handle, {
    server, url, port, pid, shutdown, admission, webDist: WEB_DIST,
  });
  return handle;
}
