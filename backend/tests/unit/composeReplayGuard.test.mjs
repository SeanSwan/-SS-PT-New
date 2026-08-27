/**
 * The replay guard in isolation — total, synchronous where it must be, and silent about
 * its own bookkeeping. Split from atelierAsyncReplay at the 300-line cap.
 */

import { describe, it, expect } from 'vitest';

describe('the guard is total — no stored value can make it throw', () => {
  it('a rejected stored promise means run the work, not 500 forever', async () => {
    // The claim writes a pending promise and settles it with the outcome. A failure path
    // that rejects it without removing it would make the guard's `await` throw — and a
    // throw skips the delete, so every retry with that key 500s permanently with nothing
    // able to clear it. Being total is the whole job of a guard.
    const inner = new Map();
    const poisoned = Promise.reject(new Error('settled with a failure and left behind'));
    poisoned.catch(() => {});
    inner.set('u1:poison', poisoned);
    const store = {
      has: (k) => inner.has(k), get: (k) => inner.get(k),
      set: (k, v) => inner.set(k, v), delete: (k) => inner.delete(k),
    };
    const { replayIfFresh } = await import('../../services/atelier/composeReplay.mjs');
    const out = await replayIfFresh(store, 'u1:poison');
    expect(out).toBeNull();                 // run the work
    expect(inner.has('u1:poison')).toBe(false);   // and the poison is gone
  });
});


describe('claiming a key never takes it from whoever got there first', () => {
  it('a second claimant is told to coalesce, not handed the key', async () => {
    // There is a third kind of miss and it cannot be made synchronous: a REJECTED claim's
    // null arrives from behind an await. Two retries awaiting the same rejected claim both
    // resume in a continuation, and a blind `store.set` there means the second silently
    // takes the key from the first — two renders, two bites of the run cap.
    const { claimIfAbsent } = await import('../../services/atelier/composeReplay.mjs');
    const store = new Map();
    const first = Promise.resolve({ mine: true });
    const second = Promise.resolve({ mine: false });
    expect(claimIfAbsent(store, 'k', first)).toBe(true);
    expect(claimIfAbsent(store, 'k', second)).toBe(false);
    expect(store.get('k')).toBe(first);       // the first claimant still owns it
  });

  it('coalesces onto the winner rather than starting its own work', async () => {
    const { claimOrCoalesce } = await import('../../services/atelier/composeReplay.mjs');
    const store = new Map();
    // Someone already finished and retained a stub under this key.
    store.set('k', { batchId: 'B1', status: 'done', replayExpiresAt: Date.now() + 60_000 });
    const out = await claimOrCoalesce(store, 'k', () => Date.now());
    expect(out.replay).toBeTruthy();
    expect(out.replay.batchId).toBe('B1');
    expect(out.replay.replayed).toBe(true);
    expect(out.settle).toBeUndefined();       // it did not take ownership
  });

  it('exactly ONE of many waiters becomes the owner; the rest coalesce', async () => {
    // The tail used to write blindly, so with k retries waiting on one rejected claim all k
    // resumed in the same microtask drain, all k found nothing to coalesce onto, and all k
    // claimed: k owners, k batches, k run-cap debits, k different batchIds for one
    // idempotent key. The entry was conditional and the tail contradicted it.
    const { claimOrCoalesce } = await import('../../services/atelier/composeReplay.mjs');
    const store = new Map();
    const dead = Promise.reject(new Error('the first claim failed'));
    dead.catch(() => {});
    store.set('k', dead);

    // The losers coalesce onto the winner's claim, which in production its owner settles
    // and here nobody does — so they wait, correctly, forever. That waiting IS the fix, so
    // the test asserts it instead of awaiting it.
    const settled = (p) => Promise.race([p, new Promise((r) => setTimeout(() => r('waiting'), 60))]);
    const outs = await Promise.all([
      settled(claimOrCoalesce(store, 'k', () => Date.now())),
      settled(claimOrCoalesce(store, 'k', () => Date.now())),
      settled(claimOrCoalesce(store, 'k', () => Date.now())),
    ]);
    const owners = outs.filter((o) => o !== 'waiting' && o.settle);
    expect(owners.length).toBe(1);                       // one render, not three
    expect(outs.filter((o) => o === 'waiting').length).toBe(2);   // the rest queued behind it
    expect(store.size).toBe(1);                          // one claim in the store
  });

  it('refuses loudly rather than rendering twice when ownership cannot be established', async () => {
    // A store that permanently claims occupancy and never yields is not a reason to render
    // anyway. A request that cannot establish ownership must not spend a GPU.
    const { claimOrCoalesce } = await import('../../services/atelier/composeReplay.mjs');
    const store = { has: () => true, get: () => undefined, set: () => {}, delete: () => {} };
    await expect(claimOrCoalesce(store, 'k', () => Date.now(), 2)).rejects.toMatchObject({ code: 'E_REPLAY_CONTENTION' });
  });
});

