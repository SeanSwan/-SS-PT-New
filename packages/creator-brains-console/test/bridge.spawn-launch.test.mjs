/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/bridge.spawn-launch.test.mjs
 * PURPOSE: The SPAWN LAUNCH HANDOFF — which store the child is routed to, and what
 *          happens when the launch fails.
 * PART OF: Creator Brains Console (Astra round 1, P2 ×2)
 * ADDED: 2026-09-22
 * ============================================================================
 *
 * WHY THIS IS ITS OWN FILE. Two of Astra round 1's P2 findings are about the same
 * moment — the instant between `spawn` returning and the child owning the store —
 * and both were invisible for the same reason: `bridge.rundaily.test.mjs` asserted
 * the ARGUMENTS of the spawn call and never the child's behaviour, so a child
 * routed to the wrong store and a child that never started both looked identical
 * from the assertion's point of view. Splitting them here made room under the Rule 4
 * cap AND put the two findings where their shared precondition is named.
 *
 * ── P2a · THE CHILD WAS NOT TOLD WHICH STORE ────────────────────────────────
 *
 * Astra, verbatim: *"uses `r` for the gate but passes the child only the script and
 * `--per-hour`. It supplies neither a root argument nor a root-specific environment
 * or working directory. Changing `r` does not change the child's launch
 * configuration."*
 *
 * `run-daily.mjs:122` resolves `root()` as
 * `explicit || process.env.CREATOR_BRAINS_ROOT || <repo default>` (`paths.mjs:49`),
 * and the child receives no `explicit` — so **the gate guarded one store while the
 * run wrote another.** That is the "two writers, one store" shape the gate exists to
 * prevent, reached by configuration drift rather than by a race, and unreachable
 * from either side of the boundary alone.
 *
 * ── P2b · A LAUNCH FAILURE WAS REPORTED AS ACCEPTANCE ──────────────────────
 *
 * Astra, verbatim: *"installs no child `error` listener and returns acceptance
 * without observing the `spawn` event"*, and the failure is `[LIKELY]` to become an
 * unhandled error that terminates the bridge.
 *
 * Both halves are asserted below: the request REJECTS rather than resolving to a
 * `202`, and the rejection is not an `ApiError` — a launch failure is not a decision
 * the API made, and dressing it as a contract-shaped refusal would send the client
 * looking for a request it should never make again.
 *
 * ── WHAT IS DELIBERATELY *NOT* AWAITED ─────────────────────────────────────
 *
 * The child's EXIT. Acceptance is not completion (A1-05): `run-daily.mjs` owns the
 * exit codes a scheduler reads precisely so the bridge does not have to, and the
 * run's verdict is the engine's journal, never this process's lifetime. The last
 * test here is the counterweight that keeps the two launch checks from silently
 * growing into a completion wait — which would hang the console for twenty minutes
 * and invite an operator to kill it.
 *
 * @module creator-brains-console/test/bridge.spawn-launch
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { startDailyRun, ROOT_ENV } from '../lib/run-daily.mjs';
import { ApiError } from '../lib/errors.mjs';
import { recorder, fakeChild, manualChild } from './fixtures/spawn-recorder.mjs';

const R = 'C:/tmp/creator-brains-rundaily-fixture';

/* ── the child is told WHICH STORE ────────────────────────────────────────── */

test('T-B4: the child is told which store to use — the SAME root the gate guarded', async () => {
  // A root deliberately NOT the default, so "the child got the caller's root"
  // cannot pass by both values happening to agree.
  const OTHER = 'C:/tmp/creator-brains-rundaily-SOME-OTHER-STORE';
  const { gate, spawns, spawnFn } = recorder();
  await startDailyRun({ r: OTHER, perHour: 60, gate, spawnFn, newRequestId: () => 'req-root' });

  assert.equal(spawns.length, 1, 'exactly one spawn, so the assertion below has a subject');
  const { env } = spawns[0].opts;
  assert.ok(env, 'the spawn must carry an env at all — omit it and the child uses its own default');
  assert.equal(env[ROOT_ENV], OTHER,
    `the child must be routed to the SAME store the gate guarded, via ${ROOT_ENV} — the wrapper's own knob`);
  // The control that makes it discriminating: the default root must NOT be what the
  // child got, or this test passes for a fixture whose root equals the default.
  assert.notEqual(env[ROOT_ENV], R, 'and not the fixture default — otherwise the assertion is vacuous');
});

