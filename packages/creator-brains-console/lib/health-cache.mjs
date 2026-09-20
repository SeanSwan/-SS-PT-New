/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/health-cache.mjs
 * PURPOSE: The process-local health cache, KEYED BY CANONICAL STORE ROOT (R2-04).
 * PART OF: Creator Brains Console (R2-04, Astra round 2)
 * ============================================================================
 *
 * WHY THIS IS ITS OWN FILE. `health.mjs` stood at 296 lines against the repo's
 * hard 300-line cap (CLAUDE.md rule 4), and R2-04 required keying the cache by
 * store root. The cap is not cosmetic — it exists so that a reviewer can hold one
 * concern in view at once — so the fix was to move the cache out rather than to
 * grow the file. **Extract at the seam; never raise the cap.**
 *
 * THE DEFECT THIS FILE FIXES. `healthReading` accepts a store root `r` because
 * the history fallback reads THAT store's `canary.json`. The cache, though, was a
 * single module-level slot. Two roots read in one process therefore shared one
 * answer: the first read consulted the correct store's canary, and every later
 * read — for a DIFFERENT store — served that answer as though it were its own. A
 * correct answer for store A presented as a correct answer for store B is the
 * worst shape of this bug, because nothing in the reading looks wrong.
 *
 * The key is `realpathSync`-resolved, so `./store`, `store/` and a junction to
 * the same directory are ONE entry rather than three. A path that does not exist
 * yet falls back to its resolved absolute form, because a store root is often
 * named before anything has created it.
 *
 * @module creator-brains-console/lib/health-cache
 */

import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * How many distinct roots keep a cached reading.
 *
 * One store is the real case. The bound exists because the console's own test
 * suite creates a fresh temp root per test, and an unbounded Map would hold a
 * reading for every root the process had ever seen — a slow leak whose only
 * symptom is memory. Eviction is least-recently-used: `putCached` re-inserts, so
 * the Map's iteration order is the order of last write.
 */
export const MAX_CACHED_ROOTS = 4;

/**
 * The key used when a caller passes no store root at all.
 *
 * NOT the same as "do not cache". A reading taken without a root still has a
 * probe result worth serving for the TTL — it simply has no history fallback —
 * and conflating the two would make the no-root path re-probe on every read.
 */
const NO_ROOT = '<no store root>';

/** The canonical key for a store root. */
export function cacheKey(r) {
  if (!r) return NO_ROOT;
  const abs = resolve(r);
  try {
    return realpathSync(abs);
  } catch {
    return abs; // named but not yet created — still a distinct store
  }
}

const caches = new Map();

/** The cached reading for a root, or `null` when none has been taken. */
export function getCached(key) {
  return caches.get(key) ?? null;
}

/** Install a reading for a root, evicting the least recently used root if needed. */
export function putCached(key, entry) {
  caches.delete(key);
  caches.set(key, entry);
  while (caches.size > MAX_CACHED_ROOTS) {
    caches.delete(caches.keys().next().value);
  }
}

/** Forget every root. This is the test seam, and it is why a reset is a reset. */
export function clearCaches() {
  caches.clear();
}

/** How many roots currently hold a reading — lets a test prove the bound holds. */
export function cachedRootCount() {
  return caches.size;
}
