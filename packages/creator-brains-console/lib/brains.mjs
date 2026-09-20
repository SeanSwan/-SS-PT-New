/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/brains.mjs
 * PURPOSE: Asking the brains (cited claims) and reading a published generation.
 * PART OF: Creator Brains Console (blueprint 05 §1, §3)
 * SLICE: S0
 * ============================================================================
 *
 * THE CONTAINMENT RULES AND THE LANE B/C BOUNDARY MOVED TO `lib/brain-read.mjs`
 * (R2-03, 2026-09-20). This file is now the ROUTE-SHAPED half: it maps a
 * caller's request onto that reader and projects engine rows into the console's
 * served shape. Read `brain-read.mjs` before changing anything here — the
 * measurement history for every containment rule lives with the rule, and it is
 * deliberately not duplicated.
 *
 * THE READ SURFACE IS NOW CONTAINED AT BOTH ENTRY POINTS (R2-02, 2026-09-20).
 * `queryConsole` calls `assertReadSurfaceContained` before it delegates, so every
 * path the engine's own traversal will join has already been proven to resolve
 * inside the store. The drawer goes through `readPublishedBrain`, which contains
 * the namespace directory, the pointer file, the generation directory and every
 * leaf. Read `brain-read.mjs` before changing anything here — the measurement
 * history for every containment rule lives with the rule, and it is deliberately
 * not duplicated.
 *
 * THE PREFLIGHT AND ITS ENUMERATION MOVED TO `lib/read-surface.mjs` (R3-01,
 * 2026-09-20). Round 3 measured the preflight skipping an entry the engine still
 * traversed, because the walk delegated to a reader that returns `null` for a
 * name outside its alphabet. The enumeration and the naming rule now live
 * together, where they can be made to agree; this file keeps the route shape.
 *
 * WHY THE QUERY ROUTE REFUSES (409) RATHER THAN SKIPPING THE POISONED CREATOR.
 * `/api/query` returns `skipped`, so reporting damage as a field was available and
 * was rejected. The engine owns the traversal; the console can only validate it
 * before or after, never inside. Validating and then skipping would leave the
 * engine reading the very path that failed validation, and owning the traversal
 * in the console would mean owning the engine's scoring too — a second
 * implementation of a contract, which is the drift hazard R2-01 was about. A
 * store that cannot be vouched for is a stop-and-look event, not a partial answer.
 *
 * @module creator-brains-console/lib/brains
 */

import { queryBrains } from '../../../scripts/creator-brains/lib/query.mjs';
import { BRAIN_FILES, readPublishedBrain } from './brain-read.mjs';
import { assertReadSurfaceContained } from './read-surface.mjs';
import { ApiError, CODE, validateQuery } from './errors.mjs';
import { toQueryHit } from './hits.mjs';

// Re-exported because `api.mjs` reads the allowlist from here; the list itself
// belongs with the reader that uses it.
export { BRAIN_FILES };

/**
 * GET /api/query?q&creator — the engine's own query, behind a containment pass.
 *
 * The pass is what makes this route safe: the engine resolves pointers and joins
 * generations itself, so validating nothing here is what let the round-2 probe
 * read `outside/rules.jsonl` and return a hit (R2-02).
 */
export function queryConsole(q, { r, creator = null } = {}) {
  const query = validateQuery(q);
  assertReadSurfaceContained(r);
  let res;
  try {
    res = queryBrains(query, { r, creator: creator || null });
  } catch (e) {
    // The engine refuses an empty query and a bad creator filter by throwing;
    // map that to VALIDATION rather than a 500, keeping the engine's wording.
    throw new ApiError(CODE.VALIDATION, e.message);
  }
  return {
    hits: res.hits.map((h) => ({
      claimId: h.claimId || `${h.videoId}:${h.tStartMs}`,
      creatorId: h.creatorId,
      creatorTitle: h.creatorTitle || h.creatorId,
      videoId: h.videoId,
      tStartMs: h.tStartMs,
      keyPhrase: h.keyPhrase,
      statement: h.statement,
      topic: h.topic,
      // The deep link is the product: it opens the creator's own video at the
      // second the claim was made.
      watchUrl: `https://youtu.be/${h.videoId}?t=${Math.max(0, Math.floor((h.tStartMs || 0) / 1000))}`,
    })),
    skipped: res.skipped || [],
  };
}

/**
 * GET /api/brains/:slug — read ONLY the published generation named by the
 * pointer. A missing pointer is a 404, never an empty document that looks like
 * a brain with nothing in it.
 *
 * Everything below the 404 decision lives in `readPublishedBrain`, which reads
 * the pointer ONCE and takes all four files from the directory that one read
 * named. Two shapes are deliberately distinguished there:
 *
 *   no published brain        → `null` here → 404
 *   damage (impossible
 *   generation, escaping
 *   link)                     → thrown there → 409 STORE_DAMAGED
 *
 * Collapsing those is how a corrupt store comes to look like an empty one — the
 * S1-H15 shape, which this route has already produced once.
 */
export function brainDoc(slug, { r } = {}) {
  if (typeof slug !== 'string' || !slug.trim()) {
    throw new ApiError(CODE.VALIDATION, 'a brain slug is required');
  }
  const name = slug.trim();

  const published = readPublishedBrain(r, name);
  if (!published) {
    throw new ApiError(CODE.NOT_FOUND, `no published brain for '${name}'`, { slug: name });
  }

  // Claims come from the SAME pinned generation as the markdown (A1-04/R2-03),
  // and the projection is shared with the query route (`lib/hits.mjs`) so the
  // two cannot drift field for field.
  return {
    slug: name,
    generation: published.generation,
    title: published.title,
    index: published.docs['index.md'],
    topics: published.docs['topics.md'],
    timeline: published.docs['timeline.md'],
    claims: published.claims.map(toQueryHit),
    skipped: published.skipped,
  };
}
