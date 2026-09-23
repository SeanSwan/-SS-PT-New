# Astra packet — round 2 · the P2 discharge for the spawn handoff

**Date:** 2026-09-22
**Predecessor:** `ASTRA-SUBSCRIPTION-REPLY.md` (round 1, 2026-09-22T05:53:53Z) — the review whose three P2 findings this packet discharges.
**Scope:** FIVE files, included in full below. Nothing else was changed this round.

## What changed, in one table

| # | Round-1 finding | Verdict on the shipped source | Fix |
|---|---|---|---|
| 1 | *"The spawned process is not given the store being gated"* | **CONFIRMED** | `run-daily.mjs` passes `env: { ...process.env, CREATOR_BRAINS_ROOT: r }` |
| 2 | *"Spawn acceptance does not handle asynchronous launch failure"* | **CONFIRMED** | `awaitSpawn(child)` registers `spawn`/`error`/`exit`, waits for `'spawn'` before the 202 |
| 3 | *"The new claim write precedes the shown cleanup region"* | **CONFIRMED** | extracted `lib/run-ownership.mjs` (`withOwnership`); the region opens BEFORE the claim |

## What I want from you

1. **Are these three fixes correct and complete** for the defects you named, or is there a residual I have not seen? State the interleaving or the input if so.
2. **Is the `withOwnership` `finally` on the correct side of everything that can throw** while the lock is held? I believe the whole ownership lifetime is now inside it; a counterexample would be valuable.
3. **Did making `claim` injectable introduce a hazard?** It defaults to the real `claimRunJournal`, so production passes nothing — but I want that judged rather than assumed.
4. **`awaitSpawn` accepts `spawn` and rejects on `error` and on pre-`spawn` `exit`.** Is there a launch outcome it does not cover? I deliberately do NOT await `'exit'` (acceptance is not completion) — if that is wrong, say why.
5. **The two test fixtures.** Both were plain objects that could not emit. I consolidated them into one shared harness. Is the shared harness itself capable of masking a defect — in particular, does a fixture that ALWAYS emits `spawn` on `setImmediate` hide a real ordering bug?

## The disclosure that matters most

**My first version of the ownership test was green and vacuous.** It drove its failure from `body` and asserted the lock was released; it passed against a mutated build with the claim moved back OUTSIDE the `try` — i.e. against the defect itself. I caught it only because I ran the mutation and it SURVIVED. Fix: the claim is now injectable so failure can be raised at the line you named.

I am telling you this because it is the same class as the T-E3 lesson, and because **I would like you to look for the same shape elsewhere in what I am sending**: a test that is green for a reason unrelated to the property it advertises. I have deliberately left the non-discriminating case in the file, labelled as such, rather than deleting it — tell me if that is the wrong call.

## Explicitly NOT in this packet

- **HR14f / U2** — you have made NO recommendation on it across both replies (`grep -ci HR14f` returns 0 in each). It is measured at 0 failures in 26 runs. I am not inventing a fix.
- **`lock.mjs` stale-lock reclamation race** (your P1) — untouched. Your containment advice is to refuse automatic reclamation until serialization exists; that changes what a 409 means, so it is an owner decision, not mine.
- **The console blocking stale-lock recovery** (your P2) — untouched, same reason.
- The engine's `run.mjs` is included in full even though only the ownership region moved.

---

# FILE 1/5 — `scripts/creator-brains/lib/run-ownership.mjs` (NEW, 95 lines)

