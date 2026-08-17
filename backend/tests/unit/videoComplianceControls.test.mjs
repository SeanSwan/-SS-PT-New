/**
 * The three compliance controls promised to a licensor on 2026-08-16.
 * ============================================================================
 *
 * These are not ordinary features. A licensing request went to MiniMax stating that
 * SwanStudios has per-asset provenance, server-side spend/volume ceilings, and a
 * content policy filter. These tests are what make those sentences true rather than
 * aspirational, and they are the reason the claim can be re-verified later by someone
 * who was not here.
 *
 * The highest-value test in this file is the one asserting that a NORMAL adult fitness
 * prompt passes clean. A safety filter that refuses the product's actual content gets
 * switched off, and a disabled filter protects nobody.
 */

import { describe, it, expect } from 'vitest';

import {
  buildProvenance, auditProvenance, snapshotLicence, PROVENANCE_SCHEMA, PROMPT_KEEP_CHARS,
} from '../../../shared/providers/video/provenance.mjs';
import {
  readLimits, checkRunAllowed, dayKey, makeFileLedger,
  DEFAULT_MAX_RUNS_DAILY, DEFAULT_MAX_SPEND_USD_DAILY, SpendGuardError,
} from '../../../shared/providers/video/spendGuard.mjs';
import {
  evaluatePrompt, assertPromptAllowed,
} from '../../../shared/providers/video/promptPolicy.mjs';
import { resolve, capabilities } from '../../../shared/providers/video/registry.mjs';
import { runGenerate, seedFromJobId } from '../../scripts/handlers/generateVideo.mjs';

const LOCAL = 'comfyui/minimax-h3';
const HOSTED = 'minimax/hailuo-hosted';
const localCaps = () => resolve(LOCAL, { commercial: false, requireEnabled: false });
const hostedCaps = () => resolve(HOSTED, { requireEnabled: false });

const req = (over = {}) => ({
  prompt: 'a swan crossing still water at dawn',
  category: 'marketing', style: 'cinematic', duration: 5, ...over,
});

// ───────────────────────────── PROVENANCE ─────────────────────────────

describe('provenance — the record promised to the licensor', () => {
  const build = (over = {}) => buildProvenance({
    caps: localCaps(),
    request: req(),
    result: { filename: 'a.mp4', bytes: 10, sha256: 'abc', promptId: 'p1' },
    commercial: false, territory: 'US', grantRecorded: false,
    now: new Date('2026-08-16T12:00:00Z'),
    ...over,
  });

  it('carries provider, model version and generation time', () => {
    const r = build();
    expect(r.schema).toBe(PROVENANCE_SCHEMA);
    expect(r.provider).toBe(LOCAL);
    expect(r.modelVersion).toBeTruthy();
    expect(r.generatedAt).toBe('2026-08-16T12:00:00.000Z');
  });

  it('embeds the licence as it stood AT GENERATION TIME, not by reference', () => {
    // The whole point: terms change, grants are issued and revoked. A record that
    // points at the current licence answers a different question than the one asked.
    const r = build();
    expect(r.licence.name).toMatch(/MiniMax/);
    expect(r.licence.restricts).toBe('model-execution');
    expect(r.licence.grantRecorded).toBe(false);
    expect(r.licence.territoryAtGeneration).toBe('US');
    expect(r.licence.usedCommercially).toBe(false);
  });

  it('records grantRecorded:true separately from the licence terms', () => {
    const r = build({ grantRecorded: true, commercial: true });
    expect(r.licence.grantRecorded).toBe(true);
    expect(r.licence.usedCommercially).toBe(true);
    // Terms themselves are unchanged by holding a grant.
    expect(r.licence.commercialUse).toBe('requires-grant');
  });

  it('carries the attribution the licence requires displayed', () => {
    expect(build().attribution).toMatch(/MiniMax H3/);
  });

  it('is immutable — a record that can be edited is not evidence', () => {
    const r = build();
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.licence)).toBe(true);
    expect(() => { 'use strict'; r.provider = 'tampered'; }).toThrow();
  });

  it('hashes the prompt and flags truncation rather than silently cutting', () => {
    const long = 'x'.repeat(PROMPT_KEEP_CHARS + 50);
    const r = build({ request: req({ prompt: long }) });
    expect(r.request.prompt.length).toBe(PROMPT_KEEP_CHARS);
    expect(r.request.promptTruncated).toBe(true);
    expect(r.request.promptSha256).toHaveLength(64);
    // The hash is of the FULL prompt, so truncation never breaks comparability.
    const r2 = build({ request: req({ prompt: long }) });
    expect(r2.request.promptSha256).toBe(r.request.promptSha256);
  });

  it('identifies the artifact it describes', () => {
    const r = build();
    expect(r.artifact.sha256).toBe('abc');
    expect(r.artifact.filename).toBe('a.mp4');
    expect(r.artifact.providerJobId).toBe('p1');
  });

  it('audit names what is missing rather than returning a bare false', () => {
    const thin = build({ result: { filename: 'a.mp4', bytes: 1 } });   // no sha256
    const audit = auditProvenance(thin);
    expect(audit.ok).toBe(false);
    expect(audit.missing).toContain('artifact.sha256');
    expect(auditProvenance(build()).ok).toBe(true);
  });

  it('refuses to build without resolved capabilities', () => {
    expect(() => buildProvenance({})).toThrow(/resolved capabilities/);
  });

  it('snapshotLicence copies the excluded-territory list rather than aliasing it', () => {
    const snap = snapshotLicence(localCaps(), { commercial: true, territory: 'US', grantRecorded: false });
    expect(Object.isFrozen(snap.excludedTerritories)).toBe(true);
    expect(snap.excludedTerritories).toContain('US');
  });
});

