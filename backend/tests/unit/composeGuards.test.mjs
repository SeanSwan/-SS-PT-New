/**
 * The coalescing map and the gate a caller forgot to wire.
 *
 * Both pieces were found subtly wrong by successive review rounds, which is why they
 * now sit together and why each failure mode below is pinned rather than described.
 */

import { describe, it, expect } from 'vitest';
import { rememberKey, defaultCommit, slimForReplay, _resetCoalescing, IDEMPOTENCY_RETAIN, BYTES_RETAIN, settledKeys } from '../../services/atelier/composeGuards.mjs';

describe('bounding the replay map must not break replay', () => {
  it('NEVER evicts a key whose request is still in flight', () => {
    // The first bound walked the store in insertion order, so the oldest entry it dropped
    // could be a request still running — and that entry's promise is the thing a
    // concurrent duplicate coalesces onto. Dropping it lets the duplicate generate and
    // charge a SECOND time: the exact outcome the map exists to prevent, reintroduced by
    // the bound meant to make the map safe.
    settledKeys.clear();
    const store = new Map();
    const inFlight = 'IN-FLIGHT';
    store.set(inFlight, new Promise(() => {}));          // never settles; never marked settled

    for (let i = 0; i < IDEMPOTENCY_RETAIN + 50; i += 1) {
      const k = `done-${i}`;
      store.set(k, Promise.resolve({ ok: true }));
      rememberKey(store, k, settledKeys);
    }

    expect(store.has(inFlight)).toBe(true);              // survived every eviction
    expect(store.size).toBeLessThanOrEqual(IDEMPOTENCY_RETAIN + 1);
  });

  it('does bound the map, so it cannot grow for the life of the process', () => {
    settledKeys.clear();
    const store = new Map();
    for (let i = 0; i < IDEMPOTENCY_RETAIN * 2; i += 1) {
      const k = `k-${i}`;
      store.set(k, Promise.resolve({ ok: true }));
      rememberKey(store, k, settledKeys);
    }
    expect(store.size).toBeLessThanOrEqual(IDEMPOTENCY_RETAIN);
  });

  it('keeps the MOST RECENT keys, because a retry that has not arrived yet is a recent one', () => {
    settledKeys.clear();
    const store = new Map();
    for (let i = 0; i < IDEMPOTENCY_RETAIN + 10; i += 1) {
      const k = `k-${i}`;
      store.set(k, Promise.resolve({ ok: true }));
      rememberKey(store, k, settledKeys);
    }
    expect(store.has(`k-${IDEMPOTENCY_RETAIN + 9}`)).toBe(true);   // newest kept
    expect(store.has('k-0')).toBe(false);                          // oldest dropped
  });

  it('does nothing to a store that is not a Map, rather than throwing', () => {
    expect(() => rememberKey({ set() {}, delete() {} }, 'k', new Set())).not.toThrow();
  });
});

describe('the gate a caller forgot to wire', () => {
  it('permits FREE work — there is no money to count', () => {
    expect(defaultCommit({ spendUsd: 0 })).toMatchObject({ allowed: true });
    expect(defaultCommit({})).toMatchObject({ allowed: true });
  });

  it('REFUSES anything that costs money', () => {
    // A permissive default made the money gate droppable by accident: a route that omitted
    // or misspelled `commit` spent with no ceiling and no sound.
    let err;
    try { defaultCommit({ spendUsd: 0.0039 }); } catch (e) { err = e; }
    expect(err?.code).toBe('E_NO_SPEND_GATE');
    expect(err.message).toMatch(/[Nn]othing was generated/);
  });
});
