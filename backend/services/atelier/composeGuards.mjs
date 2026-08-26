/**
 * composeGuards.mjs — the coalescing map and the gate a caller forgot to wire.
 *
 * Split from composeStills at the 300-line cap. Both pieces answer the same question —
 * "may this request proceed, and has this exact request already been answered?" — and
 * both were found to be subtly wrong by successive review rounds, which is reason enough
 * for them to sit together where the next reviewer can read them in one place.
 */

import { ComposeError } from './composeLimits.mjs';

/** How many settled idempotency keys to retain. Big enough that any realistic retry
 *  still replays instead of re-charging; small enough that the map cannot grow for the
 *  life of the process. */
export const IDEMPOTENCY_RETAIN = 500;

/**
 * The coalescing map, and the keys in it whose work has finished.
 *
 * BOTH are module-scoped, and they have to be. The store's default used to be
 * `new Map()` evaluated per CALL, which meant a route that omitted it got a fresh map
 * every request — idempotency scoped to a single request is no idempotency at all, and
 * the retry it exists to protect would generate and charge again. Worse, pairing a
 * per-call store with this process-wide set broke the eviction bound the moment two
 * stores existed. One process, one map, one set.
 */
export const COALESCING_STORE = new Map();
export const settledKeys = new Set();

/**
 * Bound the replay map without breaking replay.
 *
 * A Map iterates in insertion order, so the first key is the oldest and dropping it is a
 * plain FIFO eviction — no timestamps to keep and no second structure to hold. The keys
 * being dropped are the ones least likely to see a retry, because a retry that has not
 * arrived within five hundred subsequent requests is not a retry.
 */
export function rememberKey(store, key, settled) {
  settled.add(key);
  if (typeof store.size !== 'number') return;
  // Evict only from the SETTLED set. The first version walked the store itself in
  // insertion order, and the oldest entry there may be a request still IN FLIGHT — its
  // promise is the thing a concurrent duplicate coalesces onto, so dropping it lets the
  // duplicate generate and charge a second time. That is the very outcome the map exists
  // to prevent, reintroduced by the bound meant to make the map safe.
  while (store.size > IDEMPOTENCY_RETAIN) {
    const oldest = settled.values().next();
    if (oldest.done || oldest.value === key) break;
    store.delete(oldest.value);
    settled.delete(oldest.value);
  }
}

/**
 * The commit used when a caller injects none.
 *
 * It permits free work and REFUSES anything that costs money. A blanket
 * `() => ({ allowed: true })` made the money gate fail open: a route that omitted or
 * misspelled `commit` would spend without a ceiling and without a sound. A control that
 * can be dropped by accident is not a control — the same lesson the video lane's
 * `ledger = null` taught, in the file next door.
 */
export function defaultCommit({ spendUsd = 0 } = {}) {
  // Same reasoning as the ledger's own guard: `NaN > 0` is false, so an unpriced cost
  // would read as free and be permitted by the very default that exists to refuse spend.
  if (!Number.isFinite(spendUsd) || spendUsd < 0) {
    throw new ComposeError('E_BAD_COST',
      `Refusing: a cost of ${spendUsd} cannot be checked against any ceiling.`);
  }
  if (spendUsd > 0) {
    throw new ComposeError('E_NO_SPEND_GATE',
      'Refusing to spend: no spend gate was wired into this call, so the cost could not be '
      + 'counted against any ceiling. Nothing was generated and nothing was spent.');
  }
  return { allowed: true };
}

/** Test hook. Process-scoped state needs an explicit reset or suites leak into each other
 *  — which is the price of making the store process-scoped, and worth paying. */
export function _resetCoalescing() {
  COALESCING_STORE.clear();
  settledKeys.clear();
}
