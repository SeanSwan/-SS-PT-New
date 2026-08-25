/**
 * Atelier Compose — lanes, the taste source, and the GPU guards.
 * ============================================================================
 *
 * WHAT THESE TESTS EXIST TO PREVENT
 *
 * 1. A TASTE PROMPT LEAVING THE MACHINE. Taste output encodes a private
 *    aesthetic history. `promptSource:'taste'` + `lane:'hosted'` must be
 *    refused before any fetch, and the taste client must be GET-only against a
 *    loopback URL with an allowlisted query.
 *
 * 2. A LAW FILTER THAT PASSES EVERYTHING. `assertLawful` walks string SLOTS;
 *    a bare string would be a silent no-op. Taste prompts are wrapped, and a
 *    known-banned phrase must be caught.
 *
 * 3. TWO RENDERS ON ONE GPU. A second local batch while one is in flight is
 *    refused, not queued; admission reads live vram_free and refuses below
 *    the threshold. Both before any render call.
 *
 * 4. AN UNPROBED LANE ADVERTISED. Until SWAN_ATELIER_LOCAL_STILLS=probed the
 *    local lane refuses and reports `claimed`.
 *
 * 5. THE IDEMPOTENCY RACE. Two concurrent identical requests must coalesce
 *    onto ONE generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { composeStills, ComposeError } from '../../services/atelier/composeStills.mjs';
import {
  fetchTastePrompts, lawCheckPrompt, resolveTasteUrl, promptsFromTaste, resolveLawProfile, LAW_PROFILES, TASTE_URL_DEFAULT,
} from '../../services/atelier/promptSources.mjs';
import {
  admission, withGpu, _resetSingleFlight, verifyLocalStills, overlayEnv, probeStatus, PROBE_ENV_KEY, STILL_ENV,
} from '../../services/atelier/localStillLane.mjs';

const BRIEF = { text: 'a glacier calving into black water at dawn', intent: 'hero', aspect: '16:9' };
const MODEL = 'openai/gpt-5.4-image-2';
const okHosted = () => ({ ok: true, model: MODEL, problems: [] });
const noGen = async () => { throw new Error('generator must not be reached'); };
const LOCAL_ENV = {
  [PROBE_ENV_KEY]: 'probed', [STILL_ENV.workflow]: '/g/still.json', [STILL_ENV.prompt]: '6',
  SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/wan-2.2',
};
const readyLocal = () => ({ ok: true, provider: 'comfyui/wan-2.2', problems: [], status: 'probed' });
const admitOk = async () => ({ host: 'http://127.0.0.1:8188', freeMb: 30000, neededMb: 26000 });

beforeEach(() => _resetSingleFlight());

describe('taste is local-only', () => {
  it('refuses taste + hosted before touching the taste server or a generator', async () => {
    let fetched = 0;
    const err = await composeStills(
      { promptSource: 'taste', lane: 'hosted', count: 2 },
      { generator: noGen, verifier: okHosted, limits: { maxRunsDaily: 50, maxSpendUsdDaily: 5, disabled: false },
        tasteDeps: { fetchImpl: async () => { fetched += 1; } }, localVerify: readyLocal, admit: admitOk },
    ).catch((e) => e);
    expect(err).toBeInstanceOf(ComposeError);
    expect(err.code).toBe('E_TASTE_LOCAL_ONLY');
    expect(fetched).toBe(0);
  });

  it('the taste client is GET-only against loopback with an allowlisted query', async () => {
    const calls = [];
    await fetchTastePrompts({ count: 3, aspect: '16:9', seed: 42, cinematic: true, mode: 'taste' }, {
      env: {}, fetchImpl: async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => ({ seed: 42, prompts: [{ prompt: 'x' }] }) }; },
    });
    expect(calls).toHaveLength(1);
    const u = new URL(calls[0].url);
    expect(u.hostname).toBe('127.0.0.1');
    expect(u.pathname).toBe('/api/prompt');
    expect(calls[0].init.method).toBe('GET');
    expect([...u.searchParams.keys()].sort()).toEqual(['ar', 'cinematic', 'mode', 'n', 'seed']);
    expect(u.searchParams.get('seed')).toBe('42');
  });

  it('refuses a non-loopback override instead of following it', () => {
    expect(() => resolveTasteUrl({ SWAN_ATELIER_TASTE_URL: 'http://10.0.0.7:7331/api/prompt' }))
      .toThrow(expect.objectContaining({ code: 'E_TASTE_URL_NOT_LOOPBACK' }));
    expect(resolveTasteUrl({})).toBe(TASTE_URL_DEFAULT);
    expect(resolveTasteUrl({ SWAN_ATELIER_TASTE_URL: 'http://localhost:7331/api/prompt' })).toContain('localhost');
  });

  it('fails closed when the server is down — no silent fallback to the brief', async () => {
    await expect(fetchTastePrompts({ count: 1 }, { env: {}, fetchImpl: async () => { throw new Error('ECONNREFUSED'); } }))
      .rejects.toMatchObject({ code: 'E_TASTE_UNREACHABLE' });
    await expect(fetchTastePrompts({ count: 1 }, { env: {}, fetchImpl: async () => ({ ok: true, json: async () => ({ nope: 1 }) }) }))
      .rejects.toMatchObject({ code: 'E_TASTE_BAD_RESPONSE' });
  });
});

describe('the law filter actually sees taste prompts', () => {
  it('catches a kill-list phrase in a bare taste string', () => {
    const r = lawCheckPrompt('a swan rendered as an iridescent gradient with lens flare');
    expect(r.passed).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it('passes an ordinary lawful prompt', () => {
    expect(lawCheckPrompt('glacier wall at dawn, long lens, cold light').passed).toBe(true);
  });

  it('overdraws, drops unlawful prompts, and reports the shortfall as per-still failures', async () => {
    const served = ['glacier wall at dawn', 'iridescent gradient swan', 'black water, long lens', 'lens flare everywhere', 'ridge line in fog', 'x'];
    const out = await promptsFromTaste({ count: 4, seed: 1 }, {
      env: {}, fetchImpl: async () => ({ ok: true, json: async () => ({ seed: 1, prompts: served.map((p) => ({ prompt: p })) }) }),
    });
    expect(out.prompts).toHaveLength(4);
    const ok = out.prompts.filter((p) => p.ok);
    expect(ok.length).toBe(3);
    expect(out.prompts.find((p) => !p.ok).code).toBe('E_LAW_VIOLATION');
    expect(out.lawRejected).toBe(2);
    expect(out.dropped).toBe(1); // 'x' is too short
  });

  it('hard-fails when nothing lawful comes back', async () => {
    await expect(promptsFromTaste({ count: 2 }, {
      env: {}, fetchImpl: async () => ({ ok: true, json: async () => ({ prompts: [{ prompt: 'iridescent gradient' }] }) }),
    })).rejects.toMatchObject({ code: 'E_ALL_FAILED' });
  });
});

describe('law profiles — brand taste vs house rules', () => {
  const swan = 'a lone swan on a glacier lake at dawn, long lens';

  it('full (the default) rejects a literal creature — the Swan brand law', () => {
    const r = lawCheckPrompt(swan);
    expect(r.passed).toBe(false);
    expect(r.violations[0].law).toBe('LAW4-optics-not-creatures');
    expect(r.profile).toBe('full');
  });

  it('universal admits wildlife but reports what it dropped, in the open', () => {
    const r = lawCheckPrompt(swan, 'universal');
    expect(r.passed).toBe(true);
    expect(r.dropped).toBe(1);
    expect(r.profile).toBe('universal');
  });

  it('universal STILL enforces the kill-list, the retired palette, and Rule 9', () => {
    expect(lawCheckPrompt('wolf pack under an iridescent gradient sky', 'universal').passed).toBe(false);
    expect(lawCheckPrompt('a yoga retreat on the ridge at dawn', 'universal').passed).toBe(false);
    expect(lawCheckPrompt('a yoga retreat on the ridge at dawn', 'universal').violations[0].law).toBe('LAW10-content');
  });

  it('the droppable set is exactly the two brand laws (plus the facet law taste cannot trip)', () => {
    expect([...LAW_PROFILES.universal].sort()).toEqual(['LAW2-gold-allowlist', 'LAW3-banned-facet', 'LAW4-optics-not-creatures']);
    expect(LAW_PROFILES.full).toEqual([]);
  });

  it('an unknown profile is refused before anything runs', async () => {
    expect(() => resolveLawProfile('lenient')).toThrow(expect.objectContaining({ code: 'E_BAD_LAW_PROFILE' }));
    let fetched = 0;
    const err = await composeStills({ promptSource: 'taste', lane: 'local', lawProfile: 'lenient', count: 1 }, {
      env: LOCAL_ENV, localVerify: readyLocal, admit: admitOk, tasteDeps: { fetchImpl: async () => { fetched += 1; } },
      limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0, disabled: true },
    }).catch((e) => e);
    expect(err.code).toBe('E_BAD_LAW_PROFILE');
    expect(fetched).toBe(0);
  });

  it('a taste batch under universal keeps the swan and still drops the gradient', async () => {
    const served = [swan, 'eagle over an iridescent gradient', 'ridge line in fog'];
    const out = await promptsFromTaste({ count: 2, lawProfile: 'universal' }, {
      env: {}, fetchImpl: async () => ({ ok: true, json: async () => ({ seed: 3, prompts: served.map((p) => ({ prompt: p })) }) }),
    });
    expect(out.lawProfile).toBe('universal');
    expect(out.prompts.filter((p) => p.ok).map((p) => p.text)).toEqual([swan, 'ridge line in fog']);
    expect(out.lawRejected).toBe(1);
  });
});

describe('the local lane refuses until probed, and guards the GPU', () => {
  it('reports claimed and refuses when the probe flag is unset', () => {
    expect(probeStatus({})).toBe('claimed');
    const v = verifyLocalStills({ ...LOCAL_ENV, [PROBE_ENV_KEY]: '' });
    expect(v.ok).toBe(false);
    expect(v.status).toBe('claimed');
    expect(v.problems.join(' ')).toContain(PROBE_ENV_KEY);
  });

  it('refuses a local request on an unprobed lane before any render', async () => {
    let rendered = 0;
    const err = await composeStills({ brief: BRIEF, lane: 'local', count: 1 }, {
      env: {}, renderStill: async () => { rendered += 1; }, limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0, disabled: true },
    }).catch((e) => e);
    expect(err.code).toBe('E_STILL_LANE_UNPROBED');
    expect(rendered).toBe(0);
  });

  it('overlays the still keys onto the adapter keys and never inherits the video init-image binding', () => {
    const o = overlayEnv({ ...LOCAL_ENV, [STILL_ENV.seed]: '9', [STILL_ENV.length]: '4', SWAN_COMFYUI_NODE_IMAGE_WAN_2_2: '99' });
    expect(o.SWAN_COMFYUI_WORKFLOW_WAN_2_2).toBe('/g/still.json');
    expect(o.SWAN_COMFYUI_NODE_PROMPT_WAN_2_2).toBe('6');
    expect(o.SWAN_COMFYUI_NODE_SEED_WAN_2_2).toBe('9');
    expect(o.SWAN_COMFYUI_NODE_DURATION_WAN_2_2).toBe('4');
    expect(o.SWAN_COMFYUI_NODE_IMAGE_WAN_2_2).toBeUndefined();
  });

  it('admission refuses on low live vram_free with the numbers, and on an unreachable server', async () => {
    const stats = (mb) => async () => ({ ok: true, json: async () => ({ devices: [{ vram_free: mb * 1024 * 1024 }] }) });
    const err = await admission({ env: {}, fetchImpl: stats(8000) }).catch((e) => e);
    expect(err.code).toBe('E_VRAM_BUSY');
    expect(err.freeMb).toBe(8000);
    expect(err.neededMb).toBe(26000);
    expect(err.retryAfterSec).toBeGreaterThan(0);
    const ok = await admission({ env: {}, fetchImpl: stats(30000) });
    expect(ok.freeMb).toBe(30000);
    await expect(admission({ env: {}, fetchImpl: async () => { throw new Error('ECONNREFUSED'); } }))
      .rejects.toMatchObject({ code: 'E_COMFY_UNREACHABLE' });
  });

  it('a second local batch while one is in flight is refused, not queued', async () => {
    let release;
    const first = withGpu(() => new Promise((r) => { release = r; }));
    const err = await withGpu(async () => 'second').catch((e) => e);
    expect(err.code).toBe('E_LOCAL_BUSY');
    release('done');
    expect(await first).toBe('done');
    expect(await withGpu(async () => 'third')).toBe('third');
  });

  it('renders a local batch sequentially at $0 through the injected renderer', async () => {
    const order = [];
    // RE-ANCHORED: the local lane is async by default (202 + poll, atelierAsyncStills.test.mjs);
    // `async:false` keeps the inline path for direct callers, which is what this test covers.
    const out = await composeStills({ brief: BRIEF, lane: 'local', count: 3, async: false }, {
      env: LOCAL_ENV, localVerify: readyLocal, admit: admitOk, store: new Map(),
      limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0, disabled: true },
      renderStill: async ({ seed }) => { order.push(seed); return { image: { kind: 'path', path: `/o/${seed}.png`, mime: 'image/png' }, sha256: 'ab', bytes: 10, provider: 'comfyui/wan-2.2' }; },
    });
    expect(out.lane).toBe('local');
    expect(out.cost.totalUsd).toBe(0);
    expect(out.cost.chargedUsd).toBe(0);
    expect(out.stills).toHaveLength(3);
    expect(new Set(order).size).toBe(3);
    expect(out.stills[0].image.kind).toBe('path');
    expect(out.admission.freeMb).toBe(30000);
  });
});

describe('auto lane and idempotency', () => {
  it('auto with hosted off and local unprobed names BOTH switches', async () => {
    const err = await composeStills({ brief: BRIEF, count: 1 }, {
      env: {}, generator: noGen, limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0, disabled: true },
    }).catch((e) => e);
    expect(err.code).toBe('E_NO_LANE');
    expect(err.message).toContain('SWAN_ATELIER_MAX_SPEND_USD_DAILY');
    expect(err.message).toContain(PROBE_ENV_KEY);
  });

  it('two CONCURRENT identical requests coalesce onto one generation', async () => {
    let calls = 0;
    const store = new Map();
    const deps = {
      env: {}, verifier: okHosted, store, limits: { maxRunsDaily: 50, maxSpendUsdDaily: 5, disabled: false },
      generator: async () => { calls += 1; await new Promise((r) => setTimeout(r, 20)); return { images: ['b64'], usage: {} }; },
    };
    const req = { brief: BRIEF, lane: 'hosted', count: 1, idempotencyKey: 'same' };
    const [a, b] = await Promise.all([composeStills(req, deps), composeStills(req, deps)]);
    expect(calls).toBe(1);
    expect([a.replayed, b.replayed].filter(Boolean)).toHaveLength(1);
  });

  it('a failed batch releases its key so a retry can run', async () => {
    const store = new Map();
    const deps = { env: {}, verifier: okHosted, store, limits: { maxRunsDaily: 50, maxSpendUsdDaily: 5, disabled: false }, generator: async () => { throw new Error('down'); } };
    const req = { brief: BRIEF, lane: 'hosted', count: 1, idempotencyKey: 'k' };
    await expect(composeStills(req, deps)).rejects.toMatchObject({ code: 'E_ALL_FAILED' });
    expect(store.has('k')).toBe(false);
  });

  it('caps the brief and normalizes it so NFC/NFD variants hash the same', async () => {
    const deps = { env: {}, verifier: okHosted, generator: noGen, limits: { maxRunsDaily: 50, maxSpendUsdDaily: 5, disabled: false } };
    await expect(composeStills({ brief: { text: 'x'.repeat(2001) }, lane: 'hosted' }, deps)).rejects.toMatchObject({ code: 'E_BRIEF_TOO_LONG' });
    const gen = async () => ({ images: ['b64'], usage: {} });
    const store = new Map();
    const d2 = { ...deps, generator: gen, store };
    const a = await composeStills({ brief: { text: 'café at dawn' }, lane: 'hosted', count: 1 }, d2);
    const b = await composeStills({ brief: { text: 'café at dawn' }, lane: 'hosted', count: 1 }, d2);
    expect(b.key).toBe(a.key);
    expect(b.replayed).toBe(true);
  });
});
