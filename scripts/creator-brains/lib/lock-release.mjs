#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/lock-release.mjs
 * PURPOSE: Give the store back — and keep trying when the first attempt fails.
 * PART OF: Creator Brains — SS-PT acquisition engine (F03, Astra hostile r1)
 * ADDED: 2026-09-23
 * ============================================================================
 *
 * ── WHY THIS IS ITS OWN MODULE, AND WHY IT IMPORTS NOTHING ──────────────────
 *
 * `releaseStore` is a LOCK policy, so it belongs to the lock rather than to any
 * one caller — and it is needed by callers that cannot reach `lock.mjs`'s
 * `withLock`, because a synchronous mutation (`setEnabled`) cannot await it.
 * A module with ZERO imports is what lets `registry.mjs` and `subs-apply.mjs`
 * share ONE definition without either reaching through the other; it is also
 * what lets `lock.mjs` itself use it without creating an import cycle.
 *
 * ── THE DEFECT IT CLOSES (F03) ──────────────────────────────────────────────
 *
 * `release()` returns **false** when its deletion retries are exhausted, and the
 * E4 repair deliberately does NOT latch `released` in that case: the SAME handle
 * stays retryable, which is the whole point of that repair. Every call site that
 * wrote `lock.release();` and discarded the boolean made that retryability
 * UNREACHABLE. A fix that is correct and uncallable is not a fix.
 *
 * The failure it guards is specific, and it is not "merely busy". A transient
 * `unlink` failure on Windows — another reader holding the lock file open —
 * exhausts the ~92 ms budget inside `release()`. The lock then stays on disk
 * carrying a **LIVE** pid, and `acquireLock` refuses to reclaim a lock whose
 * owner is alive. The store is not contended, it is WEDGED: every later writer,
 * the daily run included, refuses until a human deletes the file by hand.
 *
 * The retry is not a heuristic. `release()` failing is a transient-condition
 * failure by construction, and the handle was explicitly left retryable for
 * exactly this. Four attempts is bounded, so a genuinely stuck store reports
 * honestly instead of spinning.
 *
 * ── EVERY SITE IS WIRED, INCLUDING THE ASYNC ONE ────────────────────────────
 *
 * Four sites discarded the boolean. All four now call this:
 *
 *   `registry.mjs`   `commitResolvedCreator`  sync — the console's MAIN thread
 *   `registry.mjs`   `setEnabled`             sync — the enable/disable flip
 *   `subs-apply.mjs` `commitSnapshot`         async, but the lock is by hand
 *   `lock.mjs`       `withLock`               async — the console run gate
 *
 * `withLock` is the site that reaches callers this workstream does not edit, so
 * leaving it out would have left the F03 class OPEN on the console's run-gate
 * path while claiming the class closed. Its `finally` retries too.
 *
 * ── WHAT A `false` MEANS TO A CALLER ───────────────────────────────────────
 *
 *   true   the store is provably free.
 *   false  the lock may still be on disk under a live pid. The write itself has
 *          ALREADY COMMITTED, so this must never be reported as a refusal
 *          (S1-H9). Surface it as its own field, or not at all — never as
 *          `{ok:false}`.
 *
 * @module creator-brains/lock-release
 */

/**
 * Release `lock`, retrying the whole `release()` a bounded number of times.
 *
 * @param {{release: () => boolean}} lock a handle from `acquireLock` / `withLock`
 * @returns {boolean} true when the store is provably free
 */
export function releaseStore(lock) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (lock.release()) return true;
  }
  return false;
}
