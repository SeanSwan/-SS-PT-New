/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/run-reservation.mjs
 * PURPOSE: The operation reservation that closes the SPAWN HANDOFF gap (D2/P1a).
 * PART OF: Creator Brains Console (blueprint 05 §2b)
 * ADDED: 2026-09-22 (S4, Astra round 1 P1a)
 * ============================================================================
 *
 * ── THE DEFECT THIS CLOSES, MEASURED ────────────────────────────────────────
 *
 * `underRunGate` holds the engine's mutex from the pure read until the SPAWN
 * RETURNS. The child does not take the store until `run.mjs:154`, tens of
 * milliseconds later. Between those two moments the store is held by NOBODY as
 * far as the console can see, so a second request passes the pure read and is
 * admitted:
 *
 *   first accepted  = {"requestId":"8ce74578-…"}   children so far: 1
 *   second outcome  = {"admitted":true, …}          children spawned: 2
 *
 * Two children then race for one store, separated only by the child-side lock —
 * and the engine writes its journal at `:107` BEFORE it checks that lock at
 * `:154`, so the loser has already written. That is the A1-06 shape, reached
 * through a door the gate cannot see.
 *
 * ── THE FIX ASTRA ASKED FOR, AND HOW EACH PART IS HONOURED ──────────────────
 *
 *   "Use a console operation reservation covering pending startup and
 *    execution."                        → this module: `reserve()` / `held()`.
 *   "Let the child acquire the engine lock once, and acknowledge acquisition or
 *    refusal over IPC."                 → the reservation is released only on
 *                                          EVIDENCE (below), and the child is
 *                                          the only thing that can produce it.
 *   "Return acceptance asynchronously without releasing the reservation
 *    prematurely."                      → `startDailyRun` reserves, returns 202,
 *                                          and the reservation outlives the 202.
 *   "Test both handoff orderings with explicit barriers."
 *                                       → `bridge.handoff.test.mjs`.
 *
 * ── WHY THIS IS NOT A LOCK, AND MUST NOT BE TREATED AS ONE ──────────────────
 *
 * The engine's lock is CROSS-PROCESS and authoritative. This is a single-process
 * admission gate for one bridge — the same scope, deliberately, as
 * `instance.mjs`'s "one bridge per store". It does not protect the store from
 * the CLI or from a second machine, and it must never be cited as if it did. Its
 * only job is to stop THIS console from spawning a second child into the window
 * where the first has not yet taken the store.
 *
 * ── WHY RELEASE IS EVIDENCE-BASED, NOT CLOCK-BASED ──────────────────────────
 *
 * A reservation released on a timer releases too early when the machine is slow
 * (the defect returns) and too late when it is fast (a needless refusal). So it
 * is released on one of three OBSERVABLE facts:
 *
 *   `acknowledged`  `GET /api/run` reports a journal runId this reservation has
 *                   not seen before, or a held lock — the child demonstrably
 *                   owns the store, so the handoff is over.
 *   `refused`       the child reported it could not take the store. Nothing is
 *                   coming, so the reservation is not protecting anything.
 *   `timeout`       the LAST RESORT, and the reason it exists is the crash case:
 *                   a child that dies before acknowledging would otherwise wedge
 *                   the store for every later request. A dead console cannot
 *                   release anything, so a bound is mandatory — the same
 *                   counterweight `run-gate.mjs` names. It is deliberately long
 *                   (default 60 s) because it is a safety valve, not a policy.
 *
 * @module creator-brains-console/lib/run-reservation
 */

/** Long enough that a slow-but-alive child is never cut off; short enough that a
 *  dead one does not wedge the console for a session. See the header. */
export const DEFAULT_HANDOFF_TIMEOUT_MS = 60_000;

/**
 * One reservation slot per bridge.
 *
 * `reserve()` is SYNCHRONOUS and is the check-then-act. It must not straddle an
 * `await`: if it did, two requests could both pass the check before either
 * counted — which is precisely the defect being fixed, one layer up. The same
 * reasoning, and the same shape, as `admission.mjs`'s `admit()`.
 *
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs] override for the safety valve (tests)
 * @param {Function} [opts.now]     clock injection (tests)
 * @returns {{
 *   reserve: (op: string, detail?: object) => ({ ok: true, release: Function } | { ok: false, held: object }),
 *   held: () => object | null,
 *   noteRun: (reading: object) => void,
 * }}
 */
export function createReservation({ timeoutMs = DEFAULT_HANDOFF_TIMEOUT_MS, now = () => Date.now() } = {}) {
  /** The live reservation, or null. A single slot is correct: one store, one operation. */
  let current = null;

  const clear = () => { current = null; };

  return {
    /**
     * Take the slot, or hand back the one that holds it.
     *
     * Synchronous by contract — see the docstring.
     *
     * `seenRunId` MUST be supplied by the caller: it is the journal run id that
     * was already there when this reservation was taken. Without it,
     * `meta.seenRunId` is `undefined`, every journal id looks new, and a stale
     * entry from a previous run releases the reservation on the first
     * `noteRun` — reopening the handoff window with the fix that was meant to
     * close it. A test caught exactly that (`bridge.handoff.test.mjs`, the
     * stale-journal case), which is why this is documented rather than defaulted.
     */
    reserve(op, detail = {}) {
      if (current) return { ok: false, held: { ...current.meta } };

      const meta = { op, startedAt: now(), seenRunId: null, ...detail };
      current = { meta, timer: null };

      // The safety valve. `unref` so a pending reservation never keeps the
      // process alive on its own — a console that will not exit because of a
      // timer is a new problem, not a fix for an old one.
      if (timeoutMs > 0) {
        current.timer = setTimeout(() => {
          // Only clear if it is still OUR reservation. A later one may have
          // replaced it, and clearing that would reopen the handoff.
          if (current && current.meta === meta) {
            current.meta.outcome = 'timeout';
            clear();
          }
        }, timeoutMs);
        if (current.timer && typeof current.timer.unref === 'function') current.timer.unref();
      }

      let released = false;
      return {
        ok: true,
        release(outcome = 'acknowledged') {
          if (released) return false;
          released = true;
          if (current && current.meta === meta) {
            if (current.timer) clearTimeout(current.timer);
            clear();
          }
          return true;
        },
      };
    },

    /** The live reservation's metadata, or null. Read by the refusal message. */
    held() {
      if (!current) return null;
      return { ...current.meta, ageMs: Math.max(0, now() - current.meta.startedAt) };
    },

    /**
     * Evidence from `GET /api/run` that the handoff is over.
     *
     * Called on every run-state read. This is the "acknowledge over IPC" half:
     * the console does not take the child's word for it, it looks at the store
     * and releases when the store shows an owner. A journal entry the
     * reservation has not seen before, or a held lock, is that proof.
     *
     * `seen` records what was already true when the reservation was taken, so a
     * STALE journal from a previous run cannot be mistaken for this child's
     * acknowledgement — that would release the reservation immediately and
     * reopen the exact window being closed.
     */
    noteRun(reading) {
      if (!current) return;
      const journalRunId = reading && reading.journal ? reading.journal.runId : null;
      const lockHeld = !!(reading && reading.lock && reading.lock.held);

      if (lockHeld) {
        if (current.timer) clearTimeout(current.timer);
        current.meta.outcome = 'acknowledged:lock';
        clear();
        return;
      }
      if (journalRunId && journalRunId !== current.meta.seenRunId) {
        if (current.timer) clearTimeout(current.timer);
        current.meta.outcome = 'acknowledged:journal';
        clear();
      }
    },
  };
}
