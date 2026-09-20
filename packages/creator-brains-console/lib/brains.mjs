/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/brains.mjs
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
 * three fixed filenames.
 *
 * THAT LAST PARAGRAPH USED TO END "…so a slug cannot escape the directory
 * because the three names are literals." IT WAS FALSE, AND IT WAS THE REASON
 * A1-11 SAT HERE UNSEEN (2026-09-20). Three literals do not help: the slug and
 * the pointer's generation are BOTH joined into the path —
 *
 *   readPointer(r, name)              → join(brainsDir, name, 'current.json')
 *   join(brainsDir, name, generation) → the three reads
 *
 * — and neither was validated. MEASURED against the pre-fix code, with a
 * directory of the same three filenames placed beside the store:
 *
 *   a pointer naming generation `../../../outside/gen-0001`  → 200, served it
 *   `brains/<ns>/gen-0001` as a junction to that directory   → 200, served it
 *   `brains/<ns>` itself as a junction to it                 → 200, served it
 *   an encoded traversal in the SLUG (`..%2F..%2Foutside`)   → 404, no leak
 *
 * So the generation component and any filesystem LINK are live, and the slug
 * text is not — the router does not decode `%2F`, and `fetch`/`undici` strip a
 * raw `..` before the wire. The alphabet check below is still required, and not
 * because it fixes a live hole: the slug is safe TODAY only because another
 * module declines to decode, which is an assumption owned elsewhere and one
 * `decodeURIComponent` away from being false. That is the exact shape of guard
 * this review exists to find, so the slug is constrained here rather than left
 * resting on someone else's behaviour.
 *
 * @module creator-brains-console/lib/brains
 */

import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { queryBrains } from '../../../scripts/creator-brains/lib/query.mjs';
import { readPointer } from '../../../scripts/creator-brains/lib/render.mjs';
import { paths } from '../../../scripts/creator-brains/lib/paths.mjs';
import { ApiError, CODE, validateQuery } from './errors.mjs';

/** The only three files a brain page is allowed to expose (LANE C). */
export const BRAIN_FILES = Object.freeze(['index.md', 'topics.md', 'timeline.md']);

/**
 * A namespace that cannot be a path.
 *
 * The engine produces two shapes and only two: `slugify` yields `[a-z0-9-]`
 * (≤60 chars, no leading or trailing hyphen) and a YouTube channel id is
 * `UC[A-Za-z0-9_-]+`. This allowlist covers both and admits no `.`, no
 * separator, and no empty name — so `..`, `/`, `\` and a NUL byte are all
 * unrepresentable. `BRAIN_NS` in the fixtures ('fixture-brain') is the case
 * that keeps the rule honest about hyphens.
 */
const NAMESPACE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

/** The generation directory shape the engine writes (`render.mjs` `nextGeneration`). */
const GENERATION = /^gen-\d{4}$/;

/** Is `target` strictly inside `root`, after both have been normalised? */
function inside(root, target) {
  const rel = relative(root, target);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

/**
 * `brains/<slug>/<generation>`, proven to resolve inside the store.
 *
 * WHY BOTH CHECKS WHEN THE ALPHABET ALREADY FORBIDS TRAVERSAL. Because a check
 * that holds only while another check happens to hold is precisely the defect
 * class this review exists to find. Containment is asserted directly, so
 * loosening `NAMESPACE` later cannot silently reopen the hole.
 *
 * AND WHY CONTAINMENT OF THE PATH IS NOT CONTAINMENT OF THE FILE. `readFileSync`
 * follows junctions and symlinks, so `brains/<slug>` — or the generation
 * directory itself — may be a link to anywhere while remaining lexically inside.
 * `realpathSync` resolves the whole chain, which is the only thing that can see
 * that. MEASURED 2026-09-20 against the pre-fix code: a junction at either
 * `brains/<ns>/gen-0001` or at `brains/<ns>` served a directory outside the
 * store with 200 and the same three documents. A traversal in the pointer's
 * `generation` did the same. All three are refused now.
 */
function containedDir(r, slug, generation) {
  const root = resolve(paths(r).brainsDir);
  const dir = resolve(root, slug, generation);
  if (!inside(root, dir)) {
    throw new ApiError(
      CODE.STORE_DAMAGED,
      `'${slug}/${generation}' does not resolve inside the brains store`,
      { file: 'current.json' },
    );
  }

  let realRoot = null;
  let real = null;
  try { realRoot = realpathSync(root); } catch { /* no store yet — nothing to escape */ }
  try { real = realpathSync(dir); } catch { /* absent generation, reported per file below */ }

  // An ABSENT generation directory is not a fault — it is reported file by file,
  // exactly as before. Only one that EXISTS and escapes is a store fault.
  if (real !== null && realRoot !== null && !inside(realRoot, real)) {
    throw new ApiError(
      CODE.STORE_DAMAGED,
      `the published generation for '${slug}' resolves outside the brains store`,
      { file: 'current.json' },
    );
  }
  return dir;
}

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

  // REFUSE BEFORE THE POINTER READ (A1-11). `pointerPath` joins this string
  // unsanitised, so a name that cannot be a namespace must not reach it at all.
  // 404 rather than 400: from a caller's side an unnameable slug and an absent
  // brain are the same answer, and the containment probes already pin that.
  if (!NAMESPACE.test(name)) {
    throw new ApiError(CODE.NOT_FOUND, `no published brain for '${name}'`, { slug: name });
  }

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

  // AN ABSENT GENERATION IS INCOMPLETE; AN IMPOSSIBLE ONE IS DAMAGE (A1-11). The
  // engine writes `gen-NNNN` and nothing else, so a pointer naming anything else
  // was not written by the engine — corrupt or forged. Reporting it as three
  // empty documents is the S1-H15 shape again: a store fault dressed as a
  // legitimate brain with nothing in it.
  if (generation !== null && !GENERATION.test(generation)) {
    throw new ApiError(
      CODE.STORE_DAMAGED,
      `the published pointer for '${name}' names generation '${generation.slice(0, 80)}', `
        + 'which the engine never writes',
      { file: 'current.json' },
    );
  }

  const dir = generation ? containedDir(r, name, generation) : null;

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
