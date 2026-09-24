/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/fixtures/spawn-recorder.mjs
 * PURPOSE: The shared fake-gate + fake-child harness for the daily-run spawn tests.
 * PART OF: Creator Brains Console (Astra round 1, D2/P1a + P2)
 * ADDED: 2026-09-22
 * ============================================================================
 *
 * WHY THIS IS SHARED RATHER THAN COPIED. `bridge.rundaily.test.mjs` grew past the
 * repo's 300-line cap (CLAUDE.md rule 4) when the launch-handoff tests landed, and
 * the choice was to extract a coherent unit or to line-golf the comments. Rule 4
 * says extract — but a naive extraction into two test files would have DUPLICATED
 * this harness, and the duplication is the exact defect class this suite keeps
 * finding: two copies of a recorder that drift, each looking right on its own, so
 * one file's assertions silently read a different object than the code was handed.
 * Astra found that in a SINGLE file (`bridge.rundaily.test.mjs`, P2b — the
 * disconnected spawn recorder). Two files would have made it structural.
 *
 * ── THE FAKE CHILD IS NOT DECORATION ────────────────────────────────────────
 *
 * It replaced a plain `{ pid: 4242, unref() {} }`. That object had no `once`, no
 * `emit` and no `removeListener`, so once the bridge began waiting for the child to
 * actually START before answering 202, the fixture could not exercise the behaviour
 * AT ALL — a fake that cannot emit is a fake on which "a launch failure rejects
 * before the 202" is untestable, and an untestable claim is how a `202` for a child
 * that never started survives a green suite.
 *
 * @module creator-brains-console/test/fixtures/spawn-recorder
 */

import { EventEmitter } from 'node:events';

/**
 * A child process that behaves like the real one at the interface the code uses.
 *
 * `autoStart` defaults to true because a real `spawn` almost always starts — Node
 * emits `'spawn'` on the next tick. Set it false to model a child that never does.
 *
 * `startMode` covers both ways a launch can fail, in one place so the two cannot
 * drift:
 *   `'spawn'`  the success case.
 *   `'error'`  `spawn` could not hand the process to the OS (ENOENT, EPERM, bad cwd).
 *   `'exit'`   the process started and went away before `'spawn'` was observed.
 *
 * ── ⚠️ WHO SCHEDULES THE EMISSION, AND WHY IT MOVED (Astra round 2, P2 #2) ──
 *
 * `emitAfter` is the timing knob, and it must be driven from **`spawnFn`**, not
 * from construction. Astra's finding, measured: with the emission scheduled inside
 * this constructor, a caller that registered its listeners one `nextTick` LATE
 * still caught the event — because `setImmediate` fires after the tick queue, so
 * the fixture's timing accidentally granted a grace period real `spawn` does not
 * give. A mutation that delays listener attachment across an event-loop turn was
 * therefore INVISIBLE.
 *
 * Worse, and separate: with a child built in the call that CREATES the recorder, the
 * fixture emitted `'spawn'` before any spawn was requested at all — so a "did it
 * spawn?" assertion could be satisfied by event timing rather than by the code under
 * test.
 *
 * `emitAfter: 'immediate'` (the default) preserves the original timing ONCE
 * `start()` is called; `'tick'` models an emitter whose event lands within the same
 * turn, which is the mode that exposes a late listener. `'manual'` emits nothing and
 * hands you the control, for tests that drive the events themselves.
 *
 * @param {object} [opts]
 * @param {number} [opts.pid]
 * @param {'spawn'|'error'|'exit'} [opts.startMode]
 * @param {boolean} [opts.autoStart]
 * @param {'immediate'|'tick'|'manual'} [opts.emitAfter]
 */