// ───────────────────────────── SPEND GUARD ─────────────────────────────

describe('spend + volume ceilings', () => {
  it('defaults are finite for runs and ZERO for spend', () => {
    const l = readLimits({});
    expect(l.maxRunsDaily).toBe(DEFAULT_MAX_RUNS_DAILY);
    expect(Number.isFinite(l.maxRunsDaily)).toBe(true);   // "unset" never means unlimited
    expect(l.maxSpendUsdDaily).toBe(DEFAULT_MAX_SPEND_USD_DAILY);
    expect(l.maxSpendUsdDaily).toBe(0);                   // paid runs need an explicit decision
  });

  it('lets the FREE local provider run without any spend ceiling configured', () => {
    // Reading "unconfigured cap denies" literally would block the zero-cost path over
    // money that is never spent — the same mistake as image-first on a free provider.
    const out = checkRunAllowed(localCaps(), { runs: 0, spendUsd: 0 }, readLimits({}));
    expect(out.allowed).toBe(true);
    expect(out.runCost).toBe(0);
  });

  it('DENIES a billing provider while the spend ceiling is zero', () => {
    let err;
    try { checkRunAllowed(hostedCaps(), { runs: 0, spendUsd: 0 }, readLimits({})); }
    catch (e) { err = e; }
    expect(err.code).toBe('E_SPEND_DISABLED');
    expect(err.message).toMatch(/SWAN_VIDEO_MAX_SPEND_USD_DAILY/);
  });

  it('still refuses a billing provider whose price was never recorded', () => {
    // costPerRunUsd null. With a ceiling configured, an unpriced provider is unbounded,
    // so it is refused rather than guessed at zero.
    const limits = readLimits({ SWAN_VIDEO_MAX_SPEND_USD_DAILY: '10' });
    let err;
    try { checkRunAllowed(hostedCaps(), { runs: 0, spendUsd: 0 }, limits); }
    catch (e) { err = e; }
    expect(err.code).toBe('E_UNKNOWN_COST');
  });

  it('enforces the daily run ceiling even when nothing is billed', () => {
    const limits = readLimits({ SWAN_VIDEO_MAX_RUNS_DAILY: '3' });
    expect(() => checkRunAllowed(localCaps(), { runs: 3, spendUsd: 0 }, limits)).toThrow(/run cap reached/i);
    expect(checkRunAllowed(localCaps(), { runs: 2, spendUsd: 0 }, limits).allowed).toBe(true);
  });

  it('refuses a malformed cap instead of guessing', () => {
    // Treating "abc" as absent restores the default silently; treating it as Infinity
    // removes the ceiling. Neither is safe, so it throws.
    expect(() => readLimits({ SWAN_VIDEO_MAX_RUNS_DAILY: 'abc' })).toThrow(/plain non-negative decimal/);
    expect(() => readLimits({ SWAN_VIDEO_MAX_SPEND_USD_DAILY: '-5' })).toThrow(/plain non-negative decimal/);
  });

  it('projects spend before allowing, not after', () => {
    const capsPriced = { ...hostedCaps(), costPerRunUsd: 0.64 };
    const limits = readLimits({ SWAN_VIDEO_MAX_SPEND_USD_DAILY: '1.00' });
    expect(checkRunAllowed(capsPriced, { runs: 0, spendUsd: 0 }, limits).projectedSpendUsd).toBeCloseTo(0.64);
    let err;
    try { checkRunAllowed(capsPriced, { runs: 1, spendUsd: 0.64 }, limits); } catch (e) { err = e; }
    expect(err.code).toBe('E_SPEND_CAP');
  });

  it('day key is UTC so a timezone shift cannot silently reset the ledger', () => {
    expect(dayKey(new Date('2026-08-16T23:59:59Z'))).toBe('2026-08-16');
    expect(dayKey(new Date('2026-08-17T00:00:01Z'))).toBe('2026-08-17');
  });
});

