/**
 * The gates a brand kit puts in front of a render.
 *
 * Split from brandKits.test.mjs at the 300-line cap. That file tests what a kit IS and
 * what it does to a brief; this one tests what it REFUSES — and both refusals here were
 * found bypassable by reviewers reading the real source, which is why they are pinned
 * separately rather than buried among the happy paths.
 */

import { describe, it, expect } from 'vitest';
import { resolveBrandKit } from '../../../shared/brandKits/registry.mjs';
import { composeStills } from '../../services/atelier/composeStills.mjs';
import { _resetBatches, getBatch } from '../../services/atelier/batchStore.mjs';
import { _resetSingleFlight } from '../../services/atelier/localStillLane.mjs';

const MODEL = 'openai/gpt-5.4-image-2';
const BRIEF = { text: 'a glacier calving into black water at dawn', intent: 'hero', aspect: '16:9' };

function capturingDeps(over = {}) {
  const seen = [];
  return {
    seen,
    deps: {
      env: {}, verifier: () => ({ ok: true, model: MODEL, problems: [] }),
      generator: async (compiled) => { seen.push(compiled.promptText || ''); return { images: ['b64'], usage: {} }; },
      persist: async () => ({ ok: false, persisted: 0, code: 'E_STORAGE_UNCONFIGURED' }),
      store: new Map(), limits: { maxRunsDaily: 50, maxSpendUsdDaily: 5, disabled: false },
      commit: () => ({ allowed: true }),
      ...over,
    },
  };
}

function localDepsNoGate() {
  return {
    env: { SWAN_ATELIER_LOCAL_STILLS: 'probed', SWAN_ATELIER_STILL_WORKFLOW: '/g/s.json', SWAN_ATELIER_STILL_NODE_PROMPT: '6', SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/wan-2.2' },
    localVerify: () => ({ ok: true, provider: 'comfyui/wan-2.2', problems: [], status: 'probed' }),
    admit: async () => ({ host: 'h', freeMb: 30000, neededMb: 26000 }),
    renderStill: async ({ seed }) => ({ image: { kind: 'path', path: `/o/${seed}.png`, mime: 'image/png' }, sha256: 'ab'.repeat(32), bytes: 1, provider: 'comfyui/wan-2.2' }),
    persist: async ({ stills }) => { stills.forEach((x) => Object.assign(x, { assetId: 'a1', persist: { ok: true } })); return { ok: true, persisted: stills.length, total: stills.length }; },
    store: new Map(), limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0, disabled: true },
    // NO `commit` on purpose.
  };
}

describe('the taste refusal cannot be bought off with an override', () => {
  it('brandKit universal + lawProfile full is STILL refused', async () => {
    // Two reviewers found this independently, reading the real source. The gate tested the
    // MERGED law profile, and the caller's explicit override wins that merge — so one
    // extra parameter walked straight through a refusal built to stop a brand-scope leak.
    // The gate now judges the KIT's own profile, which no request parameter can move.
    const { seen, deps } = capturingDeps();
    const err = await composeStills({
      brief: BRIEF, promptSource: 'taste', lane: 'local', count: 1, userId: 1,
      brandKit: 'universal', lawProfile: 'full',
    }, deps).catch((e) => e);
    expect(err.code).toBe('E_TASTE_IS_SWAN_ONLY');
    expect(seen).toHaveLength(0);
  });

  it('and the Swan kit may still use taste even when its laws are relaxed', async () => {
    // The corpus belongs to the Swan BRAND, not to a law profile. Relaxing the laws on
    // Swan's own work is a different decision from rendering someone else's brand from it.
    const kit = resolveBrandKit('swanstudios', { lawProfile: 'universal' });
    expect(kit.lawProfileFromKit).toBe('full');     // what the taste gate reads
    expect(kit.lawProfile).toBe('universal');       // what the compiler reads
  });
});

