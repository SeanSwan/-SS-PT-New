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
import { isAbsolute, relative, resolve, sep } from 'node:path';

import { paths } from '../../../scripts/creator-brains/lib/paths.mjs';
import { ApiError, CODE } from './errors.mjs';

/**
 * The real-path resolver, injectable for tests.
 *
 * WHY THIS SEAM EXISTS. R5-02's fix is "only ENOENT means absence". Its failure
 * branch cannot be reached by real filesystem means on this host: a non-ENOENT
 * `realpathSync` failure needs an ACL (EACCES), and the two constructible
 * alternatives do not work — a path beneath a FILE reports **ENOENT** because the
 * leaf does not exist, and a Windows directory junction LOOP resolves cleanly
 * rather than raising ELOOP (both measured 2026-09-20). Astra reached the branch by
 * substituting filesystem responses in memory, and recorded the reachability limit
 * as [UNKNOWN]. Without a seam the fix would ship **unverified**, and an unverified
 * guard is the defect class this module exists to remove.
 *
 * Mirrors the existing `setProbeWorkerForTest` pattern in `lib/health-probe.mjs`.
 */
let realpathImpl = realpathSync;

/** Test seam. Pass nothing (or null) to restore the real resolver. */
export function setRealpathForTest(fn) {
  realpathImpl = typeof fn === 'function' ? fn : realpathSync;
}

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
    realRoot = realpathImpl(root);
  } catch (err) {
    // AN ABSENT STORE IS NOT A FAULT (R5-02). But the previous catch swallowed EVERY
    // error, so one EACCES on the root set `realRoot = null` for the WHOLE request
    // and disabled real-path containment globally — leaving only the lexical
    // `inside()`, which is the check `realpathSync` exists to supplement because it
    // cannot see a junction. Only ENOENT means "no store yet".
    //
    // THE TEST IS AN OPTIONAL CHAIN, NOT `err &&` (R6-02). `err && err.code !== 'ENOENT'`
    // is a FALSY test used as a PRESENCE test — the shape R5-01 removed from
    // `pointer.mjs`, reintroduced here one function over. A non-`Error` throw
    // (`undefined`, `null`, `false`, `0`, `''`) made the guard read as "the store does
    // not exist", which is a confident absence over a fault. `err?.code` is `undefined`
    // for a falsy throw, so it refuses instead.
    if (err?.code !== 'ENOENT') {
      throw damaged(
        `the brains store root could not be resolved`
          + `${err?.code ? ` (${err.code})` : ''}`,
        'brains',
      );
    }
    /* ENOENT — no store yet, and there is nothing to escape from. */
  }
  return { root, realRoot };
}

/**
 * Is `target` strictly inside `root`, after both have been normalised?
 *
 * THE ESCAPE TEST IS BY PATH COMPONENT, NOT BY PREFIX (R7-01). The previous form was
 * `!rel.startsWith('..')`, which rejects every name that merely BEGINS with two dots —
 * `..notes`, `..cache`, `..tmp` — none of which is a parent-directory component. The
 * consequence was not theoretical: `resolvePointer` runs namespace containment BEFORE
 * the ordinary-file skip, so an ordinary file named `..notes` sitting in the store
 * made the whole read refuse with `STORE_DAMAGED`. `listNamespaces` is an unfiltered
 * `readdirSync`, so such a name IS enumerated and DOES reach this check.
 *
 * A parent component is exactly `..`, or `..` followed by a separator. Both are
 * refused; a longer name that starts with two dots is an ordinary name and is allowed
 * — provided it also passes the real-path check, which is the one that can see a
 * junction regardless of spelling.
 */
export function inside(root, target) {
  const rel = relative(root, target);
  return rel !== ''
    && rel !== '..'
    && !rel.startsWith(`..${sep}`)
    && !isAbsolute(rel);
}

/**
 * The real path of `target`, or null ONLY when it genuinely does not exist (R5-02).
 *
 * `file` is the caller's filename, THREADED THROUGH rather than invented (R6-02): the
 * refusal must blame the file the caller was working on. A direct call has no caller
 * context, so the default names the store — which is at least true, and is why this is
 * a defaulted parameter rather than an omitted one.
 */
export function realpathOrNull(target, file = 'brains') {
  try {
    return realpathImpl(target);
  } catch (err) {
    // ONLY ENOENT IS ABSENCE. Every other resolution failure used to become `null`
    // here, and `containedPath` reads `null` as "cannot check" and SKIPS real-path
    // containment entirely — a guard that switches itself off on an error it did not
    // anticipate. Astra round 5 drove this with an injected EACCES and measured the
    // read proceeding with no damage. EACCES/EPERM/ELOOP/ENOTDIR are faults.
    //
    // THE TEST IS AN OPTIONAL CHAIN (R6-02). `err && err.code === 'ENOENT'` happens to
    // refuse a falsy throw too, but by inversion rather than by intent — the same
    // expression shape is WRONG one function up in `brainsStore`, where the sense is
    // reversed. Write the absence test the same way in both places so neither has to
    // be reasoned about separately.
    if (err?.code === 'ENOENT') return null;
    throw damaged(
      `'${target}' exists but its real path could not be resolved`
        + `${err?.code ? ` (${err.code})` : ''}`,
      file,
    );
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
 * THE ONE COMBINATION THAT IS NOT ABSENCE. A target that RESOLVED while the root did
 * not is refused, because that is not two absences agreeing — it is a target the store
 * cannot account for (R6-02). Every refusal here names a file: `brains` when the store
 * root is the subject, otherwise the caller's own filename, which is why `file` is a
 * required parameter rather than an optional one.
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
  const real = realpathOrNull(target, file);
  // A TARGET THAT RESOLVED CANNOT BE AUTHORIZED AGAINST A ROOT THAT DID NOT (R6-02).
  // `brainsStore` returns `realRoot: null` only when the root is absent, and the old
  // condition required BOTH non-null — so the one combination where skipping means the
  // check never ran for a target that DOES exist was the one combination it skipped.
  // The both-absent case is still not a fault: `real === null` short-circuits first.
  if (real !== null && realRoot === null) {
    throw damaged(`${what} resolves but the brains store root did not`, 'brains');
  }
  if (real !== null && !inside(realRoot, real)) {
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