test('T-B4: routing the child does not MUTATE the bridge\'s own environment', async () => {
  // `{ ...process.env, [ROOT_ENV]: r }` spreads rather than assigns, so the bridge
  // process is never repointed. This matters beyond tidiness: a bridge serving store
  // A that wrote CREATOR_BRAINS_ROOT into its own process would move every LATER
  // spawn, every health probe and any sibling bridge in that process onto A.
  const before = process.env[ROOT_ENV];
  const { gate, spawnFn } = recorder();
  await startDailyRun({ r: 'C:/tmp/creator-brains-rundaily-ENV-LEAK-CHECK', perHour: 60, gate, spawnFn });
  assert.equal(process.env[ROOT_ENV], before,
    'the bridge must not set its own CREATOR_BRAINS_ROOT — the routing is for the child only');
});

/* ── a launch failure must not be answered with a 202 ─────────────────────── */

test('T-B4: an ASYNCHRONOUS spawn error rejects, and is not reported as acceptance', async () => {
  // `spawn` does not throw on ENOENT/EPERM/bad-cwd — it emits 'error' on a later
  // tick. With no listener that is an unhandled 'error' event, which TERMINATES the
  // bridge; and the first version answered `202 {requestId}` regardless, so a client
  // would poll `GET /api/run` forever for a run that never began. Both halves are
  // asserted: it rejects, and it is not an ApiError that would be served as a 4xx.
  const { gate, spawnFn } = recorder({ child: fakeChild({ startMode: 'error' }) });
  await assert.rejects(
    () => startDailyRun({ r: R, perHour: 60, gate, spawnFn }),
    (e) => {
      assert.equal(e.code, 'ENOTDIR', 'the launch failure travels as itself, not paraphrased');
      assert.equal(e instanceof ApiError, false,
        'a launch failure is not a contract refusal — ApiError shapes are reserved for what the API decided');
      return true;
    },
  );
});

test('T-B4: a child that EXITS before it starts also rejects, rather than hanging the request', async () => {
  // The other way to never start. Without the 'exit' listener the promise would
  // never settle and the HTTP request would sit open — which a client reads as "a
  // slow run", not "a failed launch", so the defect would present as latency and
  // never as an error. Bounded by the test timeout as well as the assertion.
  const { gate, spawnFn } = recorder({ child: fakeChild({ startMode: 'exit' }) });
  await assert.rejects(
    () => startDailyRun({ r: R, perHour: 60, gate, spawnFn }),
    /exited before it started/,
  );
});

test('T-B4: the acceptance listeners come OFF after settling — no leak onto the live child', async () => {
  // The child outlives the request for the whole run. A listener left attached is a
  // closure holding the reservation and the response for twenty minutes, and the
  // `error` listener in particular would keep swallowing events it no longer has any
  // business handling. `listenerCount` is the observable, not a comment.
  const child = fakeChild();
  const { gate, spawnFn } = recorder({ child });
  await startDailyRun({ r: R, perHour: 60, gate, spawnFn });
  for (const ev of ['spawn', 'error', 'exit']) {
    assert.equal(child.listenerCount(ev), 0, `no '${ev}' listener may survive the acceptance handshake`);
  }
});

test('T-B4: acceptance does NOT await the child\'s exit — the run outlives the 202 (A1-05)', async () => {
  // The counterweight to the two tests above, and the reason they are safe to add:
  // waiting for 'spawn' is a LAUNCH check, not a completion check. A child that
  // starts and then runs for a long time must still produce an immediate 202 — if
  // this ever awaits 'exit', the console hangs for the run's whole lifetime and an
  // operator is invited to kill it, which is how a store gets two writers.
  const child = fakeChild(); // emits 'spawn' only; never exits
  const { gate, spawnFn } = recorder({ child });
  const out = await startDailyRun({ r: R, perHour: 60, gate, spawnFn, newRequestId: () => 'req-early' });
  assert.equal(out.requestId, 'req-early', 'the 202 arrives while the child is still running');
  assert.equal(out.runId, null, 'and it is still acceptance, not completion');
});

/* ── the fixture must be able to FAIL a late listener (Astra round 2, P2 #2) ── */

