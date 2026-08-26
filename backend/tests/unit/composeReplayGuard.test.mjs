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
