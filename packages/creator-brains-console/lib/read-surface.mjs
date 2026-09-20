/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/read-surface.mjs
 * PURPOSE: Prove the WHOLE read surface is contained before any route reads it,
 *          and answer the status route's publication count without reading a
 *          single unchecked pointer.
 * PART OF: Creator Brains Console (blueprint 05 §1, §3)
 * SLICE: S0H (R2-02, then R3-01 and R3-02)
 * ============================================================================
 *
 * WHY A WALK AND NOT A REWRITE (R2-02). `/api/query` delegates to the engine's
 * `queryBrains`, which enumerates every `current.json` under the brains
 * directory ITSELF and joins each pointer's generation unchecked — that is the
 * measured R2-02 leak. The console cannot fix that from the outside, and
 * reimplementing the traversal would mean reimplementing the engine's scoring
 * too, which is the duplicated-contract hazard R2-01 was about.
 *
 * So the console establishes the property the engine relies on, BEFORE the engine
 * runs: every entry in `brains/`, every pointer, every generation and every leaf
 * is proven to resolve inside the store. After this pass returns, every path
 * `listPublished` will join is a path already validated here.
 *
 * THE PREFLIGHT MUST COVER THE ENGINE'S ENUMERATION EXACTLY (R3-01, Astra round
 * 3). `render.mjs` `listPublished` filters on NOTHING — it takes every entry of
 * `brains/`, joins `current.json`, reads it, and keeps the ones whose pointer
 * names a generation. The first version of this walk enumerated the same set but
 * then handed each entry to `readPublishedBrain`, which returns `null` for a name
 * outside `NAMESPACE` — so an entry the engine would still traverse had its
 * generation and leaves left UNPROVEN, and the caller ignored the `null`.
 * Measured by Astra round 3: a directory named `bad.name` whose pointer named
 * `../../../outside/gen-0001` passed the preflight, and the query then opened the
 * outside rules file and returned a hit.
 *
 * AN ENUMERATED NAME THE CONSOLE CANNOT NAME IS DAMAGE, NEVER A SKIP. The two
 * halves must agree, and "skip what I cannot name" cannot be made to agree with
 * "traverse everything", because the engine is the one that traverses. The
 * engine's own test is the console's test: a pointer naming a generation is a
 * pointer the engine will join. So the enumeration uses the ENGINE'S `readPointer`
 * (a second reader would drift from `listPublished`, and drift silently), and an
 * entry that passes the engine's test but fails the console's alphabet refuses
 * the whole request with 409.
 *
 * AN ENTRY THE ENGINE DROPS IS AN ENTRY THIS WALK MAY DROP. A stray file, or a
 * directory whose pointer is absent or names no generation, is not read by
 * `listPublished` at all — so refusing on it would make a harmless `.DS_Store`
 * kill every query. Those entries are skipped, and that is not the R3-01 skip:
 * the engine skips them too.
 *
 * WHAT THIS DOES NOT COVER, stated rather than implied: a filesystem MUTATED
 * between this pass and the engine's read. That race is not detectable without
 * platform-specific primitives, and Astra's own correction (A2-R2-06) says not to
 * certify it. Cooperating atomic publication and pre-existing links are covered;
 * a hostile concurrent mutation is not claimed.
 *
 * @module creator-brains-console/lib/read-surface
 */

import { join } from 'node:path';
import { readPointer } from '../../../scripts/creator-brains/lib/render.mjs';
import { listDir } from '../../../scripts/creator-brains/lib/paths.mjs';
import { ApiError, CODE } from './errors.mjs';
import { brainsStore, containedPath } from './containment.mjs';
import { isNamespace, readPublishedBrain } from './brain-read.mjs';

/**
 * Every pointer the ENGINE will read, with each pointer PATH contained first.
 *
 * Returns `[{ name, pointer }]` in the engine's own enumeration order. THROWS
 * `STORE_DAMAGED` when an entry the engine would traverse is one the console
 * cannot name — see the header for why that is a refusal and not a skip.
 */
export function containedPointers(r) {
  const { root, realRoot } = brainsStore(r);
  const out = [];
  for (const entry of listDir(root)) {
    // Every entry, not only well-formed namespaces: `listPublished` does not
    // filter by name either, so anything it will open must be proven here. These
    // two calls prove the POINTER PATH — that `brains/<entry>` and its
    // `current.json` are not themselves links out of the store.
    containedPath(root, realRoot, join(root, entry), `'${entry}'`, 'current.json');
    containedPath(root, realRoot, join(root, entry, 'current.json'), `the pointer for '${entry}'`, 'current.json');

    let pointer = null;
    try {
      pointer = readPointer(r, entry);
    } catch {
      pointer = null; // the engine's `readJson(…, null)` answers the same way
    }
    // The engine keeps a pointer only when it names a generation; an entry it
    // drops is an entry it never reads, so this walk may drop it too.
    if (!pointer || !pointer.generation) continue;

    if (!isNamespace(entry)) {
      throw new ApiError(
        CODE.STORE_DAMAGED,
        `'${String(entry).slice(0, 80)}' is a published namespace the engine traverses `
          + 'but the console cannot name, so its generation cannot be proven to stay in the store',
        { file: 'current.json' },
      );
    }
    out.push({ name: entry, pointer });
  }
  return out;
}

/**
 * Prove that the engine's own traversal cannot leave the store (R2-02, R3-01).
 *
 * THROWS on any escape, so the route answers 409 rather than serving from a store
 * it cannot vouch for. `/api/query` refuses the WHOLE request rather than
 * skipping the poisoned creator: a skipped creator is indistinguishable from a
 * creator that never claimed anything (the S1-H15 shape).
 */
export function assertReadSurfaceContained(r) {
  for (const { name } of containedPointers(r)) readPublishedBrain(r, name);
}

/**
 * Count published brains WITHOUT reading their markdown or rules (R3-02).
 *
 * WHY THIS EXISTS. `lib/status.mjs` used to answer this by calling the engine's
 * `listPublished` directly — which reads every `current.json` through
 * `render.mjs:67`, with none of the containment above. A namespace or a pointer
 * that escaped the store therefore stayed reachable through the status route, and
 * the published count was derived from an untrusted pointer.
 *
 * THE SHAPE IS DELIBERATELY NOT THE QUERY ROUTE'S SHAPE. `/api/query` refuses the
 * whole request; status is a composite instrument, and turning one damaged brain
 * into a failed status reading would cost the operator every unrelated reading at
 * the moment they most need them. So damage here is a FIELD, and the count is
 * `null` — a count that cannot be taken is never `0`, which would be
 * indistinguishable from "nothing is published".
 *
 * NEVER THROWS a containment failure; a non-`ApiError` still propagates, because
 * a bug in this module is not a damaged store.
 *
 * @returns {{count: number|null, damage: {file: string, detail: string}|null}}
 */
export function countPublished(r) {
  try {
    return { count: containedPointers(r).length, damage: null };
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    return {
      count: null,
      damage: { file: err.extra?.file || 'current.json', detail: err.message },
    };
  }
}
