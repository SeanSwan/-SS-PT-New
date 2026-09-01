/**
 * The money gates, exercised through the real orchestrator with a real ledger.
 *
 * Split from laneLedger.test.mjs when it crossed the 300-line cap. That file tests the
 * COUNTER; this one tests the GATES the counter makes real — and the difference matters,
 * because the counter was correct for months while the gates it fed were comparing every
 * request against zero.
 *
 * WHAT THESE EXIST TO PREVENT
 *   1. Two CONCURRENT batches both passing a ceiling neither passes alone. Six reviewers
 *      found this in the first draft; the sequential test could never have caught it.
 *   2. A billed batch proceeding when its cost could not be recorded.
 *   3. A price preview consuming budget, or a replay being counted twice.
 *   4. A free lane taken down by a bookkeeping problem.
 *   5. A billed video provider running with no ledger at all.
 */

import { describe, it, expect } from 'vitest';
import { makeLaneLedger } from '../../services/laneLedger.mjs';
import { composeStills } from '../../services/atelier/composeStills.mjs';
import { _resetBatches, getBatch } from '../../services/atelier/batchStore.mjs';
import { _resetSingleFlight } from '../../services/atelier/localStillLane.mjs';
import { spendGate } from '../../scripts/handlers/videoSpendGate.mjs';

/** An in-memory filesystem with exactly the four calls the ledger makes. */
function fakeFs({ seed = null, failWrite = false } = {}) {
  const files = new Map();
  if (seed !== null) files.set('SEEDED', seed);
  return {
    _files: files,
    _mkdirs: [],
    readFileSync(p) {
      const v = files.has(p) ? files.get(p) : files.get('SEEDED');
      if (v === undefined) { const e = new Error('ENOENT: no such file'); e.code = 'ENOENT'; throw e; }
      return v;
    },
    writeFileSync(p, data) {
      if (failWrite) { const e = new Error('EACCES: permission denied'); e.code = 'EACCES'; throw e; }
      files.set(p, data);
      files.delete('SEEDED');
    },
    mkdirSync(p) { this._mkdirs.push(p); },
  };
}

const DAY = '2026-08-25';
const at = new Date(`${DAY}T12:00:00Z`);

const BRIEF = { text: 'a glacier calving into black water at dawn', intent: 'hero', aspect: '16:9' };
const MODEL = 'openai/gpt-5.4-image-2';
const hostedOk = () => ({ ok: true, model: MODEL, problems: [] });
const gen = async () => ({ images: ['b64'], usage: {} });
const noPersist = async () => ({ ok: false, persisted: 0, code: 'E_STORAGE_UNCONFIGURED' });

function hostedDeps(ledger, over = {}) {
  return {
    env: {}, verifier: hostedOk, generator: gen, persist: noPersist, store: new Map(),
    limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0.01, disabled: false },
    usage: ledger.usageToday(), commit: (d) => ledger.tryCommit(d),
    ...over,
  };
}

function localDeps(ledger, over = {}) {
  return {
    env: { SWAN_ATELIER_LOCAL_STILLS: 'probed', SWAN_ATELIER_STILL_WORKFLOW: '/g/s.json', SWAN_ATELIER_STILL_NODE_PROMPT: '6', SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/wan-2.2' },
    localVerify: () => ({ ok: true, provider: 'comfyui/wan-2.2', problems: [], status: 'probed' }),
    admit: async () => ({ host: 'h', freeMb: 30000, neededMb: 26000 }),
    renderStill: async ({ seed }) => ({ image: { kind: 'path', path: `/o/${seed}.png`, mime: 'image/png' }, sha256: 'ab'.repeat(32), bytes: 1, provider: 'comfyui/wan-2.2' }),
    persist: async ({ stills }) => { stills.forEach((x) => Object.assign(x, { assetId: 'a1', persist: { ok: true } })); return { ok: true, persisted: stills.length, total: stills.length }; },
    store: new Map(), limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0, disabled: true },
    usage: ledger.usageToday(), commit: (d) => ledger.tryCommit(d),
    ...over,
  };
}

