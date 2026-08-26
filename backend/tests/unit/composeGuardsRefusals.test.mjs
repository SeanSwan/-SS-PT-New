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

describe('the coalescing identity must include everything that changes the output', () => {
  it('brandKit, lawProfile, cinematic and mode all change the key', async () => {
    // brandKit is the one that mattered: it arrived a slice after the key was written and
    // nobody came back, so the SAME brief under swanstudios and under universal derived
    // the SAME key — and the second request silently received the first's
    // differently-branded images. A key that ignores an input is not an identity.
    const { deriveKey } = await import('../../services/atelier/composeLimits.mjs');
    const base = { brief: { text: 'a glacier' }, promptSource: 'brief', lane: 'hosted', model: 'm', count: 1, userId: 7 };
    const now = Date.now();
    const pairs = [
      ['brandKit', { brandKit: 'swanstudios' }, { brandKit: 'universal' }],
      ['lawProfile', { lawProfile: 'full' }, { lawProfile: 'universal' }],
      ['cinematic', { cinematic: true }, { cinematic: false }],
      ['mode', { mode: 'a' }, { mode: 'b' }],
    ];
    for (const [label, a, b] of pairs) {
      expect(deriveKey({ ...base, ...a }, now), `${label} did not change the key`)
        .not.toBe(deriveKey({ ...base, ...b }, now));
    }
  });

  it('and an identical request still coalesces with itself', async () => {
    const { deriveKey } = await import('../../services/atelier/composeLimits.mjs');
    const req = { brief: { text: 'a glacier' }, promptSource: 'brief', lane: 'hosted', model: 'm', count: 1, userId: 7, brandKit: 'swanstudios' };
    const now = Date.now();
    expect(deriveKey(req, now)).toBe(deriveKey(req, now));
  });
});

describe('the identity, one round later', () => {
  it('includes the top-level aspect and the slot overrides', async () => {
    // Found one round after brandKit, in the same file that had just declared "every
    // field that changes the output belongs in the identity". The top-level aspect
    // overrides the brief's, and slot overrides replace compiler slots outright.
    const { deriveKey } = await import('../../services/atelier/composeLimits.mjs');
    const base = { brief: { text: 'a glacier' }, promptSource: 'brief', lane: 'hosted', model: 'm', count: 1, userId: 7 };
    const now = Date.now();
    expect(deriveKey({ ...base, aspect: '16:9' }, now)).not.toBe(deriveKey({ ...base, aspect: '1:1' }, now));
    expect(deriveKey({ ...base, brief: { ...base.brief, slotOverrides: { negative: 'a' } } }, now))
      .not.toBe(deriveKey({ ...base, brief: { ...base.brief, slotOverrides: { negative: 'b' } } }, now));
  });
});

describe('slot overrides are a channel past the brief length gate', () => {
  it('refuses an oversized override', async () => {
    // MAX_BRIEF_CHARS guards brief.text and NOTHING ELSE, so slotOverrides was an
    // unbounded channel straight past it into the compiler and out to a provider. A
    // reviewer found it by asking the question the length gate never asked: what else
    // reaches the compiler?
    const { assertSlotOverrides, MAX_SLOT_OVERRIDE_CHARS } = await import('../../services/atelier/composeGuards.mjs');
    let err;
    try { assertSlotOverrides({ slotOverrides: { negative: 'x'.repeat(MAX_SLOT_OVERRIDE_CHARS + 1) } }); } catch (e) { err = e; }
    expect(err?.code).toBe('E_BAD_SLOT_OVERRIDE');
    expect(err.message).toMatch(/characters/);
  });

  it('refuses too many slots, and non-text values', async () => {
    const { assertSlotOverrides, MAX_SLOT_OVERRIDES } = await import('../../services/atelier/composeGuards.mjs');
    const many = Object.fromEntries(Array.from({ length: MAX_SLOT_OVERRIDES + 1 }, (_, i) => [`s${i}`, 'x']));
    expect(() => assertSlotOverrides({ slotOverrides: many })).toThrow(expect.objectContaining({ code: 'E_BAD_SLOT_OVERRIDE' }));
    expect(() => assertSlotOverrides({ slotOverrides: { negative: 42 } })).toThrow(expect.objectContaining({ code: 'E_BAD_SLOT_OVERRIDE' }));
    expect(() => assertSlotOverrides({ slotOverrides: ['a'] })).toThrow(expect.objectContaining({ code: 'E_BAD_SLOT_OVERRIDE' }));
  });

  it('NORMALISES the values, so NFC and NFD spellings are one request', async () => {
    // The brief gets normalised and the overrides did not, so the same word in two
    // encodings produced two different prompts — and, once the key hashed them, two
    // different keys for one intent.
    const { assertSlotOverrides } = await import('../../services/atelier/composeGuards.mjs');
    const nfc = assertSlotOverrides({ slotOverrides: { negative: 'caf\u00e9' } });
    const nfd = assertSlotOverrides({ slotOverrides: { negative: 'cafe\u0301' } });
    expect(nfc.negative).toBe(nfd.negative);
  });

  it('passes an absent or empty override through untouched', async () => {
    const { assertSlotOverrides } = await import('../../services/atelier/composeGuards.mjs');
    expect(assertSlotOverrides({})).toBeUndefined();
    expect(assertSlotOverrides({ slotOverrides: {} })).toEqual({});
  });
});