describe('usage ledger', () => {
  const fakeFs = (initial = null) => {
    let store = initial;
    return {
      readFileSync: () => { if (store === null) throw new Error('ENOENT'); return store; },
      writeFileSync: (_p, data) => { store = data; },
      _dump: () => store,
    };
  };

  it('counts runs and spend per UTC day', () => {
    const fs = fakeFs();
    const led = makeFileLedger('/x.json', fs);
    expect(led.usageFor('2026-08-16')).toMatchObject({ runs: 0, spendUsd: 0 });
    led.record('2026-08-16', { runs: 1, spendUsd: 0.5 });
    led.record('2026-08-16', { runs: 1, spendUsd: 0.5 });
    expect(led.usageFor('2026-08-16')).toMatchObject({ runs: 2, spendUsd: 1 });
  });

  it('keeps days separate — a new day starts clean', () => {
    const fs = fakeFs();
    const led = makeFileLedger('/x.json', fs);
    led.record('2026-08-16', { runs: 5, spendUsd: 2 });
    expect(led.usageFor('2026-08-17')).toMatchObject({ runs: 0, spendUsd: 0 });
  });

  it('distinguishes a MISSING ledger from a CORRUPT one', () => {
    // External review (Kimi K3) found that conflating them was an exploit: truncating the
    // file to "{" reset the day's usage, and anyone with disk access to the worker can do
    // that. Missing = a fresh day. Corrupt = the total is unknown.
    const missing = makeFileLedger('/x.json', fakeFs());
    expect(missing.usageFor('2026-08-16').degraded).toBe(false);

    const corrupt = makeFileLedger('/x.json', fakeFs('}{ not json'));
    const u = corrupt.usageFor('2026-08-16');
    expect(u.degraded).toBe(true);
    expect(u.runs).toBe(0);   // still reads as zero — availability is preserved
  });

  it('degrades ASYMMETRICALLY: free keeps running, billing stops', () => {
    const corrupt = makeFileLedger('/x.json', fakeFs('}{ not json')).usageFor('d');
    const limits = readLimits({ SWAN_VIDEO_MAX_SPEND_USD_DAILY: '10' });
    // A bookkeeping problem must not become an outage for the zero-cost path...
    expect(() => checkRunAllowed(localCaps(), corrupt, limits)).not.toThrow();
    // ...but an unknown total cannot be compared against a spend ceiling.
    const billing = { ...hostedCaps(), costPerRunUsd: 0.64 };
    expect(() => checkRunAllowed(billing, corrupt, limits)).toThrow(/ledger could not be read/i);
  });

  it('is MONOTONIC — a negative delta cannot buy back headroom', () => {
    // Kimi K3 probe: recorded 5 runs / $5 was driven back to 1 / $1, minting quota.
    const led = makeFileLedger('/x.json', fakeFs());
    led.record('d', { runs: 5, spendUsd: 5 });
    led.record('d', { runs: -4, spendUsd: -4 });
    expect(led.usageFor('d').runs).toBe(5);
    expect(led.usageFor('d').spendUsd).toBe(5);
  });

  it('rejects a non-decimal cap instead of coercing it', () => {
    // Number("0x32") is 50 — a config typo silently became a ceiling nobody chose.
    expect(() => readLimits({ SWAN_VIDEO_MAX_RUNS_DAILY: '0x32' })).toThrow(/plain non-negative decimal/);
    expect(() => readLimits({ SWAN_VIDEO_MAX_RUNS_DAILY: '0b11' })).toThrow(/plain non-negative decimal/);
    expect(readLimits({ SWAN_VIDEO_MAX_RUNS_DAILY: '50' }).maxRunsDaily).toBe(50);
    expect(readLimits({ SWAN_VIDEO_MAX_SPEND_USD_DAILY: '2.5' }).maxSpendUsdDaily).toBe(2.5);
  });

  it('trims to 30 days so the ledger cannot grow forever', () => {
    const fs = fakeFs();
    const led = makeFileLedger('/x.json', fs);
    for (let d = 1; d <= 40; d += 1) {
      led.record(`2026-07-${String(d).padStart(2, '0')}`, { runs: 1 });
    }
    expect(Object.keys(JSON.parse(fs._dump())).length).toBeLessThanOrEqual(30);
  });
});