describe('the money gate cannot be dropped by accident', () => {
  it('spending with NO gate wired is refused, not permitted', async () => {
    // The default used to be `() => ({ allowed: true })`, so a route that omitted or
    // misspelled `commit` spent without a ceiling and without a sound. Same class as the
    // video lane's `ledger = null`, in the file next door.
    const { seen, deps } = capturingDeps();
    delete deps.commit;
    const err = await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, userId: 1 }, deps).catch((e) => e);
    expect(err.code).toBe('E_NO_SPEND_GATE');
    expect(seen).toHaveLength(0);
  });

  it('but FREE work still runs without one — there is no money to count', async () => {
    _resetSingleFlight(); _resetBatches();
    const d = localDepsNoGate();
    const out = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1 }, d);
    expect(out.accepted).toBe(true);
  });
});

describe('an idempotency key needs an owner', () => {
  it('refuses a client key with no userId, instead of sharing one anon namespace', async () => {
    // `u${userId ?? 'anon'}` put every unauthenticated caller in ONE namespace, so two of
    // them sending the same key coalesced onto each other's work — the second receiving
    // the first's stills. The same confused deputy an earlier round fixed for
    // authenticated users, still standing for anonymous ones, found two rounds apart.
    const { seen, deps } = capturingDeps();
    const err = await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, idempotencyKey: 'shared' }, deps).catch((e) => e);
    expect(err.code).toBe('E_BAD_OWNER');
    expect(seen).toHaveLength(0);
  });

  it('and permits it once an owner is present', async () => {
    const { deps } = capturingDeps();
    const out = await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, idempotencyKey: 'shared', userId: 7 }, deps);
    expect(out.stills).toHaveLength(1);
  });
});

describe('a replay is not refused by a cap it already paid into', () => {
  it('replays at the run cap instead of throwing E_RUN_CAP', async () => {
    // GATE 2 used to run before the replay probe. At the cap, a retry of a request that
    // ALREADY RAN AND WAS ALREADY PAID FOR was refused — the caller charged for work it
    // could not collect, by a cap defending headroom that request had already consumed.
    // A replay costs no GPU and no money, so nothing it could breach applies to it.
    const { deps } = capturingDeps({ limits: { maxRunsDaily: 4, maxSpendUsdDaily: 5, disabled: false } });
    const store = deps.store;
    const first = await composeStills({ brief: BRIEF, lane: 'hosted', count: 4, userId: 1, idempotencyKey: 'k' }, deps);
    expect(first.stills).toHaveLength(4);

    // Now the day's usage has caught up to the cap...
    const atCap = capturingDeps({ store, usage: { runs: 4, spendUsd: 0 }, limits: { maxRunsDaily: 4, maxSpendUsdDaily: 5, disabled: false } });
    const replay = await composeStills({ brief: BRIEF, lane: 'hosted', count: 4, userId: 1, idempotencyKey: 'k' }, atCap.deps);
    expect(replay.replayed).toBe(true);
    expect(atCap.seen).toHaveLength(0);          // and it generated nothing to do it
  });

  it('a genuinely NEW request at the cap is still refused', async () => {
    const { seen, deps } = capturingDeps({ usage: { runs: 4, spendUsd: 0 }, limits: { maxRunsDaily: 4, maxSpendUsdDaily: 5, disabled: false } });
    const err = await composeStills({ brief: { ...BRIEF, text: 'something else entirely' }, lane: 'hosted', count: 4, userId: 1 }, deps).catch((e) => e);
    expect(err.code).toBe('E_RUN_CAP');
    expect(seen).toHaveLength(0);
  });
});

describe('a price preview is free of the caps it will not consume', () => {
  it('estimates at the run cap instead of refusing', async () => {
    // An estimate consumes no run, so no run cap applies to it. Refusing a preview at the
    // cap hides the price exactly when an operator most needs to see it — the same mistake
    // as the estimate that used to reserve the GPU, in the gate next door.
    const { seen, deps } = capturingDeps({ usage: { runs: 50, spendUsd: 0 }, limits: { maxRunsDaily: 50, maxSpendUsdDaily: 5, disabled: false } });
    const out = await composeStills({ brief: BRIEF, lane: 'hosted', count: 4, userId: 1, estimateOnly: true }, deps);
    expect(out.estimateOnly).toBe(true);
    expect(out.cost.totalUsd).toBeGreaterThan(0);
    expect(seen).toHaveLength(0);
  });
});