export function fakeChild({ pid = 4242, startMode = 'spawn', autoStart = true, emitAfter = 'immediate' } = {}) {
  const child = new EventEmitter();
  child.pid = pid;
  child.unref = () => {};
  child.unrefCalled = false;

  /** Fire whichever terminal event `startMode` names. Manual tests call this directly. */
  child.start = () => {
    if (startMode === 'spawn') child.emit('spawn');
    else if (startMode === 'error') child.emit('error', Object.assign(new Error('spawn ENOTDIR'), { code: 'ENOTDIR' }));
    else child.emit('exit', 1, null);
  };

  if (autoStart && emitAfter !== 'manual') {
    const schedule = emitAfter === 'tick' ? queueMicrotask : setImmediate;
    schedule(() => child.start());
  }
  return child;
}

/**
 * A child that emits NOTHING until you call `child.start()`.
 *
 * The escape hatch for tests that need to place the emission deliberately — e.g.
 * before listener attachment, or after a prescribed number of turns.
 */
export function manualChild(opts = {}) {
  return fakeChild({ ...opts, autoStart: false, emitAfter: 'manual' });
}

/**
 * A gate that records the call order, and a spawn that records its arguments.
 *
 * `mutexHeld` is the flag that makes the ORDERING claim falsifiable (Astra round 1,
 * P2c). Without it, a test can assert the call sequence and the spawn count
 * separately and never establish that the spawn happened INSIDE the mutex — which
 * is the entire property. The `spawnFn` here records the flag AT SPAWN TIME, so
 * `spawns[0].mutexHeld` is evidence rather than inference.
 *
 * ⚠️ DESTRUCTURE `spawnFn` AND `spawns` FROM THE SAME CALL. Obtaining them from two
 * different `recorder()` calls is the P2b defect reproduced verbatim: the assertion
 * then reads an array nothing ever pushes to, and it cannot fail. This function
 * cannot prevent that — it returns one consistent set, and the caller's single
 * destructuring is what keeps the check attached to its subject.
 *
 * ⚠️ THE CHILD IS BUILT INSIDE `spawnFn`, PER CALL, AND ITS EMISSION IS SCHEDULED
 * FROM THERE (Astra round 2, P2 #2). It used to be built ONCE in this factory and
 * merely returned at call time, which meant the `setImmediate` emission was armed
 * before any spawn was requested — so a "did it spawn?" assertion could be satisfied
 * by event timing. Building it in `spawnFn` also means each spawn gets its OWN
 * child, so a double spawn produces two distinct emitters instead of two references
 * to one.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.held]           `lockStatus` reports a live holder
 * @param {boolean} [opts.withLockRefuses] `withLock` invokes `onBusy` instead of granting
 * @param {object}  [opts.child]          pin a specific child for EVERY spawn
 * @param {object}  [opts.childOpts]      options for the per-call child (see `fakeChild`)
 */
export function recorder({ held = false, withLockRefuses = false, child: optsChild = null, childOpts = {} } = {}) {
  const calls = [];
  const spawns = [];
  const state = { mutexHeld: false };
  // `children` records one emitter per spawn, so a test can inspect either the first
  // or the latest without reaching through `spawns` (which holds plain argument rows).
  const children = [];
  return {
    calls,
    spawns,
    state,
    children,
    // The child handed to a pinned `optsChild` caller (kept for tests that need to
    // drive events directly); otherwise the LAST one built, which is the common case.
    get child() { return optsChild || children[children.length - 1]; },
    gate: {
      lockStatus() {
        calls.push('lockStatus');
        return held ? { held: true, pid: 777, host: 'probe' } : { held: false };
      },
      async withLock(_r, fn, opts) {
        calls.push('withLock');
        if (withLockRefuses) return opts.onBusy({ reason: 'lock_held', holder: { pid: 88, host: 'other' } });
        state.mutexHeld = true;
        try {
          return await fn({});
        } finally {
          state.mutexHeld = false;
        }
      },
    },
    spawnFn(cmd, args, spawnOpts) {
      spawns.push({ cmd, args, opts: spawnOpts, mutexHeld: state.mutexHeld });
      const child = optsChild || fakeChild(childOpts);
      children.push(child);
      return child;
    },
  };
}