// ───────────────────────────── PROMPT POLICY ─────────────────────────────

describe('content policy — what must PASS', () => {
  it('a normal adult fitness prompt passes clean', () => {
    // THE MOST IMPORTANT TEST HERE. A filter that refuses the product's own content
    // gets disabled, and a disabled filter protects nobody.
    for (const p of [
      'a swan crossing still water at dawn, cinematic',
      'a 45 year old man performing a barbell back squat, side angle, studio lighting',
      'close-up of hands gripping a kettlebell, slow motion',
      'an athlete resting between sets, editorial lighting',
      'a woman demonstrating a hip hinge with perfect form',
    ]) {
      const r = evaluatePrompt(p, {});
      expect(r.allowed, `blocked a legitimate prompt: "${p}" -> ${JSON.stringify(r.violations)}`).toBe(true);
    }
  });

  it('an adult age passes — the product trains adults', () => {
    expect(evaluatePrompt('a 62 year old client doing a step-up', {}).allowed).toBe(true);
    expect(evaluatePrompt('an 18 year old athlete sprinting', {}).allowed).toBe(true);
  });
});

describe('content policy — what must BLOCK', () => {
  const blocked = (p) => {
    const r = evaluatePrompt(p, {});
    expect(r.allowed, `should have blocked: "${p}"`).toBe(false);
    return r.violations.map(v => v.rule);
  };

  it('blocks synthetic depiction of minors', () => {
    expect(blocked('a child doing jumping jacks')).toContain('minors');
    expect(blocked('a teenager lifting weights')).toContain('minors');
    expect(blocked('a 12 year old athlete')).toContain('minors');
    expect(blocked('kids in a gym class')).toContain('minors');
  });

  it('blocks impersonation and synthetic likeness', () => {
    expect(blocked('a deepfake of a famous athlete')).toContain('impersonation');
    expect(blocked('someone impersonating a well-known trainer')).toContain('impersonation');
    expect(blocked('a celebrity endorsing the program')).toContain('impersonation');
  });

  it('blocks deceptive framing', () => {
    expect(blocked('a fake news report about our results')).toContain('deception');
    expect(blocked('a forged certificate of completion')).toContain('deception');
    expect(blocked('an official government notice')).toContain('deception');
  });

  it('blocks a name on the explicit denylist', () => {
    const r = evaluatePrompt('a portrait of Jordan Rivera training', { SWAN_VIDEO_BLOCKED_NAMES: 'jordan rivera' });
    expect(r.allowed).toBe(false);
    expect(r.violations.map(v => v.rule)).toContain('blocked-name');
  });

  it('names EVERY violation, not just the first', () => {
    let err;
    try { assertPromptAllowed('a deepfake of a child in a fake news report', {}); } catch (e) { err = e; }
    expect(err.code).toBe('E_POLICY_REFUSED');
    const rules = err.violations.map(v => v.rule);
    expect(rules).toContain('minors');
    expect(rules).toContain('impersonation');
    expect(rules).toContain('deception');
  });
});

