#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/run-journal.mjs
 * PURPOSE: The run journal — a single slot recording the run that owns the
 *          store, and the ONLY writer allowed to open or close it.
 * PART OF: Creator Brains — SS-PT acquisition engine (A1-06)
 * ADDED: 2026-09-21 | EXTRACTED from store.mjs 2026-09-21
 * ============================================================================
 *
 * WHY THIS IS ITS OWN FILE (and not more lines in store.mjs):
 *
 *   The A1-06 ownership repair added ~51 lines to `store.mjs`, which pushed it
 *   to 323 and over rule 4's 300-line cap. The cap is not raised and the
 *   comments are not golfed — the journal is extracted at its own seam. It has
 *   a self-contained contract (one slot, three verbs, ownership keyed on
 *   `runId`), every consumer already reaches it through the store barrel, and
 *   nothing else in store.mjs shares its state. `store.mjs` re-exports these
 *   three names so no import site changed.
 *
 * @module creator-brains/run-journal
 */

import { paths, readJson, writeJsonAtomic } from './paths.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// Run journal (review HR16)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Open a journal entry for a run BEFORE anything can fail.
 *
 *   A run that never reached the phase wrapper used to leave no trace at all:
 *   missing yt-dlp exited 2 with no run record and no digest, and
 *   "no enabled creators" returned before recording. A reader then could not
 *   distinguish "nothing to do" from "the job has not run in three weeks".
 *   The journal is written first and finalized last, so an INTERRUPTED run is
 *   visible as an open journal rather than as silence.
 *
 * OWNERSHIP (A1-06). The journal is a SINGLE SLOT, and the slot belongs to the
 * run that holds the store. `writeJsonAtomic` renames a pid-unique temp file, so
 * the file is never torn or interleaved — which is exactly why "it still parses"
 * was never evidence of preservation. The failure is a LOST UPDATE: a second
 * runner's open erased the first's entry outright, and no console mutex can see
 * an external runner (the CLI, a scheduled task, a second machine on a synced
 * store). So an open refuses to overwrite another run's STILL-OPEN entry.
 *
 * `opts.claim` is the lock holder's override, and it is not optional politeness:
 * without it, a journal left `running` by a CRASHED run would block every later
 * run from ever opening its own entry, and the store would name the dead run
 * forever. A run that holds the lock has demonstrably won the store, so it may
 * take the slot. Only call it AFTER `acquireLock` returns ok.
 */
export function writeRunJournal(r, entry, opts = {}) {
  const journal = paths(r).journal;
  const prior = readJson(journal, null);
  if (!opts.claim) {
    // ── GUARD: ANOTHER RUN'S STILL-OPEN ENTRY IS NOT OURS TO ERASE ──────────
    //
    //   Deliberately narrow, and the narrowness is load-bearing — see test O2
    //   in `test/journal-ownership.test.mjs`: a FINISHED prior entry MUST be
    //   replaceable, or the journal becomes write-once and no later run could
    //   ever open its own slot.
    //
    //   ⚠️ THE COST OF THAT, RECORDED SO IT IS NOT MISTAKEN FOR SAFETY (D8):
    //
    //   A run that opens at step 0 and is THEN refused by the lock has already
    //   erased a finished foreign entry — the ordinary end state of nearly
    //   every journal. Measured end-to-end against a temp store: seed a real
    //   run, hold the lock with a live pid, run again, and the journal names
    //   the refused run while the holder's verdict is gone.
    //
    //   The guard cannot fix that: at open time the caller does not yet know
    //   whether it will win the lock, so refusing here would break O2 for every
    //   legitimate run. The repair therefore belongs on the REFUSAL path, which
    //   is the only place that knows the lock was lost. `run.mjs` passes the
    //   entry it displaced as `restore`; see `finalizeRunJournal`.
    const foreignAndOpen = prior
      && prior.status === 'running'
      && prior.runId
      && prior.runId !== entry.runId;
    if (foreignAndOpen) return null;
  }
  const written = writeJsonAtomic(journal, {
    status: 'running',
    ...entry,
    heartbeats: 0,
  });
  // The caller needs the displaced entry to undo its own open if the lock is
  // later refused. Returned rather than re-read, so a concurrent write cannot
  // substitute a different prior between write and read.
  return written === null ? null : { written, displaced: opts.claim ? null : prior };
}

