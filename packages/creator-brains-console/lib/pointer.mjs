/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/pointer.mjs
 * PURPOSE: The ONE strict, contained reader for `brains/<ns>/current.json` —
 *          shared by the enumeration preflight and the single-generation drawer.
 * PART OF: Creator Brains Console (blueprint 05 §1, §3)
 * SLICE: S0H (R4-01, Astra round 4)
 * ============================================================================
 *
 * WHY THIS MODULE EXISTS (R4-01). The console had TWO pointer readers, and they
 * did not agree. `brain-read.mjs` validated the generation shape and contained
 * the generation directory; `read-surface.mjs` did neither — it called the
 * engine's `readPointer` and kept anything with a truthy `generation`. Round 4
 * measured the disagreement as a table:
 *
 *   a valid namespace naming `../../../outside/gen-0001`  count 1, NO DAMAGE,
 *                                                        query STORE_DAMAGED
 *   `generation: 42` (a number)                           count 1, NO DAMAGE,
 *                                                        query VALIDATION
 *   malformed pointer JSON                                count 0, NO DAMAGE
 *   pointer read raises EACCES                            count 0, NO DAMAGE
 *   enumeration raises EACCES                             count 0, NO DAMAGE
 *
 * Every one of those rows is the SAME defect: damage reported as a healthy
 * count or as healthy emptiness. The status route published "2 brains, nothing
 * wrong" over a store it could not read.
 *
 * THE ROOT CAUSE IS THE DUPLICATION, so the fix is the opposite of a second
 * check. There is now exactly ONE place that turns a namespace into a pointer,
 * and both callers use it. This is the R2-01 hazard in its natural habitat: two
 * statements of one rule, and the weaker one wins wherever it is the only one
 * that runs.
 *
 * WHY A READ THAT FAILS IS DAMAGE AND NOT ABSENCE. Only `ENOENT` means "there
 * is no publication here". `EACCES`, `EISDIR`, `EPERM`, `EMFILE`, a malformed
 * path — and a `current.json` that exists but is not JSON — all mean a
 * publication that cannot be read, and reporting those as absence is how a
 * permissions problem comes to look like "this creator published nothing"
 * (A2-R2-01, restated here for the pointer rather than for a leaf).
 *
 * WHY AN ORDINARY FILE IS SKIPPED AND A BROKEN DIRECTORY IS NOT. The engine's
 * `listPublished` reads `join(base, ns, 'current.json')` through `readJson`,
 * which returns `null` on ENOTDIR — so a stray `.DS_Store` sitting in `brains/`
 * is dropped by the engine and must be dropped here too, or one harmless file
 * kills every query. A *directory* whose `current.json` exists and cannot be
 * read is a different fact: that is a publication attempt that is broken.
 *
 * WHAT THE ENGINE DOES WITH A GENERATION, which is what this module has to
 * match. `listPublished` joins `ptr.generation` into a path. `path.join` throws
 * `TypeError` on a non-string, so a numeric generation does not make the engine
 * skip the entry — it makes the engine FAIL. And a traversal generation is
 * joined and followed. So both are store damage, and neither may be counted.
 *
 * @module creator-brains-console/lib/pointer
 */

import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { ApiError, CODE } from './errors.mjs';
import {
  brainsStore, containedPath, readContainedText,
} from './containment.mjs';

/**
 * The generation directory shape the engine writes.
 *
 * MOVED HERE FROM `brain-read.mjs` (R4-01) so the enumeration and the drawer
 * apply one regex rather than two copies of it. The two-shape rule is unchanged:
 * `render.mjs` uses `padStart(4)`, a FLOOR and not a fixed width, so N ≤ 9999 is
 * exactly four digits and N ≥ 10000 is the plain decimal — which is why a
 * five-digit form may not start with `0`.
 */
export const GENERATION = /^gen-(?:\d{4}|[1-9]\d{4,})$/;

function damaged(message, file = 'current.json') {
  return new ApiError(CODE.STORE_DAMAGED, message, { file });
}

/**
 * Enumerate the brains store STRICTLY.
 *
 * `paths.mjs`'s `listDir` catches EVERY error and returns `[]`, so a store that
 * cannot be listed is indistinguishable from a store with nothing in it — the
 * "damage as healthy emptiness" row of the round-4 table. Only `ENOENT` is
 * absence here.
 */
export function listNamespaces(root) {
  try {
    return readdirSync(root);
  } catch (err) {
    if (err && err.code === 'ENOENT') return [];
    const code = (err && err.code) || 'unknown error';
    throw damaged(`the brains store could not be enumerated (${code})`);
  }
}

