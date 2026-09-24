/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/repair.mjs
 * PURPOSE: The ops repair operation — delegates to the engine's own repair
 *          path, on the SAME exclusion gate the daily run uses.
 * PART OF: Creator Brains Console (blueprint 05 §2b, 08 slice S3)
 * SLICE: S3
 * ============================================================================
 *
 * WHY REPAIR IS NOT A SECOND RUN, AND MUST NOT BECOME ONE.
 * The engine's `repair` command (`run-commands.mjs:156`) is not a separate
 * mechanism: it calls `runDaily({ only: ['reconcile','build','export'] })`. So
 * anything that can be reached through repair is reachable through the daily
 * run, and vice versa — which is exactly why `05 §2b` records that a gate on
 * `POST /api/run/daily` alone "would leave the journal reachable through the
 * other door". This module takes the SAME gate. There is one gate, not two
 * compatible ones, and that is the whole point of A1-06.
 *
 * ── WHY THE LOCK IS CHECKED HERE, BEFORE CALLING THE ENGINE ─────────────────
 *
 * This is the subtle part, and getting it backwards would produce a console that
 * reports "RUN_LOCKED" *after* damaging the store.
 *
 * `runDaily` writes the run journal FIRST (`lib/run.mjs:107`, the HR16 block:
 * "JOURNAL, BEFORE ANYTHING CAN FAIL") and only THEN attempts the lock
 * (`:154`, HR14). So by the time the engine discovers the store is locked, it has
 * already appended a journal entry. `05 §2b` states this directly:
 *
 *   "409 RUN_LOCKED IS A REFUSAL OF THE RUN, NOT PROOF THE STORE IS UNTOUCHED."
 *
 * A console that called `runDaily` and translated its `store is locked` verdict
 * into a 409 would be reporting a refusal over a store it had just written to.
 * The honest sequence is therefore:
 *
 *   1. `lockStatus(r)` — a PURE read, no side effect. If held, refuse here with
 *      409 and the holder named. Nothing has been written.
 *   2. `withLock(r, …)` — take the engine's own lock, so the window between (1)
 *      and the engine's own check is closed by the same mutex the CLI honours.
 *   3. call the engine's repair path.
 *
 * Between (1) and (2) another process could still take the lock; `withLock`
 * closes that by refusing rather than waiting, and its refusal is the same 409.
 * What (1) buys is that the COMMON case — a run already in progress — never
 * reaches the journal write at all.
 *
 * ── WHY THE RESULT IS PROJECTED, NOT PASSED THROUGH ────────────────────────
 *
 * `runDaily` returns a full run record (phases, counts, notes, secrets-scrubbed
 * config). The console contract declares `{repaired, built, emptied}` and says
 * so explicitly: "a PROJECTED engine result" (`05 §2b`). Passing the record
 * through would leak the engine's internal shape into a browser surface and
 * would make every future engine field a silent contract change. The projection
 * below is total: three fields, each a finite number, defaulting to 0 exactly as
 * the engine's own CLI does when a count is absent.
 *
 * The engine's repair prints `counts.quarantined` too, and it is NOT in the
 * contract. It is deliberately not added here: widening a declared response is a
 * contract change that belongs in `05-contracts.md` first, not in a handler.
 *
 * @module creator-brains-console/lib/repair
 */

import { underRunGate } from './run-gate.mjs';
// Astra round 1, P1a: the raw `runDaily` re-export was REMOVED from
// `run-gate.mjs`. It made the gate module look like the only import site for the
// engine entry point while offering it UNRESTRICTED — an ordinary caller could
// import an apparently-gated function and never take the gate. Repair is the one
// legitimate consumer, so it imports the engine directly here and is visibly
// responsible for forwarding the gate's lock.
import { runDaily } from '../../../scripts/creator-brains/lib/run.mjs';

/** The three counts the contract declares. Absent is 0, matching the engine CLI. */
const PROJECTED = Object.freeze(['repaired', 'built', 'emptied']);

/**
 * Shape a run record into the contract's projected result.
 * @returns {{repaired: number, built: number, emptied: number}}
 */
export function projectRepair(record) {
  const counts = (record && record.counts) || {};
  const out = {};
  for (const k of PROJECTED) {
    const v = counts[k];
    out[k] = Number.isFinite(v) ? v : 0;
  }
  return out;
}

/**
 * Run the engine's repair path under the shared exclusion gate.
 *
 * The gate itself — the pure `lockStatus` read, the engine's own mutex, the 409
 * with the holder named — lives in `run-gate.mjs` since S4 needed the identical
 * thing. It is ONE call site shared with the daily run, not two compatible
 * implementations (see that module's header for why that distinction is the
 * whole of A1-06).
 *
 * @param {object} opts
 * @param {string} opts.r                  store root
 * @param {object} [opts.deps]             engine deps injection (tests)
 * @param {Function} [opts.clock]          engine clock injection (tests)
 * @param {object} [opts.run]              injected `runDaily` (tests)
 * @param {object} [opts.gate]             injected lock functions (tests)
 * @returns {Promise<{repaired:number, built:number, emptied:number}>}
 * @throws {ApiError} RUN_LOCKED (409) with the holder named
 */
export async function repairStore({ r, deps = {}, clock = null, run = runDaily, gate } = {}) {
  const record = await underRunGate(
    r,
    // ── D2/P1b: FORWARD THE GATE'S LOCK INTO THE ENGINE ──────────────────────
    //
    //   `underRunGate` took the store's mutex and hands it to this callback.
    //   The engine must REUSE it, not acquire a second one: `acquireLock` is
    //   cross-process and not reentrant, so a second call from this same
    //   process reports `lock_held` and the engine refuses itself. That is not
    //   a corner case — it is every console repair, and it was measured on the
    //   real engine (`ok=false, lock:FAIL(store is locked (lock_held))`).
    //
    //   NOT `lock: false`. Astra round 1: "the supplied implementation skips the
    //   ownership claim in that mode" — the journal slot would stop following
    //   the lock, reintroducing A1-06 inside the gate. Ownership is taken and
    //   reused, never skipped.
    (lock) => run({ r, deps, clock, only: ['reconcile', 'build', 'export'], acquiredLock: lock }),
    { gate },
  );

  // The engine's repair verdict can also be a refusal from INSIDE runDaily (a
  // bounds refusal, say). Those arrive as a concluded record rather than a throw.
  // Only the lock case is translated by the gate; inventing a code for the rest
  // here would be a second, quieter contract.
  return projectRepair(record);
}
