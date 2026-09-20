/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/containment.mjs
 * PURPOSE: Turning a name into a path that is PROVEN to stay inside the store.
 * PART OF: Creator Brains Console (blueprint 05 §1, §3)
 * SLICE: S0H (R2-02, Astra round 2)
 * ============================================================================
 *
 * WHY THIS IS A MODULE AND NOT A FUNCTION IN THE READER. `brain-read.mjs` owns
 * what a published brain LOOKS like; this file owns how a path is proven safe to
 * touch. They were one file until R2-02 needed containment for the pointer, the
 * namespace directory, the generation directory AND every leaf — four call sites
 * where there had been one — and the combined file passed the repo's 300-line cap
 * (CLAUDE.md rule 4). The split is on the seam the two concerns already had.
 *
 * THE DEFECT THIS CLOSES (R2-02, measured by the round-2 probe). Containment
 * covered the DRAWER's generation directory only. It did not cover:
 *
 *   - the POINTER file, which was read before any check, so a `current.json`
 *     that was itself a link was followed;
 *   - the NAMESPACE directory, so `brains/<slug>` could be a junction out;
 *   - any LEAF file, so `rules.jsonl` could be a link out of an otherwise
 *     contained generation;
 *   - the QUERY route at all — `queryBrains` resolves pointers itself, so it
 *     never reached the drawer's check. The probe returned a hit after reading
 *     `outside/rules.jsonl`.
 *
 * A boundary implemented at one entry point and not the other is a boundary
 * implemented once and a half. Everything below is used by BOTH.
 *
 * CONTAINMENT OF A PATH IS NOT CONTAINMENT OF A FILE. `readFileSync` follows
 * junctions and symlinks, so a path can be lexically inside the store and still
 * name a file on the other side of the machine. `realpathSync` resolves the whole
 * chain, and it is the only thing that can see that. Both checks run, always —
 * not because the alphabet check might fail, but because a guard that holds only
 * while another guard holds is the defect class this module exists to remove.
 *
 * @module creator-brains-console/lib/containment
 */

import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

import { paths } from '../../../scripts/creator-brains/lib/paths.mjs';
import { ApiError, CODE } from './errors.mjs';

/**
 * The brains store, with its real path resolved ONCE per call.
 *
 * `realRoot` is null when the store does not exist yet. That is not a fault —
 * there is nothing to escape from — and every check below tolerates it.
 */
export function brainsStore(r) {
  const root = resolve(paths(r).brainsDir);
  let realRoot = null;
  try {
    realRoot = realpathSync(root);
  } catch {
    /* no store yet — nothing to escape */
  }
  return { root, realRoot };
}

/** Is `target` strictly inside `root`, after both have been normalised? */
export function inside(root, target) {
  const rel = relative(root, target);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

/** The real path of `target`, or null when it does not exist / cannot be resolved. */
export function realpathOrNull(target) {
  try {
    return realpathSync(target);
  } catch {
    return null;
  }
}

function damaged(message, file) {
  return new ApiError(CODE.STORE_DAMAGED, message, { file });
}

/**
 * Assert that `target` resolves inside the store, then return it.
 *
 * AN ABSENT TARGET IS NOT A FAULT. A generation directory that does not exist is
 * reported file by file by the caller; only something that EXISTS and escapes is
 * store damage. So the real-path check is skipped when the path cannot be
 * resolved, and the caller is left to distinguish absence from damage on the read
 * — which `readContainedText` below does, and does differently on purpose.
 *
 * @param root     the lexical store root
 * @param realRoot its resolved real path, or null when the store is absent
 * @param target   the absolute path to prove
 * @param what     a short human description, used in the refusal
 * @param file     the file name to blame in the refusal (contract §3 damage shape)
 */
export function containedPath(root, realRoot, target, what, file) {
  if (!inside(root, target)) {
    throw damaged(`${what} does not resolve inside the brains store`, file);
  }
  const real = realpathOrNull(target);
  if (real !== null && realRoot !== null && !inside(realRoot, real)) {
    throw damaged(`${what} resolves outside the brains store`, file);
  }
  return target;
}

/**
 * Read a UTF-8 text file, treating ABSENCE and FAILURE as different facts.
 *
 * THIS IS THE A2-R2-01 CORRECTION. The first version of the reader caught every
 * read error and reported "missing from the published generation". That collapses
 * two opposite facts: a file that is not there, and a file that is there but
 * cannot be read. The second is a store fault the operator must fix; the first is
 * an ordinary incomplete publication. Reporting the second as the first is how a
 * permissions problem reads as "this creator published nothing".
 *
 * So: `ENOENT` returns null (absence, the caller reports it), and EVERY other
 * failure throws. `EISDIR`, `EACCES`, `EPERM`, `EMFILE` and a malformed path are
 * all damage. The distinction is testable on Windows without privileges by making
 * the path a DIRECTORY, which raises `EISDIR` — see `bridge.readsurface.test.mjs`.
 *
 * @returns the file's text, or null when it does not exist
 */
export function readContainedText(path, what, file) {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    const code = (err && err.code) || 'unknown error';
    throw damaged(`${what} exists but could not be read (${code})`, file);
  }
}
