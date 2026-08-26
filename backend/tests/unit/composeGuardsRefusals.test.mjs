/**
 * The money-shaped halves of composeGuards: the gate a caller forgot to wire, and the
 * ownership rules that stop one caller receiving another's work.
 *
 * Split from composeGuards.test.mjs at the 300-line cap. That file covers the coalescing
 * map's mechanics; this one covers what the guards REFUSE — every case below was a real
 * bypass a reviewer found, so they are pinned where they read as a list of attacks rather
 * than as arithmetic.
 */

import { describe, it, expect } from 'vitest';
import { rememberKey, defaultCommit, slimForReplay, _resetCoalescing, IDEMPOTENCY_RETAIN, BYTES_RETAIN, settledKeys } from '../../services/atelier/composeGuards.mjs';

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

describe('only the entries a retry can ask for are worth retaining', () => {
  it('a DERIVED key is RETAINED, but in its own smaller window', () => {
    // RE-ANCHORED. The first attempt at this fix deleted derived keys on settle, and the
    // suite caught the regression immediately: a derived key is stable WITHIN its time
    // bucket, which is exactly what makes a fast SEQUENTIAL double-click replay instead of
    // paying twice. It has to outlive the second click — just not a network retry.
    _resetCoalescing();
    const store = new Map();
    const settled = new Set();
    store.set('derived', Promise.resolve(1));
    rememberKey(store, 'derived', settled, { clientKeyed: false });
    expect(store.has('derived')).toBe(true);        // the second click still replays
    expect(settled.size).toBe(0);                   // but it never enters the client window
  });

  it('high-volume derived traffic does not evict a client-keyed entry', () => {
    settledKeys.clear();
    const store = new Map();
    const settled = new Set();
    store.set('u7:client', Promise.resolve(1));
    rememberKey(store, 'u7:client', settled, { clientKeyed: true });
    for (let i = 0; i < IDEMPOTENCY_RETAIN * 3; i += 1) {
      const k = `derived-${i}`;
      store.set(k, Promise.resolve(1));
      rememberKey(store, k, settled, { clientKeyed: false });
    }
    expect(store.has('u7:client')).toBe(true);      // the retry can still find it
    expect(settled.size).toBe(1);
  });
});

describe('keeping bytes needs a budget, because persistence failures correlate', () => {
  it('stops carrying payloads once the budget is spent', () => {
    // One misconfigured R2 makes EVERY batch fail to persist, so the keep-the-bytes
    // exception stops being an exception and every retained entry carries megabytes —
    // the exhaustion the slimming was written to prevent, reintroduced beside it.
    _resetCoalescing();
    const unpersisted = () => ({ cost: {}, stills: [{ index: 0, image: { kind: 'b64', data: 'X'.repeat(2000) } }] });
    let kept = 0;
    for (let i = 0; i < BYTES_RETAIN + 10; i += 1) {
      if (slimForReplay(unpersisted()).bytesDropped !== true) kept += 1;
    }
    expect(kept).toBe(BYTES_RETAIN);
  });

  it('says so when the budget is what dropped them, not persistence', () => {
    _resetCoalescing();
    const unpersisted = () => ({ cost: {}, stills: [{ index: 0, image: { kind: 'b64', data: 'X' } }] });
    for (let i = 0; i < BYTES_RETAIN; i += 1) slimForReplay(unpersisted());
    const over = slimForReplay(unpersisted());
    expect(over.bytesBudgetExhausted).toBe(true);
    expect(over.stills[0].image.dropped).toBe(true);
  });
});

describe('the byte budget is an at-once cap, not a lifetime one', () => {
  it('gives the budget back when a byte-carrying entry is evicted', () => {
    // Without a release the cap counted lifetime allocations: twelve unpersisted batches
    // EVER, and no render was recoverable again for the life of the process — a limit that
    // silently tightens to zero is worse than no limit, because nobody sees it happen.
    _resetCoalescing();
    const store = new Map();
    const settled = new Set();
    const unpersisted = () => ({ cost: {}, stills: [{ index: 0, image: { kind: 'b64', data: 'X' } }] });

    for (let i = 0; i < BYTES_RETAIN; i += 1) {
      const k = `c-${i}`;
      const r = slimForReplay(unpersisted());
      store.set(k, r);
      rememberKey(store, k, settled, { clientKeyed: true, carriesBytes: r.bytesDropped !== true });
    }
    expect(slimForReplay(unpersisted()).bytesDropped).toBe(true);        // budget spent

    // Push the retained entries out of the window...
    for (let i = 0; i < IDEMPOTENCY_RETAIN + 20; i += 1) {
      const k = `x-${i}`;
      store.set(k, Promise.resolve(1));
      rememberKey(store, k, settled, { clientKeyed: true });
    }
    expect(slimForReplay(unpersisted()).bytesDropped).toBeUndefined();   // and it is back
  });
});