/**
 * Close the journal entry THIS run opened — and only that one (A1-06).
 *
 *   A run REFUSED by the lock still reaches `conclude()`, which finalizes. It
 *   used to read the current journal and write it back with its own runId and
 *   `status:'failed'`, stamping a failure over the entry of the run that holds
 *   the store. Measured through the console's own reader that is operator-
 *   visible: while a scheduled run is in flight the console reported
 *   `lastRun {status:'failed', runId:'REFUSED-REPAIR'}` — naming a run that
 *   never happened and erasing the one that was succeeding.
 *
 * The guard matches on `runId`, not on the lock: finalize runs on the refusal
 * path precisely BECAUSE the lock was not held, so asking "do I hold the lock"
 * would refuse the legitimate holder too.
 *
 * ── ⚠️ THIS GUARD IS NOT ATOMIC. IT WAS CALLED ONE, AND THAT WAS WRONG ──────
 *
 * This used to say "the guard is a compare-and-swap on `runId`". It is not.
 * `readJson` at `:91`, the comparison at `:93` and the write at `:94` are three
 * separate steps — check-then-act, not compare-and-swap. A true CAS would need
 * a single atomic read-compare-write, which this does not have. The name
 * invited a reader to believe the window was closed. It is not.
 *
 * What actually closes the practical window is the OWNERSHIP rule at
 * `writeRunJournal` (an open declines to erase a different run's live entry)
 * plus the lock holder CLAIMING the slot in `run.mjs` right after
 * `acquireLock`. This function is the second half of that pair, and it is safe
 * only in combination with it.
 *
 * The residual window this leaves — a run that opens the journal BEFORE it
 * knows it lost the lock — is not a defect here. It is the same interval as
 * the spawn handoff gap, which is filed as **D2** in
 * `Z:/HostileReviews/2026-09-21-230718-…-round-3-the.md` and is escalated to
 * the operator, not fixed. Do not re-file it as a second bug.
 */
export function finalizeRunJournal(r, record) {
  try {
    const journal = paths(r).journal;
    const prior = readJson(journal, null) || {};

    // ── D8: A REFUSED RUN RESTORES WHAT ITS OWN OPEN DISPLACED ──────────────
    //
    //   Reached only from the lock-refusal path, where `run.mjs` passes the
    //   entry its step-0 open displaced. The run never owned the store, so the
    //   holder's verdict — which the open erased, because a FINISHED foreign
    //   entry is deliberately replaceable (O2) — goes back exactly as it was.
    //
    //   Guarded on the slot still naming THIS refused run: if anything else has
    //   written in the meantime, that writer is the current owner and restoring
    //   a stale snapshot over it would be a fresh lost update, not a repair.
    //
    //   `endedAt` and `ok` describe the refused attempt and are recorded in the
    //   run record and the digest. They do not belong in the holder's entry.
    if (record.restore) {
      if (prior.runId && prior.runId !== record.runId) return null;
      return writeJsonAtomic(journal, record.restore);
    }

    // Someone else's entry. Leave it exactly as it stands.
    if (prior.runId && prior.runId !== record.runId) return null;
    return writeJsonAtomic(journal, {
      ...prior,
      status: record.ok ? 'completed' : 'failed',
      runId: record.runId,
      endedAt: record.endedAt,
      ok: record.ok,
    });
  } catch {
    return null;
  }
}

export function readRunJournal(r) {
  return readJson(paths(r).journal, null);
}
