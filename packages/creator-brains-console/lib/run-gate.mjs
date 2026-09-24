/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/run-gate.mjs
 * PURPOSE: THE run-operation exclusion gate. One implementation, used by every
 *          console operation that reaches the engine's `runDaily`.
 * PART OF: Creator Brains Console (blueprint 05 §2b, 08 slices S3 + S4)
 * ADDED: 2026-09-21 (S4)
 * ============================================================================
 *
 * WHY THIS IS A MODULE AND NOT A PARAGRAPH IN TWO HANDLERS.
 *
 * `05 §2b` states it as a rule: "THE RUN-OPERATION EXCLUSION GATE COVERS BOTH
 * ROWS (A1-06). Repair invokes the same `runDaily` journal path, so gating
 * `POST /api/run/daily` alone would leave the journal reachable through the
 * other door. Both routes take the same exclusion." `19 §4` widens that to a
 * ship gate on S3 AND S4 together.
 *
 * Two handlers that each "take the exclusion" are two implementations that can
 * drift — and the drift is invisible, because each one looks right on its own.
 * This was `repair.mjs`'s internal preamble until S4 needed the identical thing;
 * lifting it here means **there is one call site**, so "both doors take the same
 * gate" is a property of the code rather than a promise in a document. If a third
 * operation ever reaches `runDaily`, it takes this gate or it is visibly not
 * taking it.
 *
 * ── WHY THE PURE READ COMES FIRST, AND WHY THAT IS THE WHOLE POINT ──────────
 *
 * `runDaily` writes the run journal FIRST (`lib/run.mjs:107`, the HR16 block:
 * "JOURNAL, BEFORE ANYTHING CAN FAIL") and only THEN attempts the engine lock
 * (`:154`, HR14). So by the time the engine discovers the store is locked, it has
 * already written a journal entry. `05 §2b` states this directly:
 *
 *   "409 RUN_LOCKED IS A REFUSAL OF THE RUN, NOT PROOF THE STORE IS UNTOUCHED."
 *
 * A handler that called `runDaily` and translated its `store is locked` verdict
 * into a 409 would be reporting a refusal over a store it had just written to.
 * The honest sequence is:
 *
 *   1. `lockStatus(r)` — a PURE read, no side effect. If held, refuse here with
 *      409 and the holder named. Nothing has been written.
 *   2. `withLock(r, …)` — take the engine's own mutex, so the window between (1)
 *      and the engine's own check is closed by the SAME lock the CLI honours.
 *   3. enter the engine.
 *
 * Between (1) and (2) another process could still take the lock; `withLock`
 * closes that by refusing rather than waiting, and its refusal is the same 409.
 * What (1) buys is that the COMMON case — a run already in progress — never
 * reaches the journal write at all.
 *
 * ── ⚠️ THIS DOES NOT FIX A1-06, AND MUST NOT BE RECORDED AS FIXING IT ───────
 *
 * The gate narrows the window **for this client only**. It cannot cover an
 * external runner: the CLI, a scheduled task, or a second machine against a
 * synced store. That residual — a refused run still truncating the shared
 * journal — is the engine-owned defect the A1-06 gate
 * (`scripts/creator-brains/test/journal-preservation.test.mjs`) measures.
 *
 * HISTORICAL, and deliberately dated (Astra round 1, P3): at the revision
 * `cf2e5ca9d` the engine repair landed and the journal slot became owned by the
 * lock holder, and that gate turned green. **Do not read a green gate here as a
 * statement about the current tree** — it is a claim about a revision. To check
 * the present, run the gate. And do not cite this file as its fix: this module
 * takes exclusion, it does not repair journal ownership.
 *
 * ── ⚠️ AND IT DOES NOT CLOSE THE SPAWN HANDOFF — THAT IS A SEPARATE MECHANISM ─
 *
 * Step (2) holds the engine mutex only until the SPAWN RETURNS. The child does
 * not take the store until `scripts/creator-brains/lib/run.mjs:154`, an
 * arbitrary interval later, so for that interval the store is held by nobody as
 * far as this gate can see, and a second request would pass (1) and be released
 * by (2) before the first child acquired anything.
 *
 * ✅ **CLOSED 2026-09-22, and NOT by this file** — which is exactly why the
 * boundary is worth restating. It is closed by `lib/run-reservation.mjs`: a
 * console-side reservation taken BEFORE this gate, outliving the 202, and
 * released on EVIDENCE that the child owns the store (`GET /api/run` showing a
 * new journal id or a held lock) or by a 60 s safety valve. Astra round 1's
 * prescription verbatim: *"Use a console operation reservation covering pending
 * startup and execution. Let the child acquire the engine lock once, and
 * acknowledge acquisition or refusal over IPC. Return acceptance asynchronously
 * without releasing the reservation prematurely."*
 *
 * The split of responsibility is the point: THIS module still does not close the
 * handoff, and must not be cited as doing so. Everything above about the pure
 * read and the mutex remains true and is unchanged.
 *
 * ── ✅ BUT THE OTHER HALF OF D2 IS CLOSED HERE, AND IT WAS WORSE (P1b) ───────
 *
 * `underRunGate` hands `fn` the lock it took, and the operation must FORWARD
 * that handle to the engine (`runDaily({ acquiredLock })`). It previously did
 * not: repair called `runDaily` bare, the engine called `acquireLock` against a
 * lock this same process already held, and refused ITSELF. Because the engine's
 * lock is cross-process and not reentrant, that failure was not occasional — it
 * was EVERY console repair. Measured on the real engine: the run record reads
 * `ok=false, lock:FAIL(store is locked (lock_held))` while `repairStore`
 * returned a well-formed `{repaired:0,built:0,emptied:0}` — a success-shaped
 * response for work that never happened.
 *
 * `fn`'s signature is unchanged (it still takes no arguments), so a future
 * operation that ignores the handle cannot silently break: it would simply
 * self-refuse again, which the repair test now catches.
 *
 * @module creator-brains-console/lib/run-gate
 */

