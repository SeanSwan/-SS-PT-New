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
 * ⚠️ KNOWN OPEN DEFECT — R2-02, Astra round 2. `queryConsole` still calls the
 * engine's `queryBrains`, which resolves pointers ITSELF and therefore never
 * passes through `containedDir`. Measured by the round-2 probe: a poisoned
 * generation path was followed and a hit returned from outside `brains/`. The
 * drawer is contained; the query route is not. The fix is to route the query
 * through the same reader, which is the S0H slice. It is recorded here rather
 * than left implicit because a reader of this file would otherwise reasonably
 * assume the boundary covers both entry points — which is exactly how A1-11 sat
 * unseen in the first place.
 *
 * @module creator-brains-console/lib/brains
 */

import { queryBrains } from '../../../scripts/creator-brains/lib/query.mjs';
import { BRAIN_FILES, readPublishedBrain } from './brain-read.mjs';
import { ApiError, CODE, validateQuery } from './errors.mjs';
import { toQueryHit } from './hits.mjs';

// Re-exported because `api.mjs` reads the allowlist from here; the list itself
// belongs with the reader that uses it.
export { BRAIN_FILES };

/**
 * GET /api/query?q&creator — thin pass-through to the engine's own query.
 *
 * ⚠️ NOT CONTAINED — see the R2-02 note in the header. Every other path into
 * LANE C goes through `readPublishedBrain`.
 */
export function queryConsole(q, { r, creator = null } = {}) {
  const query = validateQuery(q);
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
