/**
 * ============================================================================
 * FILE: scripts/creator-brains/console/lib/brains.mjs
 * PURPOSE: Asking the brains (cited claims) and reading a published generation.
 * PART OF: Creator Brains Console (blueprint 05 §1, §3)
 * SLICE: S0
 * ============================================================================
 *
 * THE TRUST BOUNDARY LIVES IN THIS FILE, so it is worth stating precisely.
 *
 * The engine's store has three lanes:
 *   LANE A  durable     registry.json / state.json — roster and video states
 *   LANE B  private     docs/<channelId>/<videoId>.json — RAW TRANSCRIPT TEXT
 *   LANE C  derived     brains/<slug>/ — published claims, topics, timeline
 *
 * LANE B is the creator's own spoken content, stored locally. Nothing in the
 * console may serve it. LANE C is the product: claims with timestamps and deep
 * links back into the creator's video.
 *
 * `queryConsole` reads LANE C indirectly, through the engine's `queryBrains`,
 * which loads published generation files. `brainDoc` reads LANE C directly, but
 * only the files named by the published pointer — the pointer IS the gate. The
 * engine's render pipeline (HR08) guarantees a brain page is built from
 * published claims, never from raw transcript, and this module inherits that
 * guarantee rather than re-establishing it.
 *
 * The one thing this file must never grow: a path parameter that lets a caller
 * name a file. `brainDoc` takes a SLUG, joins it under `brainsDir`, and reads
 * three fixed filenames. A slug cannot escape the directory because the three
 * names are literals.
 *
 * @module creator-brains/console/lib/brains
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { queryBrains } from '../../lib/query.mjs';
import { readPointer } from '../../lib/render.mjs';
import { paths } from '../../lib/paths.mjs';
import { ApiError, CODE, validateQuery } from './errors.mjs';

/** The only three files a brain page is allowed to expose (LANE C). */
export const BRAIN_FILES = Object.freeze(['index.md', 'topics.md', 'timeline.md']);

/** GET /api/query?q&creator — thin pass-through to the engine's own query. */
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
 */
export function brainDoc(slug, { r } = {}) {
  if (typeof slug !== 'string' || !slug.trim()) {
    throw new ApiError(CODE.VALIDATION, 'a brain slug is required');
  }
  const name = slug.trim();

  let pointer;
  try {
    pointer = readPointer(r, name);
  } catch {
    pointer = null;
  }
  if (!pointer) {
    throw new ApiError(CODE.NOT_FOUND, `no published brain for '${name}'`, { slug: name });
  }

  // THE GENERATION IS PART OF THE PATH (S1-H15). The engine publishes into
  // `brains/<slug>/<generation>/` and swaps `current.json` LAST (render.mjs
  // `publishBrain`: `writeTextAtomic(join(genDir, f.name), f.text)` then
  // `writeJsonAtomic(pointerPath(r, ns), pointer)`), so the three documents sit
  // one level BELOW the pointer. This function used to join `brainsDir + slug`
  // only and then read the three literal names — a directory that never holds
  // them — so every published brain answered **200 with all three fields
  // empty**. Correct slug, correct generation, correct title, no content: that
  // is precisely the "empty document that looks like a brain with nothing in
  // it" the contract above forbids, and it is indistinguishable from a brain
  // that genuinely has no claims.
  const generation = typeof pointer.generation === 'string' && pointer.generation
    ? pointer.generation
    : null;
  const dir = generation ? join(paths(r).brainsDir, name, generation) : null;

  // A file that is missing must be REPORTED, not silently rendered as empty —
  // the same rule `loadHits` applies to a missing `rules.jsonl`. `skipped` was
  // already part of this payload and was always `[]`.
  const skipped = [];
  const readIfPresent = (file) => {
    if (!dir) {
      skipped.push({ file, reason: 'the published pointer names no generation' });
      return '';
    }
    try {
      return readFileSync(join(dir, file), 'utf8');
    } catch {
      skipped.push({ file, reason: 'missing from the published generation' });
      return '';
    }
  };

  return {
    slug: name,
    generation,
    title: pointer.title ?? name,
    index: readIfPresent('index.md'),
    topics: readIfPresent('topics.md'),
    timeline: readIfPresent('timeline.md'),
    claims: [],
    skipped,
  };
}
