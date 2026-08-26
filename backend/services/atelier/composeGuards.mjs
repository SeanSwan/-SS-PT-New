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
 * How many byte-carrying replays may be retained at once.
 *
 * Keeping the payload when a still never persisted is right — it is the only copy. But a
 * reviewer pointed out that persistence failures CORRELATE: one misconfigured R2 makes
 * every batch fail, so the exception stops being an exception and every retained entry
 * carries megabytes. The rescue reintroduced the exhaustion it was written beside.
 *
 * A small budget keeps the property that matters (a recent lost render is recoverable)
 * without letting a systemic outage turn the replay map into a heap dump.
 */
export const BYTES_RETAIN = 12;

/** Derived (keyless) entries retained. Far smaller than the client-key window: a derived
 *  key only has to outlive the second click that produced it, not a network retry. */
export const DERIVED_RETAIN = 50;
const derivedKeys = new Set();
/** Retained keys whose entry still carries its payload, so the budget can be RELEASED
 *  when one is evicted. Without this the cap counted lifetime allocations rather than
 *  live ones: twelve unpersisted batches ever, and no render was recoverable again for
 *  the life of the process. */
const byteKeys = new Set();
let bytesHeld = 0;

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
export function rememberKey(store, key, settled, { clientKeyed = true, carriesBytes = false } = {}) {
  if (carriesBytes) byteKeys.add(key);
  // TWO CLASSES OF KEY, EVICTED IN PRIORITY ORDER.
  //
  // A reviewer was right that keyless traffic churned the window: derived keys were
  // filling the same FIFO as client keys, so high-volume anonymous-ish traffic evicted the
  // entries whose retry genuinely was still coming. Its prescription — drop derived keys
  // on settle — overshot, and the tests said so immediately: a derived key is stable
  // WITHIN its time bucket, which is precisely what makes a fast SEQUENTIAL double-click
  // replay instead of paying twice. Deleting it re-opened that.
  //
  // So both are retained and derived ones are evicted FIRST. A client key survives any
  // amount of keyless traffic; a derived key survives long enough to catch the second
  // click that produced it.
  if (!clientKeyed) {
    derivedKeys.add(key);
    while (derivedKeys.size > DERIVED_RETAIN) {
      const oldest = derivedKeys.values().next();
      if (oldest.done || oldest.value === key) break;
      store.delete(oldest.value);
      derivedKeys.delete(oldest.value);
      releaseBytes(oldest.value);
    }
    return;
  }
  settled.add(key);
  if (typeof store.size !== 'number') return;
  // Evict only from the SETTLED set. The first version walked the store itself in
  // insertion order, and the oldest entry there may be a request still IN FLIGHT — its
  // promise is the thing a concurrent duplicate coalesces onto, so dropping it lets the
  // duplicate generate and charge a second time. That is the very outcome the map exists
  // to prevent, reintroduced by the bound meant to make the map safe.
  // BOUND THE SETTLED COUNT, NOT THE STORE. Bounding on `store.size` looked equivalent
  // and was not: in-flight entries inflate it, so a burst of concurrent requests drove the
  // loop to evict settled keys far below the retention target — a probe with 600 in flight
  // left ONE settled key standing out of 600. That destroys the replay window during
  // exactly the traffic that produces retries, which is the double-charge this retention
  // exists to prevent. In-flight entries need no bound: they are removed as they settle,
  // and their count is capped by concurrency rather than by history.
  while (settled.size > IDEMPOTENCY_RETAIN) {
    const oldest = settled.values().next();
    if (oldest.done || oldest.value === key) break;
    store.delete(oldest.value);
    settled.delete(oldest.value);
    releaseBytes(oldest.value);
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
/** Give the budget back when a byte-carrying entry leaves the map. */
function releaseBytes(key) {
  if (byteKeys.delete(key)) bytesHeld = Math.max(0, bytesHeld - 1);
}

export function _resetCoalescing() {
  COALESCING_STORE.clear();
  settledKeys.clear();
  derivedKeys.clear();
  byteKeys.clear();
  bytesHeld = 0;
}

/**
 * The slimmed copy of a settled result that is safe to KEEP.
 *
 * The bound is five hundred ENTRIES, and a reviewer pointed out what an entry weighs: a
 * hosted 4-up holds four base64 images, and a 1920x1080 PNG is megabytes once encoded.
 * Five hundred of those is gigabytes of resident memory held to answer a retry that may
 * never come — a bound that counts the wrong unit is not a bound.
 *
 * A retry does not actually need the bytes back. It needs to learn that this exact request
 * ALREADY RAN, and where its output went, so it does not pay for it twice. So the retained
 * copy keeps every field except the payloads, and says so with `bytesDropped` — the client
 * fetches from the library by `assetId`, which is the surface that exists for exactly that.
 */
export function slimForReplay(result) {
  if (!result || !Array.isArray(result.stills)) return result;
  // KEEP THE BYTES WHEN THEY ARE THE ONLY COPY. Dropping the payload is safe precisely
  // because the still is retrievable by `assetId` from the library. When persistence
  // FAILED — R2 unconfigured, a hash mismatch — there is no library copy, and a slimmed
  // replay would hand a retry neither the image nor a way to find it: the client paid,
  // and everything it paid for is gone. Rare enough that carrying the bytes costs little,
  // and the alternative is losing someone's render to save memory.
  if (result.stills.some((s) => !s.assetId)) {
    // Only while there is budget. Past it, a lost render is still lost — but the process
    // survives to serve the ones that are not, which is the better of two bad outcomes.
    if (bytesHeld >= BYTES_RETAIN) return { ...result, replayed: true, bytesDropped: true, bytesBudgetExhausted: true,
      stills: result.stills.map(({ image, ...rest }) => ({ ...rest, image: image ? { kind: image.kind, mime: image.mime, dropped: true } : null })) };
    bytesHeld += 1;
    return { ...result, replayed: true };
  }
  return {
    ...result,
    replayed: true,
    bytesDropped: true,
    stills: result.stills.map(({ image, ...rest }) => ({
      ...rest,
      // Shape preserved so a client reading `image.kind` does not crash on a replay.
      image: image ? { kind: image.kind, mime: image.mime, dropped: true } : null,
    })),
  };
}

/**
 * A CLIENT KEY REQUIRES AN OWNER. `u${userId ?? 'anon'}` put every unauthenticated
 * caller in ONE namespace, so two of them sending the same key string coalesced onto
 * each other's work — the second receiving the first's batch id and stills. That is the
 * same confused deputy an earlier round fixed for authenticated users, still standing
 * for anonymous ones. The live route is admin-only so this was never reachable; the
 * SHAPE was reachable, and two reviewers found it two rounds apart.
 */
export function assertKeyHasOwner(req) {
  // `=== undefined` was too narrow, and both seats of the next round said so: `null` and
  // `''` are exactly what a route yields when auth is misconfigured (`req.user?.id` on a
  // missing user gives undefined, but a half-populated session gives null), and either one
  // sailed through to rebuild the shared namespace this guard exists to remove. An owner
  // is a non-empty value or it is not an owner.
  const owner = req.userId;
  const hasOwner = owner !== undefined && owner !== null && owner !== '';
  if (req.idempotencyKey && !hasOwner) {
    throw new ComposeError('E_BAD_OWNER',
      'An idempotency key needs an owner: without one, two callers sending the same key '
      + "would receive each other's work. Nothing was generated and nothing was spent.");
  }
}

/** A slot override is a string a compiler slot is REPLACED with; nothing else is useful
 *  there, and everything else is an attack surface. */
export const MAX_SLOT_OVERRIDE_CHARS = 2000;
export const MAX_SLOT_OVERRIDES = 12;
/** A slot NAME is an identifier like `negative` or `styleAnchor`, never prose. */
export const MAX_SLOT_NAME_CHARS = 64;

/**
 * Bound the slot overrides.
 *
 * `MAX_BRIEF_CHARS` guards `brief.text` and nothing else, so `slotOverrides` was an
 * unbounded channel straight past it into the compiler and out to a provider: a two-
 * megabyte "negative" slot, or a hundred keys nobody reads. It also skipped the
 * normalisation the brief gets, so the same words in NFC and NFD produced different
 * prompts from the same request.
 *
 * A reviewer found the hole by asking the obvious question the length gate never asked:
 * what ELSE reaches the compiler?
 */
export function assertSlotOverrides(brief = {}) {
  const overrides = brief.slotOverrides;
  if (overrides === undefined || overrides === null) return undefined;
  if (typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw new ComposeError('E_BAD_SLOT_OVERRIDE', 'slotOverrides must be an object of slot names to replacement text.');
  }
  const keys = Object.keys(overrides);
  if (keys.length > MAX_SLOT_OVERRIDES) {
    throw new ComposeError('E_BAD_SLOT_OVERRIDE',
      `slotOverrides carries ${keys.length} slots; at most ${MAX_SLOT_OVERRIDES} are accepted.`);
  }
  const cleaned = {};
  for (const k of keys) {
    // The KEY is unbounded too — a guard added specifically to close an unbounded channel
    // left the slot NAME open, so a multi-megabyte key with an empty value walked through
    // it. Bounding the value and not the key is the pair pattern inside a single function.
    if (k.length > MAX_SLOT_NAME_CHARS) {
      throw new ComposeError('E_BAD_SLOT_OVERRIDE',
        `A slot name is ${k.length} characters; at most ${MAX_SLOT_NAME_CHARS} are accepted.`);
    }
    const v = overrides[k];
    if (typeof v !== 'string') {
      throw new ComposeError('E_BAD_SLOT_OVERRIDE', `slotOverrides.${k} must be text.`);
    }
    if (v.length > MAX_SLOT_OVERRIDE_CHARS) {
      throw new ComposeError('E_BAD_SLOT_OVERRIDE',
        `slotOverrides.${k} is ${v.length} characters; at most ${MAX_SLOT_OVERRIDE_CHARS} are accepted.`);
    }
    // Same normalisation the brief gets, so NFC and NFD spellings of one word hash and
    // compile identically instead of quietly becoming two different requests.
    cleaned[k] = v.normalize('NFC').trim();
  }
  return cleaned;
}