```js
#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/run-ownership.mjs
 * PURPOSE: The ownership handshake — claim the journal slot under the lock, and
 *          release EXACTLY ONCE at the end.
 * PART OF: Creator Brains — SS-PT acquisition engine (D2/P1b, A1-06, Astra P2)
 * ADDED: 2026-09-22
 * ============================================================================
 *
 * EXTRACTED FROM `run.mjs` AT THE SEAM, NOT TRIMMED TO FIT (Rule 4).
 *
 * `run.mjs` hit EXACTLY 300 lines — the cap, with zero headroom — when the
 * ownership region grew its `try` around the claim write (Astra round 1, P2). Any
 * further change to that file would have had to be shaped net-neutral to fit, which
 * is the distortion the cap is supposed to prevent rather than cause. This is the
 * third extraction from this file for the same reason (`run-lock.mjs`, `passes.mjs`),
 * and the seam named itself: *acquiring ownership, claiming under it, and giving it
 * back* is one idea, and it was spread across the top and the `finally` of a
 * 200-line function.
 *
 * ── THE DEFECT THIS CLOSES, AND WHY IT IS NOT JUST TIDINESS ─────────────────
 *
 * Astra, verbatim: *"acquires the lock and writes the claimed journal before
 * entering the shown `try`"* → *"[LIKELY] a write failure can therefore bypass lock
 * cleanup."*
 *
 * `claimRunJournal` is a STORE WRITE. A full disk, a permission change or a torn
 * JSON write at that line threw with the lock already held and no `finally` in
 * scope, so the store stayed locked until stale-owner reclamation (6 h,
 * `lock.mjs:50`). One failed write stalled every later run for the rest of the
 * day. `withOwnership` is what makes that impossible by construction: the region
 * opens before the first thing that can throw inside it.
 *
 * ── WHY THE CLAIM IS GUARDED BY `held` ──────────────────────────────────────
 *
 * The `held` guard is load-bearing, not defensive. On the `lock:false` path there
 * is no handle, so there is no ownership to claim UNDER — and a claim written
 * without ownership is precisely the A1-06 defect (a journal slot that does not
 * follow the lock). This is why `lock:false` was rejected as the repair for D2/P1b:
 * it would skip this call entirely rather than reusing the handle.
 *
 * ── WHY THE CLAIM IS INJECTABLE, AND WHY THAT IS NOT TEST-SMELL ─────────────
 *
 * `claim` defaults to the real `claimRunJournal`, so every production caller passes
 * nothing and reads exactly the code that ships. The seam exists because the defect
 * this module was written to close is *"the claim write throws and the lock leaks"*,
 * and that is only observable if something is ALLOWED to throw there.
 *
 * The first version of this file had no seam, and its test suite drove a failure
 * from `body` instead. Every case passed — including against a MUTATED build with
 * the claim moved back outside the `try`. The tests were green and vacuous for the
 * one line Astra named. An un-injectable claim cannot be made to fail, and a
 * property whose failure mode cannot be reached is not being tested; it is being
 * asserted about in a comment.
 *
 * @module creator-brains/run-ownership
 */

import { claimRunJournal as realClaim, shouldRelease } from './run-lock.mjs';

/**
 * Run `body` as the owner of the store: claim the journal under the lock, run,
 * then release exactly once — whatever happened.
 *
 * @param {object} opts
 * @param {string}   opts.r              store root
 * @param {string}   opts.runId          this run's id
 * @param {object}   opts.record         the in-flight run record (for startedAt)
 * @param {object}   opts.taken          the result of `takeStoreLock`
 * @param {object}   opts.held           the acquired handle, or null
 * @param {string[]|null} opts.onlyCreators
 * @param {string[]|null} opts.only
 * @param {Function} opts.body           async () => result, run under ownership
 * @param {Function} [opts.claim]        the claim write; injected ONLY to make it
 *                                       fail in a test. Defaults to the real one.
 * @returns {Promise<any>}
 */
export async function withOwnership({
  r, runId, record, taken, held, onlyCreators = null, only = null, body, claim = realClaim,
}) {
  try {
    if (held) {
      // A1-06: the journal slot follows the LOCK, not the first writer. Runs on
      // the REUSED path too — that is why `lock:false` was rejected.
      claim(r, { runId, record, onlyCreators, only });
    }
    return await body();
  } finally {
    // D2/P1b: release EXACTLY ONCE, and only what this run acquired. `taken.reused`
    // is the discriminator — see `shouldRelease` in `run-lock.mjs` for why a double
    // release is not the harmless no-op it looks like.
    if (shouldRelease(taken)) held.release();
  }
}
```

---

# FILE 2/5 — `packages/creator-brains-console/lib/run-daily.mjs` (the changed region)

Imports added: `export const ROOT_ENV = 'CREATOR_BRAINS_ROOT';`

```js
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
```

The spawn site, in full:

```js
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
```

---

# FILE 3/5 — `scripts/creator-brains/lib/run.mjs` (the ownership call site)