describe('the ceiling is now a day, proven end to end', () => {
  it('TWO SEQUENTIAL BATCHES: the second is refused by the first\'s total', async () => {
    const ledger = makeLaneLedger({ lane: 'atelier', io: fakeFs(), now: () => at });
    // One 2-up at $0.0039/image = $0.0078, under the $0.01 ceiling.
    const first = await composeStills({ brief: BRIEF, lane: 'hosted', count: 2, userId: 1 }, hostedDeps(ledger));
    expect(first.stills).toHaveLength(2);
    expect(ledger.usageToday().spendUsd).toBeCloseTo(0.0078, 6);
    // The SAME request again. Before the ledger was wired this passed, and so would the
    // next fifty: each batch was only ever compared against zero.
    const err = await composeStills({ brief: { ...BRIEF, text: 'a different subject entirely' }, lane: 'hosted', count: 2, userId: 1 },
      hostedDeps(ledger)).catch((e) => e);
    expect(err.code).toBe('E_SPEND_CEILING');
    expect(err.message).toMatch(/today's spend is \$0\.0078/);
  });

  it("TWO CONCURRENT BATCHES: exactly one is refused — the race five reviewers found", async () => {
    // THE regression for this iteration. Each batch is $0.0078 against a $0.01 cap, so
    // either alone passes and the two together must not. Both requests capture their
    // `usage` snapshot BEFORE either commits — which is exactly what the route does, one
    // snapshot per request — so under the previous design (check here, record there, awaits
    // in between) both read $0, both passed, and $0.0156 went out against a $0.01 ceiling.
    // tryCommit reads, checks and writes with no await between them, so the second loses.
    const ledger = makeLaneLedger({ lane: 'atelier', io: fakeFs(), now: () => at });
    const a = composeStills({ brief: BRIEF, lane: 'hosted', count: 2, userId: 1, idempotencyKey: 'a' }, hostedDeps(ledger));
    const b = composeStills({ brief: { ...BRIEF, text: 'a wholly different subject' }, lane: 'hosted', count: 2, userId: 1, idempotencyKey: 'b' }, hostedDeps(ledger));
    const out = await Promise.allSettled([a, b]);
    const ok = out.filter((r) => r.status === 'fulfilled');
    const no = out.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(no).toHaveLength(1);
    expect(no[0].reason.code).toBe('E_SPEND_CEILING');
    // And the ledger holds exactly ONE batch's worth, not two.
    expect(ledger.usageToday().spendUsd).toBeCloseTo(0.0078, 6);
  });

  it("a BILLED batch is refused when the ledger cannot be written — it commits BEFORE it spends", async () => {
    // The first draft reasoned "never throw, the request already spent". True where the
    // record happens after generation (the video lane); FALSE here, because nothing has
    // been spent at commit time. Proceeding would be unbounded spend with no counter.
    const ledger = makeLaneLedger({ lane: 'atelier', io: fakeFs({ failWrite: true }), now: () => at });
    let generated = false;
    const err = await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1 },
      hostedDeps(ledger, { generator: async () => { generated = true; return { images: ['b64'], usage: {} }; } })).catch((e) => e);
    expect(err.code).toBe('E_LEDGER_UNWRITABLE');
    expect(generated).toBe(false);        // the provider was never called
  });

  it("a FREE batch still runs when the ledger cannot be written — no money is at stake", async () => {
    _resetSingleFlight(); _resetBatches();
    const ledger = makeLaneLedger({ lane: 'atelier', io: fakeFs({ failWrite: true }), now: () => at });
    const out = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1 }, localDeps(ledger));
    expect(out.accepted).toBe(true);
    const t0 = Date.now();
    while (!getBatch(out.batchId, 1).terminal && Date.now() - t0 < 2000) await new Promise((r) => setTimeout(r, 10));
    expect(getBatch(out.batchId, 1).status).toBe('done');
  });

  it('an ESTIMATE does not consume budget — a price preview must be free', async () => {
    const ledger = makeLaneLedger({ lane: 'atelier', io: fakeFs(), now: () => at });
    const est = await composeStills({ brief: BRIEF, lane: 'hosted', count: 2, userId: 1, estimateOnly: true }, hostedDeps(ledger));
    expect(est.estimateOnly).toBe(true);
    expect(ledger.usageToday()).toMatchObject({ runs: 0, spendUsd: 0 });
  });

  it('a REPLAY is not counted twice', async () => {
    const ledger = makeLaneLedger({ lane: 'atelier', io: fakeFs(), now: () => at });
    const store = new Map();
    const d = () => hostedDeps(ledger, { store });
    await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1, idempotencyKey: 'k' }, d());
    const after = ledger.usageToday().spendUsd;
    const replay = await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1, idempotencyKey: 'k' }, d());
    expect(replay.replayed).toBe(true);
    expect(ledger.usageToday().spendUsd).toBe(after);
  });

  it('the RUN CAP accumulates too, so a free lane cannot render forever', async () => {
    const ledger = makeLaneLedger({ lane: 'atelier', io: fakeFs(), now: () => at });
    ledger.recordToday({ runs: 49, spendUsd: 0 });
    const err = await composeStills({ brief: BRIEF, lane: 'hosted', count: 2, userId: 1 }, hostedDeps(ledger)).catch((e) => e);
    expect(err.code).toBe('E_RUN_CAP');
    expect(err.message).toMatch(/49\/50/);
  });

  it('a DEGRADED ledger refuses the billed lane', async () => {
    const ledger = makeLaneLedger({ lane: 'atelier', io: fakeFs({ seed: '}{' }), now: () => at });
    const err = await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1 }, hostedDeps(ledger)).catch((e) => e);
    expect(err.code).toBe('E_LEDGER_DEGRADED');
  });

  it('a degraded ledger leaves the FREE local lane running — bookkeeping is not an outage', async () => {
    _resetSingleFlight(); _resetBatches();
    const ledger = makeLaneLedger({ lane: 'atelier', io: fakeFs({ seed: '}{' }), now: () => at });
    const out = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1 }, localDeps(ledger));
    expect(out.accepted).toBe(true);
    // The free lane costs $0 but still spends a GPU, so it counts RUNS and no money.
    const t0 = Date.now();
    while (!getBatch(out.batchId, 1).terminal && Date.now() - t0 < 2000) await new Promise((r) => setTimeout(r, 10));
    expect(ledger.usageToday().spendUsd).toBe(0);
    expect(ledger.usageToday().runs).toBe(1);
  });
});