describe('a price preview is free of the SPEND ceiling too', () => {
  it('estimates when the day is already over budget', async () => {
    // The run cap learned this a round earlier and the spend gate did not — the same
    // one-parameter-over miss. Refusing a preview at the ceiling hides the price at the
    // moment it is most needed, and hides why, because the refusal reads as though money
    // had been at stake.
    const { seen, deps } = capturingDeps({
      usage: { runs: 0, spendUsd: 99 },
      limits: { maxRunsDaily: 50, maxSpendUsdDaily: 1, disabled: false },
    });
    const out = await composeStills({ brief: BRIEF, lane: 'hosted', count: 2, userId: 1, estimateOnly: true }, deps);
    expect(out.estimateOnly).toBe(true);
    expect(out.cost.totalUsd).toBeGreaterThan(0);
    expect(seen).toHaveLength(0);
  });

  it('but a real batch over budget is still refused', async () => {
    const { deps } = capturingDeps({
      usage: { runs: 0, spendUsd: 99 },
      limits: { maxRunsDaily: 50, maxSpendUsdDaily: 1, disabled: false },
    });
    const err = await composeStills({ brief: BRIEF, lane: 'hosted', count: 2, userId: 1 }, deps).catch((e) => e);
    expect(err.code).toBe('E_SPEND_CEILING');
  });
});

describe('a price preview survives a ledger it cannot read', () => {
  it('estimates while the ledger is degraded', async () => {
    // "Today's total is unknown" bears on SPENDING, not on quoting: an estimate needs the
    // unit price, never the running sum. Caught by auditing the pairs rather than by a
    // reviewer — the fifth instance of a fix landing on one half of a pair, and the first
    // caught before it shipped.
    const { seen, deps } = capturingDeps({ usage: { runs: 0, spendUsd: 0, degraded: true } });
    const out = await composeStills({ brief: BRIEF, lane: 'hosted', count: 2, userId: 1, estimateOnly: true }, deps);
    expect(out.estimateOnly).toBe(true);
    expect(out.cost.totalUsd).toBeGreaterThan(0);
    expect(seen).toHaveLength(0);
  });

  it('but a real batch on a degraded ledger is still refused', async () => {
    const { deps } = capturingDeps({ usage: { runs: 0, spendUsd: 0, degraded: true } });
    const err = await composeStills({ brief: BRIEF, lane: 'hosted', count: 2, userId: 1 }, deps).catch((e) => e);
    expect(err.code).toBe('E_LEDGER_DEGRADED');
  });
});

