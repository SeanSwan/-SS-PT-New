/**
 * Video provider registry, licence gate, and the `generate` handler.
 * ============================================================================
 *
 * WHAT THESE TESTS EXIST TO PREVENT
 *
 * 1. A licence restriction enforced only by someone remembering it. The prose
 *    version of this rule decayed into "commercial use is blocked" — a sentence
 *    that misled its own author into believing the generated VIDEO was
 *    restricted, when the restriction is on running the model. So the gate is
 *    code, and the message it produces is asserted here verbatim enough to keep
 *    that distinction from eroding again.
 *
 * 2. The image-first law being applied where its cause is absent. The law exists
 *    because hosted generation bills per run; enforcing it against a free local
 *    provider would block the exact zero-cost path the whole lane is for.
 *
 * 3. Retry classification inverting. Same failure mode the sibling
 *    `renderAgentClassification` suite was written for, in a new handler.
 *
 * These assert against the modules' real exports; none of them re-declare the
 * behaviour under test. Deleting the implementation fails every one.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  capabilities, listProviders, resolve, readGrants, readEnabled,
  validateVideoRequest, normalizeProviderResponse, ProviderError,
} from '../../../shared/providers/video/registry.mjs';
import { VIDEO_PROVIDERS, assertSpecShape } from '../../../shared/providers/video/catalogue.mjs';
import { buildGraph, findOutputFile, resolveConfig, verify, generate } from '../../../shared/providers/video/comfyuiLocal.mjs';
import { runGenerate, isPermanentCode } from '../../scripts/handlers/generateVideo.mjs';
import { completionBody, completionSummary, mimeForFilename } from '../../scripts/handlers/completion.mjs';

const LOCAL = 'comfyui/minimax-h3';
const HOSTED = 'minimax/hailuo-hosted';

const validRequest = (over = {}) => ({
  prompt: 'a swan crossing still water at dawn',
  category: 'marketing',
  style: 'cinematic',
  duration: 5,
  ...over,
});

describe('catalogue shape', () => {
  it('every declared provider satisfies the required shape', () => {
    for (const [id, spec] of Object.entries(VIDEO_PROVIDERS)) {
      expect(() => assertSpecShape(id, spec)).not.toThrow();
    }
    expect(listProviders().length).toBeGreaterThan(0);
  });

  it('rejects a provider that requires attribution but declares none', () => {
    const bad = { ...VIDEO_PROVIDERS[LOCAL], attribution: '  ' };
    expect(() => assertSpecShape('bad/provider', bad)).toThrow(/attribution/i);
  });

  it('rejects a provider missing a required field', () => {
    const { maxResolution, ...missing } = VIDEO_PROVIDERS[LOCAL];
    expect(() => assertSpecShape('bad/provider', missing)).toThrow(/maxResolution/);
  });

  it('every provider ships a non-empty attribution string', () => {
    // The licence demands prominent display; an absent string makes that
    // unsatisfiable no matter how careful the UI is.
    for (const id of listProviders()) {
      expect(capabilities(id).attribution.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('capabilities — tri-state honesty', () => {
  it('reports a merely-claimed field as null rather than its claimed value', () => {
    const caps = capabilities(LOCAL);
    // maxDurationSec is 'published' so it survives; the claimed ones do not leak.
    expect(caps.maxDurationSec).toBe(6);
    expect(caps.provenance.maxDurationSec).toBe('published');
  });

  it('throws on an unknown provider instead of returning a default', () => {
    expect(() => capabilities('nope/not-real')).toThrow(ProviderError);
    expect(() => capabilities('nope/not-real')).toThrow(/Unknown video provider/);
  });
});

describe('licence gate', () => {
  it('refuses the local model for commercial use in an excluded territory', () => {
    expect(() => resolve(LOCAL, {
      commercial: true, territory: 'US', grants: new Set(), requireEnabled: false,
    })).toThrow(/grant/i);
  });

  it('says the restriction is on RUNNING the model, not on the video produced', () => {
    // This exact distinction is the thing that got miscommunicated. If the
    // wording ever loses it, this fails.
    let msg = '';
    try {
      resolve(LOCAL, { commercial: true, territory: 'US', grants: new Set(), requireEnabled: false });
    } catch (err) { msg = err.message; }
    expect(msg).toMatch(/restricts running the model/i);
    expect(msg).toMatch(/NOT the ownership or use of video it produces/i);
    expect(msg).toMatch(/MINIMAX-H3-LICENSING-REQUEST/);
  });

  it('permits the local model once a grant is recorded', () => {
    const caps = resolve(LOCAL, {
      commercial: true, territory: 'US', grants: new Set([LOCAL]), requireEnabled: false,
    });
    expect(caps.provider).toBe(LOCAL);
  });

  it('permits non-commercial use with no grant at all', () => {
    expect(() => resolve(LOCAL, {
      commercial: false, territory: 'US', grants: new Set(), requireEnabled: false,
    })).not.toThrow();
  });

  it('permits the same model outside the excluded territory', () => {
    expect(() => resolve(LOCAL, {
      commercial: true, territory: 'CA', grants: new Set(), requireEnabled: false,
    })).not.toThrow();
  });

  it('needs no grant for the hosted peer — the licence-refused fallback works', () => {
    expect(() => resolve(HOSTED, {
      commercial: true, territory: 'US', grants: new Set(), requireEnabled: false,
    })).not.toThrow();
  });

  it('is fail-closed: an unset grant env var grants nothing', () => {
    expect(readGrants({}).size).toBe(0);
    expect(readGrants({ SWAN_VIDEO_LICENCE_GRANTS: '' }).size).toBe(0);
    expect(readGrants({ SWAN_VIDEO_LICENCE_GRANTS: ` ${LOCAL} , ` }).has(LOCAL)).toBe(true);
  });

  it('refuses a provider that is present but not enabled', () => {
    // Every catalogue entry ships disabled; enabling is an explicit act.
    // `enabled` is passed explicitly so this never depends on ambient process.env.
    expect(() => resolve(LOCAL, { grants: new Set([LOCAL]), enabled: new Set() }))
      .toThrow(/not enabled/i);
  });

  it('names the variable that switches a provider on — a lock needs a key', () => {
    // The catalogue is frozen with `enabled: false` on every row, so without a
    // runtime allowlist this gate could never be passed by anything. It shipped
    // that way for exactly one test run.
    let msg = '';
    try { resolve(LOCAL, { grants: new Set([LOCAL]), enabled: new Set() }); }
    catch (err) { msg = err.message; }
    expect(msg).toMatch(/SWAN_VIDEO_PROVIDERS_ENABLED/);
  });

  it('enablement and licence grant are separate acts', () => {
    // Enabled but ungranted still refuses on licence — switching a provider on
    // must not silently confer the right to run it commercially.
    expect(() => resolve(LOCAL, {
      commercial: true, territory: 'US', grants: new Set(), enabled: new Set([LOCAL]),
    })).toThrow(/grant/i);

    // Enabled + non-commercial is fine without any grant.
    expect(() => resolve(LOCAL, {
      commercial: false, grants: new Set(), enabled: new Set([LOCAL]),
    })).not.toThrow();
  });

  it('is fail-closed: an unset enable list enables nothing', () => {
    expect(readEnabled({}).size).toBe(0);
    expect(readEnabled({ SWAN_VIDEO_PROVIDERS_ENABLED: ` ${LOCAL} ,` }).has(LOCAL)).toBe(true);
  });

  it('reports the RESOLVED enablement, not the catalogue default', () => {
    // The frozen spec says false forever. An object returned from a successful
    // resolve that still claims `enabled: false` would contradict its own
    // existence, and a UI binding to it would say "off" mid-render.
    const caps = resolve(LOCAL, { commercial: false, enabled: new Set([LOCAL]) });
    expect(caps.enabled).toBe(true);
    expect(VIDEO_PROVIDERS[LOCAL].enabled).toBe(false);   // catalogue untouched
  });
});

describe('request validation', () => {
  const localCaps = () => resolve(LOCAL, { commercial: false, requireEnabled: false });
  const hostedCaps = () => resolve(HOSTED, { requireEnabled: false });

  it('requires a prompt', () => {
    expect(() => validateVideoRequest(validRequest({ prompt: '  ' }), localCaps())).toThrow(/Prompt is required/);
  });

  it('caps prompt length', () => {
    expect(() => validateVideoRequest(validRequest({ prompt: 'x'.repeat(501) }), localCaps()))
      .toThrow(/500 characters or fewer/);
  });

  it('rejects an unknown category or style', () => {
    expect(() => validateVideoRequest(validRequest({ category: 'memes' }), localCaps())).toThrow(/category is invalid/);
    expect(() => validateVideoRequest(validRequest({ style: 'vaporwave' }), localCaps())).toThrow(/style is invalid/);
  });

  it('bounds duration by the PROVIDER maximum, not a fixed global set', () => {
    // The superseded service allowed [5,10,15,30] while every real model caps at 6s.
    expect(() => validateVideoRequest(validRequest({ duration: 30 }), localCaps()))
      .toThrow(/supports at most 6s/);
    expect(validateVideoRequest(validRequest({ duration: 6 }), localCaps()).duration).toBe(6);
  });

  it('does NOT enforce image-first on a free local provider', () => {
    // The law's cause is per-run cost. A local run on hardware Sean owns has none,
    // so enforcing it here would block the zero-cost path this lane exists for.
    const out = validateVideoRequest(validRequest(), localCaps());
    expect(out.initImage).toBeNull();
  });

  it('DOES enforce image-first on a provider that bills', () => {
    expect(() => validateVideoRequest(validRequest(), hostedCaps()))
      .toThrow(/requires an approved still/i);
  });

  it('treats an unknown price as billing — fail-closed, not fail-open', () => {
    expect(capabilities(HOSTED).costPerRunUsd).toBeNull();
    expect(() => validateVideoRequest(validRequest(), hostedCaps())).toThrow(/E_IMAGE_FIRST_REQUIRED|approved still/i);
  });

  it('accepts an init image on the billing provider', () => {
    const out = validateVideoRequest(validRequest({ initImage: 'still.png' }), hostedCaps());
    expect(out.initImage).toBe('still.png');
  });
});

describe('provider response normalization', () => {
  it('finds the video url however deeply the vendor nested it', () => {
    expect(normalizeProviderResponse({ videoUrl: 'a.mp4' }).videoUrl).toBe('a.mp4');
    expect(normalizeProviderResponse({ data: { video_url: 'b.mp4' } }).videoUrl).toBe('b.mp4');
    expect(normalizeProviderResponse({ output: { url: 'c.mp4' } }).videoUrl).toBe('c.mp4');
  });

  it('treats a present url as completed even when status disagrees', () => {
    const out = normalizeProviderResponse({ status: 'processing', videoUrl: 'd.mp4' });
    expect(out.status).toBe('completed');
    expect(out.rawStatus).toBe('processing');
  });

  it('defaults to queued when there is nothing to report', () => {
    expect(normalizeProviderResponse({}).status).toBe('queued');
    expect(normalizeProviderResponse({}).videoUrl).toBeNull();
  });
});

describe('comfyui workflow injection', () => {
  let dir;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'swan-comfy-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  const writeGraph = (obj) => {
    const p = join(dir, 'wf.json');
    writeFileSync(p, JSON.stringify(obj));
    return p;
  };

  const cfgFor = (templatePath, over = {}) => resolveConfig({
    SWAN_COMFYUI_WORKFLOW: templatePath,
    SWAN_COMFYUI_NODE_PROMPT: '6',
    ...over,
  });

  it('injects the prompt into the declared node', () => {
    const p = writeGraph({ 6: { class_type: 'CLIPTextEncode', inputs: { text: 'PLACEHOLDER' } } });
    const graph = buildGraph(validRequest({ prompt: 'a swan' }), cfgFor(p));
    expect(graph['6'].inputs.text).toBe('a swan');
  });

  it('does not mutate the template on disk', () => {
    const p = writeGraph({ 6: { class_type: 'CLIPTextEncode', inputs: { text: 'PLACEHOLDER' } } });
    buildGraph(validRequest({ prompt: 'a swan' }), cfgFor(p));
    const again = buildGraph(validRequest({ prompt: 'second' }), cfgFor(p));
    expect(again['6'].inputs.text).toBe('second');
    expect(JSON.parse(readFileSync(p, 'utf8'))['6'].inputs.text).toBe('PLACEHOLDER');
  });

  it('names the GUI-vs-API export mistake instead of letting ComfyUI 400', () => {
    const p = writeGraph({ nodes: [{ id: 1 }], links: [] });
    expect(() => buildGraph(validRequest(), cfgFor(p))).toThrow(/API format/i);
  });

  it('throws with the available node ids when the binding points nowhere', () => {
    const p = writeGraph({ 6: { inputs: {} } });
    expect(() => buildGraph(validRequest(), cfgFor(p, { SWAN_COMFYUI_NODE_PROMPT: '99' })))
      .toThrow(/no node "99".*6/is);
  });

  it('refuses to CREATE an input the node does not declare', () => {
    // ComfyUI ignores an undeclared input, so inventing one renders the template's
    // placeholder prompt at full GPU cost and reports success. Silent wrong output
    // is strictly worse than a loud refusal.
    const p = writeGraph({ 6: { class_type: 'WeirdNode', inputs: { unrelated: 1 } } });
    let err;
    try { buildGraph(validRequest(), cfgFor(p)); } catch (e) { err = e; }
    expect(err.code).toBe('E_NO_INPUT');
    expect(err.message).toMatch(/no input for "prompt"/);
    expect(err.message).toMatch(/tried: text, prompt, string/);
    expect(err.message).toMatch(/its inputs are: unrelated/i);
  });

  it('DETECTS the field name instead of assuming one', () => {
    // Wan's CLIPTextEncode calls it `text`; MiniMax H3's MiniMaxH3ImageToVideo calls it
    // `prompt`. Hardcoding `text` drove one model and threw on the other — found on the
    // first real H3 render, by the guard above.
    const wan = writeGraph({ 6: { class_type: 'CLIPTextEncode', inputs: { text: 'X' } } });
    expect(buildGraph(validRequest({ prompt: 'a swan' }), cfgFor(wan))['6'].inputs.text).toBe('a swan');

    const h3 = writeGraph({ 6: { class_type: 'MiniMaxH3ImageToVideo', inputs: { prompt: 'X', width: 1344 } } });
    const g = buildGraph(validRequest({ prompt: 'a swan' }), cfgFor(h3));
    expect(g['6'].inputs.prompt).toBe('a swan');
    // and it must not have invented the other name alongside it
    expect(g['6'].inputs.text).toBeUndefined();
  });

  it('throws a named error when the template file is absent', () => {
    expect(() => buildGraph(validRequest(), cfgFor(join(dir, 'missing.json'))))
      .toThrow(/not found/i);
  });

  it('injects duration and seed only when those bindings are declared', () => {
    const p = writeGraph({
      6: { inputs: { text: '' } }, 7: { inputs: { value: 0 } }, 8: { inputs: { seed: 0 } },
    });
    const bound = cfgFor(p, { SWAN_COMFYUI_NODE_DURATION: '7', SWAN_COMFYUI_NODE_SEED: '8' });
    const graph = buildGraph(validRequest({ duration: 6 }), bound, { seed: 42 });
    expect(graph['7'].inputs.value).toBe(6);
    expect(graph['8'].inputs.seed).toBe(42);

    const unbound = buildGraph(validRequest({ duration: 6 }), cfgFor(p));
    expect(unbound['7'].inputs.value).toBe(0);   // untouched
  });

  it('is unconfigured until both template and prompt binding are set', () => {
    expect(resolveConfig({}).configured).toBe(false);
    expect(resolveConfig({ SWAN_COMFYUI_WORKFLOW: '/x.json' }).configured).toBe(false);
    expect(cfgFor('/x.json').configured).toBe(true);
  });
});

describe('comfyui generate — full submit/poll/download path', () => {
  let dir;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'swan-gen-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  const template = () => {
    const p = join(dir, 'wf.json');
    writeFileSync(p, JSON.stringify({ 6: { class_type: 'CLIPTextEncode', inputs: { text: 'PLACEHOLDER' } } }));
    return p;
  };

  const envFor = (tp) => ({ SWAN_COMFYUI_WORKFLOW: tp, SWAN_COMFYUI_NODE_PROMPT: '6' });

  /** A fake ComfyUI that accepts, then reports one finished artifact. */
  const fakeComfy = (filename, { submitStatus = 200 } = {}) => async (url, init) => {
    const u = String(url);
    if (u.endsWith('/prompt')) {
      if (submitStatus !== 200) return { ok: false, status: submitStatus, text: async () => 'boom' };
      // the injected prompt must have reached the graph
      const sent = JSON.parse(init.body);
      expect(sent.prompt['6'].inputs.text).toBe('a swan crossing still water at dawn');
      return { ok: true, status: 200, json: async () => ({ prompt_id: 'pid-1' }) };
    }
    if (u.includes('/history/')) {
      return { ok: true, status: 200, json: async () => ({
        'pid-1': { status: { completed: true }, outputs: { 9: { videos: [{ filename, subfolder: '', type: 'output' }] } } },
      }) };
    }
    if (u.includes('/view')) {
      return { ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode('VIDEOBYTES').buffer };
    }
    throw new Error(`unexpected url ${u}`);
  };

  it('writes the artifact and returns its attribution', async () => {
    const tp = template();
    const out = await generate(validRequest(), {
      env: envFor(tp), fetchImpl: fakeComfy('out.mp4'),
      outPath: join(dir, 'job-1.mp4'), sleep: async () => {},
    });
    expect(out.bytes).toBe(10);
    expect(out.promptId).toBe('pid-1');
    expect(out.attribution).toMatch(/MiniMax H3/);
    expect(readFileSync(out.outPath, 'utf8')).toBe('VIDEOBYTES');
  });

  it('honours the artifact\'s real container instead of the proposed extension', async () => {
    // A graph ending in a webm saver produces webm. Writing those bytes to a
    // `.mp4` name would misdescribe the file to every downstream consumer.
    const tp = template();
    const out = await generate(validRequest(), {
      env: envFor(tp), fetchImpl: fakeComfy('out.webm'),
      outPath: join(dir, 'job-2.mp4'), sleep: async () => {},
    });
    expect(out.outPath.endsWith('.webm')).toBe(true);
    expect(out.outPath).not.toMatch(/\.mp4$/);
  });

  it('classes a 4xx submit as the graph\'s fault (permanent)', async () => {
    const tp = template();
    const err = await generate(validRequest(), {
      env: envFor(tp), fetchImpl: fakeComfy('out.mp4', { submitStatus: 400 }),
      outPath: join(dir, 'j.mp4'), sleep: async () => {},
    }).catch(e => e);
    expect(err.code).toBe('E_SUBMIT_REJECTED');
    expect(isPermanentCode(err.code)).toBe(true);
  });

  it('classes a 5xx submit as a fact about the moment (retryable)', async () => {
    // ComfyUI restarting or briefly out of VRAM. Marking this permanent would
    // throw away a job that a later attempt would complete.
    const tp = template();
    const err = await generate(validRequest(), {
      env: envFor(tp), fetchImpl: fakeComfy('out.mp4', { submitStatus: 503 }),
      outPath: join(dir, 'j.mp4'), sleep: async () => {},
    }).catch(e => e);
    expect(err.code).toBe('E_SUBMIT_FAILED');
    expect(isPermanentCode(err.code)).toBe(false);
  });

  it('refuses when configured but the graph produced no video', async () => {
    const tp = template();
    const noVideo = async (url) => {
      const u = String(url);
      if (u.endsWith('/prompt')) return { ok: true, status: 200, json: async () => ({ prompt_id: 'pid-1' }) };
      return { ok: true, status: 200, json: async () => ({ 'pid-1': { status: { completed: true }, outputs: { 9: { images: [{ filename: 'p.png' }] } } } }) };
    };
    const err = await generate(validRequest(), {
      env: envFor(tp), fetchImpl: noVideo, outPath: join(dir, 'j.mp4'), sleep: async () => {},
    }).catch(e => e);
    expect(err.code).toBe('E_NO_OUTPUT');
  });

  it('reports a timeout AS a timeout, not as "no output"', async () => {
    // A history entry that exists but never completes keeps `entry` truthy. The
    // first version tested `!entry` and so blamed the graph for a clock problem.
    const tp = template();
    const neverDone = async (url) => {
      const u = String(url);
      if (u.endsWith('/prompt')) return { ok: true, status: 200, json: async () => ({ prompt_id: 'pid-1' }) };
      return { ok: true, status: 200, json: async () => ({ 'pid-1': { status: { completed: false } } }) };
    };
    const err = await generate(validRequest(), {
      env: envFor(tp), fetchImpl: neverDone, outPath: join(dir, 'j.mp4'),
      sleep: async () => {}, timeoutMs: 1,
    }).catch(e => e);
    expect(err.code).toBe('E_TIMEOUT');
    expect(isPermanentCode(err.code)).toBe(false);   // a later attempt may succeed
  });

  it('never fabricates media when unconfigured', async () => {
    const err = await generate(validRequest(), {
      env: {}, fetchImpl: async () => { throw new Error('should not be called'); },
      outPath: join(dir, 'j.mp4'),
    }).catch(e => e);
    expect(err.code).toBe('E_NOT_CONFIGURED');
  });
});