```js
  // ── LOCK (HR14) + THE CLAIM THAT FOLLOWS IT (A1-06, D2/P1b) ───────────────
  //   Acquire, or reuse a handle the caller already holds. Then — and only
  //   under ownership — claim the journal slot. The claim and the release now live
  //   in `withOwnership`, which is the region that opens BEFORE the claim write;
  //   `run-ownership.mjs` owns that reasoning. `run-lock.mjs` owns acquire-or-reuse.
  const taken = takeStoreLock({ r, runId, now: tick, lock, acquiredLock });
  const held = taken.ok ? taken.handle : null;

  if (!taken.ok) {
    addPhase(record, 'lock', { ok: false, reason: `store is locked (${taken.reason})`, counts: {} });
    notes.push('another run owns this store; refusing rather than saving a stale state map');
    // D8: this run never owned the store, so its step-0 open has no right to be
    // the journal's last word. Hand the displaced entry back so finalize can
    // restore it. Without this the holder's verdict is silently gone and the
    // journal names a run that was refused.
    record.restore = displaced || undefined;
    return conclude([], false);
  }

  return await withOwnership({
    r, runId, record, taken, held, onlyCreators, only,
    body: async () => {
    // ── 0b. PREFLIGHT: STRICT, FAIL-CLOSED (HR04/HR05) ──────────────────────
    ...  (the entire previous try-block body, unchanged)
    return { ...out, exportResult };
    },
  });
}
```

Note the indentation of the `body` arrow: the outer `try` was removed and `withOwnership` took its place, so the body is indented one level deeper than before. The block is otherwise byte-for-byte the previous `try` body.

---

# FILE 4/5 — `scripts/creator-brains/test/run-ownership-release.test.mjs` (NEW, 6 cases)

The decisive case, in full — this is the one that was vacuous and is now discriminating:

```js
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
```

The other four cases assert: a failed claim prevents the body from running; a **reused** handle is NOT released (the caller owns it, D2/P1b); the success path releases once and returns the body's value through; and `held: null` (the `lock:false` path) is inert and does **not** claim.

---

# FILE 5/5 — `packages/creator-brains-console/test/fixtures/spawn-recorder.mjs` (NEW, shared harness)

```js
export function fakeChild({ pid = 4242, startMode = 'spawn', autoStart = true } = {}) {
  const child = new EventEmitter();
  child.pid = pid;
  child.unref = () => {};
  if (autoStart) {
    setImmediate(() => {
      if (startMode === 'spawn') child.emit('spawn');
      else if (startMode === 'error') child.emit('error', Object.assign(new Error('spawn ENOTDIR'), { code: 'ENOTDIR' }));
      else child.emit('exit', 1, null);
    });
  }
  return child;
}

export function recorder({ held = false, withLockRefuses = false, child: optsChild = null } = {}) {
  const calls = [];
  const spawns = [];
  const state = { mutexHeld: false };
  const child = optsChild || fakeChild();
  return {
    calls, spawns, state, child,
    gate: {
      lockStatus() { calls.push('lockStatus'); return held ? { held: true, pid: 777, host: 'probe' } : { held: false }; },
      async withLock(_r, fn, opts) {
        calls.push('withLock');
        if (withLockRefuses) return opts.onBusy({ reason: 'lock_held', holder: { pid: 88, host: 'other' } });
        state.mutexHeld = true;
        try { return await fn({}); } finally { state.mutexHeld = false; }
      },
    },
    spawnFn(cmd, args, spawnOpts) {
      spawns.push({ cmd, args, opts: spawnOpts, mutexHeld: state.mutexHeld });
      return child;
    },
  };
}
```

`bridge.handoff.test.mjs` was changed from `spawnFn: () => ({ unref() {}, pid: 9000 + pids.push(1), on() {} })` to `spawnFn: () => fakeChild({ pid: 9000 + pids.push(1) })`. That `on() {}` silently discarded its arguments, so its five cases failed by **HANGING** the moment the bridge began waiting for `spawn`.

---

## Verification I ran

| Suite | Before | After |
|---|---|---|
| Engine | 204 / 0 / 6 | **210 / 0 / 6** |
| Console | 336 / 0 | **342 / 0** |
| Web (vitest) | 145 / 0 (15 files) | **145 / 0 (15 files)** |
| `tsc --noEmit` | clean | **clean** |
| Rule 4 (>300) over engine+console+web | 0 | **0** |

Mutations: (1) drop `env` → 1 red; (2) remove `awaitSpawn` → 2 red; (3) listeners left attached → 1 red; (4) claim moved outside the `try` → 1 red **only after the test was corrected**. Every mutated file restored and verified byte-identical (`diff -q`).

I did not run the engine's own `runDaily` end-to-end against a fresh store this round. If you consider that necessary to accept FILE 1 and FILE 3, say so and I will do it before claiming these closed.
