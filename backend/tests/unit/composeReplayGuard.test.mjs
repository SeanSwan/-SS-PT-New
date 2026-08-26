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