describe('an ownerless request coalesces with nobody', () => {
  it('two anonymous callers making the identical request derive DIFFERENT keys', async () => {
    // The owner is part of the hash, so two anonymous callers making the same request in
    // the same time bucket derived the IDENTICAL key and received each other's stills —
    // the confused deputy the client-key guard closed, arriving by the derived path.
    const { deriveKey } = await import('../../services/atelier/composeLimits.mjs');
    const req = { brief: { text: 'a glacier' }, promptSource: 'brief', lane: 'hosted', model: 'm', count: 1 };
    const now = Date.now();
    for (const owner of [undefined, null, '']) {
      const a = deriveKey({ ...req, userId: owner }, now);
      const b = deriveKey({ ...req, userId: owner }, now);
      expect(a, `userId=${JSON.stringify(owner)} coalesced with a stranger`).not.toBe(b);
    }
  });

  it('but an OWNED request still coalesces with itself, so a double-click replays', async () => {
    const { deriveKey } = await import('../../services/atelier/composeLimits.mjs');
    const req = { brief: { text: 'a glacier' }, promptSource: 'brief', lane: 'hosted', model: 'm', count: 1, userId: 7 };
    const now = Date.now();
    expect(deriveKey(req, now)).toBe(deriveKey(req, now));
    expect(deriveKey(req, now)).not.toBe(deriveKey({ ...req, userId: 8 }, now));
  });
});

describe('the guard against unbounded input was itself unbounded', () => {
  it('refuses an oversized slot NAME, not just an oversized value', async () => {
    // The guard was added specifically to close an unbounded channel and left the slot
    // NAME open, so a multi-megabyte key with an empty value walked straight through it.
    // The pair pattern, inside a single function.
    const { assertSlotOverrides, MAX_SLOT_NAME_CHARS } = await import('../../services/atelier/composeGuards.mjs');
    const huge = 'k'.repeat(MAX_SLOT_NAME_CHARS + 1);
    let err;
    try { assertSlotOverrides({ slotOverrides: { [huge]: '' } }); } catch (e) { err = e; }
    expect(err?.code).toBe('E_BAD_SLOT_OVERRIDE');
    expect(err.message).toMatch(/slot name/i);
  });

  it('accepts a normal slot name', async () => {
    const { assertSlotOverrides } = await import('../../services/atelier/composeGuards.mjs');
    expect(assertSlotOverrides({ slotOverrides: { negative: 'no watermark' } })).toEqual({ negative: 'no watermark' });
  });
});

describe('the GPU comes back when the WORK stops, not when the WAIT stops', () => {
  it('holds the reservation while the work is still running', async () => {
    // One helper, called by both lanes. It exists because the async lane got this right
    // first and the sync watchdog added an hour later reproduced the original bug exactly
    // — two copies of a subtle release rule is how that happens.
    const { releaseWhenSettled } = await import('../../services/atelier/composeGuards.mjs');
    let released = false;
    const reservation = { release: () => { released = true; } };
    let finish;
    const work = new Promise((r) => { finish = r; });

    releaseWhenSettled(reservation, work, 5000);
    await new Promise((r) => setTimeout(r, 40));
    expect(released).toBe(false);                 // still rendering; card is still ours

    finish();
    await new Promise((r) => setTimeout(r, 20));
    expect(released).toBe(true);                  // work ended, card returned
  });

  it('releases after a bounded grace even when the work NEVER settles', async () => {
    // The opposite mistake: waiting unconditionally means a genuinely hung render holds
    // the card forever, which is the failure the watchdog exists to end.
    const { releaseWhenSettled } = await import('../../services/atelier/composeGuards.mjs');
    let released = false;
    releaseWhenSettled({ release: () => { released = true; } }, new Promise(() => {}), 250);
    await new Promise((r) => setTimeout(r, 400));
    expect(released).toBe(true);
  });

  it('releases exactly once, and immediately when there is no work to wait for', async () => {
    const { releaseWhenSettled } = await import('../../services/atelier/composeGuards.mjs');
    let count = 0;
    releaseWhenSettled({ release: () => { count += 1; } }, null, 250);
    expect(count).toBe(1);

    let n = 0;
    releaseWhenSettled({ release: () => { n += 1; } }, Promise.reject(new Error('boom')), 250);
    await new Promise((r) => setTimeout(r, 300));
    expect(n).toBe(1);                            // a rejected render still returns the card, once
  });
});