describe('content policy — the naive phrasings the first version missed', () => {
  // An adversarial pass found 11 of 13 probes walked straight through. These are the
  // ones that matter most: none of them is an evasion attempt. Someone types "a
  // youngster" or "my son" meaning nothing by it and gets a synthetic minor.
  const mustBlock = [
    ['synonym', 'a youngster in the gym'],
    ['synonym', 'a juvenile athlete'],
    ['age in words', 'a five year old training'],
    ['hyphenated age', 'a 9-year-old sprinting'],
    ['family reference', 'my son doing pushups'],
    ['school context', 'recess at the playground'],
    ['school grade', 'a 7th grader lifting'],
    ['named likeness', 'make it look exactly like LeBron James'],
    ['real news outlet', 'a realistic CNN broadcast about us'],
  ];
  for (const [label, prompt] of mustBlock) {
    it(`blocks ${label}: "${prompt}"`, () => {
      expect(evaluatePrompt(prompt, {}).allowed, `bypass: ${prompt}`).toBe(false);
    });
  }
});

describe('content policy — the two evasions I had rationalised as unclosable', () => {
  // These were shipped as DOCUMENTED HOLES with tests pinning them as passing, on the
  // reasoning that closing them would cost false positives. An external reviewer
  // (GLM-5.3) called that "rationalization-adjacent". It was right: measured against a
  // 20-prompt corpus of realistic training-video prompts, closing them costs ZERO false
  // positives. The pins are now inverted — these must BLOCK.
  const closed = [
    ['digit substitution', 'a ch1ld doing squats'],
    ['letter spacing', 'a c h i l d doing squats'],
    ['repeated digits', 'a t33n lifting'],
    ['spaced short word', 'a k i d in the gym'],
    ['digit in "minor"', 'a m1nor training'],
  ];
  for (const [label, prompt] of closed) {
    it(`catches ${label}: "${prompt}"`, () => {
      expect(evaluatePrompt(prompt, {}).allowed).toBe(false);
    });
  }

  it('folds zero-width characters and homoglyphs before matching', () => {
    expect(evaluatePrompt('a ch​ild doing squats', {}).allowed).toBe(false);
  });

  it('COSTS NOTHING on realistic training prompts — the whole basis of the change', () => {
    // Digit substitution never touches a STANDALONE number, which is why "45 year old",
    // "3 sets of 10", "RPE 8" and "a 1 rep max" all survive. If that ever breaks, this
    // test is what says so before an operator does.
    for (const p of [
      'a 45 year old man performing a barbell back squat',
      'an 18 year old athlete sprinting',
      '3 sets of 10 reps, side angle',
      'V2 of the hero shot, 4K, 24fps',
      'set 3 of 5, tempo 3 0 1 0',
      'shot on a Sony A7R IV, 85mm',
      'an E Z bar curl, close grip',
      'a 1 rep max attempt',
      'RPE 8 on the top set',
      'a 30 second plank hold',
      'a T bar row demonstration',
      'a 5k row at steady pace',
    ]) {
      expect(evaluatePrompt(p, {}).allowed, `false positive on: "${p}"`).toBe(true);
    }
  });
});

describe('content policy — what must FLAG but not block', () => {
  it('flags a named individual rather than refusing', () => {
    // Blocking every capitalised name in a fitness product would refuse constantly and
    // train the operator to switch the filter off.
    const r = evaluatePrompt('a video of Marcus Webb performing a deadlift', {});
    expect(r.allowed).toBe(true);
    expect(r.flags.map(f => f.rule)).toContain('real-person');
  });

  it('does not flag well-known non-person capitalised phrases', () => {
    const r = evaluatePrompt('golden hour light over Los Angeles, a swan gliding', {});
    expect(r.flags.length).toBe(0);
  });
});

