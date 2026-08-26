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

    // Same key, but asked for LATER than the row can survive.
    const later = Date.now() + BATCH_TTL_MS + 60_000;
    const b = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, deps({ store, now: later }));
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
