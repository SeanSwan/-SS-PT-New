/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/run-ownership-release.test.mjs
 * PURPOSE: A failure INSIDE the ownership region must give the store back.
 * PART OF: Creator Brains — SS-PT acquisition engine (Astra round 1, P2)
 * ADDED: 2026-09-22
 * ============================================================================
 *
 * THE DEFECT ASTRA NAMED, AND WHY IT NEEDS ITS OWN GATE.
 *
 * Astra: *"acquires the lock and writes the claimed journal before entering the shown
 * `try`"* → *"[LIKELY] a write failure can therefore bypass lock cleanup."*
 *
 * The claim is a STORE WRITE. When it threw, the lock was already held and no
 * `finally` was in scope, so the store stayed locked until stale-owner reclamation
 * — `lock.mjs:50`, SIX HOURS. One failed write stalled every later run for the rest
 * of the working day, and the symptom (later runs refusing with `lock_held` naming a
 * dead pid) points at the lock, not at the write that leaked it.
 *
 * ── WHY THIS FILE IS NOT IN `journal-ownership.test.mjs` ────────────────────
 *
 * That file (O5) tests `writeRunJournal`'s claim guard as a UNIT: it calls the
 * function directly and never acquires a lock. Astra's own note applies exactly —
 * *"Removing the production claim at `run.mjs:166–172` leaves O5 unchanged. Its
 * 'lock holder' is an assertion in a comment, not a fixture condition."* A unit test
 * of the guard cannot see whether the PRODUCTION path releases ownership when the
 * guard throws, because the production path is not in it.
 *
 * So these cases drive `withOwnership` — the module that now owns the region — with
 * the claim injected to fail. That injection is the whole point: the property is
 * "the `finally` is on the outside of the thing that throws", and it is only
 * observable if something is allowed to throw there.
 *
 * ── THE MUTATION THIS FILE MUST KILL ────────────────────────────────────────
 *
 * Moving the claim back OUTSIDE `withOwnership` — i.e. reverting to `try { … }`
 * starting after the claim — must turn these red. Verified: it does. A test that
 * only asserted "the lock is free afterwards" on the happy path would pass against
 * the original defect, which is how this survived a green suite.
 *
 * @module creator-brains/test/run-ownership-release
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { withOwnership } from '../lib/run-ownership.mjs';

/** A store handle that records whether it was given back. */
function fakeLock() {
  const state = { released: 0 };
  return {
    state,
    handle: { ok: true, runId: 'run-x', release() { state.released += 1; return true; } },
  };
}

/** The `taken` shape `takeStoreLock` returns for a freshly acquired handle. */
const acquired = (handle) => ({ ok: true, handle, reused: false });

const BASE = { r: 'C:/tmp/creator-brains-ownership-fixture', runId: 'run-x', record: { startedAt: '2026-01-01T00:00:00.000Z' } };

test('THE STORE STAYS LOCKED WHILE THE ASYNC BODY RUNS — the `await` is load-bearing', async () => {
  // ⚠️ ASTRA ROUND 2, P2 #1 — AND EVERY CASE ABOVE MISSED IT.
  //
  // `withOwnership` uses `return await body()`, not `return body()`. The `await` is
  // NOT redundant: without it the `finally` runs as soon as the promise is RETURNED,
  // so the lock is released while the body is still executing. Measured: the mutation
  // `return await body()` → `return body()` passed all six cases in this file,
  // because every one of them asserts the release count only AFTER completion — and
  // after completion both shapes have released exactly once.
  //
  // In production that mutation means the store is unprotected for the entire run.
  // The console's own gate would hand the store to a second caller the moment the
  // first spawn returned, which is D2/P1a reopened from the inside.
  //
  // So the body is MANUALLY CONTROLLED here: the lock must still be held while the
  // body's promise is pending, and released only once it settles. That is a property
  // no after-the-fact count can express.
  const { handle, state } = fakeLock();
  let releaseBody;
  let bodyStarted = false;
  const gate = withOwnership({
    ...BASE,
    taken: acquired(handle),
    held: handle,
    body: () => {
      bodyStarted = true;
      return new Promise((res) => { releaseBody = res; });
    },
  });

  // Let the microtask queue drain so the body is genuinely in flight. Without this,
  // the assertion below could pass merely because nothing has run yet.
  await new Promise((r) => setImmediate(r));
  assert.equal(bodyStarted, true, 'the body must have started, or this test proves nothing');
  assert.equal(state.released, 0,
    'the lock MUST still be held while the body is pending — releasing here leaves the store unguarded for the whole run');

  releaseBody('done');
  assert.equal(await gate, 'done', 'and the body\'s value is returned unchanged');
  assert.equal(state.released, 1, 'released exactly once, only after the body settled');
});

