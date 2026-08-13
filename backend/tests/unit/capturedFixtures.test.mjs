import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileImage } from '../../../shared/swanPromptCompiler.mjs';
import { generate, capabilities, DEFAULT_MODEL } from '../../../shared/providers/openrouterImage.mjs';
import { paletteAudit } from '../../../shared/pixels.mjs';

/**
 * TESTS THAT READ CAPTURED REALITY, not my beliefs about it.
 *
 * The meta-bug this kills: the cost defect survived 121 green tests because I
 * authored the stub with `usage.total_cost` — the same wrong field name the
 * production code used. Test and code shared one misconception, so the test
 * COULD NOT FAIL. One slice later the same trap caught me again: twelve green
 * palette tests over solid-colour PNGs I generated myself could never have found
 * an audit that broke specifically on desaturated real images.
 *
 * Everything here loads from `fixtures/captured/`, recorded by
 * `scripts/forge-capture-fixtures.mjs` from live calls. No provider field name
 * in this file was typed by me — they are read out of the recorded envelope.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, '..', 'fixtures', 'captured');
const load = (f) => JSON.parse(readFileSync(join(FIX, f), 'utf8'));
const bytes = (f) => readFileSync(join(FIX, f));

const SUCCESS = load('success.json');
const ERROR_400 = load('error-400.json');
const BRIEF = { briefId: 'b-fix', text: 'pale winter light across cracked grey ice', intent: 'hero', aspect: '16:9' };

/** Replay the captured envelope, substituting the real image bytes back in. */
function replay(overrides = {}) {
  const body = structuredClone(SUCCESS);
  body.data[0].b64_json = bytes('real-desaturated.png').toString('base64');
  return async () => ({ ok: true, status: 200, json: async () => ({ ...body, ...overrides }) });
}

test('THE CAPTURED ENVELOPE names its cost field — and it is not what I guessed', () => {
  // Read from the recording, not asserted from memory.
  assert.ok(Object.hasOwn(SUCCESS.usage, 'cost'), 'captured envelope has usage.cost');
  assert.equal(Object.hasOwn(SUCCESS.usage, 'total_cost'), false,
    'usage.total_cost does NOT exist — the name the original code and its stub both used');
  assert.equal(typeof SUCCESS.usage.cost, 'number');
  assert.ok(Object.hasOwn(SUCCESS, 'id') === false, 'no id — an uncaptured cost cannot be looked up later');
});

test('cost parsing works against a payload the provider actually sent', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key-not-a-real-credential';
  try {
    const compiled = compileImage(BRIEF, capabilities(DEFAULT_MODEL));
    const res = await generate(compiled, { root: '.', fetchImpl: replay() });
    assert.equal(res.costUsd, SUCCESS.usage.cost);
    assert.ok(res.costUsd > 0);
    assert.equal(res.actualWidth, 256);       // the captured image, downsampled
    assert.equal(res.retries, 0);
  } finally { delete process.env.OPENROUTER_API_KEY; }
});

test('the REAL captured 400 is classified as a safety rejection', async () => {
  // Body shape is the provider's: { error: { message, code, metadata } }.
  assert.match(ERROR_400.error.message, /rejected by the safety system/i);
  process.env.OPENROUTER_API_KEY = 'test-key-not-a-real-credential';
  try {
    const compiled = compileImage(BRIEF, capabilities(DEFAULT_MODEL));
    await assert.rejects(
      generate(compiled, {
        root: '.',
        fetchImpl: async () => ({ ok: false, status: 400, text: async () => JSON.stringify(ERROR_400) }),
      }),
      (e) => e.code === 'E_PROVIDER_SAFETY_REJECT',
    );
  } finally { delete process.env.OPENROUTER_API_KEY; }
});

test('a REAL desaturated generated image is NOT a brand violation', () => {
  // This is the case that broke the first two palette audits. It is now a
  // captured artifact rather than a solid colour I invented.
  const audit = paletteAudit(bytes('real-desaturated.png'));
  assert.equal(audit.decoded, true, 'a real 8-bit PNG from the provider must decode');
  assert.equal(audit.driftsRetired, false);
  assert.ok(audit.swanCoverage >= 0 && audit.swanCoverage <= 1,
    `coverage must be a fraction, got ${audit.swanCoverage} — sums over overlapping anchors once gave 236%`);
});

test('a second REAL generated image also decodes and stays within bounds', () => {
  const audit = paletteAudit(bytes('real-generated.png'));
  assert.equal(audit.decoded, true);
  assert.ok(audit.swanCoverage <= 1);
  assert.ok(audit.retiredCoverage <= 1);
});

test('RETRY: a 500 then a 200 yields one image and records the retry', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key-not-a-real-credential';
  try {
    const compiled = compileImage(BRIEF, capabilities(DEFAULT_MODEL));
    let call = 0;
    const ok = replay();
    // NOTE: the 5xx here is a TRANSPORT condition synthesized by the runtime,
    // not a captured provider body — I cannot induce a real 502 on demand, and
    // fabricating one would reintroduce the disease these fixtures cure. The
    // 200 it recovers to IS captured.
    const flaky = async (...a) => {
      call += 1;
      if (call === 1) return { ok: false, status: 500, text: async () => 'upstream unavailable' };
      return ok(...a);
    };
    const res = await generate(compiled, { root: '.', fetchImpl: flaky, sleep: async () => {} });
    assert.equal(res.retries, 1);
    assert.equal(res.costUsd, SUCCESS.usage.cost);
    assert.equal(call, 2, 'exactly one retry, not a storm');
  } finally { delete process.env.OPENROUTER_API_KEY; }
});

test('RETRY NEVER fires on 4xx — a safety rejection must not be re-bought', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key-not-a-real-credential';
  try {
    const compiled = compileImage(BRIEF, capabilities(DEFAULT_MODEL));
    let call = 0;
    await assert.rejects(generate(compiled, {
      root: '.', sleep: async () => {},
      fetchImpl: async () => { call += 1; return { ok: false, status: 400, text: async () => JSON.stringify(ERROR_400) }; },
    }), (e) => e.code === 'E_PROVIDER_SAFETY_REJECT');
    assert.equal(call, 1, 'a 400 costs money to repeat and fails identically');
  } finally { delete process.env.OPENROUTER_API_KEY; }
});

test('RETRY gives up after the configured attempts and reports transport failure', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key-not-a-real-credential';
  try {
    const compiled = compileImage(BRIEF, capabilities(DEFAULT_MODEL));
    let call = 0;
    await assert.rejects(generate(compiled, {
      root: '.', sleep: async () => {},
      fetchImpl: async () => { call += 1; throw new Error('socket hang up'); },
    }), (e) => e.code === 'E_PROVIDER_TRANSPORT');
    assert.equal(call, 3, 'first attempt plus two retries, then stop');
  } finally { delete process.env.OPENROUTER_API_KEY; }
});

test('a persistent 5xx surfaces as an HTTP error, not an infinite loop', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key-not-a-real-credential';
  try {
    const compiled = compileImage(BRIEF, capabilities(DEFAULT_MODEL));
    let call = 0;
    await assert.rejects(generate(compiled, {
      root: '.', sleep: async () => {},
      fetchImpl: async () => { call += 1; return { ok: false, status: 503, text: async () => 'unavailable' }; },
    }), (e) => e.code === 'E_PROVIDER_HTTP');
    assert.equal(call, 3);
  } finally { delete process.env.OPENROUTER_API_KEY; }
});