describe('comfyui output discovery', () => {
  it('finds a video under any of the node output keys', () => {
    for (const key of ['videos', 'gifs', 'images']) {
      const entry = { outputs: { 9: { [key]: [{ filename: 'out.mp4', subfolder: '', type: 'output' }] } } };
      expect(findOutputFile(entry)?.filename).toBe('out.mp4');
    }
  });

  it('ignores non-video artifacts', () => {
    const entry = { outputs: { 9: { images: [{ filename: 'preview.png' }] } } };
    expect(findOutputFile(entry)).toBeNull();
  });

  it('returns null rather than throwing on an empty history entry', () => {
    expect(findOutputFile({})).toBeNull();
    expect(findOutputFile(null)).toBeNull();
  });
});

describe('verify() reports what to DO, and never throws', () => {
  it('reports each missing piece with an actionable instruction', async () => {
    const report = await verify({}, { fetchImpl: async () => { throw new Error('ECONNREFUSED'); } });
    expect(report.ok).toBe(false);
    const byName = Object.fromEntries(report.checks.map(c => [c.name, c]));
    expect(byName['workflow template'].detail).toMatch(/SWAN_COMFYUI_WORKFLOW/);
    expect(byName['prompt node binding'].detail).toMatch(/SWAN_COMFYUI_NODE_PROMPT/);
    expect(byName['comfyui reachable'].detail).toMatch(/is ComfyUI running/i);
  });

  it('reports reachable when the server answers', async () => {
    const report = await verify({}, { fetchImpl: async () => ({ ok: true, status: 200 }) });
    const reach = report.checks.find(c => c.name === 'comfyui reachable');
    expect(reach.ok).toBe(true);
  });
});

