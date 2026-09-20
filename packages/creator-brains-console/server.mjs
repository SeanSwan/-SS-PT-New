/**
 * ============================================================================
 * FILE: packages/creator-brains-console/server.mjs
 * PURPOSE: The console's loopback bridge — process lifecycle, and the two gates
 *          that wrap the route table.
 * PART OF: Creator Brains Console (blueprint 02 §2, 05 §2, 08 Operations)
 * SLICE: S0
 * ============================================================================
 *
 * This file holds the LIFECYCLE and nothing else: construction, the Host gate,
 * the request-target parse, the error envelope, listen/shutdown, the browser
 * open, and the CLI entry. The ROUTE TABLE lives in `routes.mjs`, the HTTP
 * plumbing in `lib/http.mjs`, the single-instance guard in `lib/instance.mjs`,
 * and the handlers in the `lib/` modules behind `api.mjs`.
 *
 * WHY THE ROUTE TABLE MOVED (2026-09-19, S2 prep). This file sat at EXACTLY 300
 * lines — the repo's hard cap (CLAUDE.md rule 4) with zero headroom — so every
 * change had to be shaped net-neutral to fit, including S1-H11's fix. The cap had
 * stopped describing the code and started distorting it. The split is on the seam
 * this docstring already named. See `routes.mjs` for why the table there must
 * stay literal (HY4-H6 reads it as text).
 *
 * TWO GATES STAY HERE ON PURPOSE. The Host check runs BEFORE the route table and
 * the envelope wraps AROUND it, so neither is reachable by, or visible to, any
 * individual route — and keeping both here is what makes that structural rather
 * than conventional. `parseRequestUrl` also stays, because it must run inside the
 * `try` below; that placement IS the S1-H8 fix and is pinned by T-B18.
 *
 * DESIGN CONSTRAINTS THIS FILE OBEYS, AND WHY
 *
 * 1. ZERO DEPENDENCIES. The engine is zero-dep; the bridge composes the engine,
 *    so it inherits that. Nine literal routes need no framework.
 *
 * 2. BINDS 127.0.0.1 ONLY. Not 0.0.0.0, not a configurable host. The store it
 *    fronts holds the operator's whole creator catalog and the private
 *    transcript directory. Binding this to a routable interface would put a
 *    no-auth JSON API on Sean's LAN. `HOST` is a constant, not a parameter, so
 *    no env var and no flag can widen it.
 *
 * 3. OPENS THE BROWSER ITSELF, AFTER `listen` RESOLVES (blueprint H3). A `.cmd`
 *    that parses the port out of stdout races the server's own startup. The
 *    server knows the port because it just bound it, so it opens the browser
 *    with the real URL and the `.cmd` stays a two-line stub.
 *
 * 4. SINGLE INSTANCE via pid file (blueprint H2) — see lib/instance.mjs.
 *
 * 5. SIGNAL HANDLERS ARE REMOVED ON SHUTDOWN. The first version left them
 *    attached, so a process that started more than one bridge (a test suite, or
 *    the future embedding host) accumulated stale handlers that called
 *    `process.exit(0)` on the NEXT signal — killing the process mid-suite. The
 *    exit now lives in the signal handler, not in `shutdown`, so a library
 *    caller can stop the bridge without the module deciding to end the host.
 *
 * USAGE
 *   node packages/creator-brains-console/server.mjs [--port N] [--no-open]
 *
 * @module creator-brains-console/server
 */

import { createServer } from 'node:http';
import { execFile } from 'node:child_process';

import { ensureStore } from '../../scripts/creator-brains/lib/store.mjs';
import { root } from '../../scripts/creator-brains/lib/paths.mjs';
import { dispatch } from './routes.mjs';
import {
  sendJson, sendError, WEB_DIST, hostAllowed, parseRequestUrl,
} from './lib/http.mjs';
import { claimInstance, releaseInstance, registerBridge, unregisterBridge } from './lib/instance.mjs';
import { writeGateFailure } from './lib/write-gate.mjs';
import { acquireHealthOwner, releaseHealthOwner } from './lib/health-lease.mjs';

