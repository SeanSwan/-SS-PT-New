#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/run-ownership.mjs
 * PURPOSE: The ownership handshake — claim the journal slot under the lock, and
 *          release EXACTLY ONCE at the end.
 * PART OF: Creator Brains — SS-PT acquisition engine (D2/P1b, A1-06, Astra P2)
 * ADDED: 2026-09-22
 * ============================================================================
 *
 * EXTRACTED FROM `run.mjs` AT THE SEAM, NOT TRIMMED TO FIT (Rule 4).
 *
 * `run.mjs` hit EXACTLY 300 lines — the cap, with zero headroom — when the
 * ownership region grew its `try` around the claim write (Astra round 1, P2). Any
 * further change to that file would have had to be shaped net-neutral to fit, which
 * is the distortion the cap is supposed to prevent rather than cause. This is the
 * third extraction from this file for the same reason (`run-lock.mjs`, `passes.mjs`),
 * and the seam named itself: *acquiring ownership, claiming under it, and giving it
 * back* is one idea, and it was spread across the top and the `finally` of a
 * 200-line function.
 *
 * ── THE DEFECT THIS CLOSES, AND WHY IT IS NOT JUST TIDINESS ─────────────────
 *
 * Astra, verbatim: *"acquires the lock and writes the claimed journal before
 * entering the shown `try`"* → *"[LIKELY] a write failure can therefore bypass lock
 * cleanup."*
 *
 * `claimRunJournal` is a STORE WRITE. A full disk, a permission change or a torn
 * JSON write at that line threw with the lock already held and no `finally` in
 * scope, so the store stayed locked until stale-owner reclamation (6 h,
 * `lock.mjs:50`). One failed write stalled every later run for the rest of the
 * day. `withOwnership` is what makes that impossible by construction: the region
 * opens before the first thing that can throw inside it.
 *
 * ── WHY THE CLAIM IS GUARDED BY `held` ──────────────────────────────────────
 *
 * The `held` guard is load-bearing, not defensive. On the `lock:false` path there
 * is no handle, so there is no ownership to claim UNDER — and a claim written
 * without ownership is precisely the A1-06 defect (a journal slot that does not
 * follow the lock). This is why `lock:false` was rejected as the repair for D2/P1b:
 * it would skip this call entirely rather than reusing the handle.
 *
 * ── WHY THE CLAIM IS INJECTABLE, AND WHY THAT IS NOT TEST-SMELL ─────────────
 *
 * `claim` defaults to the real `claimRunJournal`, so every production caller passes
 * nothing and reads exactly the code that ships. The seam exists because the defect
 * this module was written to close is *"the claim write throws and the lock leaks"*,
 * and that is only observable if something is ALLOWED to throw there.
 *
 * The first version of this file had no seam, and its test suite drove a failure
 * from `body` instead. Every case passed — including against a MUTATED build with
 * the claim moved back outside the `try`. The tests were green and vacuous for the
 * one line Astra named. An un-injectable claim cannot be made to fail, and a
 * property whose failure mode cannot be reached is not being tested; it is being
 * asserted about in a comment.
 *
 * @module creator-brains/run-ownership
 */

import { claimRunJournal as realClaim, shouldRelease } from './run-lock.mjs';
import { releaseStore } from './lock-release.mjs';

/**
 * Run `body` as the owner of the store: claim the journal under the lock, run,
 * then release exactly once — whatever happened.
 *
 * @param {object} opts
 * @param {string}   opts.r              store root
 * @param {string}   opts.runId          this run's id
 * @param {object}   opts.record         the in-flight run record (for startedAt)
 * @param {object}   opts.taken          the result of `takeStoreLock`
 * @param {object}   opts.held           the acquired handle, or null
 * @param {string[]|null} opts.onlyCreators
 * @param {string[]|null} opts.only
 * @param {Function} opts.body           async () => result, run under ownership
 * @param {Function} [opts.claim]        the claim write; injected ONLY to make it
 *                                       fail in a test. Defaults to the real one.
 * @returns {Promise<any>}
 */
export async function withOwnership({
  r, runId, record, taken, held, onlyCreators = null, only = null, body, claim = realClaim,
}) {
  try {
    if (held) {
      // A1-06: the journal slot follows the LOCK, not the first writer. Runs on
      // the REUSED path too — that is why `lock:false` was rejected.
      claim(r, { runId, record, onlyCreators, only });
    }
    return await body();
  } finally {
    // D2/P1b: release EXACTLY ONCE, and only what this run acquired. `taken.reused`
    // is the discriminator — see `shouldRelease` in `run-lock.mjs` for why a double
    // release is not the harmless no-op it looks like.
    //
    // F03, FIFTH SITE (G9 hostile review, major 3): this was a bare `held.release()`
    // discarding the boolean, so one exhausted transient budget left the lock on
    // disk under a LIVE pid — wedged, unreclaimable, silent, on the daily run's
    // own path. `releaseStore` retries the whole release a bounded number of
    // times; a still-false verdict surfaces as `record.releaseFailed` (the
    // registry.mjs pattern) and on stderr — never as a refusal, because the
    // body's write has already committed (S1-H9).
    if (shouldRelease(taken)) {
      if (!releaseStore(held)) {
        if (record && typeof record === 'object') record.releaseFailed = true;
        console.error(`[run-ownership] store lock for ${r} may still be held: release exhausted its retries`);
      }
    }
  }
}