/** Is this path a directory, an ordinary file, or not there at all? */
function entryKind(path, what) {
  try {
    return statSync(path).isDirectory() ? 'dir' : 'file';
  } catch (err) {
    if (err && err.code === 'ENOENT') return 'absent';
    const code = (err && err.code) || 'unknown error';
    throw damaged(`${what} exists but could not be inspected (${code})`);
  }
}

/**
 * `brains/<slug>/<generation>`, proven to resolve inside the store.
 *
 * WHY BOTH CHECKS WHEN THE ALPHABET ALREADY FORBIDS TRAVERSAL. Because a check
 * that holds only while another check happens to hold is the defect class this
 * subsystem exists to remove. Containment is asserted directly, so loosening the
 * alphabet later cannot silently reopen the hole.
 *
 * AND WHY CONTAINMENT OF THE PATH IS NOT CONTAINMENT OF THE FILE.
 * `readFileSync` follows junctions and symlinks, so the generation directory may
 * be a link to anywhere while remaining lexically inside; `realpathSync` is the
 * only thing that sees that. Exported (and re-exported by `brain-read.mjs`)
 * because the drawer and the enumeration must use the SAME check, not a copy.
 */
export function containedDir(r, slug, generation) {
  const { root, realRoot } = brainsStore(r);
  return containedPath(
    root, realRoot, resolve(root, slug, generation), `'${slug}/${generation}'`, 'current.json',
  );
}

/**
 * Resolve one namespace to its published generation, or prove there is none.
 *
 * THE ABSENT RESULT CARRIES ITS REASON, because the two callers want different
 * things from it and collapsing them was itself a defect shape. The ENUMERATION
 * skips both — the engine drops both, so skipping both is agreement. The DRAWER
 * does not: `T-B22c` requires a pointer that exists but names no generation to
 * render a page saying so, rather than a 404 that reads as "no such creator".
 *
 * @returns {{present: false, reason: 'absent'|'no-generation'}}
 *        `absent` — no publication here: an absent entry, an ordinary file, no
 *        `current.json`, or one that does not exist.
 *        `no-generation` — a pointer that parses but names no generation, which
 *        is the entry the ENGINE also drops.
 * @returns {{present: true, pointer: object, generation: string, dir: string}}
 *        when there is one, with `dir` already proven to resolve inside the store.
 * @throws ApiError(STORE_DAMAGED) for every other outcome — see the header.
 */
export function resolvePointer(r, ns) {
  const { root, realRoot } = brainsStore(r);
  const what = `'${ns}'`;

  // 1. The namespace directory and the pointer file must not be links out. This
  //    runs FIRST: `statSync` follows links, so containment has to be settled
  //    before anything is asked about the entry's kind.
  containedPath(root, realRoot, join(root, ns), what, 'current.json');
  const pointerPath = containedPath(root, realRoot, join(root, ns, 'current.json'), `the pointer for ${what}`, 'current.json');

  // 2. An ordinary FILE where a namespace directory belongs is dropped by the
  //    engine (its `readJson` swallows ENOTDIR), so it is not a publication.
  if (entryKind(join(root, ns), what) !== 'dir') return { present: false, reason: 'absent' };

  // 3. Read it strictly. ENOENT is absence; every other failure is damage.
  const text = readContainedText(pointerPath, `the published pointer for ${what}`, 'current.json');
  if (text === null) return { present: false, reason: 'absent' };

  let pointer;
  try {
    pointer = JSON.parse(text);
  } catch {
    throw damaged(`the published pointer for ${what} exists but is not valid JSON`);
  }

  // 4. A pointer that names no generation is one the engine drops, so this walk
  //    may drop it too — that is the R3-01 skip, and it is the engine's own test.
  if (!pointer || typeof pointer !== 'object' || !pointer.generation) {
    return { present: false, reason: 'no-generation' };
  }

  // 5. A generation the engine cannot JOIN is not a skip. `path.join` throws on
  //    a non-string, so a numeric generation makes `listPublished` FAIL rather
  //    than drop the entry — counting it as healthy is the round-4 `generation:
  //    42` row.
  if (typeof pointer.generation !== 'string') {
    throw damaged(
      `the published pointer for ${what} names a generation of type `
        + `'${typeof pointer.generation}', which the engine cannot join into a path`,
    );
  }

  // 6. Nor is a generation the engine never writes.
  if (!GENERATION.test(pointer.generation)) {
    throw damaged(
      `the published pointer for ${what} names generation `
        + `'${pointer.generation.slice(0, 80)}', which the engine never writes`,
    );
  }

  // 7. And it must resolve inside the store — the traversal row of the table.
  const dir = containedPath(
    root, realRoot, resolve(root, ns, pointer.generation),
    `'${ns}/${pointer.generation}'`, 'current.json',
  );

  return { present: true, pointer, generation: pointer.generation, dir };
}
