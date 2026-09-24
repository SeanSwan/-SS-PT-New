/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/run-daily.mjs
 * PURPOSE: The daily run operation — spawn the engine's scheduled entry point
 *          under THE shared run-operation exclusion gate.
 * PART OF: Creator Brains Console (blueprint 05 §2b, 08 slice S4)
 * SLICE: S4
 * ============================================================================
 *
 * ── ACCEPTANCE IS NOT COMPLETION (A1-05) ────────────────────────────────────
 *
 * This module starts work and then returns IMMEDIATELY. `19 §1` is explicit:
 *
 *   "The engine's `run-daily.mjs` does not accept a caller-supplied run id, so an
 *    honest `runId` cannot exist at acceptance. The console returns its own
 *    `requestId` immediately, correlates the child process to an engine journal
 *    entry, and uses THAT entry's run id. NEVER TREAT PROCESS EXIT, OR A LOCK
 *    DISAPPEARING, AS SUCCESS."
 *
 * So the response is `202 {requestId, runId: null}`. `runId` is **null** at
 * acceptance and stays null — it is not "the child's pid", not a guessed id, and
 * not the journal's current run id (which may be another run's). The console
 * learns the real run id by polling `GET /api/run` and reading the engine's own
 * journal, and the client correlates through `requestId`.
 *
 * `runId` is declared `string | null` in the contract for exactly this reason:
 * a non-null value here would be a fabricated correlation, which is the failure
 * `19 §1` names.
 *
 * ── WHY THE LOCK IS CHECKED BEFORE SPAWNING (A1-06, same gate as repair) ────
 *
 * `POST /api/run/daily` and `POST /api/repair` take THE SAME gate
 * (`lib/run-gate.mjs`), because both reach `runDaily` and therefore the same
 * journal. The gate's pure `lockStatus` read happens **before the child is
 * spawned**, so the common case — a run already in progress — costs no process
 * at all. See that module's header for the full reasoning; the short version is
 * that `run.mjs:107` writes the journal before it checks the lock at `:154`.
 *
 * ── WHY THE CHILD IS SPAWNED, NOT IMPORTED ─────────────────────────────────
 *
 * The engine's repair path is a function call (`runDaily({only: [...]})`), but
 * the daily run is the **scheduled entry point**: `run-daily.mjs` owns the exit
 * codes a scheduler reads (0 ok · 1 work failed · 2 refused · 3 deferred) and the
 * startup-outcome recording for paths that fail before the engine starts (HR16).
 * Importing `runDaily` here and skipping that wrapper would produce a console run
 * that is *not* the run the scheduler performs, and the console's job is to drive
 * the real thing. So this spawns `run-daily.mjs`, detached, and never reads its
 * stdout for truth (`status.mjs`: "the run's truth is the engine's own files,
 * never stdout").
 *
 * ── VALIDATION BEFORE ANY SIDE EFFECT (05 §2b) ─────────────────────────────
 *
 * `perHour` must be an integer ≥ 1, rejected on BOTH sides ("both client and
 * server" — the contract says so explicitly). This uses the project's EXISTING
 * `validatePerHour` (`lib/errors.mjs:93`), which accepts a numeric string from a
 * query param by design — its docstring says so. A first draft of this module
 * carried a STRICTER local copy that rejected `'3'`; that would have silently
 * narrowed established, tested behaviour on a route that did not exist yet, and
 * it would have looked like hardening. **A second, quieter contract for a field
 * this repo already validates is how the two drift.** One validator, reused.
 *
 * The check runs before the lock and before any spawn, so a bad request leaves
 * the store untouched and no process behind.
 *
 * ── THE CHILD IS TOLD WHICH STORE (Astra round 1, P2) ──────────────────────
 *
 * The gate below reads `lockStatus(r)` and `withLock(r, …)` against **the caller's
 * `r`**, but the first version handed the child nothing but the script and
 * `--per-hour`. `run-daily.mjs:122` resolves its own root as `root()` — which is
 * `explicit || process.env.CREATOR_BRAINS_ROOT || <repo default>` (`paths.mjs:49`)
 * — and the child receives no `explicit`, so **changing `r` did not change which
 * store the child used.** Every gate decision would then be about one store while
 * the run wrote another: the exact "two writers, one store" shape the gate exists
 * to prevent, reached by a configuration mismatch rather than a race.
 *
 * `CREATOR_BRAINS_ROOT` is the wrapper's OWN supported knob — the same one
 * `paths.mjs:22` documents as "the single knob" for pointing the engine at a
 * different store. Propagating through it (rather than inventing a `--root` flag
 * the wrapper does not read) keeps ONE mechanism, so a future CLI change cannot
 * leave the console's spawn quietly on the old path. It is passed on the child's
 * `env` only: `process.env` itself is never mutated, so a bridge serving one
 * store cannot move a test — or a second bridge — serving another.
 *
 * ── A LAUNCH THAT FAILS MUST NOT ANSWER 202 (Astra round 1, P2) ────────────
 *
 * `spawn` does not throw on a bad `cwd`, a missing executable or a permission
 * failure — it emits `'error'` ASYNCHRONOUSLY, on a later tick. With no listener
 * that is an unhandled `'error'` event, which terminates the bridge process; and
 * even without the crash the first version returned its `202 {requestId}` for a
 * child that never started, which is acceptance reported for work that cannot
 * happen. So both listeners are registered IMMEDIATELY after `spawn`, and the
 * handler waits for `'spawn'` — the event Node emits once the process has
 * actually been handed to the OS — before it returns. A launch failure therefore
 * rejects BEFORE the 202, and the caller gets a 500 rather than a request id it
 * can poll forever.
 *
 * What is deliberately NOT awaited is the child's EXIT. Acceptance is still
 * acceptance (A1-05): the run's verdict is the engine's journal, never this
 * process's lifetime — `run-daily.mjs` owns its exit codes precisely so the
 * bridge does not have to. And a request that aborts at the boundary is not a
 * launch failure: a `'spawn'` listener that fires after the client is gone
 * settles an already-settled promise, which is a no-op.
 *
 * @module creator-brains-console/lib/run-daily
 */

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { underRunGate } from './run-gate.mjs';
import { ApiError, CODE, validatePerHour } from './errors.mjs';
// The journal id already in the store, read at reserve time so the reservation
// can tell this child's acknowledgement from a stale entry (D2/P1a).
import { readRunJournal } from '../../../scripts/creator-brains/lib/store.mjs';

/** The engine entry point this spawns. Resolved relative to this file, so the
 *  console cannot drift onto a different script than the scheduler runs. */
export const RUN_DAILY_SCRIPT = fileURLToPath(
  new URL('../../../scripts/creator-brains/run-daily.mjs', import.meta.url),
);

/** The wrapper's own store-routing variable — see `paths.mjs:22`, which calls it
 *  "the single knob". Named here so the spawn site and its tests share one
 *  spelling rather than two literals that can drift. */
export const ROOT_ENV = 'CREATOR_BRAINS_ROOT';

/**
 * Register the two launch listeners, immediately, and resolve when the child has
 * actually started — or reject if it never did.
 *
 * Covers BOTH failure shapes, which is why it does not just await `'spawn'`:
 *
 *   `'error'`   fires if the process could not be handed to the OS at all (bad
 *               cwd, EPERM, ENOENT). Unlistened, it is an unhandled event that
 *               terminates the bridge — so the listener is not optional.
 *   `'exit'`    closing before `'spawn'` is the other way to never start. Without
 *               this the promise would hang and the request would hang with it,
 *               which reads to a client as a slow run rather than a failed one.
 *
 * `settle` and `cleanup` are deliberately separate: the listeners come off on
 * BOTH outcomes (a settled promise must not keep a closure alive for the run's
 * whole lifetime), while resolving is guarded so the later events are inert.
 */
function awaitSpawn(child) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      child.removeListener('spawn', onSpawn);
      child.removeListener('error', onError);
      child.removeListener('exit', onExit);
      fn(arg);
    };
    const onSpawn = () => done(resolve);
    const onError = (err) => done(reject, err);
    const onExit = () => done(reject, new Error('child exited before it started'));

    child.once('spawn', onSpawn);
    child.once('error', onError);
    child.once('exit', onExit);
  });
}