// ───────────────────────────── HANDLER INTEGRATION ─────────────────────────────

describe('seed derivation — ComfyUI caches by graph', () => {
  it('is deterministic for a job, so a RETRY reproduces its render', () => {
    expect(seedFromJobId('job-abc')).toBe(seedFromJobId('job-abc'));
  });

  it('differs across jobs, so two jobs never share one cached video', () => {
    // The real failure: an identical graph returned the previous run's outputs without
    // re-rendering, and the download 404'd on a file that had since been moved.
    const seen = new Set();
    for (let i = 0; i < 500; i += 1) seen.add(seedFromJobId(`job-${i}`));
    expect(seen.size).toBe(500);
  });

  it('stays inside the sampler seed range', () => {
    for (const id of ['a', 'job-999999', 'x'.repeat(64)]) {
      const s = seedFromJobId(id);
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(2147483647);
    }
  });

  it('an explicitly pinned seed still wins', async () => {
    let got;
    const spy = { generate: async (r, o) => { got = o.seed; return { provider: LOCAL, outPath: o.outPath, bytes: 1, filename: 'a.mp4', sha256: 'z' }; } };
    await runGenerate(
      { id: 'j-pin', params: { provider: LOCAL, ...req(), commercial: false, seed: 12345 } },
      async () => {}, { env: { SWAN_VIDEO_PROVIDERS_ENABLED: LOCAL }, adapters: { [LOCAL]: spy }, outDir: '/tmp' },
    );
    expect(got).toBe(12345);
  });
});

