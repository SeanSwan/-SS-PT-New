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
import { _resetBatches } from '../../services/atelier/batchStore.mjs';
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
