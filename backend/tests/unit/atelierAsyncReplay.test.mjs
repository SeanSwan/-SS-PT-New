/**
 * What a retained idempotency replay is allowed to say.
 *
 * Split from atelierAsyncStills at the 300-line cap. These pin the round-T corrections:
 * a retained stub must not outlive the batch it points at, must not report a frozen
 * "queued" for work that has finished, and must not exist at all for work that failed —
 * retaining there makes a transient failure permanent, because every retry replays the
 * corpse instead of rendering. Both panel seats found that lie independently.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { composeStills } from '../../services/atelier/composeStills.mjs';
import { getBatch, _resetBatches, prune, BATCH_TTL_MS } from '../../services/atelier/batchStore.mjs';
import { _resetSingleFlight } from '../../services/atelier/localStillLane.mjs';

const BRIEF = { text: 'a glacier calving into black water at dawn', intent: 'hero', aspect: '16:9' };
const LOCAL_ENV = { SWAN_ATELIER_LOCAL_STILLS: 'probed', SWAN_ATELIER_STILL_WORKFLOW: '/g/s.json', SWAN_ATELIER_STILL_NODE_PROMPT: '6', SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/wan-2.2' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 2000) => { const t0 = Date.now(); while (!fn()) { if (Date.now() - t0 > ms) throw new Error('timeout'); await sleep(10); } };

function deps(over = {}) {
  return {
    env: LOCAL_ENV, localVerify: () => ({ ok: true, provider: 'comfyui/wan-2.2', problems: [], status: 'probed' }),
    admit: async () => ({ host: 'h', freeMb: 30000, neededMb: 26000 }), store: new Map(),
    limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0, disabled: true },
    renderStill: async ({ seed }) => { await sleep(30); return { image: { kind: 'path', path: `/o/${seed}.png`, mime: 'image/png' }, sha256: 'ab'.repeat(32), bytes: 10, provider: 'comfyui/wan-2.2' }; },
    persist: async ({ stills }) => { stills.forEach((s) => Object.assign(s, { assetId: `asset-${s.seed}`, persist: { ok: true, created: true } })); return { ok: true, persisted: stills.length, total: stills.length }; },
    ...over,
  };
}

beforeEach(() => { _resetSingleFlight(); _resetBatches(); });

describe('a retained replay must not outlive, or misreport, the batch it points at', () => {
  it('a FAILED batch does NOT hold its client key — the retry has to be able to run', async () => {
    // Retaining here would make a transient failure PERMANENT: every retry replays the
    // corpse instead of rendering, and the stub it replays reads `status: 'queued'` for
    // work that is already dead. Both panel seats found the lie independently.
    let renders = 0;
    const store = new Map();
    const d = () => deps({ store, renderStill: async () => { renders += 1; throw new Error('gpu fell over'); } });
    const a = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, d());
    await until(() => getBatch(a.batchId, 1).terminal);
    expect(getBatch(a.batchId, 1).status).toBe('failed');
    await until(() => store.size === 0);

    const before = renders;
    const b = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, d());
    await until(() => getBatch(b.batchId, 1).terminal);
    expect(b.batchId).not.toBe(a.batchId);       // a real second attempt
    expect(renders).toBeGreaterThan(before);     // and it actually reached the GPU
  });

  it('a replay reports the batch\'s REAL terminal status, never a frozen "queued"', async () => {
    // The statusUrl being authoritative does not license the field beside it to lie. A
    // client branching on `status === "queued"` re-enqueues against finished work.
    const store = new Map();
    const a = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, deps({ store }));
    expect(a.status).toBe('queued');             // the FIRST answer is honest: it is queued
    await until(() => getBatch(a.batchId, 1).terminal);

    const b = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, deps({ store }));
    expect(b.replayed).toBe(true);
    expect(b.batchId).toBe(a.batchId);
    expect(b.status).toBe('done');               // ...and so is the second
    expect(b.status).not.toBe('queued');
    expect(b.accepted).toBe(false);              // nothing new was accepted
  });

  it('a pruned batch row takes its retained key with it', async () => {
    // These were two clocks: the row expires an hour after it finishes, the stub lived
    // until it was evicted for room. In between, a retry got "here is your batch" and a
    // URL that 404s — forever, because the stub outlives every retry.
    const store = new Map();
    const a = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, deps({ store }));
    await until(() => getBatch(a.batchId, 1).terminal);
    await until(() => store.size === 1);         // retained, because it succeeded

    // Age the row past its TTL. The next batch's prune reports the drop, and the stub goes.
    const dropped = prune(Date.now() + 61 * 60 * 1000);
    expect(dropped.length).toBe(1);
    for (const k of dropped) store.delete(k);
    expect(store.size).toBe(0);
  });
});

describe('a reservation that cannot be released says so', () => {
  it('does not take the process down, and does not go quiet either', async () => {
    const { releaseWhenSettled } = await import('../../services/atelier/composeGpu.mjs');
    const seen = [];
    let calls = 0;
    // Call-counted, not merely "did not throw" — a test that passes via the `!reservation`
    // early return would prove nothing at all.
    const reservation = { release: () => { calls += 1; throw new Error('lease server said no'); } };
    releaseWhenSettled(reservation, Promise.resolve(), 250, (e) => seen.push(e.message));
    await sleep(30);
    expect(calls).toBe(1);
    expect(seen).toEqual(['lease server said no']);
  });
});

describe('a replay refuses itself once the row it points at is gone', () => {
  it('an expired stub re-renders instead of answering with a dead statusUrl', async () => {
    // The stub used to live until something evicted it, while the row expired an hour after
    // finishing. A delayed retry — exactly what retention exists for — got a confident
    // success payload and a URL that 404s, and the user concluded their render had vanished.
    const store = new Map();
    const a = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, deps({ store }));
    await until(() => getBatch(a.batchId, 1).terminal);
    await until(() => store.size === 1);

    // Same key, asked for LATER than the row can survive. The clock is injected rather than
    // the frozen `now`: the guard samples it at check time, because a deadline compared
    // against request-start time serves a stub that expired while the request queued.
    const later = Date.now() + BATCH_TTL_MS + 60_000;
    const b = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, deps({ store, clock: () => later }));
    expect(b.replayed).toBe(false);          // it ran again
    expect(b.batchId).not.toBe(a.batchId);
  });

  it('a still-fresh stub DOES replay — the guard must not swallow the honest case', async () => {
    const store = new Map();
    const a = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, deps({ store }));
    await until(() => getBatch(a.batchId, 1).terminal);
    const b = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, deps({ store }));
    expect(b.replayed).toBe(true);
    expect(b.batchId).toBe(a.batchId);
  });
});

describe("a partial replay reports the OUTCOME's numbers, not the request's", () => {
  it('an incomplete batch replays what it actually produced', async () => {
    // Spreading the 202 stub alone replayed a 1-of-3 partial as `count: 3` — the number the
    // client asked for, not the number that exists. A client reconciling against the ledger
    // sees frames it was never given.
    let n = 0;
    const store = new Map();
    const d = () => deps({ store, renderStill: async ({ seed }) => {
      n += 1;
      if (n > 1) throw new Error('gpu fell over');
      return { image: { kind: 'path', path: `/o/${seed}.png`, mime: 'image/png' }, sha256: 'ab'.repeat(32), bytes: 10, provider: 'comfyui/wan-2.2' };
    } });
    const a = await composeStills({ brief: BRIEF, lane: 'local', count: 3, userId: 1, idempotencyKey: 'k' }, d());
    await until(() => getBatch(a.batchId, 1).terminal);
    expect(getBatch(a.batchId, 1).status).toBe('partial');

    const b = await composeStills({ brief: BRIEF, lane: 'local', count: 3, userId: 1, idempotencyKey: 'k' }, d());
    expect(b.replayed).toBe(true);
    expect(b.status).toBe('partial');
    expect(b.count).toBe(1);         // what exists
    expect(b.requested).toBe(3);     // what was asked for
    expect(b.failed).toBe(2);        // and the gap, so a NEW key is an informed choice
  });
});

describe('the replay guard fails toward running the work, never toward a hollow answer', () => {
  it('a key that vanishes between has() and get() re-runs instead of returning an empty body', async () => {
    // `has` and `get` are not one operation, and a terminal `.finally` can delete the key
    // between them. Spreading an absent prior would hand the client `{ replayed: true }`
    // with no fields at all — a 200 that says nothing — rather than doing the work.
    const store = {
      has: () => true,               // claims to hold it...
      get: async () => undefined,    // ...and does not
      set: () => {}, delete: () => {},
    };
    const out = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, deps({ store }));
    expect(out.replayed).toBe(false);
    expect(out.batchId).toBeTruthy();
  });

  it('does not hand the client its own bookkeeping', async () => {
    // `replayExpiresAt` exists for the guard. It is not something a caller can act on, and
    // shipping it makes an internal deadline part of the contract by accident.
    const store = new Map();
    const a = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, deps({ store }));
    await until(() => getBatch(a.batchId, 1).terminal);
    const b = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, deps({ store }));
    expect(b.replayed).toBe(true);
    expect(b.replayExpiresAt).toBeUndefined();
  });
});

describe('a stub that landed is never deleted by bookkeeping that did not', () => {
  it('keeps the retained stub when rememberKey throws after the write', async () => {
    // The catch used to delete unconditionally — right for a failed `store.set` (the stale
    // 202 promise would answer "queued" forever), exactly wrong for anything failing after
    // it. A partial batch that delivered and billed frames would be re-rendered and billed
    // a second time. The two cases have opposite money semantics.
    const store = new Map();
    const a = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' },
      deps({ store, rememberKey: () => { throw new Error('eviction bookkeeping fell over'); } }));
    await until(() => getBatch(a.batchId, 1).terminal);
    await sleep(30);
    expect(store.size).toBe(1);                    // the money-safe stub survived

    const b = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, deps({ store }));
    expect(b.replayed).toBe(true);                 // and the retry collects instead of re-rendering
    expect(b.batchId).toBe(a.batchId);
  });
});

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

describe('a partial replay prices what it delivered', () => {
  it('charges follow the frames that exist, as the synchronous lane already does', async () => {
    // `count` was corrected to the outcome last round and `cost` was left spread from the
    // 202 stub, so a partial replayed frames delivered beside a quote for frames requested
    // — outcome-truth and request-truth in one body.
    let n = 0;
    const store = new Map();
    const d = () => deps({ store, renderStill: async ({ seed }) => {
      n += 1;
      if (n > 2) throw new Error('gpu fell over');
      return { image: { kind: 'path', path: `/o/${seed}.png`, mime: 'image/png' }, sha256: 'ab'.repeat(32), bytes: 10, provider: 'comfyui/wan-2.2' };
    } });
    const a = await composeStills({ brief: BRIEF, lane: 'local', count: 4, userId: 1, idempotencyKey: 'k' }, d());
    await until(() => getBatch(a.batchId, 1).terminal);
    expect(getBatch(a.batchId, 1).status).toBe('partial');

    const b = await composeStills({ brief: BRIEF, lane: 'local', count: 4, userId: 1, idempotencyKey: 'k' }, d());
    expect(b.replayed).toBe(true);
    expect(b.count).toBe(2);
    expect(b.requested).toBe(4);
    // NOT ASSERTING chargedUsd, and the reason is worth more than the assertion would be.
    // The stub now prices delivered frames the way the synchronous lane does — but the only
    // async lane is LOCAL, where unitUsd is 0, so the expression is 0 either way and a test
    // on it compares zero to zero. It cannot fail, which means it is not a test; it would
    // just sit here reading green and be mistaken for proof by whoever adds a paid async
    // lane. The parity is real and currently unobservable, and saying so is the honest
    // record. Whoever makes a charging lane async: this is the assertion to write then.
    expect(b.cost.unitUsd).toBe(0);
  });
});
