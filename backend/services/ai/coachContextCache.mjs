/**
 * SCU S5 — Coach context cache.
 *
 * In-memory context cache for evidence-aware Coach inference. The key binds
 * actor + target + role/access version + capability + private-mode flag, so a
 * role switch, target switch, or private-mode change always misses (T25:
 * "new authorized scope only; old aliases/data not reused"). Denied data never
 * enters the provider payload, so only ok/empty envelopes are cached;
 * unavailable/stale are re-read on the next call. Forget and logout invalidate
 * everything for the actor (logout: everything).
 *
 * The cache is deliberately process-local and unbounded-time: it holds
 * de-identified, byte-capped envelopes only, never raw PII.
 */

const DEFAULT_MAX_ENTRIES = 256;

const cache = new Map();

function norm(value, fallback = '') {
  const text = value === null || value === undefined ? fallback : String(value).trim();
  return text || fallback;
}

/**
 * Build the canonical cache key for one inference scope.
 * Order and separators are part of the contract — tests and future slices
 * rely on role/target/access-version changes producing a different key.
 */
export function coachContextCacheKey({
  actorId = null,
  targetClientId = null,
  role = null,
  accessVersion = null,
  capability = null,
  privateMode = false,
} = {}) {
  const parts = [
    norm(actorId, 'no-actor'),
    norm(targetClientId, 'self'),
    norm(role, 'no-role'),
    norm(accessVersion, 'access-v0'),
    norm(capability),
    privateMode ? 'private' : 'shared',
  ];
  return parts.join(':');
}

/** Read one cached envelope or null. Never mutates insertion order (LRU-lite). */
export function getCachedCoachContext(key) {
  const entry = cache.get(key);
  return entry ? entry.value : null;
}

/**
 * Store one envelope under a key.
 * @param {string} key
 * @param {{ state: string, [k: string]: unknown }} envelope
 * @param {{ maxSize?: number }} [options]
 */
export function setCachedCoachContext(key, envelope, options = {}) {
  if (typeof key !== 'string' || key === '') return;
  if (!envelope || typeof envelope.state !== 'string') return;
  const maxSize = Number.isSafeInteger(options.maxSize) ? options.maxSize : DEFAULT_MAX_ENTRIES;
  // Evict oldest insertion first when over capacity.
  while (cache.size >= maxSize && cache.size > 0) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { value: envelope, at: Date.now() });
}

/**
 * Invalidate by scope. Omit a field to match any value for that dimension:
 *   invalidateCoachContextCache({ actorId: 7 })            -> actor forgot
 *   invalidateCoachContextCache({ actorId: 7, targetClientId: 42 }) -> target switch
 *   invalidateCoachContextCache({ actorId: 7, role: 'trainer' })    -> role switch
 *   invalidateCoachContextCache({})                          -> logout/global
 */
export function invalidateCoachContextCache({
  actorId = null,
  targetClientId = null,
  role = null,
  capability = null,
} = {}) {
  let removed = 0;
  for (const [key, entry] of [...cache.entries()]) {
    const parts = key.split(':');
    const actor = actorId === null ? true : parts[0] === String(actorId);
    const target = targetClientId === null ? true : parts[1] === String(targetClientId);
    const r = role === null ? true : parts[2] === String(role);
    const cap = capability === null ? true : parts[4] === String(capability);
    if (actor && target && r && cap) {
      cache.delete(key);
      removed += 1;
    }
  }
  return removed;
}

/** Test/ops helper: drop everything (logout of all actors). */
export function clearCoachContextCache() {
  const size = cache.size;
  cache.clear();
  return size;
}

/** Introspection for diagnostics — keys only, never values. */
export function coachContextCacheKeys() {
  return [...cache.keys()];
}
