/**
 * bridge.handoff.test.mjs — the SPAWN HANDOFF, both orderings (D2/P1a).
 *
 * ── WHAT THIS FILE IS FOR ───────────────────────────────────────────────────
 *
 * `underRunGate` releases the engine mutex when the SPAWN RETURNS. The child does
 * not own the store until `run.mjs:154`. The store is therefore held by nobody
 * for the handoff interval, and a second request arriving inside it used to be
 * admitted. Measured before the fix:
 *
 *   first accepted  = {"requestId":"8ce74578-…"}   children so far: 1
 *   second outcome  = {"admitted":true, …}          children spawned: 2
 *
 * Astra round 1, P1a: "Test both handoff orderings with explicit barriers." The
 * two orderings are not symmetric and both need pinning:
 *
 *   (1) CHILD ARRIVES FIRST  — a second request during the window is refused,
 *                              and the reservation is released once the child
 *                              demonstrably owns the store.
 *   (2) GATE REFUSES         — a request refused by a REAL foreign holder must
 *                              NOT leave the reservation behind, or every later
 *                              request is refused for a full timeout window
 *                              after a perfectly correct 409.
 *
 * "Explicit barriers" means the test never races the event loop and hopes. Each
 * phase is a separate `await` in a stated order, and the observation is always
 * the COUNT OF CHILDREN SPAWNED — a number a caller cannot fake, unlike a status
 * code.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startDailyRun } from '../lib/run-daily.mjs';
import { createReservation } from '../lib/run-reservation.mjs';
import { fakeChild } from './fixtures/spawn-recorder.mjs';

const freshStore = () => mkdtempSync(join(tmpdir(), 'handoff-'));

/**
 * A spawn that records instead of running, so "did a child start?" is countable.
 *
 * ⚠️ IT USED TO RETURN `{ unref() {}, pid: …, on() {} }` — an object with an `on`
 * that SILENTLY DISCARDED ITS ARGUMENTS. That was invisible while nothing listened,
 * and became a hang the moment the bridge began waiting for the child to actually
 * start before answering 202 (Astra round 1, P2): `once('spawn', …)` registered on a
 * stub that could never emit, so the promise never settled and all five cases in this
 * file timed out. A fake whose event methods are no-ops does not model a child
 * process — it models a black hole, and it fails by HANGING rather than by asserting.
 *
 * It now delegates to the shared `fakeChild`, which models both launch outcomes.
 * `pid` is still synthetic and still sequential, because this file's subject is the
 * COUNT of children, not their identity.
 */
function countingSpawn() {
  const pids = [];
  return {
    pids,
    spawnFn: () => {
      const n = pids.push(1);
      return fakeChild({ pid: 9000 + n });
    },
  };
}

test('P1a ordering 1: a second request inside the handoff window is refused', async () => {
  const r = freshStore();
  const reservation = createReservation();
  const { pids, spawnFn } = countingSpawn();

  // ── barrier: request ONE completes (child spawned, mutex released, 202 out)
  const first = await startDailyRun({ r, perHour: 3, spawnFn, reservation });
  assert.equal(first.runId, null, 'acceptance must carry a null runId (A1-05)');
  assert.equal(pids.length, 1, 'the first request must spawn exactly one child');

  // The reservation is the ONLY thing standing in the window now. Assert it is
  // actually held — if it were not, this test would pass for the wrong reason.
  const held = reservation.held();
  assert.ok(held, 'the reservation must outlive the 202 — that is the whole fix');
  assert.equal(held.op, 'run/daily');

  // ── barrier: request TWO arrives while the child is still booting
  await assert.rejects(
    () => startDailyRun({ r, perHour: 3, spawnFn, reservation }),
    (e) => e && e.code === 'RUN_LOCKED',
    'a request in the handoff window must be refused, not spawned',
  );

  // THE COUNTING OBSERVABLE. One request, one child. Before the fix this was 2.
  assert.equal(pids.length, 1, 'the second request must NOT have spawned a child');
});