test('FIXTURE: a same-turn emitter fires BEFORE a listener attached on the next tick', async () => {
  // ⚠️ ASTRA ROUND 2, P2 #2 — AND MY FIRST VERSION OF THIS TEST DID NOT DISCRIMINATE.
  //
  // The finding, measured by Astra: with the emission scheduled inside the child's
  // CONSTRUCTOR, a caller registering its listeners one `nextTick` LATE still caught
  // the event, because `setImmediate` runs after the microtask queue — the fixture
  // accidentally granted a grace period real `spawn` never gives.
  //
  // I first asserted this with two `await setImmediate(r)` turns, which is enough for
  // EITHER scheduling mode to land — so collapsing `'tick'` back to `setImmediate`
  // left the test green. Measured: mutation survived. The assertion has to be about
  // the SAME TURN, so it uses a single microtask checkpoint and no macrotask.
  //
  // `'tick'` uses `queueMicrotask`, so its event is queued ahead of anything the test
  // does after a single `await`. That is what makes the two orderings distinguishable.
  const order = [];
  const sameTurn = fakeChild({ emitAfter: 'tick' });
  sameTurn.once('spawn', () => order.push('emitter'));

  // A child whose emission is scheduled as a MACROTASK (the old, grace-granting shape).
  const laterTurn = fakeChild({ emitAfter: 'immediate' });
  laterTurn.once('spawn', () => order.push('emitter-immediate'));

  // Attach the "late" listener at the next microtask — i.e. after the tick emitter
  // but before the immediate one.
  await Promise.resolve();
  sameTurn.once('spawn', () => order.push('late'));
  laterTurn.once('spawn', () => order.push('late-immediate'));

  await new Promise((r) => setImmediate(r));

  assert.deepEqual(order, ['emitter', 'emitter-immediate', 'late-immediate'],
    'a same-turn emitter must fire and be GONE before a next-tick listener attaches; only the macrotask emitter is late enough to be caught');
});

test('FIXTURE: nothing is emitted until a spawn is actually requested', async () => {
  // Astra's second half of P2 #2: with the child built in the recorder factory, the
  // fixture emitted `spawn` before any spawn was requested — so a "did it spawn?"
  // assertion could be satisfied by event timing rather than by the code under test.
  // The child is now built INSIDE `spawnFn`, and this asserts the consequence.
  //
  // Note what `children` being empty MEANS here: there is no emitter to attach to at
  // all, which is a stronger statement than "it did not fire". The assertion is on
  // the array, not on a child that does not yet exist.
  const { spawnFn, spawns, children } = recorder();
  assert.equal(spawns.length, 0, 'no spawn requested yet');
  assert.equal(children.length, 0,
    'and no child exists yet — the fixture cannot emit before a spawn is requested, which is the property Astra measured as broken');

  // The control: once requested, both the record and the emitter appear. Without
  // this the assertion above would pass for a fixture that never emits at all.
  spawnFn('node', ['x'], {});
  assert.equal(children.length, 1, 'the spawn call produces exactly one child');
  let emitted = false;
  children[0].once('spawn', () => { emitted = true; });
  await new Promise((r) => setImmediate(r));
  assert.equal(emitted, true, 'and the emission does arrive once the spawn is requested');
});

test('FIXTURE: each spawn gets its OWN child, so a double spawn is visible as two emitters', async () => {
  // Two references to one object would let a test mistake "spawned twice" for
  // "spawned once" when it inspects the emitter, and would let the second spawn
  // inherit the first's already-fired state.
  const { spawnFn, children } = recorder();
  spawnFn('node', ['x'], {});
  spawnFn('node', ['x'], {});
  assert.equal(children.length, 2, 'one child per spawn invocation');
  assert.notEqual(children[0], children[1], 'and they are distinct objects, not two references to one');
});

test('FIXTURE: a manually driven child places the emission exactly, including before attachment', async () => {
  // `manualChild` emits nothing until told to — the mode a test needs when the
  // question is about ORDERING rather than outcome. Asserted against the FIXTURE
  // directly, and deliberately NOT through `startDailyRun`: a pinned child skips the
  // real `spawn` path, so driving the bridge with one would be measuring my own
  // double rather than the bridge. (I wrote that version first and it was wrong in
  // exactly that way — it asserted "pending" for a call that had already resolved.)
  //
  // Here the property is the fixture's: an emission fired BEFORE the listener exists
  // is genuinely missed, and one fired after is caught. That is what lets a future
  // test model the race instead of silently getting a grace period.
  const child = manualChild();
  let caughtBefore = false;
  let caughtAfter = false;

  child.start();                                  // fires with NO listener attached
  child.once('spawn', () => { caughtAfter = true; });
  await new Promise((r) => setImmediate(r));
  assert.equal(caughtBefore, false, 'the earlier emission had no listener, so it was missed');
  assert.equal(caughtAfter, false, 'and attaching a listener afterwards cannot retroactively catch it');

  const child2 = manualChild();
  child2.once('spawn', () => { caughtBefore = true; });
  child2.start();                                 // now the listener exists
  await new Promise((r) => setImmediate(r));
  assert.equal(caughtBefore, true, 'a listener attached BEFORE the manual start does catch it');
});