describe('handler — the controls actually run in the generate path', () => {
  const ENABLED = { SWAN_VIDEO_PROVIDERS_ENABLED: LOCAL };
  const fakeAdapter = {
    generate: async (r, o) => ({
      provider: LOCAL, promptId: 'p9', outPath: o.outPath, bytes: 42,
      filename: 'out.mp4', sha256: 'deadbeef', attribution: capabilities(LOCAL).attribution,
    }),
  };
  const job = (over = {}) => ({ id: 'j1', params: { provider: LOCAL, ...req(), commercial: false, ...over } });

  it('refuses a policy-violating prompt PERMANENTLY', async () => {
    const err = await runGenerate(job({ prompt: 'a child doing squats' }), async () => {}, {
      env: ENABLED, adapters: { [LOCAL]: fakeAdapter }, outDir: '/tmp',
    }).catch(e => e);
    expect(err.code).toBe('E_POLICY_REFUSED');
    expect(err.permanent).toBe(true);          // the same words refuse forever
  });

  it('a malformed ceiling is PERMANENT — a human must fix the environment', async () => {
    const err = await runGenerate(job(), async () => {}, {
      env: { ...ENABLED, SWAN_VIDEO_MAX_RUNS_DAILY: 'not-a-number' },
      adapters: { [LOCAL]: fakeAdapter }, outDir: '/tmp',
    }).catch(e => e);
    expect(err.code).toBe('E_BAD_CAP');
    expect(err.permanent).toBe(true);
  });

  it('a spend/run ceiling is RETRYABLE — it expires on its own', async () => {
    const err = await runGenerate(job(), async () => {}, {
      env: { ...ENABLED, SWAN_VIDEO_MAX_RUNS_DAILY: '0' },
      adapters: { [LOCAL]: fakeAdapter }, outDir: '/tmp',
    }).catch(e => e);
    expect(err.code).toBe('E_RUN_CAP');
    expect(err.permanent).toBeUndefined();     // tomorrow genuinely succeeds
  });

  it('attaches a complete provenance record to a successful run', async () => {
    const out = await runGenerate(job(), async () => {}, {
      env: ENABLED, adapters: { [LOCAL]: fakeAdapter }, outDir: '/tmp',
      now: () => new Date('2026-08-16T12:00:00Z'),
    });
    expect(auditProvenance(out.provenance).ok).toBe(true);
    expect(out.provenance.artifact.sha256).toBe('deadbeef');
    expect(out.provenance.licence.grantRecorded).toBe(false);
    expect(out.provenance.generatedAt).toBe('2026-08-16T12:00:00.000Z');
  });

  it('records usage only AFTER the run succeeds', async () => {
    const calls = [];
    const ledger = { usageFor: () => ({ runs: 0, spendUsd: 0 }), record: (d, u) => calls.push([d, u]) };

    // A refused prompt must not consume a slot.
    await runGenerate(job({ prompt: 'a child doing squats' }), async () => {}, {
      env: ENABLED, adapters: { [LOCAL]: fakeAdapter }, outDir: '/tmp', ledger,
    }).catch(() => {});
    expect(calls.length).toBe(0);

    await runGenerate(job(), async () => {}, {
      env: ENABLED, adapters: { [LOCAL]: fakeAdapter }, outDir: '/tmp', ledger,
      now: () => new Date('2026-08-16T12:00:00Z'),
    });
    expect(calls).toEqual([['2026-08-16', { runs: 1, spendUsd: 0 }]]);
  });

  it('leaves the artifact local and says so when no upload channel exists', async () => {
    const out = await runGenerate(job(), async () => {}, {
      env: ENABLED, adapters: { [LOCAL]: fakeAdapter }, outDir: '/tmp',
    });
    expect(out.uploaded).toBe(false);
    expect(out.r2Key).toBe('jobs/j1/out.mp4');
  });

  it('uploads via the presigned URL and reports the SERVER-chosen key', async () => {
    const seen = {};
    const api = async (path, opts) => {
      seen.path = path; seen.body = opts.body;
      return { data: { uploadUrl: 'https://r2.example/renders/j1/out.mp4?sig=x', objectKey: 'renders/j1/out.mp4' } };
    };
    const out = await runGenerate(job(), async () => {}, {
      env: ENABLED, adapters: { [LOCAL]: fakeAdapter }, outDir: '/tmp',
      api, readArtifact: () => Buffer.from('BYTES'),
      fetchImpl: async () => ({ ok: true, status: 200 }),
    });
    expect(seen.path).toBe('/jobs/j1/upload-url');
    // The hash goes with the request so R2 verifies the bytes it receives.
    expect(seen.body.sha256).toBe('deadbeef');
    expect(seen.body.contentType).toBe('video/mp4');
    expect(out.uploaded).toBe(true);
    // The key is the SERVER's, never the one the handler would have guessed.
    expect(out.r2Key).toBe('renders/j1/out.mp4');
  });

  it('fails RETRYABLY on upload failure and names the intact local render', async () => {
    // Completing with an r2Key whose object does not exist would put a confident lie in
    // the queue — the same defect class as recording an mp4 as mediasync.json.
    const api = async () => ({ data: { uploadUrl: 'https://r2.example/x', objectKey: 'renders/j1/out.mp4' } });
    const err = await runGenerate(job(), async () => {}, {
      env: ENABLED, adapters: { [LOCAL]: fakeAdapter }, outDir: '/tmp',
      api, readArtifact: () => Buffer.from('BYTES'),
      fetchImpl: async () => ({ ok: false, status: 500 }),
    }).catch(e => e);
    expect(err.code).toBe('E_UPLOAD_FAILED');
    expect(err.permanent).toBeUndefined();            // the GPU work is not lost
    expect(err.message).toMatch(/does not need to be regenerated/);
  });

  it('refuses to invent a key when the server returns no upload URL', async () => {
    const err = await runGenerate(job(), async () => {}, {
      env: ENABLED, adapters: { [LOCAL]: fakeAdapter }, outDir: '/tmp',
      api: async () => ({ data: {} }), readArtifact: () => Buffer.from('B'),
    }).catch(e => e);
    expect(err.code).toBe('E_NO_UPLOAD_URL');
  });

  it('surfaces policy FLAGS on the output for human review', async () => {
    const out = await runGenerate(job({ prompt: 'a video of Marcus Webb performing a deadlift' }), async () => {}, {
      env: ENABLED, adapters: { [LOCAL]: fakeAdapter }, outDir: '/tmp',
    });
    expect(out.policyFlags.map(f => f.rule)).toContain('real-person');
  });
});