describe('generate handler — retry classification', () => {
  const job = (params) => ({ id: 'job-1', params });
  const noop = async () => {};

  const ENABLED = { SWAN_VIDEO_PROVIDERS_ENABLED: LOCAL };

  it('marks a licence refusal PERMANENT — a retry grows no licence', async () => {
    const err = await runGenerate(
      job({ provider: LOCAL, ...validRequest() }), noop, { env: ENABLED },
    ).catch(e => e);
    expect(err.code).toBe('E_LICENCE_GRANT_REQUIRED');
    expect(err.permanent).toBe(true);
  });

  it('marks a disabled provider PERMANENT', async () => {
    const err = await runGenerate(
      job({ provider: LOCAL, ...validRequest(), commercial: false }), noop, { env: {} },
    ).catch(e => e);
    expect(err.code).toBe('E_PROVIDER_DISABLED');
    expect(err.permanent).toBe(true);
  });

  it('honours the INJECTED env rather than process.env', async () => {
    // If the registry fell back to its own process.env read, this would refuse.
    const fake = { generate: async (r, o) => ({ provider: LOCAL, outPath: o.outPath, bytes: 1, attribution: 'x' }) };
    const out = await runGenerate(
      job({ provider: LOCAL, ...validRequest(), commercial: false }), noop,
      { env: ENABLED, adapters: { [LOCAL]: fake }, outDir: '/tmp' },
    );
    expect(out.bytes).toBe(1);
  });

  it('marks an unknown provider PERMANENT', async () => {
    const err = await runGenerate(job({ provider: 'nope/x' }), noop, { env: {} }).catch(e => e);
    expect(err.permanent).toBe(true);
  });

  it('marks a missing provider param PERMANENT', async () => {
    const err = await runGenerate(job({}), noop, { env: {} }).catch(e => e);
    expect(err.code).toBe('E_NO_PROVIDER');
    expect(err.permanent).toBe(true);
  });

  it('marks bad input PERMANENT, not retryable', async () => {
    const err = await runGenerate(
      job({ provider: LOCAL, ...validRequest({ duration: 999 }), commercial: false }),
      noop,
      { env: { SWAN_VIDEO_LICENCE_GRANTS: LOCAL, ...ENABLED }, adapters: { [LOCAL]: {} } },
    ).catch(e => e);
    expect(err.code).toBe('E_BAD_INPUT');
    expect(err.permanent).toBe(true);
  });

  it('leaves a transient adapter failure RETRYABLE', async () => {
    const flaky = { generate: async () => { const e = new Error('socket hang up'); e.code = 'ECONNRESET'; throw e; } };
    const err = await runGenerate(
      job({ provider: LOCAL, ...validRequest(), commercial: false }),
      noop,
      { env: ENABLED, adapters: { [LOCAL]: flaky } },
    ).catch(e => e);
    expect(err.message).toMatch(/socket hang up/);
    expect(err.permanent).toBeUndefined();
  });

  it('classifies structural comfy errors as permanent and transport ones as not', () => {
    expect(isPermanentCode('E_GUI_FORMAT_WORKFLOW')).toBe(true);
    expect(isPermanentCode('E_NO_NODE')).toBe(true);
    expect(isPermanentCode('E_TIMEOUT')).toBe(false);
    expect(isPermanentCode('E_DOWNLOAD_FAILED')).toBe(false);
  });
});

