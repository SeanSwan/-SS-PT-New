#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/journal-ownership.test.mjs
 * PURPOSE: Lock the OWNERSHIP rules the A1-06 repair introduced into
 *          `writeRunJournal` / `finalizeRunJournal` — including the one that
 *          exists only to stop the repair itself from deadlocking the journal.
 * PART OF: Creator Brains — SS-PT acquisition engine (A1-06 repair)
 * ADDED: 2026-09-21
 * ============================================================================
 *
 * WHY THIS FILE IS SEPARATE FROM THE GATE.
 *
 *   `journal-preservation.test.mjs` is the GATE: it proves the defect A1-06
 *   named is gone, and it is cited as slice evidence for S3 and S4. This file is
 *   different in kind — it pins the behaviour of the FIX, so a later refactor
 *   cannot quietly drop a guard and still show a green gate. It is a sibling
 *   rather than an addition because the gate file is at 286 lines against the
 *   300-line cap (rule 4), and a gate whose evidence is diluted by unit tests of
 *   its own repair is a worse gate.
 *
 * THE RULE BEING PINNED: the journal is a SINGLE SLOT, owned by the run that
 * holds the store.
 *
 *   1. An open declines to erase another run's STILL-OPEN entry. This is the
 *      A1-06 lost update — a second runner erased the first's entry outright,
 *      and no console mutex can see an external runner.
 *   2. An open DOES replace a CLOSED entry. Sequential runs must keep working;
 *      a guard that also blocked this would make the journal write-once.
 *   3. The lock holder may CLAIM the slot. This one is not politeness — it is
 *      the counterweight to (1). Without it, a journal left `running` by a
 *      CRASHED run would block every later run from opening its own entry, and
 *      the store would name the dead run forever. Rule (1) CREATES that hazard,
 *      so the repair is only correct with both halves.
 *   4. Finalize is a compare-and-swap on `runId`. A run refused by the lock
 *      still reaches `conclude()`, and must not stamp its failure over the
 *      holder's entry.
 *
 * Each test states the defect it would catch, because a test whose name says
 * only what it does tells the next reader nothing about why it may not be
 * deleted.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { writeFileSync } from 'node:fs';

import { tempRoot } from './helpers.mjs';
import { paths } from '../lib/paths.mjs';
import {
  ensureStore, writeRunJournal, finalizeRunJournal, readRunJournal,
} from '../lib/store.mjs';

const FROZEN = '2026-09-21T10:00:00Z';

const store = (tag) => {
  const r = tempRoot(`cb-jo-${tag}`);
  ensureStore(r);
  return r;
};

/** Put a journal on disk directly, so the thing under test is never also the
 *  thing that arranged the precondition. */
const put = (r, entry) => writeFileSync(
  paths(r).journal,
  JSON.stringify({ startedAt: FROZEN, pid: 1, selection: null, phases: 'all', heartbeats: 0, ...entry }, null, 2),
  'utf-8',
);

const openEntry = (runId) => ({
  runId, startedAt: FROZEN, pid: process.pid, selection: null, phases: 'all',
});

/* ── 1. the lost update A1-06 named ───────────────────────────────────────── */

test('O1 an open does NOT erase another run\'s still-open entry', () => {
  const r = store('foreign-open');
  put(r, { status: 'running', runId: 'HOLDER' });

  const result = writeRunJournal(r, openEntry('INTRUDER'));

  assert.equal(result, null, 'the write reports that it declined, rather than silently no-op');
  const after = readRunJournal(r);
  assert.equal(after.runId, 'HOLDER',
    `a second runner erased the holder's open entry (journal now names '${after.runId}') — this is the A1-06 lost update`);
  assert.equal(after.status, 'running', 'and left it open, not closed on its behalf');
});

/* ── 2. the regression the guard could have caused ────────────────────────── */

test('O2 an open DOES replace a CLOSED entry — the journal is not write-once', () => {
  const r = store('closed-prior');
  put(r, { status: 'completed', runId: 'YESTERDAY', ok: true, endedAt: FROZEN });

  assert.notEqual(writeRunJournal(r, openEntry('TODAY')), null, 'the write proceeded');
  const after = readRunJournal(r);
  assert.equal(after.runId, 'TODAY',
    'a finished run must not hold the slot against the next run — that would make the journal write-once');
  assert.equal(after.status, 'running');
});

