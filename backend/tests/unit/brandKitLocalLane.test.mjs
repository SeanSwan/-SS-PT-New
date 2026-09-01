/**
 * The LOCAL lane's share of the brand kit.
 *
 * Split from brandKitGates at the 300-line cap, and the split is the honest grouping:
 * every case here exists because the local lane was found doing something its hosted
 * twin already did correctly. That lane is the DEFAULT — Sean's 5090, where essentially
 * every render happens — so a defect here is a defect in production behaviour while the
 * hosted tests stayed green throughout.
 *
 * THE TASTE SEAM IS `fetchImpl`, NOT `fetchPrompts`.
 *
 * Two tests here stubbed `tasteDeps.fetchPrompts` — a key NOTHING reads. `fetchTastePrompts`
 * destructures `{ fetchImpl = fetch, env, timeoutMs }` (promptSources.mjs), so the stub was
 * inert and both tests hit the real taste server at 127.0.0.1:7331. They passed for months
 * only because that server happened to be running on the author's machine, and went red the
 * moment it was not. One of them even carried a comment rationalising that its stub "does
 * not control" the seed — the stub controlled nothing at all.
 *
 * A test whose double is wired to a key the code never reads is not a test of the code; it
 * is a test of whoever's laptop is running. Before stubbing a collaborator, read the
 * destructure in the function that consumes it.
 */

import { describe, it, expect } from 'vitest';
import { composeStills } from '../../services/atelier/composeStills.mjs';
import { _resetBatches, getBatch } from '../../services/atelier/batchStore.mjs';
import { _resetSingleFlight } from '../../services/atelier/localStillLane.mjs';

const BRIEF = { text: 'a glacier calving into black water at dawn', intent: 'hero', aspect: '16:9' };

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

describe('both lanes build prompts with the same function', () => {
  it('the async lane reports taste metadata, and async is where taste runs', async () => {
    // The synchronous result carried tasteMeta since the taste slice; the batch did not.
    // Taste is LOCAL-ONLY, so the one lane it actually runs on was the only one that
    // never reported it — the seed, how many prompts the laws rejected, which profile
    // judged. All of it invisible on the path that produced it.
    _resetSingleFlight(); _resetBatches();
    const out = await composeStills({
      brief: BRIEF, promptSource: 'taste', lane: 'local', count: 1, userId: 1, brandKit: 'swanstudios',
    }, {
      env: { SWAN_ATELIER_LOCAL_STILLS: 'probed', SWAN_ATELIER_STILL_WORKFLOW: '/g/s.json', SWAN_ATELIER_STILL_NODE_PROMPT: '6', SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/wan-2.2' },
      localVerify: () => ({ ok: true, provider: 'comfyui/wan-2.2', problems: [], status: 'probed' }),
      admit: async () => ({ host: 'h', freeMb: 30000, neededMb: 26000 }),
      tasteDeps: { fetchImpl: async () => ({ ok: true, json: async () => ({ seed: 101, prompts: [{ prompt: 'a rated composition in cold morning light' }] }) }) },
      renderStill: async ({ seed }) => ({ image: { kind: 'path', path: `/o/${seed}.png`, mime: 'image/png' }, sha256: 'ab'.repeat(32), bytes: 1, provider: 'comfyui/wan-2.2' }),
      persist: async ({ stills }) => { stills.forEach((x) => Object.assign(x, { assetId: 'a1', persist: { ok: true } })); return { ok: true, persisted: 1, total: 1 }; },
      store: new Map(), limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0, disabled: true },
      commit: () => ({ allowed: true }),
    });
    const t0 = Date.now();
    while (!getBatch(out.batchId, 1).terminal && Date.now() - t0 < 2000) await new Promise((r) => setTimeout(r, 10));
    const snap = getBatch(out.batchId, 1);
    expect(snap.tasteMeta).toBeTruthy();
    expect(snap.tasteMeta.lawProfile).toBe('full');       // the profile that judged
  });
});

