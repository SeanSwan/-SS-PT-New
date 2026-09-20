/*
 * R2-04 — THE HEALTH CACHE IS PER STORE ROOT, AND IT IS BOUNDED.
 *
 * THE FINDING (`health.mjs:75`). `healthReading` accepts a store root because the
 * history fallback reads THAT store's `canary.json` — but the cache was a single
 * module-level slot. Two roots read in one process therefore shared one answer:
 * the first read consulted the correct store's canary, and every later read, for
 * a DIFFERENT store, served it as though it were its own.
 *
 * WHY THAT IS THE WORST SHAPE. A wrong answer that looks wrong gets noticed. A
 * correct answer for store A presented as a correct answer for store B does not:
 * the reading is well-formed, the timestamp is real, the cue count is real, and
 * only the STORE is wrong. Nothing in the payload betrays it.
 *
 * The cache mechanics themselves live in `health.test.mjs`; this file is only
 * about WHICH STORE an answer belongs to.
 *
 * @module creator-brains-console/test/health.cachekey
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import { ensureStore } from '../../../scripts/creator-brains/lib/store.mjs';
import { healthReading, resetHealthCache } from '../lib/health.mjs';
import { MAX_CACHED_ROOTS, cacheKey, cachedRootCount } from '../lib/health-cache.mjs';

/** A probe that always fails, so every reading falls through to the canary. */
const FAILING_PROBE = () => ({ ok: false, version: null, reason: 'yt-dlp not resolvable' });

const TTL = 60_000;
const NOW = Date.parse('2026-09-20T00:00:00.000Z');

/** A store whose canary carries a distinguishable timestamp and cue count. */
function storeWithCanary(label, ts, cues) {
  const r = tempRoot(label);
  ensureStore(r);
  writeFileSync(join(r, 'canary.json'), JSON.stringify([{ ts, ok: true, cues, lang: 'en' }]), 'utf8');
  return r;
}

test('R2-04i: two store roots must not share a cached reading', () => {
  resetHealthCache();
  const a = storeWithCanary('r204-root-a', '2026-09-10T00:00:00.000Z', 3);
  const b = storeWithCanary('r204-root-b', '2026-09-11T00:00:00.000Z', 9);

  // Same clock for both, so a shared cache would serve A's entry to B.
  const ra = healthReading({ r: a, probe: FAILING_PROBE, ttlMs: TTL, now: NOW });
  const rb = healthReading({ r: b, probe: FAILING_PROBE, ttlMs: TTL, now: NOW });

  assert.equal(ra.source, 'history');
  assert.equal(ra.checkedAt, '2026-09-10T00:00:00.000Z');
  assert.equal(rb.source, 'history');
  assert.equal(rb.checkedAt, '2026-09-11T00:00:00.000Z',
    "root B must serve ITS OWN canary, not root A's cached answer");
  // The cue count is carried only in the reason string, and only B's canary has 9.
  assert.match(rb.reason, /9 cues/, 'and its own cue count, which nothing else carries');
});

test('R2-04j: one store reached two ways is ONE cache entry', () => {
  resetHealthCache();
  const r = storeWithCanary('r204-canon', '2026-09-10T00:00:00.000Z', 1);

  // (a) A normalised spelling. `resolve` alone already handles this one, so it is
  // not the half that discriminates canonicalisation — it is here because a key
  // built on the RAW argument would fail it.
  assert.equal(cacheKey(r), cacheKey(join(r, '.')), 'a trailing dot must not be a second store');

  // (b) A JUNCTION to the same directory, which is the half `resolve` cannot see.
  // Only `realpathSync` follows the link back to the target, so a key built from
  // the resolved string holds two entries for one store. This is the assertion a
  // `resolve`-only implementation fails.
  const link = join(tempRoot('r204-canon-link'), 'store-link');
  symlinkSync(r, link, 'junction');
  assert.equal(realpathSync(link), realpathSync(r), 'precondition: the junction points at the store');
  assert.equal(cacheKey(link), cacheKey(r), 'a junction and its target are the SAME store');

  healthReading({ r, probe: FAILING_PROBE, ttlMs: TTL, now: NOW });
  healthReading({ r: link, probe: FAILING_PROBE, ttlMs: TTL, now: NOW });
  assert.equal(cachedRootCount(), 1, 'one store, one entry — however it is reached');
});

test('R2-04k: the cache is bounded, and a reset empties it', () => {
  resetHealthCache();
  for (let i = 0; i < MAX_CACHED_ROOTS + 3; i += 1) {
    const r = storeWithCanary(`r204-bound-${i}`, '2026-09-10T00:00:00.000Z', 1);
    healthReading({ r, probe: FAILING_PROBE, ttlMs: TTL, now: NOW });
  }
  assert.equal(cachedRootCount(), MAX_CACHED_ROOTS,
    'a console that reads many roots must not hold a reading for every root it has ever seen');

  resetHealthCache();
  assert.equal(cachedRootCount(), 0);
});