test('O3 an open proceeds when the slot is EMPTY', () => {
  const r = store('empty');
  assert.equal(readRunJournal(r), null, 'precondition: no journal yet');

  assert.notEqual(writeRunJournal(r, openEntry('FIRST')), null);
  assert.equal(readRunJournal(r).runId, 'FIRST');
});

test('O4 re-opening the SAME runId is allowed — an open is idempotent', () => {
  const r = store('same-run');
  put(r, { status: 'running', runId: 'ME' });

  // `run.mjs` opens at step 0 and the lock holder claims again after the lock.
  // If the guard keyed on "an entry exists" rather than "a DIFFERENT run's entry
  // exists", the holder would be locked out of its own slot.
  assert.notEqual(writeRunJournal(r, openEntry('ME')), null, 'a run may re-open its own entry');
  assert.equal(readRunJournal(r).runId, 'ME');
});

/* ── 3. the counterweight: without this, rule O1 deadlocks the journal ────── */

test('O5 the lock holder CLAIMS the slot over a crashed run\'s open entry', () => {
  const r = store('crashed-prior');
  // A run died without finalizing. Its entry is `running` forever, and O1 would
  // now keep every later run out of the journal permanently.
  put(r, { status: 'running', runId: 'CRASHED-YESTERDAY' });

  // Un-claimed: correctly declines, because from here it is indistinguishable
  // from a live foreign run.
  assert.equal(writeRunJournal(r, openEntry('TODAY')), null,
    'without the lock, a stale open entry is indistinguishable from a live one');
  assert.equal(readRunJournal(r).runId, 'CRASHED-YESTERDAY');

  // Claimed: the caller has won the lock, which is the proof of ownership.
  assert.notEqual(writeRunJournal(r, openEntry('TODAY'), { claim: true }), null);
  const after = readRunJournal(r);
  assert.equal(after.runId, 'TODAY',
    'a lock holder must be able to take the slot, or a crashed run owns the journal forever');
  assert.equal(after.status, 'running');
});

/* ── 4. finalize is a compare-and-swap, not a read-modify-write ───────────── */

test('O6 finalize refuses to close an entry belonging to another run', () => {
  const r = store('finalize-foreign');
  put(r, { status: 'running', runId: 'HOLDER' });

  const result = finalizeRunJournal(r, { runId: 'REFUSED', endedAt: FROZEN, ok: false });

  assert.equal(result, null, 'finalize reports that it declined');
  const after = readRunJournal(r);
  assert.equal(after.runId, 'HOLDER',
    'a refused run stamped its failure over the holder — the operator-visible half of A1-06');
  assert.equal(after.status, 'running', 'and the holder\'s run was reported as failed while it was still running');
});

test('O7 finalize DOES close the entry this run opened', () => {
  const r = store('finalize-own');
  put(r, { status: 'running', runId: 'MINE' });

  assert.notEqual(finalizeRunJournal(r, { runId: 'MINE', endedAt: FROZEN, ok: true }), null);
  const after = readRunJournal(r);
  assert.equal(after.status, 'completed');
  assert.equal(after.ok, true);
  assert.equal(after.endedAt, FROZEN);
  assert.equal(after.startedAt, FROZEN, 'and the fields the open recorded survive the close');
});

test('O8 finalize adopts a slot with NO runId — an entry from before this contract', () => {
  const r = store('finalize-legacy');
  // A journal written by an older build, or a partial write with no runId. The
  // CAS must not strand it: an entry nobody claims is finalizable, otherwise the
  // store would keep a permanently-open journal it can never close.
  put(r, { status: 'running' });

  assert.notEqual(finalizeRunJournal(r, { runId: 'ADOPTER', endedAt: FROZEN, ok: false }), null);
  const after = readRunJournal(r);
  assert.equal(after.runId, 'ADOPTER');
  assert.equal(after.status, 'failed');
});

/* ── 4. D8: the paths that wrote the journal WITHOUT consulting ownership ──── */

