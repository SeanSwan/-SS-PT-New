/**
 * bridge.repair.realengine.test.mjs — the REAL-engine proof that repair executes (D2/P1b).
 *
 * ── WHY THIS FILE EXISTS, GIVEN `bridge.repair.test.mjs` ALREADY PASSES ─────
 *
 * `bridge.repair.test.mjs` injects `run: async () => ({counts…})`. That is the
 * right way to test the PROJECTION and the gate ORDERING, and it is blind to
 * D2/P1b by construction: an injected `run` never calls `acquireLock`, so it can
 * never discover that the engine refuses itself under the console's own gate.
 *
 * The defect measured on the real engine was:
 *
 *   run record:  ok=false, phases=lock:FAIL(store is locked (lock_held))
 *   console:     {repaired:0, built:0, emptied:0}   ← success-shaped
 *
 * A green suite coexisted with a repair operation that did NOTHING. This is the
 * same lesson A1-06 taught at the journal layer: **a green gate can mean the
 * FIXTURE avoided the defect.** So this file uses the real `runDaily`, against a
 * real temp store, and asserts the engine's own artifacts — never the console's
 * projection, which was the thing that lied.
 *
 * Astra round 1 (P1b): "Add a real-engine repair test proving that repair phases
 * actually execute." This is that test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repairStore } from '../lib/repair.mjs';

/** A fresh empty store. The engine creates what it needs. */
const freshStore = () => mkdtempSync(join(tmpdir(), 'repair-real-'));

/** The engine's own run record — the artifact that cannot be a projection. */
function lastRunRecord(r) {
  const dir = join(r, 'runs');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  assert.ok(files.length > 0, 'the engine wrote no run record at all — repair never reached it');
  return JSON.parse(readFileSync(join(dir, files[files.length - 1]), 'utf-8'));
}

test('D2/P1b: repair executes on the real engine — no self-refusal', async () => {
  const r = freshStore();
  await repairStore({ r });

  const run = lastRunRecord(r);

  // THE DEFECT, STATED AS AN ASSERTION. Before the fix this phase read
  // `lock:FAIL(store is locked (lock_held))` — the console had taken the mutex
  // and the engine then refused the lock its own process already held.
  const lockPhase = (run.phases || []).find((p) => p && p.name === 'lock');
  assert.equal(
    lockPhase,
    undefined,
    `the engine's lock phase must not exist on a successful repair — a present one means it refused itself: ${JSON.stringify(lockPhase)}`,
  );

  // And the phases the repair path asked for actually RAN. This is the half that
  // separates "did not refuse itself" from "did something".
  const names = (run.phases || []).map((p) => p && p.name);
  for (const wanted of ['reconcile', 'build', 'export']) {
    assert.ok(names.includes(wanted), `repair phase "${wanted}" never ran (phases: ${names.join(', ')})`);
  }
  assert.equal(run.ok, true, `the engine recorded a failed repair: ${JSON.stringify(run.phases)}`);
});

test('D2/P1b: the engine owns the journal it claimed, and the lock is released', async () => {
  const r = freshStore();
  await repairStore({ r });

  const journal = JSON.parse(readFileSync(join(r, 'journal.json'), 'utf-8'));
  assert.equal(journal.status, 'completed', 'the run that owned the store must leave a completed journal');

  // The reused handle must be released EXACTLY ONCE — by the caller. If the
  // engine released it too, or failed to, the store would either be wedged or
  // handed to a third writer. The observable is simple: the lock is gone.
  const { existsSync } = await import('node:fs');
  assert.equal(existsSync(join(r, '.lock')), false, 'the gate released the lock; a leftover .lock wedges the store');

  // A second repair on the same store must therefore succeed rather than refuse.
  await repairStore({ r });
});

test('D2/P1b: a REFUSED repair is not reported as a successful one', async () => {
  const r = freshStore();

  // Hold the store ourselves, then attempt a repair. The gate's pure read sees
  // the holder and refuses with 409 — nothing may be written.
  const { acquireLock } = await import('../../../scripts/creator-brains/lib/lock.mjs');
  const held = acquireLock(r, { runId: 'holder-real' });
  assert.equal(held.ok, true, 'precondition: we could not take the store to hold it');

  try {
    await assert.rejects(
      () => repairStore({ r }),
      (e) => e && e.code === 'RUN_LOCKED',
      'a repair against a held store must refuse, not report a repaired count',
    );
  } finally {
    held.release();
  }
});