describe('a delete behind an await never evicts someone else', () => {
  it('a stale waiter does not remove the claim of the owner who replaced it', async () => {
    // Every synchronous write here is conditional; the two behind an `await` were not.
    // Between suspending on a claim and resuming, that claim can fail, be removed by its
    // own owner, and be REPLACED by a new owner already rendering. A blind delete in the
    // continuation evicts a live claim belonging to someone else — and the evicting request
    // then claims the empty key, so two callers own one idempotency key.
    const { replayIfFresh, claimIfAbsent } = await import('../../services/atelier/composeReplay.mjs');
    const store = new Map();
    let failA;
    const pendingA = new Promise((_, rej) => { failA = rej; });
    pendingA.catch(() => {});
    store.set('k', pendingA);

    const waiter = replayIfFresh(store, 'k', () => Date.now());   // B suspends on A
    failA(new Error('A failed'));
    store.delete('k');                                            // A's own cleanup
    const pendingC = new Promise(() => {});
    expect(claimIfAbsent(store, 'k', pendingC)).toBe(true);       // C takes the empty key

    expect(await waiter).toBeNull();                              // B is told to run
    expect(store.get('k')).toBe(pendingC);                        // and C still owns it
  });

  it('a retained stub with no deadline is expired, not immortal', async () => {
    // Failing open would make any stub written without the field live forever — a delayed
    // retry handed a confident 200 and a statusUrl whose row aged out. A guard whose job is
    // not trusting writers cannot trust writers.
    const { replayIfFresh, REPLAY_NEVER_EXPIRES } = await import('../../services/atelier/composeReplay.mjs');
    const store = new Map([['k', { batchId: 'B1', status: 'done' }]]);      // no deadline
    expect(replayIfFresh(store, 'k', () => Date.now())).toBeNull();
    expect(store.has('k')).toBe(false);

    // ...unless it says so on purpose. That is what the hosted lane does.
    const forever = new Map([['k', { batchId: 'B1', status: 'done', replayExpiresAt: REPLAY_NEVER_EXPIRES }]]);
    expect(replayIfFresh(forever, 'k', () => Date.now()).batchId).toBe('B1');
  });
});

describe('liveness is a fact the caller knows, not a shape the value has', () => {
  it('a SETTLED claim left in the store is still subject to the expiry rule', async () => {
    // The exemption used to be `typeof token.then === 'function'` — and a promise keeps its
    // `then` after it resolves. So a claim that settled and stayed in the store was judged
    // "live" forever, skipped the expiry check entirely, and replayed a confident 200 for a
    // row that may have aged out. Shape said live; state said otherwise.
    const { replayIfFresh } = await import('../../services/atelier/composeReplay.mjs');
    const store = new Map();
    // A resolved promise holding a stub whose deadline has passed.
    store.set('k', Promise.resolve({ batchId: 'B1', status: 'done', replayExpiresAt: Date.now() - 1 }));
    expect(await replayIfFresh(store, 'k', () => Date.now())).toBeNull();
    expect(store.has('k')).toBe(false);
  });

  it('a live claim is still exempt — that is what coalescing waits on', async () => {
    const { replayIfFresh } = await import('../../services/atelier/composeReplay.mjs');
    const store = new Map();
    // The 202 stub has no deadline because the batch has not finished.
    store.set('k', Promise.resolve({ batchId: 'B1', accepted: true, status: 'queued' }));
    const out = await replayIfFresh(store, 'k', () => Date.now());
    expect(out.batchId).toBe('B1');
    expect(out.replayed).toBe(true);
  });

  it('survives being handed a frozen timestamp where a clock was expected', async () => {
    // The orchestrator holds a frozen `now` NUMBER beside this function's `clock` FUNCTION
    // and the two are one careless argument apart. Throwing at `clock()` would 500 every
    // request through this path.
    const { replayIfFresh, REPLAY_NEVER_EXPIRES } = await import('../../services/atelier/composeReplay.mjs');
    const store = new Map([['k', { batchId: 'B1', replayExpiresAt: REPLAY_NEVER_EXPIRES }]]);
    expect(replayIfFresh(store, 'k', Date.now()).batchId).toBe('B1');

    // And it reads NOW rather than freezing the number it was handed. Freezing would make
    // an EXPIRED stub look fresh — a silent 200 with a dead statusUrl, which is worse than
    // the crash the coercion exists to prevent.
    const stale = new Map([['k', { batchId: 'B1', replayExpiresAt: Date.now() - 1 }]]);
    expect(replayIfFresh(stale, 'k', Date.now() - 60_000)).toBeNull();
  });

  it('the never-expires sentinel survives a JSON round trip', async () => {
    // Infinity becomes null through JSON, `Number(null)` is 0, and a fail-closed guard
    // reads 0 as expired — so a store reload would turn the hosted lane's deliberate
    // immortality into a re-render, on the one lane where re-running charges money.
    const { REPLAY_NEVER_EXPIRES, replayIfFresh } = await import('../../services/atelier/composeReplay.mjs');
    const revived = JSON.parse(JSON.stringify({ batchId: 'B1', replayExpiresAt: REPLAY_NEVER_EXPIRES }));
    expect(revived.replayExpiresAt).toBe(REPLAY_NEVER_EXPIRES);
    expect(replayIfFresh(new Map([['k', revived]]), 'k', () => Date.now()).batchId).toBe('B1');
  });
});