test('O9 the RESTORE path puts a displaced finished entry back', () => {
  const r = store('restore-displaced');
  // The run opened at step 0 over a finished entry (O2 allows that), then lost
  // the lock. What it displaced must come back, or the holder's last verdict is
  // gone and the journal names a run that was refused.
  put(r, { status: 'completed', runId: 'HOLDER', ok: true, endedAt: FROZEN });

  const opened = writeRunJournal(r, openEntry('REFUSED'));
  assert.notEqual(opened, null, 'the open proceeded — O2 requires it to');
  assert.equal(opened.displaced.runId, 'HOLDER', 'and it reports exactly what it displaced');
  assert.equal(readRunJournal(r).runId, 'REFUSED', 'precondition: the slot is now the refused run\'s');

  const restored = finalizeRunJournal(r, {
    runId: 'REFUSED', ok: false, endedAt: FROZEN, restore: opened.displaced,
  });

  assert.notEqual(restored, null);
  const after = readRunJournal(r);
  assert.equal(after.runId, 'HOLDER',
    `a refused run was the journal's last word (now '${after.runId}') — the holder's verdict was erased by an open that had no right to it`);
  assert.equal(after.ok, true, 'and the holder\'s success is not downgraded to the refusal\'s failure');
  assert.equal(after.status, 'completed');
});

test('O10 the RESTORE path declines if the slot moved on — no stale overwrite', () => {
  const r = store('restore-raced');
  put(r, { status: 'completed', runId: 'HOLDER', ok: true });

  const opened = writeRunJournal(r, openEntry('REFUSED'));
  // Something else became the owner after our open. Putting our snapshot back
  // now would be a FRESH lost update, not a repair.
  put(r, { status: 'running', runId: 'A-NEWER-OWNER' });

  const result = finalizeRunJournal(r, {
    runId: 'REFUSED', ok: false, endedAt: FROZEN, restore: opened.displaced,
  });

  assert.equal(result, null, 'the restore declined');
  assert.equal(readRunJournal(r).runId, 'A-NEWER-OWNER', 'the newer owner was not clobbered by a stale snapshot');

  // HONEST LIMIT (measured, not assumed): this case does NOT go red when the
  // restore block is deleted. The generic guard further down
  // (`prior.runId !== record.runId`) returns null here for the same reason, so
  // the observable outcome is identical and the mutation is invisible from
  // outside. It is kept as a specification of the intended behaviour, NOT cited
  // as proof that the restore guard exists. O9 is the case that discriminates;
  // the restore-guard mutation was verified against O9 only.
});

test('O11 a CLAIMING open reports nothing displaced — the holder owns the slot outright', () => {
  const r = store('claim-displaced');
  put(r, { status: 'running', runId: 'CRASHED' });

  const opened = writeRunJournal(r, openEntry('NEW-HOLDER'), { claim: true });

  assert.notEqual(opened, null);
  assert.equal(opened.displaced, null,
    'the lock holder is the owner, so there is nothing to restore — restoring the crashed run would wedge the store');
  assert.equal(readRunJournal(r).runId, 'NEW-HOLDER');
});

test('O12 the STARTUP-OUTCOME path respects ownership — it used to bypass it', async () => {
  const r = store('startup-bypass');
  // A live holder owns the slot. A startup outcome is the MOST COMMON writer in
  // the system (every startup refusal, every no-op), and it used to write the
  // journal with a raw `writeJsonAtomic` — no lock check, no runId comparison.
  // Measured end-to-end: a completed `HOLDER-REAL` entry was replaced outright.
  put(r, { status: 'running', runId: 'HOLDER-REAL', ok: false, endedAt: null });

  const { recordStartupOutcome } = await import('../run-daily.mjs');
  recordStartupOutcome(r, { kind: 'no-op', reason: 'synthetic — no enabled creators' });

  const after = readRunJournal(r);
  assert.equal(after.runId, 'HOLDER-REAL',
    `a startup outcome erased a live holder's entry (journal now names '${after.runId}') — it must go through writeRunJournal, not around it`);
  assert.equal(after.status, 'running', 'and left it open rather than closing it on the holder\'s behalf');
});