test('P1a ordering 1b: the reservation releases on EVIDENCE the child owns the store', async () => {
  const r = freshStore();
  const reservation = createReservation();
  const { pids, spawnFn } = countingSpawn();

  await startDailyRun({ r, perHour: 3, spawnFn, reservation });
  assert.ok(reservation.held(), 'precondition: the reservation is held after the 202');

  // ── barrier: `GET /api/run` reports a journal run id the reservation has not
  // seen. This is the "acknowledge acquisition over IPC" half of Astra's fix —
  // the console reads the STORE, not the child's word.
  reservation.noteRun({ journal: { status: 'running', runId: 'child-run-1' }, lock: { held: false } });
  assert.equal(reservation.held(), null, 'evidence of a new journal run id must release the reservation');

  // ── barrier: the next request is admitted again
  await startDailyRun({ r, perHour: 3, spawnFn, reservation });
  assert.equal(pids.length, 2, 'after the handoff completes, the next request may spawn');
});

test('P1a: a STALE journal entry is not mistaken for this child acknowledging', async () => {
  const r = freshStore();
  const reservation = createReservation();
  const { spawnFn } = countingSpawn();

  // The store must ACTUALLY contain a stale entry for this case to mean
  // anything. The first draft of this test seeded nothing, so `seenRunId` was
  // null, `run-from-yesterday` legitimately looked new, and the assertion failed
  // against CORRECT code — a test defect, not a code defect. The probe that
  // settled it: seed the journal, then assert the reservation records that id.
  const { writeRunJournal } = await import('../../../scripts/creator-brains/lib/store.mjs');
  writeRunJournal(r, { runId: 'run-from-yesterday', startedAt: new Date().toISOString(), pid: 1 });

  await startDailyRun({ r, perHour: 3, spawnFn, reservation });

  // The reservation must have RECORDED what was already there. Without this the
  // check below could pass for the wrong reason.
  const held = reservation.held();
  assert.ok(held, 'precondition: the reservation is held');
  assert.equal(held.seenRunId, 'run-from-yesterday', 'the reservation must record the journal id it started with');

  // A completed run from earlier must NOT release it. If it did, the reservation
  // would open the handoff window on the very first `GET /api/run` — the defect,
  // restored by the fix meant to close it.
  reservation.noteRun({ journal: { status: 'completed', runId: 'run-from-yesterday' }, lock: { held: false } });
  assert.ok(
    reservation.held(),
    'only a journal id the reservation has NOT seen counts as acknowledgement',
  );

  // A genuinely NEW id must release it, which is what proves the check above is
  // a comparison rather than an unconditional hold.
  reservation.noteRun({ journal: { status: 'running', runId: 'child-run-new' }, lock: { held: false } });
  assert.equal(reservation.held(), null, 'a new journal run id IS the acknowledgement');
});

test('P1a ordering 2: a gate refusal must not strand the reservation', async () => {
  const r = freshStore();
  const reservation = createReservation();

  // ── barrier: the store is held by a REAL foreign holder. The gate's pure read
  // sees it and refuses with 409 — the child is never spawned.
  const { acquireLock } = await import('../../../scripts/creator-brains/lib/lock.mjs');
  const foreign = acquireLock(r, { runId: 'foreign-holder' });
  assert.equal(foreign.ok, true, 'precondition: could not take the store to hold it');

  try {
    await assert.rejects(
      () => startDailyRun({ r, perHour: 3, spawnFn: () => { throw new Error('must not spawn'); }, reservation }),
      (e) => e && e.code === 'RUN_LOCKED',
    );
  } finally {
    foreign.release();
  }

  // THE STRANDING CHECK. The reservation was taken before the gate and the gate
  // refused, so nothing is coming to take the store. Leaving it held would refuse
  // every legitimate request for the whole timeout window after a correct 409.
  assert.equal(
    reservation.held(),
    null,
    'a refusal must release the reservation — otherwise a correct 409 wedges the next request',
  );

  // ── barrier: and a legitimate request now succeeds, proving the slot is free
  const { pids, spawnFn } = countingSpawn();
  await startDailyRun({ r, perHour: 3, spawnFn, reservation });
  assert.equal(pids.length, 1, 'the store is free again, so the request must be admitted');
});

test('P1a: the safety valve releases a reservation whose child died before acknowledging', async () => {
  const r = freshStore();
  // A tiny timeout stands in for "a child that crashed and will never
  // acknowledge". A dead console cannot release anything, which is why an
  // evidence-only release is not sufficient and a bound is mandatory.
  const reservation = createReservation({ timeoutMs: 20 });
  const { spawnFn } = countingSpawn();

  await startDailyRun({ r, perHour: 3, spawnFn, reservation });
  assert.ok(reservation.held(), 'precondition: held right after the 202');

  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(
    reservation.held(),
    null,
    'a child that never acknowledges must not wedge the store — the valve has to fire',
  );
});
