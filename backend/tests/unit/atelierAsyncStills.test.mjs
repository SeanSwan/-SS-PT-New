/**
 * Async local stills — the lane answers at once and renders in the background.
 *
 * WHAT THESE TESTS EXIST TO PREVENT
 *   1. A local batch holding the request open for minutes (the unanimous P1).
 *   2. A poll that sees a still before that still has an asset id.
 *   3. A batch left "running" forever after a crash — it must reach a terminal state.
 *   4. The GPU reservation leaking when the background half fails.
 *   5. A double-click starting two batches — the idempotency key maps to ONE batch id.
 *   6. Another owner reading your batch.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { composeStills } from '../../services/atelier/composeStills.mjs';
import { getBatch, _resetBatches, assertBatchId, prune, snapshot } from '../../services/atelier/batchStore.mjs';
import { _resetSingleFlight, reserveGpu } from '../../services/atelier/localStillLane.mjs';

const BRIEF = { text: 'a glacier calving into black water at dawn', intent: 'hero', aspect: '16:9' };
const LOCAL_ENV = { SWAN_ATELIER_LOCAL_STILLS: 'probed', SWAN_ATELIER_STILL_WORKFLOW: '/g/s.json', SWAN_ATELIER_STILL_NODE_PROMPT: '6', SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/wan-2.2' };
const readyLocal = () => ({ ok: true, provider: 'comfyui/wan-2.2', problems: [], status: 'probed' });
const admitOk = async () => ({ host: 'h', freeMb: 30000, neededMb: 26000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 2000) => { const t0 = Date.now(); while (!fn()) { if (Date.now() - t0 > ms) throw new Error('timeout'); await sleep(10); } };

function deps(over = {}) {
  return {
    env: LOCAL_ENV, localVerify: readyLocal, admit: admitOk, store: new Map(),
    limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0, disabled: true },
    renderStill: async ({ seed }) => { await sleep(30); return { image: { kind: 'path', path: `/o/${seed}.png`, mime: 'image/png' }, sha256: 'ab'.repeat(32), bytes: 10, provider: 'comfyui/wan-2.2' }; },
    persist: async ({ stills }) => { stills.forEach((s) => Object.assign(s, { assetId: `asset-${s.seed}`, persist: { ok: true, created: true } })); return { ok: true, persisted: stills.length, total: stills.length }; },
    ...over,
  };
}

beforeEach(() => { _resetSingleFlight(); _resetBatches(); });

describe('the local lane answers at once', () => {
  it('returns accepted + batchId without waiting for a single frame', async () => {
    const t0 = Date.now();
    const out = await composeStills({ brief: BRIEF, lane: 'local', count: 3, userId: 1 }, deps());
    expect(out.accepted).toBe(true);
    expect(out.batchId).toMatch(/^[0-9a-f-]{36}$/);
    expect(out.statusUrl).toBe(`/api/atelier/compose/stills/${out.batchId}`);
    expect(Date.now() - t0).toBeLessThan(25); // three frames at 30ms each would be 90ms
    expect(getBatch(out.batchId, 1).status).toMatch(/queued|running/);
  });

  it('every still the poll sees already has its asset id; the batch ends done', async () => {
    const out = await composeStills({ brief: BRIEF, lane: 'local', count: 3, userId: 1 }, deps());
    await until(() => getBatch(out.batchId, 1).terminal);
    const snap = getBatch(out.batchId, 1);
    expect(snap.status).toBe('done');
    expect(snap.stills).toHaveLength(3);
    expect(snap.stills.every((s) => s.assetId && s.persist.ok)).toBe(true);
    expect(snap.persistence).toMatchObject({ ok: true, persisted: 3 });
    expect(snap.rendered).toBe(3);
  });

  it('a mid-batch failure lands with its code and the batch ends partial', async () => {
    let n = 0;
    const d = deps({ renderStill: async ({ seed }) => { n += 1; if (n === 2) throw Object.assign(new Error('OOM'), { code: 'E_LOCAL_RENDER' }); return { image: { kind: 'path', path: `/o/${seed}.png`, mime: 'image/png' }, sha256: 'ab'.repeat(32), bytes: 1, provider: 'comfyui/wan-2.2' }; } });
    const out = await composeStills({ brief: BRIEF, lane: 'local', count: 3, userId: 1 }, d);
    await until(() => getBatch(out.batchId, 1).terminal);
    const snap = getBatch(out.batchId, 1);
    expect(snap.status).toBe('partial');
    expect(snap.stills).toHaveLength(2);
    expect(snap.failures[0]).toMatchObject({ index: 1, code: 'E_LOCAL_RENDER' });
  });

  it('a crash before rendering reaches a terminal FAILED state and releases the GPU', async () => {
    const d = deps({ compiler: () => { throw Object.assign(new Error('law'), { code: 'E_LAW_VIOLATION' }); } });
    const out = await composeStills({ brief: BRIEF, lane: 'local', count: 2, userId: 1 }, d);
    await until(() => getBatch(out.batchId, 1).terminal);
    const snap = getBatch(out.batchId, 1);
    expect(snap.status).toBe('failed');
    expect(snap.error.code).toBe('E_LAW_VIOLATION');
    // GPU released: a fresh reservation succeeds.
    expect(() => reserveGpu().release()).not.toThrow();
  });
});

describe('one batch per request, and only for its owner', () => {
  it('a double-click maps to the SAME batch id (replayed), not a second render', async () => {
    const d = deps();
    const a = await composeStills({ brief: BRIEF, lane: 'local', count: 2, userId: 1, idempotencyKey: 'k' }, d);
    const b = await composeStills({ brief: BRIEF, lane: 'local', count: 2, userId: 1, idempotencyKey: 'k' }, d);
    expect(b.batchId).toBe(a.batchId);
    expect(b.replayed).toBe(true);
    await until(() => getBatch(a.batchId, 1).terminal);
  });

  it('a second batch while one is running is refused, not queued', async () => {
    const d = deps();
    await composeStills({ brief: BRIEF, lane: 'local', count: 2, userId: 1, idempotencyKey: 'a' }, d);
    const err = await composeStills({ brief: { ...BRIEF, text: 'another' }, lane: 'local', count: 1, userId: 1, idempotencyKey: 'b' }, d).catch((e) => e);
    expect(err.code).toBe('E_LOCAL_BUSY');
  });

  it('another owner cannot read the batch', async () => {
    const out = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1 }, deps());
    expect(getBatch(out.batchId, 2)).toBeNull();
    await until(() => getBatch(out.batchId, 1).terminal);
  });

  it('the hosted lane is still synchronous', async () => {
    const out = await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1 }, {
      env: {}, verifier: () => ({ ok: true, model: 'openai/gpt-5.4-image-2', problems: [] }), store: new Map(),
      limits: { maxRunsDaily: 50, maxSpendUsdDaily: 5, disabled: false }, generator: async () => ({ images: ['b64'], usage: {} }),
      commit: () => ({ allowed: true }),   // hosted lane spends; the gate is explicit now
      persist: async () => ({ ok: false, persisted: 0, code: 'E_STORAGE_UNCONFIGURED' }),
    });
    expect(out.accepted).toBeUndefined();
    expect(out.stills).toHaveLength(1);
  });
});

describe('what the panel found', () => {
  it("a CLIENT-supplied idempotency key is namespaced by owner — B cannot land on A's batch", async () => {
    const store = new Map();
    const a = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'shared-header' }, deps({ store }));
    // Owner 2 presents the SAME header. It must not resolve to owner 1's batch.
    const b = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 2, idempotencyKey: 'shared-header' }, deps({ store })).catch((e) => e);
    expect(b.batchId === a.batchId).toBe(false);
    await until(() => getBatch(a.batchId, 1).terminal);
  });

  it('the idempotency key is evicted when the batch is terminal, so a deliberate re-render runs', async () => {
    const store = new Map();
    const d = () => deps({ store });
    const a = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, d());
    await until(() => getBatch(a.batchId, 1).terminal);
    await until(() => !store.has([...store.keys()][0] ?? '__none__') || store.size === 0);
    const b = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, idempotencyKey: 'k' }, d());
    expect(b.batchId).not.toBe(a.batchId);
    expect(b.replayed).toBe(false);
    await until(() => getBatch(b.batchId, 1).terminal);
  });

  it('a hung render still reaches a terminal state and frees the GPU (watchdog)', async () => {
    const d = deps({ renderStill: () => new Promise(() => {}), watchdogMs: 60 });
    const out = await composeStills({ brief: BRIEF, lane: 'local', count: 2, userId: 1 }, d);
    await until(() => getBatch(out.batchId, 1).terminal, 3000);
    const snap = getBatch(out.batchId, 1);
    expect(snap.status).toBe('failed');
    expect(snap.error.code).toBe('E_BATCH_TIMEOUT');
    expect(() => reserveGpu().release()).not.toThrow();
  });

  it('an ESTIMATE never reserves the GPU — a price preview during a batch still answers', async () => {
    const store = new Map();
    const running = await composeStills({ brief: BRIEF, lane: 'local', count: 2, userId: 1, idempotencyKey: 'r' }, deps({ store }));
    const est = await composeStills({ brief: BRIEF, lane: 'local', count: 2, userId: 1, estimateOnly: true }, deps({ store }));
    expect(est.estimateOnly).toBe(true);
    expect(est.cost.totalUsd).toBe(0);
    await until(() => getBatch(running.batchId, 1).terminal);
  });

  it('a malformed batch id is a bad request, not a missing batch', () => {
    expect(() => assertBatchId('----------------------------------- ')).toThrow(expect.objectContaining({ code: 'E_BAD_BATCH_ID' }));
    expect(() => assertBatchId('x'.repeat(36))).toThrow(expect.objectContaining({ code: 'E_BAD_BATCH_ID' }));
    expect(() => assertBatchId('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).not.toThrow();
  });

  it('prune drops finished batches past the TTL and NEVER a running one', async () => {
    const out = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1 }, deps());
    prune(Date.now() + 3 * 60 * 60 * 1000);        // running: survives
    expect(getBatch(out.batchId, 1)).not.toBeNull();
    await until(() => getBatch(out.batchId, 1).terminal);
    prune(Date.now() + 3 * 60 * 60 * 1000);        // finished + past TTL: gone
    expect(getBatch(out.batchId, 1)).toBeNull();
  });
});
