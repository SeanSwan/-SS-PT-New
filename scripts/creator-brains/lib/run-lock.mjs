#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/run-lock.mjs
 * PURPOSE: How a run comes to own the store — and how it comes to the journal
 *          slot under that ownership.
 * PART OF: Creator Brains — SS-PT acquisition engine (D2/P1b, A1-06)
 * ADDED: 2026-09-22
 * ============================================================================
 *
 * EXTRACTED FROM `run.mjs` AT THE SEAM, NOT TRIMMED TO FIT (Rule 4).
 *
 * The lock block grew a second legitimate path (reuse an already-acquired
 * handle) and the reasoning for it is longer than the code — that is the norm in
 * this file's neighbourhood, where `lock.mjs`'s own header explains a rename-vs-
 * unlink decision at length. When the parent hit the 300-line cap, the choice
 * was to extract a coherent unit or to line-golf the comments. Rule 4 says
 * extract, and Rule 4 is right here for a reason beyond the number: "acquire or
 * reuse, then claim the journal under it" is ONE idea with ONE ordering
 * constraint, and it now lives in one place instead of being read off the middle
 * of a 330-line function.
 *
 * ── THE ORDERING IS THE WHOLE POINT, AND GETTING IT BACKWARDS IS THE A1-06 BUG ─
 *
 * `run.mjs` opens the journal at step 0 — BEFORE anything can fail (HR16) — and
 * only then attempts the lock (HR14). That ordering is deliberate: a run that
 * could not start must still leave a trace. The cost is that the step-0 open is
 * NON-DESTRUCTIVE (it declines to erase another run's still-open entry), which
 * leaves exactly one hole: a journal left `running` by a run that CRASHED would
 * keep every later run out of its own slot forever.
 *
 * Winning the lock is the proof of ownership that closes the hole, so the CLAIM
 * happens here, under the lock, and nowhere else.
 *
 * ── WHY `acquiredLock` EXISTS, AND WHY NOT `lock:false` (D2/P1b) ─────────────
 *
 * `acquireLock` is a CROSS-PROCESS mutex and is NOT reentrant. The console gate
 * (`packages/creator-brains-console/lib/run-gate.mjs`) takes it and then calls
 * the engine, so an engine that acquired a second time was asking for a lock its
 * own process already held: it reported `lock_held` and the run refused ITSELF.
 * That was every console repair, measured on the real engine —
 * `ok=false, lock:FAIL(store is locked (lock_held))` — while `repairStore`
 * returned a well-formed success-shaped result.
 *
 * The tempting repair is `runDaily({ lock: false })`. It is WRONG: that branch
 * never claims, so the journal slot stops following the lock and A1-06 returns
 * inside the gate. Astra round 1 states it directly — "Do not substitute
 * `lock:false`; the supplied implementation skips the ownership claim in that
 * mode." Ownership must be REUSED, never skipped.
 *
 * ── THE HANDLE IS VALIDATED, NOT TRUSTED ────────────────────────────────────
 *
 * `acquireLock` returns `{ok:false, ...}` for a refusal as well as `{ok:true}`
 * for a grant. A caller that forwarded the refusal shape would be treated as
 * owning the store, and the run would proceed UNLOCKED while believing it was
 * locked — the worst outcome this file could produce. So `ok === true` is
 * required, and anything else falls through to the ordinary acquire-or-refuse
 * path.
 *
 * @module creator-brains/run-lock
 */

import { acquireLock } from './lock.mjs';
import { writeRunJournal } from './store.mjs';

/**
 * Is this a lock handle this run may reuse?
 *
 * Only `ok === true` counts. See the header: a refusal shape passed through
 * would be read as ownership.
 *
 * @param {object|null} handle
 * @returns {boolean}
 */
export function isReusableLock(handle) {
  return !!handle && handle.ok === true;
}

/**
 * Bring a run to ownership of the store, or say why not.
 *
 * Does NOT release. The caller owns the lifetime, and for a REUSED handle the
 * caller is the one that acquired it — see `shouldRelease` before writing any
 * `finally`.
 *
 * @param {object} opts
 * @param {string}   opts.r              store root
 * @param {string}   opts.runId          this run's id (recorded in the lock body)
 * @param {Function} opts.now            clock
 * @param {boolean}  opts.lock           false to skip acquisition entirely
 * @param {object}   [opts.acquiredLock] a handle from `acquireLock` to reuse
 * @returns {{ ok: true, handle: object, reused: boolean }
 *          | { ok: false, reason: string, holder: object|null }}
 */
export function takeStoreLock({ r, runId, now, lock = true, acquiredLock = null }) {
  if (isReusableLock(acquiredLock)) {
    return { ok: true, handle: acquiredLock, reused: true };
  }

  if (!lock) return { ok: true, handle: null, reused: false };

  const handle = acquireLock(r, { runId, now });
  if (!handle.ok) return { ok: false, reason: handle.reason, holder: handle.holder || null };

  return { ok: true, handle, reused: false };
}

/**
 * Claim the journal slot, now that this run owns the store (A1-06).
 *
 * The `claim: true` flag is the difference between the step-0 OPEN and this
 * CLAIM. The open is non-destructive by design — it must not erase another
 * run's live entry, because it runs before the lock — so it is the claim, made
 * under ownership, that overwrites a slot left `running` by a crashed run. See
 * `writeRunJournal` in `store.mjs` for the guard and its deliberate narrowness.
 *
 * @param {string} r
 * @param {object} opts
 * @param {string} opts.runId
 * @param {object} opts.record        the in-flight run record (for startedAt)
 * @param {string[]|null} opts.onlyCreators
 * @param {string[]|null} opts.only
 */
export function claimRunJournal(r, { runId, record, onlyCreators = null, only = null }) {
  return writeRunJournal(r, {
    runId,
    startedAt: record.startedAt,
    pid: process.pid,
    selection: onlyCreators || null,
    phases: only || 'all',
  }, { claim: true });
}

/**
 * Must this run release the handle at the end?
 *
 * EXACTLY ONCE, AND ONLY WHAT IT ACQUIRED. A reused handle belongs to the
 * caller, which releases it in its own `finally`. Releasing here too is a double
 * release: the second `release()` returns false harmlessly, but if the caller
 * re-acquired in between, the extra call would delete a lock this run never
 * held. `reused` is the discriminator, and it exists so that question is
 * answered by a named function rather than by a comment someone can miss.
 *
 * @param {{ ok: boolean, handle: object|null, reused: boolean }} taken
 * @returns {boolean}
 */
export function shouldRelease(taken) {
  return !!(taken && taken.ok && taken.handle && !taken.reused);
}