describe('provenance names the provider that actually rendered', () => {
  it('a LOCAL sync render persists the local provider, not the hosted default', async () => {
    // `model` is `req.model || DEFAULT_MODEL` — a HOSTED model id — and the sync path
    // handed it to persist on every lane. So a local render recorded provenance naming a
    // provider it never touched, while the async path recorded cost.model and got it
    // right. The two lanes disagreed about what made the same kind of image.
    _resetSingleFlight(); _resetBatches();
    const seen = [];
    await composeStills({ brief: BRIEF, lane: 'local', count: 1, userId: 1, async: false }, {
      env: { SWAN_ATELIER_LOCAL_STILLS: 'probed', SWAN_ATELIER_STILL_WORKFLOW: '/g/s.json', SWAN_ATELIER_STILL_NODE_PROMPT: '6', SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/wan-2.2' },
      localVerify: () => ({ ok: true, provider: 'comfyui/wan-2.2', problems: [], status: 'probed' }),
      admit: async () => ({ host: 'h', freeMb: 30000, neededMb: 26000 }),
      renderStill: async ({ seed }) => ({ image: { kind: 'path', path: `/o/${seed}.png`, mime: 'image/png' }, sha256: 'ab'.repeat(32), bytes: 1, provider: 'comfyui/wan-2.2' }),
      persist: async ({ model, stills }) => { seen.push(model); stills.forEach((x) => Object.assign(x, { assetId: 'a1', persist: { ok: true } })); return { ok: true, persisted: 1, total: 1 }; },
      store: new Map(), limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0, disabled: true },
      commit: () => ({ allowed: true }),
    });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe('comfyui/wan-2.2');
    expect(seen[0]).not.toMatch(/openai/);
  });
});

describe('the same taste facts have the same shape on both lanes', () => {
  it('the sync result nests tasteMeta, as the async snapshot already did', async () => {
    // They were spread top-level on one lane and nested on the other, so a client reading
    // `lawRejected` had to know which lane produced the response before it knew where to
    // look — for facts identical in kind. The old top-level spread is kept for one release
    // so nothing reading the previous shape breaks.
    _resetSingleFlight(); _resetBatches();
    const out = await composeStills({
      brief: BRIEF, promptSource: 'taste', lane: 'local', count: 1, userId: 1, async: false,
    }, {
      env: { SWAN_ATELIER_LOCAL_STILLS: 'probed', SWAN_ATELIER_STILL_WORKFLOW: '/g/s.json', SWAN_ATELIER_STILL_NODE_PROMPT: '6', SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/wan-2.2' },
      localVerify: () => ({ ok: true, provider: 'comfyui/wan-2.2', problems: [], status: 'probed' }),
      admit: async () => ({ host: 'h', freeMb: 30000, neededMb: 26000 }),
      tasteDeps: { fetchImpl: async () => ({ ok: true, json: async () => ({ seed: 109, prompts: [{ prompt: 'a rated composition in cold morning light' }] }) }) },
      renderStill: async ({ seed }) => ({ image: { kind: 'path', path: `/o/${seed}.png`, mime: 'image/png' }, sha256: 'ab'.repeat(32), bytes: 1, provider: 'comfyui/wan-2.2' }),
      persist: async ({ stills }) => { stills.forEach((x) => Object.assign(x, { assetId: 'a1', persist: { ok: true } })); return { ok: true, persisted: 1, total: 1 }; },
      store: new Map(), limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0, disabled: true },
      commit: () => ({ allowed: true }),
    });
    // The stub DOES control the seed now. It previously did not, and this comment used to
    // rationalise that as the taste path deriving its own — the real reason was that the
    // stub was wired to `fetchPrompts`, a key nothing reads. See the note at the top.
    expect(out.tasteMeta).toBeTruthy();
    expect(out.tasteMeta.lawProfile).toBe('full');
    expect(out.tasteMeta.tasteSeed).toBe(out.tasteSeed);   // nested mirrors top-level
    expect(out.tasteSeed).toBeDefined();                   // old shape kept for one release
  });
});