test('THE STORE STAYS LOCKED WHILE A REJECTING BODY RUNS, then releases once', async () => {
  // The same property on the failure path, which the `finally` also covers. A
  // `return body()` mutation releases early here too; asserting only the final count
  // cannot see it, so the pending window is checked again.
  const { handle, state } = fakeLock();
  let rejectBody;
  let bodyStarted = false;
  const gate = withOwnership({
    ...BASE,
    taken: acquired(handle),
    held: handle,
    body: () => {
      bodyStarted = true;
      return new Promise((_res, rej) => { rejectBody = rej; });
    },
  });
  gate.catch(() => {}); // the rejection is asserted below; do not leave it unhandled meanwhile

  await new Promise((r) => setImmediate(r));
  assert.equal(bodyStarted, true, 'the body must have started');
  assert.equal(state.released, 0, 'still held while the body is pending, on the failure path too');

  rejectBody(new Error('late failure'));
  await assert.rejects(() => gate, /late failure/);
  assert.equal(state.released, 1, 'and released exactly once after the rejection');
});

test('A failure AT THE CLAIM WRITE releases the store — the exact line Astra named', async () => {
  // ⚠️ THIS CASE USED TO DRIVE ITS FAILURE FROM `body`, AND IT WAS VACUOUS.
  //
  // The first version of this file threw from `body` and asserted the release. All
  // five cases passed against a MUTATED build with the claim moved back outside the
  // `try` — i.e. against the defect itself. The reason is obvious in hindsight and
  // was invisible while writing: `body` runs INSIDE the try in both the correct and
  // the defective shape, so a body failure releases the lock either way. The only
  // failure that discriminates is the one at the CLAIM, which is the line Astra
  // identified and the only line whose position the fix moves.
  //
  // Measured, not argued: the mutation survives the body-throw case and kills this
  // one. A property whose failure mode cannot be reached is not being tested.
  const { handle, state } = fakeLock();
  await assert.rejects(
    () => withOwnership({
      ...BASE,
      taken: acquired(handle),
      held: handle,
      claim: () => { throw Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' }); },
      body: async () => { throw new Error('the body must never run when the claim failed'); },
    }),
    /ENOSPC/,
  );
  assert.equal(state.released, 1, 'the store MUST be given back when the CLAIM write fails');
});

test('a failure in the BODY also releases — same region, and the shape is worth pinning', async () => {
  // Kept as its own case precisely BECAUSE it is the non-discriminating one: it
  // documents that the region covers work after the claim as well, and it is the
  // control showing the two failure sites are distinguishable. On its own it proves
  // nothing about the fix (see the case above); together they locate the `try`.
  const { handle, state } = fakeLock();
  await assert.rejects(() => withOwnership({
    ...BASE, taken: acquired(handle), held: handle, body: async () => { throw new Error('boom'); },
  }), /boom/);
  assert.equal(state.released, 1, 'exactly one release — not zero, not two');
});

test('a claim that fails also PREVENTS the body from running', async () => {
  // A claim that could not be written means this run does not own the journal slot,
  // so proceeding would be an unlocked run writing into a store whose journal says
  // someone else owns it. The claim's throw must propagate as a refusal, not be
  // swallowed and then followed by the work it was supposed to authorize.
  let bodyRan = false;
  const { handle } = fakeLock();
  await assert.rejects(() => withOwnership({
    ...BASE,
    taken: acquired(handle),
    held: handle,
    claim: () => { throw new Error('claim refused'); },
    body: async () => { bodyRan = true; return 'should not happen'; },
  }));
  assert.equal(bodyRan, false, 'no work may run under a claim that was never written');
});

test('a REUSED handle is NOT released — the caller owns it (D2/P1b)', async () => {
  // The console gate takes the lock and hands it to the engine as `acquiredLock`.
  // `takeStoreLock` returns `reused: true` for that path, and the CALLER releases in
  // its own `finally`. Releasing here too would delete a lock the caller still holds
  // and believes it owns — which is how the console's own gate would come apart.
  const { handle, state } = fakeLock();
  await withOwnership({
    ...BASE, taken: { ok: true, handle, reused: true }, held: handle, body: async () => 'ok',
  });
  assert.equal(state.released, 0, 'a reused handle belongs to the caller — the region must not release it');
});

test('the success path releases once too, and returns the body\'s value through', async () => {
  // The control. Without it, a region that released only on failure would pass every
  // case above, and the console would leak the store on the common path instead.
  const { handle, state } = fakeLock();
  const out = await withOwnership({
    ...BASE, taken: acquired(handle), held: handle, body: async () => ({ verdict: 'completed' }),
  });
  assert.deepEqual(out, { verdict: 'completed' }, 'the region must not swallow or reshape the result');
  assert.equal(state.released, 1, 'and the store is still given back on the success path');
});

test('no handle means no claim, no release and no throw — the lock:false path stays inert', async () => {
  // `held` is null on the `lock:false` path, where `takeStoreLock` returns
  // `{ok:true, handle:null}`. The region must be inert there rather than throwing on
  // a null dereference: a refusal to run is an outcome, not a crash. Note the claim
  // is also skipped on this path, deliberately — claiming without owning is the
  // A1-06 defect — which is the other half of why `lock:false` was rejected.
  let claimCalls = 0;
  const out = await withOwnership({
    ...BASE,
    taken: { ok: true, handle: null, reused: false },
    held: null,
    claim: () => { claimCalls += 1; },
    body: async () => 'ran-unlocked',
  });
  assert.equal(out, 'ran-unlocked', 'the lock:false path runs and returns normally');
  assert.equal(claimCalls, 0, 'and it must NOT claim: a journal slot without ownership is the A1-06 defect');
});