export { statusFor, hostAllowed } from './lib/http.mjs';
export { WEB_DIST } from './lib/http.mjs';
export { resolveStatic } from './lib/http.mjs';
export { dispatch } from './routes.mjs';
export {
  consoleDir, pidPath, isAlive, claimInstance, releaseInstance, InstanceError,
  liveBridgeFor, registerBridge, unregisterBridge, resetBridgeRegistry,
} from './lib/instance.mjs';

/**
 * Loopback only. Deliberately a constant with no override path: the whole point
 * of the trust boundary in blueprint 05 §4 is that this cannot be widened by a
 * config value someone later sets "just to test from my phone".
 */
export const HOST = '127.0.0.1';

/**
 * Build the request handler's server.
 *
 * The handler is three steps and no routing: the Host gate, the parse, the
 * envelope. Everything between the parse and the envelope is `dispatch`.
 */
export function createBridge({ r = root(), log = () => {}, port = null } = {}) {
  const bridge = createServer(async (req, res) => {
    // Resolve the bound port per request rather than capturing it: the real port
    // is only known after `listen` (port 0 asks the OS to choose). Closing over
    // `bridge` is safe because the handler cannot run before listen.
    //
    // THE FALLBACK MATTERS. `port` is null when the caller asked the OS to pick
    // (the normal launcher path). Reading it from the live server each request
    // means the Host check enforces the EXACT bound port in every case, instead
    // of degrading to "any loopback host" — which is what the first version did,
    // and which silently weakened the DNS-rebinding defence for the only launch
    // path this console actually uses.
    const boundPort = bridge.address()?.port ?? port ?? null;
    if (!hostAllowed(req.headers.host, boundPort)) {
      // 403 before any handler runs — see `hostAllowed` for why this is the
      // DNS-rebinding defence and why it applies to reads as well as writes.
      return sendJson(res, 403, {
        error: {
          code: 'FORBIDDEN_HOST',
          message: `the bridge serves loopback only; Host '${req.headers.host || '(absent)'}' is refused`,
        },
      });
    }

    // THE SECOND PRE-DISPATCH GATE (A1-09, 2026-09-20). Host checking defends
    // DNS rebinding; it does NOT stop a remote page that already knows the
    // loopback address from POSTing to it directly, because the browser supplies
    // the correct Host itself. Writes must therefore be non-simple: JSON media
    // type, a fixed custom header, and an Origin that IS this bridge's origin
    // when one is sent. Same 403 shape as the Host gate so the two read alike.
    //
    // THE SERVING ORIGIN IS THE AUTHORITY THE CLIENT ACTUALLY REACHED (R3-04).
    // `hostAllowed` has just approved `req.headers.host` against the exact bound
    // port, so that header IS this bridge's origin FOR THIS REQUEST — and taking
    // it from the request is what makes the rule exact rather than assumed. An
    // earlier version built `http://${HOST}:${boundPort}` from the bind constant
    // and then accepted either loopback spelling, which admitted a page served by
    // a DIFFERENT origin at the same port. See lib/write-gate.mjs.
    const writeFailure = writeGateFailure(req, `http://${req.headers.host}`);
    if (writeFailure) return sendJson(res, 403, { error: writeFailure });

    try {
      // MUST stay inside the try — see parseRequestUrl and T-B18 (S1-H8).
      const url = parseRequestUrl(req.url, `http://${HOST}`);
      return await dispatch(req, res, { r, url });
    } catch (err) {
      return sendError(res, err, log);
    }
  });
  return bridge;
}

/**
 * Start the bridge: claim the slot, bind loopback, then open the browser.
 *
 * TWO GUARDS, both required (see lib/instance.mjs for the full reasoning):
 * the pid file stops a second PROCESS, and the in-process registry stops a
 * second CALL — which the pid file cannot do, because the same pid is allowed
 * to re-claim so that a restart inside one process stays possible.
 */
