/**
 * pendingOperationStore.mjs — the seam under the approval lane
 * ============================================================
 * `destructiveOperations.mjs` held its pending approvals in a module-private
 * `Map`. That had two consequences, one operational and one about testability:
 *
 *   1. OPERATIONAL — the store is per-process. An approval minted on instance A
 *      cannot be confirmed on instance B, and every restart drops in-flight
 *      approvals. The user sees "Operation not found or already expired" and, on
 *      the second occurrence, routes around the safety prompt entirely. Combined
 *      with `OPERATION_SIGNING_KEY` falling back to `crypto.randomBytes(32)` per
 *      process, the HMAC is effectively inert: with a per-process secret AND a
 *      per-process store, no signed payload ever crosses a trust boundary, so
 *      `timingSafeEqual` is guarding nothing.
 *
 *   2. TESTABILITY — because the Map was private, no test could reach a stored
 *      record between mint and verify. Tamper-rejection therefore could not be
 *      asserted, only read. `destructiveOperationsAdversarial.test.mjs` A6 says
 *      so in-file and promises the assertion "becomes genuinely testable in S2
 *      when the store moves behind an injectable adapter". This module is that
 *      adapter, and A6-tamper is now a real test.
 *
 * WHAT THIS MODULE DOES NOT DO: it does not yet ship a Redis implementation.
 * The store API here is deliberately SYNCHRONOUS, matching the existing
 * behaviour exactly, because a Redis implementation could not be verified in
 * this slice — no Redis SERVER was reachable and `ioredis-mock` is not a
 * dependency — and shipping an unproven durable-store path would be worse than
 * shipping none. (Hand-written in-process doubles for the seam itself are trivial
 * and the tests use several; a faithful Redis double is a different problem.)
 *
 * The remaining work is tracked as S2b and is gated on confirming `REDIS_URL`
 * on the Render service. Two things S2b must handle, discovered here:
 *   - The API must become async, and `aiCommandRoutes.mjs` `GET /health` is a
 *     SYNCHRONOUS handler calling `getPendingCount()`. Converting the store to
 *     async without also making that handler async serialises a Promise to `{}`
 *     in the JSON response — a silent data bug, not a crash.
 *   - One-time consumption must stay atomic. In Redis that means GETDEL or a
 *     Lua script, never GET-then-DEL, or two racing confirms both succeed.
 *
 * Until then, `assertStoreIsSafeForEnvironment()` makes the defect LOUD at boot
 * instead of silent at 3am.
 */
import logger from '../../utils/logger.mjs';

/**
 * The in-process store. Preserves the exact semantics the approval lane had
 * before this seam existed — same Map, same behaviour, no functional change.
 */
export function createInProcessStore() {
  const ops = new Map();

  return {
    kind: 'in-process',
    durable: false,
    get: (id) => ops.get(id),
    set: (id, op) => { ops.set(id, op); },
    delete: (id) => ops.delete(id),
    has: (id) => ops.has(id),
    /** Iterate for expiry sweeps and per-user counting. */
    entries: () => ops.entries(),
    values: () => ops.values(),
    get size() { return ops.size; },
    clear: () => ops.clear(),
  };
}

let activeStore = createInProcessStore();

/** The store the approval lane is currently using. */
export function getPendingOperationStore() {
  return activeStore;
}

/**
 * Swap the store. Two callers only:
 *   - tests, to inject a store they can reach into (this is what makes
 *     tamper-rejection assertable)
 *   - S2b, to install the durable Redis-backed implementation
 *
 * Returns the previous store so a test can restore it in a finally block.
 */
export function setPendingOperationStore(store) {
  // Validate every method the approval lane actually calls. An earlier version
  // checked only get/set while its own message promised get/set/delete — so a store
  // that could not CONSUME an operation installed cleanly and would have broken
  // one-time consumption, which is the whole point of the lane. Flagged by three
  // review seats; the message and the check now agree.
  const required = ['get', 'set', 'delete', 'entries', 'values'];
  const missing = store ? required.filter((m) => typeof store[m] !== 'function') : required;
  if (missing.length > 0) {
    throw new Error(
      `setPendingOperationStore requires a store with ${required.join('/')} — missing: ${missing.join(', ')}`
    );
  }
  const previous = activeStore;
  activeStore = store;
  return previous;
}

/** Restore the default in-process store. Intended for test teardown. */
export function resetPendingOperationStore() {
  activeStore = createInProcessStore();
}

/**
 * Make the per-process-store defect visible at boot.
 *
 * This does NOT throw. Refusing to boot here would take production down on the
 * next deploy for a defect that has been latent for months, and the fix
 * (provisioning Redis) is not something the process can do for itself. It logs
 * at error level so the condition appears in Render's logs and in any alerting
 * built on log severity, rather than being discovered by a user whose
 * confirmation silently failed.
 *
 * @returns {{ safe: boolean, reason: string|null }}
 */
export function assertStoreIsSafeForEnvironment({
  nodeEnv = process.env.NODE_ENV,
  store = activeStore,
  log = logger,
} = {}) {
  if (store.durable) {
    return { safe: true, reason: null };
  }

  if (nodeEnv !== 'production') {
    // Single-process dev and test: the in-process store is correct here.
    return { safe: true, reason: null };
  }

  const reason =
    'Destructive-approval store is in-process (not durable). Approvals minted on '
    + 'one instance cannot be confirmed on another, and every restart drops '
    + 'in-flight approvals. Users will see "Operation not found or already '
    + 'expired" and may route around the confirmation prompt. The HMAC signature '
    + 'is also inert while both the secret and the store are per-process.';

  log.error('[PendingOperationStore] UNSAFE STORE IN PRODUCTION', {
    store: store.kind,
    durable: false,
    remedy: 'Provision REDIS_URL and install the durable store (S2b), and set OPERATION_SIGNING_KEY (S1).',
    reason,
  });

  return { safe: false, reason };
}
