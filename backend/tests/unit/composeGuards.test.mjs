/**
 * The coalescing map and the gate a caller forgot to wire.
 *
 * Both pieces were found subtly wrong by successive review rounds, which is why they
 * now sit together and why each failure mode below is pinned rather than described.
 */

import { describe, it, expect } from 'vitest';
import { rememberKey, defaultCommit, slimForReplay, IDEMPOTENCY_RETAIN, settledKeys } from '../../services/atelier/composeGuards.mjs';

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

describe('a cost that is not a number is not free', () => {
  it('refuses NaN, Infinity and negatives instead of reading them as zero', () => {
    // Every comparison against NaN is false, so an unpriced or corrupted cost sailed
    // through `spendUsd > 0` (read as free) AND `total + NaN > ceiling` (read as under
    // the cap). A money gate whose every test answers "fine" for garbage is not a gate.
    for (const bad of [NaN, Infinity, -0.01]) {
      let err;
      try { defaultCommit({ spendUsd: bad }); } catch (e) { err = e; }
      expect(err?.code, `spendUsd=${bad} was permitted`).toBe('E_BAD_COST');
    }
  });

  it('still permits a genuine zero', () => {
    expect(defaultCommit({ spendUsd: 0 })).toMatchObject({ allowed: true });
  });
});

describe('the coalescing store is process-scoped, not per-call', () => {
  it('is the SAME map every time, so a retry can find the original request', async () => {
    // The default used to be `new Map()` evaluated per CALL: a route that omitted `store`
    // got a fresh map every request, which is idempotency scoped to a single request —
    // no idempotency at all, and the retry it protects would charge again.
    const a = await import('../../services/atelier/composeGuards.mjs');
    const b = await import('../../services/atelier/composeGuards.mjs');
    expect(a.COALESCING_STORE).toBe(b.COALESCING_STORE);
    expect(a.settledKeys).toBe(b.settledKeys);
  });
});

describe('the bound counts entries, so the entries must be small', () => {
  it('a retained replay keeps every field EXCEPT the payload', () => {
    // A reviewer asked what an entry weighs: a hosted 4-up holds four base64 images, and a
    // 1920x1080 PNG is megabytes encoded. Five hundred of those is gigabytes held to answer
    // a retry that may never come. A bound that counts the wrong unit is not a bound.
    const result = {
      lane: 'hosted', partial: false, cost: { totalUsd: 0.0078 }, key: 'k',
      stills: [
        { index: 0, seed: 1, assetId: 'a1', image: { kind: 'b64', mime: 'image/png', data: 'X'.repeat(5000) } },
        { index: 1, seed: 2, assetId: 'a2', image: { kind: 'b64', mime: 'image/png', data: 'Y'.repeat(5000) } },
      ],
    };
    const slim = slimForReplay(result);
    expect(JSON.stringify(slim).length).toBeLessThan(600);
    expect(slim.bytesDropped).toBe(true);
    expect(slim.replayed).toBe(true);
    // Everything a retry needs to know it already ran, and where the output went:
    expect(slim.stills.map((s) => s.assetId)).toEqual(['a1', 'a2']);
    expect(slim.cost.totalUsd).toBe(0.0078);
    // Shape preserved so a client reading image.kind does not crash on a replay.
    expect(slim.stills[0].image).toMatchObject({ kind: 'b64', mime: 'image/png', dropped: true });
    expect(slim.stills[0].image.data).toBeUndefined();
  });

  it('passes through anything that is not a still batch', () => {
    expect(slimForReplay(null)).toBeNull();
    expect(slimForReplay({ accepted: true, batchId: 'b1' })).toMatchObject({ accepted: true });
  });
});

describe('an owner is a value, not merely "not undefined"', () => {
  it('refuses null, empty string and undefined alike', async () => {
    // The first guard tested `=== undefined`. Both seats of the next round pointed out
    // that a half-populated session yields NULL, and an empty string is what a
    // misconfigured header yields — either one rebuilt the shared namespace the guard
    // exists to remove.
    const { assertKeyHasOwner } = await import('../../services/atelier/composeGuards.mjs');
    for (const owner of [undefined, null, '']) {
      let err;
      try { assertKeyHasOwner({ idempotencyKey: 'k', userId: owner }); } catch (e) { err = e; }
      expect(err?.code, `userId=${JSON.stringify(owner)} was accepted as an owner`).toBe('E_BAD_OWNER');
    }
  });

  it('accepts a real owner, including the falsy-but-valid id 0', async () => {
    // 0 is a legitimate primary key in some tables and must not be mistaken for absent —
    // which a plain truthiness check would have done.
    const { assertKeyHasOwner } = await import('../../services/atelier/composeGuards.mjs');
    expect(() => assertKeyHasOwner({ idempotencyKey: 'k', userId: 7 })).not.toThrow();
    expect(() => assertKeyHasOwner({ idempotencyKey: 'k', userId: 0 })).not.toThrow();
  });

  it('ignores requests that carry no client key at all', async () => {
    const { assertKeyHasOwner } = await import('../../services/atelier/composeGuards.mjs');
    expect(() => assertKeyHasOwner({ userId: undefined })).not.toThrow();
  });
});

describe('a burst of in-flight requests must not destroy the replay window', () => {
  it('bounds the SETTLED count, not the store — 600 in flight leaves the window intact', () => {
    // Bounding on `store.size` looked equivalent and was not: in-flight entries inflate
    // it, so the loop evicted settled keys far below the target. A probe with 600 in
    // flight left ONE settled key standing out of 600 — the replay window destroyed by
    // exactly the traffic that produces retries, which is the double-charge this
    // retention exists to prevent.
    settledKeys.clear();
    const store = new Map();
    const settled = new Set();
    for (let i = 0; i < 600; i += 1) store.set(`inflight-${i}`, new Promise(() => {}));
    for (let i = 0; i < 600; i += 1) {
      const k = `done-${i}`;
      store.set(k, Promise.resolve(1));
      rememberKey(store, k, settled);
    }
    expect(settled.size).toBe(IDEMPOTENCY_RETAIN);
    // And every in-flight entry survives: dropping one lets its duplicate charge twice.
    expect([...store.keys()].filter((k) => k.startsWith('inflight')).length).toBe(600);
  });
});

describe('slimming must never destroy the only copy', () => {
  it('KEEPS the bytes when the still never persisted', () => {
    // Dropping the payload is safe only because the still is retrievable by assetId. When
    // persistence failed there is no library copy, and a slimmed replay hands a retry
    // neither the image nor a way to find it — the client paid and it is gone.
    const unpersisted = { cost: {}, stills: [{ index: 0, image: { kind: 'b64', data: 'PAYLOAD' } }] };
    const out = slimForReplay(unpersisted);
    expect(out.stills[0].image.data).toBe('PAYLOAD');
    expect(out.bytesDropped).toBeUndefined();
    expect(out.replayed).toBe(true);
  });

  it('drops them once every still has an assetId', () => {
    const persisted = { cost: {}, stills: [{ index: 0, assetId: 'a1', image: { kind: 'b64', mime: 'image/png', data: 'PAYLOAD' } }] };
    expect(slimForReplay(persisted).bytesDropped).toBe(true);
  });

  it('keeps them when only SOME persisted — a partial batch is still a lost render', () => {
    const partial = { cost: {}, stills: [
      { index: 0, assetId: 'a1', image: { kind: 'b64', data: 'A' } },
      { index: 1, image: { kind: 'b64', data: 'B' } },
    ] };
    expect(slimForReplay(partial).bytesDropped).toBeUndefined();
  });
});