describe('the video lane fails CLOSED when no ledger is supplied', () => {
  const env = { SWAN_VIDEO_MAX_SPEND_USD_DAILY: '10', SWAN_VIDEO_MAX_RUNS_DAILY: '50' };
  const now = () => at;

  it("refuses a BILLED provider outright — a control that can be omitted is not a control", () => {
    // `ledger` defaulted to null for months and nothing passed one, so the daily ceiling
    // was compared against zero on every job. Wiring today's one caller does not fix the
    // SHAPE: the next caller inherits an uncapped lane silently, which is how this
    // happened the first time.
    const caps = { provider: 'hosted/expensive', costPerRunUsd: 0.64 };
    let err;
    try { spendGate({ caps, env, ledger: null, now }); } catch (e) { err = e; }
    expect(err?.code).toBe('E_LEDGER_REQUIRED');
    expect(err?.permanent).toBe(true);          // retrying grows no ledger
    expect(err?.message).toMatch(/hosted\/expensive/);
  });

  it('still runs a FREE provider without one — there is no money to count', () => {
    const caps = { provider: 'comfyui/wan-2.2', costPerRunUsd: 0 };
    expect(() => spendGate({ caps, env, ledger: null, now })).not.toThrow();
  });

  it('accepts a real ledger and counts against it', () => {
    const caps = { provider: 'hosted/expensive', costPerRunUsd: 0.64 };
    const ledger = makeLaneLedger({ lane: 'video', io: fakeFs(), now });
    ledger.recordToday({ runs: 1, spendUsd: 9.5 });
    // 9.5 + 0.64 passes the $10 ceiling, so the gate refuses on the TOTAL, not the run.
    expect(() => spendGate({ caps, env, ledger, now })).toThrow(/ceiling|cap/i);
  });
});