describe('the LOCAL lane gets the brand kit too — it is the lane that matters', () => {
  const localKitDeps = (over = {}) => {
    const compiled = [];
    return {
      compiled,
      deps: {
        env: { SWAN_ATELIER_LOCAL_STILLS: 'probed', SWAN_ATELIER_STILL_WORKFLOW: '/g/s.json', SWAN_ATELIER_STILL_NODE_PROMPT: '6', SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/wan-2.2' },
        localVerify: () => ({ ok: true, provider: 'comfyui/wan-2.2', problems: [], status: 'probed' }),
        admit: async () => ({ host: 'h', freeMb: 30000, neededMb: 26000 }),
        // Captures what the COMPILER was handed, which is where the kit either arrives or does not.
        compiler: (brief) => { compiled.push(brief); return { promptText: `${brief.text} [compiled]` }; },
        renderStill: async ({ seed }) => ({ image: { kind: 'path', path: `/o/${seed}.png`, mime: 'image/png' }, sha256: 'ab'.repeat(32), bytes: 1, provider: 'comfyui/wan-2.2' }),
        persist: async ({ stills }) => { stills.forEach((x) => Object.assign(x, { assetId: 'a1', persist: { ok: true } })); return { ok: true, persisted: stills.length, total: stills.length }; },
        store: new Map(), limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0, disabled: true },
        commit: () => ({ allowed: true }),
        ...over,
      },
    };
  };

  it('applies the brand language and the law drop on the async local path', async () => {
    // The SYNC path had applied both since the brand-kit slice. The LOCAL ASYNC path — the
    // default lane, the 5090, where essentially every render actually happens — passed the
    // raw brief straight through, so a non-Swan brand rendered with none of its own
    // language and was judged by every SwanStudios law. The slice's headline feature was
    // never delivered on the only lane that matters.
    _resetSingleFlight(); _resetBatches();
    const { compiled, deps } = localKitDeps();
    const out = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, brandKit: 'swanstudios' }, deps);
    const t0 = Date.now();
    while (!getBatch(out.batchId, 1).terminal && Date.now() - t0 < 2000) await new Promise((r) => setTimeout(r, 10));
    expect(compiled).toHaveLength(1);
    expect(compiled[0].text).toMatch(/midnight sapphire/);          // the kit reached the compiler
    expect(Array.isArray(compiled[0].lawProfileDrop)).toBe(true);   // and so did the law drop
  });

  it('a universal kit drops the Swan laws on the local lane as well', async () => {
    _resetSingleFlight(); _resetBatches();
    const { compiled, deps } = localKitDeps();
    const out = await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, brandKit: 'universal' }, deps);
    const t0 = Date.now();
    while (!getBatch(out.batchId, 1).terminal && Date.now() - t0 < 2000) await new Promise((r) => setTimeout(r, 10));
    expect(compiled[0].lawProfileDrop).toContain('LAW4-optics-not-creatures');
    expect(compiled[0].text).not.toMatch(/midnight sapphire/);      // and carries no Swan language
    expect(compiled[0].slotOverrides.negative).toBe('watermark, text artifacts');
  });
});

describe('the two law profiles are not interchangeable', () => {
  it('an override relaxes the COMPILER on the local lane but never the taste judging', async () => {
    // They arrived as one parameter, so the async lane judged taste correctly and then
    // dropped the WRONG laws in the compiler. Defect #8 of the same shape, and the first
    // where the two halves of a pair were one variable rather than two files.
    _resetSingleFlight(); _resetBatches();
    const compiled = [];
    const out = await composeStills({
      brief: BRIEF, lane: 'local', count: 1, userId: 1,
      brandKit: 'swanstudios', lawProfile: 'universal',      // explicit override
    }, {
      env: { SWAN_ATELIER_LOCAL_STILLS: 'probed', SWAN_ATELIER_STILL_WORKFLOW: '/g/s.json', SWAN_ATELIER_STILL_NODE_PROMPT: '6', SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/wan-2.2' },
      localVerify: () => ({ ok: true, provider: 'comfyui/wan-2.2', problems: [], status: 'probed' }),
      admit: async () => ({ host: 'h', freeMb: 30000, neededMb: 26000 }),
      compiler: (brief) => { compiled.push(brief); return { promptText: `${brief.text} [compiled]` }; },
      renderStill: async ({ seed }) => ({ image: { kind: 'path', path: `/o/${seed}.png`, mime: 'image/png' }, sha256: 'ab'.repeat(32), bytes: 1, provider: 'comfyui/wan-2.2' }),
      persist: async ({ stills }) => { stills.forEach((x) => Object.assign(x, { assetId: 'a1', persist: { ok: true } })); return { ok: true, persisted: 1, total: 1 }; },
      store: new Map(), limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0, disabled: true },
      commit: () => ({ allowed: true }),
    });
    const t0 = Date.now();
    while (!getBatch(out.batchId, 1).terminal && Date.now() - t0 < 2000) await new Promise((r) => setTimeout(r, 10));
    // The caller asked for universal, so the COMPILER drops the Swan laws...
    expect(compiled[0].lawProfileDrop).toContain('LAW4-optics-not-creatures');
    // ...and the kit is still SwanStudios, so its language is still applied.
    expect(compiled[0].text).toMatch(/midnight sapphire/);
  });
});