/**
 * Spawn the engine's daily run, detached, and return acceptance.
 *
 * @param {object} opts
 * @param {string}   opts.r                    store root
 * @param {number}   opts.perHour              validated ops/hour budget
 * @param {object}   [opts.gate]               injected lock functions (tests)
 * @param {Function} [opts.spawnFn]            injected spawn (tests)
 * @param {Function} [opts.newRequestId]       injected id source (tests)
 * @returns {Promise<{requestId: string, runId: null}>}
 * @throws {ApiError} VALIDATION (400), RUN_LOCKED (409)
 */
export async function startDailyRun({
  r, perHour, gate, spawnFn = spawn, newRequestId = () => randomUUID(), reservation = null,
} = {}) {
  // (0) VALIDATE BEFORE ANY SIDE EFFECT. A refusal must cost nothing — no lock, no
  // process, no journal. The client validates too; the contract requires both,
  // because a client check is a courtesy and a server check is the boundary.
  const perHourOk = validatePerHour(perHour);

  const requestId = newRequestId();

  // (0b) THE OPERATION RESERVATION, TAKEN BEFORE THE GATE (D2/P1a).
  //
  // The gate below holds the engine's mutex only until the SPAWN RETURNS, and
  // the child does not own the store until `run.mjs:154`. In that interval the
  // store is held by nobody, so a second request would pass the gate's pure read
  // and spawn too. Measured: two requests, two children, one store. The
  // reservation spans that interval and outlives the 202 below.
  //
  // Taken BEFORE the gate on purpose: if it were taken inside, a request that
  // lost the gate to a genuine lock holder would have reserved and released for
  // nothing — and, worse, the reserve-then-release would be two steps inside an
  // `await`, which is the race this module exists to remove.
  //
  // `seenRunId` is the journal id ALREADY present. The reservation releases on
  // evidence, so it must be able to tell a stale entry from this child's own —
  // otherwise a completed run from yesterday would "acknowledge" instantly and
  // reopen the window. Read here, before the spawn, so it is what was there.
  const before = readRunJournal(r);
  const slot = reservation
    ? reservation.reserve('run/daily', { perHour: perHourOk, seenRunId: (before && before.runId) || null })
    : { ok: true, release() {} };
  if (!slot.ok) {
    throw new ApiError(
      CODE.RUN_LOCKED,
      `an operation is already in flight for this store (${slot.held.op}, ${Math.round((slot.held.ageMs || 0) / 1000)}s ago) — waiting for it to hand off to the engine`,
      { holder: slot.held },
    );
  }

  // (1) THE SHARED GATE, and (2) spawn inside it.
  //
  // The child is spawned WHILE THE MUTEX IS HELD and released when the spawn
  // returns — not when the child exits. That is deliberate and it is the honest
  // reading of the gate's purpose: the mutex excludes *another console operation
  // starting*, and the engine's own cross-process lock (which the child takes at
  // `run.mjs:154`) excludes the child's own work. Holding the console mutex for
  // the child's whole lifetime would mean a repair could not run for twenty
  // minutes, and a console that blocked for twenty minutes would invite an
  // operator to kill it — which is how a store gets two writers.
  try {
    return await underRunGate(r, async () => {
      const child = spawnFn(
        process.execPath,
        [RUN_DAILY_SCRIPT, `--per-hour=${perHourOk}`],
        // detached + no stdio inheritance: the bridge's own lifetime must not
        // decide the run's. `stdio: 'ignore'` is not laziness — the run's truth is
        // the engine's files, and piping the child's output into the bridge would
        // invite a future reader to source the verdict from a stream.
        //
        // `env` carries the ROOT (Astra round 1, P2): without it the child falls
        // back to its own default and the gate below would be guarding a store the
        // run does not write. Spread first so PATH and the Windows system vars
        // survive, then override — never mutate `process.env` itself.
        { detached: true, stdio: 'ignore', windowsHide: true, env: { ...process.env, [ROOT_ENV]: r } },
      );
      // The child is detached, so the bridge is NOT responsible for reaping it, and
      // an `unref` here would let the bridge exit while the run continues — which is
      // correct for a detached job and is the whole point of detaching it.
      if (child && typeof child.unref === 'function') child.unref();

      // A LAUNCH THAT FAILED MUST NOT GET A 202. `spawn` reports failure
      // asynchronously, so acceptance is withheld until the child has actually
      // started. Only the START is awaited — never the exit: acceptance is not
      // completion (A1-05), and the run's verdict is the engine's journal.
      await awaitSpawn(child);

      // ACCEPTANCE, NOT COMPLETION. See the module header: `runId` is null on
      // purpose, and the pid is deliberately NOT returned — a pid is not a run id,
      // and handing one back would invite a client to treat a process as a run.
      return { requestId, runId: null };
    }, { gate });
  } catch (err) {
    // The gate refused (a real holder, or a busy store), or the child never
    // started. Nothing is coming to take the store, so the reservation is not
    // protecting anything and must not be left to time out — that would refuse
    // the next legitimate request for a full timeout window after a successful 409.
    slot.release('refused');
    throw err;
  }
  // NO `finally` RELEASE. That is the whole point: the 202 has been returned and
  // the reservation must SURVIVE it. It is released by evidence —
  // `reservation.noteRun()` on a later `GET /api/run` — or by the safety valve.
}
