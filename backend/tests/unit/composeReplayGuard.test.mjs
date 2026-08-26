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

  it('takes the key when what is there resolves to nothing usable', async () => {
    // Needs a second failure on top of the first. The window is narrowed to consecutive
    // failures, not closed — the code says so rather than claiming otherwise.
    const { claimOrCoalesce } = await import('../../services/atelier/composeReplay.mjs');
    const store = new Map();
    store.set('k', { batchId: 'B1', status: 'done', replayExpiresAt: Date.now() - 1 });  // expired
    const out = await claimOrCoalesce(store, 'k', () => Date.now());
    expect(out.replay).toBeUndefined();
    expect(out.settle).toBeTruthy();
    expect(store.get('k')).not.toEqual({ batchId: 'B1' });
  });
});
