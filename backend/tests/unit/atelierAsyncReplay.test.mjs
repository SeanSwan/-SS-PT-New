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
import { getBatch, _resetBatches, prune } from '../../services/atelier/batchStore.mjs';
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