export async function startBridge({
  r = root(), port = 0, open = true, log = (s) => process.stdout.write(`${s}\n`),
} = {}) {
  const storeKey = root(r);
  // Claim the in-process slot SYNCHRONOUSLY, before the first `await`: doing the
  // check-then-register across the async `listen` would let two concurrent calls
  // both pass — the check-then-act shape `openSync(…,'wx')` was introduced to
  // kill on the pid-file side. The object is mutated in place, so its identity
  // stays stable for the shutdown ownership comparison.
  const handle = { url: '(starting)' };
  registerBridge(storeKey, handle);

  let pid = null;
  try {
    ensureStore(r);
    pid = claimInstance(r);
    // `port` is passed through so the Host check can require the exact bound port
    // once known. When port is 0 the OS chooses, and the check falls back to
    // "any loopback host", which is still a complete DNS-rebinding defence.
    const server = createBridge({ r, log, port: port || null });

    try {
      await new Promise((res, rej) => {
        server.once('error', rej);
        server.listen(port, HOST, res);
      });
    } catch (err) {
      // If the bind fails AFTER the slot was claimed, the pid file would
      // otherwise block every future start until deleted by hand.
      releaseInstance(r, { pid });
      throw err;
    }

    const actual = server.address().port;
    const url = `http://${HOST}:${actual}`;
    log(`Creator Brains Console — bridge up on ${url}`);
    log(`store: ${storeKey}   pid: ${pid}`);
    log('close this window to stop the bridge.');

    // Browser opens AFTER listen resolved, so the URL is known-good (blueprint H3).
    if (open) {
      openBrowser(url).catch(() => log(`could not open a browser — open ${url}`));
    }

    return finishStart({ r, handle, storeKey, server, url, port: actual, pid, log });
  } catch (err) {
    // Any failure after the in-process claim must free it, or this process can
    // never start a bridge for this store again — a self-inflicted lockout.
    unregisterBridge(storeKey, handle);
    throw err;
  }
}

/** Attach the live handle, its signal handlers and its shutdown to `handle`. */
function finishStart({ r, handle, storeKey, server, url, port, pid }) {
  // R3-03: this bridge now OWNS a lease on the shared probe worker and health
  // cache for as long as it lives. Both are process-global, so only the LAST
  // owner to release retires them — resetting on every shutdown would let one
  // bridge tear the worker out from under another. Acquired HERE, on the success
  // path only: `startBridge`'s failure path never reaches this function, so it
  // has no lease to give back.
  acquireHealthOwner();
  let stopped = false;
  /** Stop the bridge. Idempotent; safe to call from a library or a signal. */
  const shutdown = () => {
    if (stopped) return;
    stopped = true;
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    releaseInstance(r, { pid });
    // Free the in-process slot. Leaving it behind would turn a clean shutdown
    // into a permanent refusal for this process.
    unregisterBridge(storeKey, handle);
    try { server.close(); } catch { /* already closed */ }
    // LAST, and only once the slot is free: a bridge that still owns the slot
    // must still own the worker it may answer from.
    releaseHealthOwner();
  };
  /** A real Ctrl-C should also END the process — but only that, not an embed. */
  const onSignal = () => {
    shutdown();
    setTimeout(() => process.exit(0), 500).unref();
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  // MUTATE the already-registered object rather than replacing it: the registry
  // holds this identity, and `shutdown`'s ownership comparison depends on it.
  Object.assign(handle, { server, url, port, pid, shutdown, webDist: WEB_DIST });
  return handle;
}

/** Open the OS default browser without a shell (no quoting hazards). */
export function openBrowser(url) {
  return new Promise((res) => {
    const [cmd, args] = process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
    execFile(cmd, args, () => res());
  });
}

/* ── CLI entry (only when invoked, never on import) ──────────────────────── */

const invokedDirectly = process.argv[1]
  && process.argv[1].replace(/\\/g, '/').endsWith('packages/creator-brains-console/server.mjs');

if (invokedDirectly) {
  const argv = process.argv.slice(2);
  const portArg = argv.indexOf('--port');
  const port = portArg >= 0 ? Number(argv[portArg + 1]) : 0;
  startBridge({ port: Number.isInteger(port) ? port : 0, open: !argv.includes('--no-open') })
    .catch((err) => {
      process.stderr.write(`creator-brains console: ${err.message}\n`);
      process.exitCode = 1;
    });
}