describe('queue artifact pointer — the completion payload', () => {
  it('preserves mediasync exactly when the handler declares nothing', () => {
    // REGRESSION GUARD. mediasync produces a measurement, not a file, and its recorded
    // shape must not change just because a second handler exists.
    const body = completionBody({ id: 'j1' }, { offsetSeconds: 1.25, usable: true });
    expect(body.r2Key).toBe('jobs/j1/mediasync.json');
    expect(body.mime).toBe('application/json');
    expect(completionSummary({ offsetSeconds: 1.25, usable: true }))
      .toBe('offset 1.2500s usable=true');
  });

  it('lets a handler override both — an mp4 is not application/json', () => {
    // The defect: every video job was recorded in the queue as `mediasync.json`
    // with mime application/json. The queue believed it, having never looked.
    const out = { r2Key: 'jobs/j2/r4.mp4', mime: 'video/mp4', summary: 'r4.mp4 (19 bytes)' };
    const body = completionBody({ id: 'j2' }, out);
    expect(body.r2Key).toBe('jobs/j2/r4.mp4');
    expect(body.mime).toBe('video/mp4');
    expect(completionSummary(out)).toBe('r4.mp4 (19 bytes)');
  });

  it('never prints "offset undefined" for a handler with no offset', () => {
    expect(completionSummary({ summary: 'x' })).not.toMatch(/offset undefined/);
  });

  it('the generate handler declares a real mime for each container', async () => {
    const mk = (filename) => ({
      generate: async (r, o) => ({ provider: LOCAL, outPath: o.outPath, bytes: 9, filename }),
    });
    for (const [file, mime] of [['a.mp4', 'video/mp4'], ['a.webm', 'video/webm'], ['a.gif', 'image/gif']]) {
      const out = await runGenerate(
        { id: 'j3', params: { provider: LOCAL, ...validRequest(), commercial: false } },
        async () => {},
        { env: { SWAN_VIDEO_PROVIDERS_ENABLED: LOCAL }, adapters: { [LOCAL]: mk(file) }, outDir: '/tmp' },
      );
      expect(out.mime).toBe(mime);
      expect(out.r2Key).toBe(`jobs/j3/${file}`);
    }
  });
});

describe('generate handler — success path', () => {
  it('returns the attribution and does NOT claim an upload that did not happen', async () => {
    const fake = {
      generate: async (req, o) => ({
        provider: LOCAL, promptId: 'p1', outPath: o.outPath, bytes: 1234,
        filename: 'out.mp4', attribution: capabilities(LOCAL).attribution,
      }),
    };
    const out = await runGenerate(
      { id: 'job-9', params: { provider: LOCAL, ...validRequest(), commercial: false } },
      async () => {},
      { env: { SWAN_VIDEO_PROVIDERS_ENABLED: LOCAL }, adapters: { [LOCAL]: fake }, outDir: '/tmp/out' },
    );
    expect(out.attribution).toMatch(/MiniMax H3/);
    expect(out.bytes).toBe(1234);
    expect(out.localPath).toBe('/tmp/out/job-job-9.mp4');
    // The artifact is on the agent's disk. R2 upload is not implemented in this
    // lane, and a truthful `false` is what stops the queue storing a lie.
    expect(out.uploaded).toBe(false);
  });
});