import { lockStatus, withLock } from '../../../scripts/creator-brains/lib/lock.mjs';
import { ApiError, CODE } from './errors.mjs';

/**
 * A lock holder described the way the error envelope expects it.
 *
 * `holder` is the engine's own object, passed through rather than reformatted:
 * "a refusal is the engine's sentence" (the honesty rule this project has burned
 * itself on), and a console that paraphrased it would discard the one detail —
 * pid/host — that tells the operator what to do.
 */
export function lockedError(lock) {
  const holder = (lock && lock.holder) || { unreadable: true };
  const who = holder.pid ? `pid ${holder.pid}${holder.host ? ` on ${holder.host}` : ''}` : 'an unreadable holder';
  return new ApiError(
    CODE.RUN_LOCKED,
    `store is locked by another run (${lock && lock.reason ? lock.reason : 'lock_held'}, ${who})`,
    { holder },
  );
}

/** Translate a `lockStatus` reading into the refusal it implies, or null. */
export function heldRefusal(status) {
  if (!status || !status.held) return null;
  return lockedError({
    reason: status.ambiguous ? 'lock_ambiguous' : 'lock_held',
    holder: status.ambiguous ? { unreadable: true } : status,
  });
}

/**
 * Take THE gate: pure read, then the engine's own mutex, then run `fn`.
 *
 * `fn` is called while the mutex is held and **receives the acquired lock
 * handle**. A caller that reaches the engine must FORWARD that handle
 * (`runDaily({ acquiredLock: lock })`, D2/P1b) rather than letting the engine
 * acquire a second one: the engine's lock is cross-process and NOT reentrant,
 * so a second acquisition in the same process is a self-refusal. Passing the
 * handle through is also what makes the journal claim happen — the engine only
 * claims under a lock it can see, and `lock:false` would skip the claim.
 *
 * A busy store is refused with the same 409 both doors produce — never queued,
 * because a run waiting behind a scheduled run is how a store gets two writers
 * and a stale map.
 *
 * @param {string} r                       store root
 * @param {Function} fn                    async (lock) => result, run under the mutex
 * @param {object}  [gate]                 injected lock functions (tests)
 * @returns {Promise<any>}
 * @throws {ApiError} RUN_LOCKED (409) with the holder named
 */
export async function underRunGate(r, fn, { gate = { lockStatus, withLock } } = {}) {
  const refusal = heldRefusal(gate.lockStatus(r));
  if (refusal) throw refusal;
  return gate.withLock(r, fn, { onBusy: (lock) => ({ __locked: true, lock }) })
    .then((out) => {
      if (out && out.__locked) throw lockedError(out.lock);
      return out;
    });
}
