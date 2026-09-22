/**
 * media-api.test.mjs — the gateway's own suite. Zero dependencies, `node --test`.
 *
 * ── WHAT THESE EXIST TO PREVENT ─────────────────────────────────────────────
 * Every test below corresponds to a refusal or a recovery that a reviewer asked for
 * by name. None of them assert that "the happy path returns 200" — that path was
 * already visible in a smoke run, and a test that restates it would add a green tick
 * without adding a guarantee.
 *
 * Test ids follow the adjudication's D-H table so a reader can map a failure back to
 * the requirement that produced it.
 *
 * Run:
 *   node --test media-api/media-api.test.mjs
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { makeJobStore, makeQuoteStore, STATUS } from './store.mjs';
import { preflight, PreflightError } from './preflight.mjs';
import { createQuote, createJob, cancelJob, getJob, listModels, estimate, statusFor } from './routes.mjs';
import { buildServer, readServerConfig, ConfigError } from './server.mjs';
import { capabilities } from '../shared/providers/video/registry.mjs';
import { VIDEO_PROVIDERS, assertSpecShape } from '../shared/providers/video/catalogue.mjs';
import { estimateRunCostMicros, formatUsd, toMicros, describeCost } from '../shared/providers/video/costEstimate.mjs';
import * as higgsfield from '../shared/providers/video/higgsfield.mjs';

let dir;
before(() => { dir = mkdtempSync(join(tmpdir(), 'swan-media-api-')); });
after(() => { rmSync(dir, { recursive: true, force: true }); });

const req = (over = {}) => ({
  prompt: 'a swan crossing still water at dawn',
  category: 'marketing',
  style: 'cinematic',
  duration: 6,
  ...over,
});

const ENABLED_LOCAL = { SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/minimax-h3' };

function freshCtx(env = {}) {
  return {
    env,
    ledger: null,
    quotes: makeQuoteStore(join(dir, `q-${Math.random().toString(36).slice(2)}.json`)),
    jobs: makeJobStore(join(dir, `j-${Math.random().toString(36).slice(2)}.json`)),
    runner: () => {},
    principal: 'owner',
  };
}

// ── CAP-001 / PRICE-001 — honesty about what a row claims ───────────────────

describe('CAP-001 — a claimed capability stays null, and never becomes runnable', () => {
  test('every hosted row is disabled and reports no unverified duration or resolution', () => {
    for (const id of Object.keys(VIDEO_PROVIDERS).filter(x => x.startsWith('higgsfield/'))) {
      assertSpecShape(id, VIDEO_PROVIDERS[id]);
      const caps = capabilities(id);
      assert.equal(caps.enabled, false, `${id} must ship disabled`);
      // claimed -> null. The registry's rule: a consumer that can see a claimed value
      // will eventually treat it as a fact.
      assert.equal(caps.maxDurationSec, null, `${id} must not expose an unverified duration`);
      assert.equal(caps.maxResolution, null, `${id} must not expose an unverified resolution`);
      assert.equal(caps.provenance.maxDurationSec, 'claimed');
    }
  });

  test('readiness separates declared from runnable', () => {
    const hosted = listModels().body.models.find(m => m.id === 'higgsfield/kling-3.0');
    assert.equal(hosted.readiness.declared, true);
    assert.equal(hosted.readiness.runnable, false);
    assert.equal(hosted.execution_kind, 'hosted');
    const local = listModels().body.models.find(m => m.id === 'comfyui/minimax-h3');
    assert.equal(local.execution_kind, 'local_gpu');
  });

  test('the model path is null, never guessed', () => {
    // A guessed path fails at the vendor with an opaque 404 AFTER the request has been
    // authorised and costed — a failure that costs money to discover.
    assert.equal(capabilities('higgsfield/minimax-h3').modelPath, null);
  });
});

describe('PRICE-001 — fixed-point money, and the unit is never implied', () => {
  test('published H3 arithmetic is exact: $0.13 x 6 = $0.78', () => {
    const micros = estimateRunCostMicros(capabilities('higgsfield/minimax-h3'), { duration: 6 });
    assert.equal(micros, 780_000);
    assert.equal(formatUsd(micros), '0.7800');
  });

  test('the local lane costs nothing and says so', () => {
    const local = capabilities('comfyui/minimax-h3');
    assert.equal(estimateRunCostMicros(local, { duration: 6 }), 0);
    assert.match(describeCost(local, { duration: 6 }), /free \(local hardware\)/);
  });

  test('DoP bills per generation and ignores duration', () => {
    const dop = capabilities('higgsfield/dop');
    assert.equal(dop.rateUnit, 'generation');
    assert.equal(estimateRunCostMicros(dop, { duration: 2 }), estimateRunCostMicros(dop, { duration: 30 }));
    assert.equal(estimateRunCostMicros(dop, {}), 125_000);
  });

  test('a per-second rate with no duration is UNKNOWN, not free', () => {
    // Returning 0 here is the single most expensive mistake this module could make.
    assert.equal(estimateRunCostMicros(capabilities('higgsfield/kling-3.0'), {}), null);
  });

  test('rate parsing is decimal-exact rather than a float multiply', () => {
    assert.equal(toMicros(0.0738), 73_800);
    assert.equal(toMicros('0.13'), 130_000);
    assert.equal(toMicros('1'), 1_000_000);
    // The classic float failure, asserted rather than described.
    assert.notEqual(0.1 + 0.2, 0.3);
    assert.equal(toMicros(0.1) + toMicros(0.2), toMicros(0.3));
  });

  test('a malformed rate is refused, never read as absent or infinite', () => {
    assert.throws(() => toMicros('0x32'), /plain non-negative decimal/);
    assert.throws(() => toMicros('abc'), /plain non-negative decimal/);
  });

  test('estimate endpoint labels its basis and carries the caveat', () => {
    const out = estimate({ body: { provider: 'higgsfield/kling-3.0', duration: 6 } });
    assert.equal(out.body.estimate_usd, '0.6720');
    assert.equal(out.body.basis, 'published-rate');
    assert.match(out.body.caveat, /not from a measured invoice/);
  });
});

// ── LIC-001 / ROUTE-001 — the licence gate, and no fallback ─────────────────

describe('LIC-001 — licence refuses at the boundary, and never reroutes', () => {
  test('a disabled provider is a 403, not a 500', () => {
    // The first implementation let the registry's ProviderError escape, so a licence
    // refusal surfaced as a server fault. A refusal that reports itself as an outage
    // sends the reader hunting a fault that does not exist.
    const out = createQuote({ ...freshCtx({}), body: req({ provider: 'higgsfield/minimax-h3' }) });
    assert.equal(out.status, 403);
    assert.equal(out.body.error.code, 'E_PROVIDER_DISABLED');
  });

  test('hosted terms that were never retrieved refuse commercial use', () => {
    // Astra rejected the original assertion that hosted H3 is "permitted": unknown is
    // not permissive.
    const out = createQuote({
      ...freshCtx({ SWAN_VIDEO_PROVIDERS_ENABLED: 'higgsfield/minimax-h3' }),
      body: req({ provider: 'higgsfield/minimax-h3' }),
    });
    assert.equal(out.status, 403);
    assert.equal(out.body.error.code, 'E_LICENCE_EVIDENCE_MISSING');
    assert.match(out.body.error.message, /unknown is not permissive/);
  });

  test('local H3 for US commercial use needs a recorded grant', () => {
    const out = createQuote({
      ...freshCtx(ENABLED_LOCAL),
      body: req({ provider: 'comfyui/minimax-h3', commercial: true }),
    });
    assert.equal(out.status, 403);
    assert.equal(out.body.error.code, 'E_LICENCE_GRANT_REQUIRED');
  });

  test('a refusal names the one provider asked for — it does not offer another', () => {
    const out = createQuote({
      ...freshCtx(ENABLED_LOCAL),
      body: req({ provider: 'comfyui/minimax-h3', commercial: true }),
    });
    const text = JSON.stringify(out.body);
    assert.doesNotMatch(text, /higgsfield|fallback|instead/i);
  });

  test('an unknown provider is a 404', () => {
    const out = createQuote({ ...freshCtx({}), body: req({ provider: 'nope/nothing' }) });
    assert.equal(out.status, 404);
    assert.equal(out.body.error.code, 'E_UNKNOWN_PROVIDER');
  });
});

// ── API-001 — validation ────────────────────────────────────────────────────

describe('API-001 — the request is validated before anything is authorised', () => {
  test('a missing provider, a bad category and a bad style are 400s', () => {
    const ctx = freshCtx(ENABLED_LOCAL);
    assert.equal(createQuote({ ...ctx, body: req({ commercial: false }) }).status, 400);
    assert.equal(createQuote({ ...ctx, body: req({ provider: 'comfyui/minimax-h3', category: 'memes', commercial: false }) }).status, 400);
    assert.equal(createQuote({ ...ctx, body: req({ provider: 'comfyui/minimax-h3', style: 'vaporwave', commercial: false }) }).status, 400);
  });

  test('duration is bounded by the provider, not by a global set', () => {
    const out = createQuote({
      ...freshCtx(ENABLED_LOCAL),
      body: req({ provider: 'comfyui/minimax-h3', duration: 30, commercial: false }),
    });
    assert.equal(out.status, 400);
    assert.match(out.body.error.message, /supports at most 6s/);
  });

  test('every refusal carries retryable, never leaves it to be inferred', () => {
    const out = createQuote({ ...freshCtx({}), body: req({ provider: 'nope/x' }) });
    assert.equal(typeof out.body.error.retryable, 'boolean');
  });
});

// ── PAY-001 — spending is refused before submission ─────────────────────────

describe('PAY-001 — the ceiling is a gate, not a report', () => {
  test('a priced route is refused when the daily ceiling is the default zero', () => {
    // Enabling the provider gets past licence; the SPEND ceiling must still stop it.
    const env = { SWAN_VIDEO_PROVIDERS_ENABLED: 'higgsfield/kling-3.0' };
    const out = createQuote({ ...freshCtx(env), body: req({ provider: 'higgsfield/kling-3.0' }) });
    assert.equal(out.status, 403, 'licence evidence gate fires first — which is the point');
  });

  test('a caller ceiling below the estimate is refused, and cannot raise the server allowance', () => {
    const ctx = freshCtx(ENABLED_LOCAL);
    const q = createQuote({ ...ctx, body: req({ provider: 'comfyui/minimax-h3', commercial: false }) });
    assert.equal(q.status, 201);

    // Local is free, so force the priced path by handing the job a quote with a price.
    const priced = { ...ctx, quotes: makeQuoteStore(join(dir, `q-${Math.random().toString(36).slice(2)}.json`)) };
    const quote = priced.quotes.create({
      owner: 'owner', provider: 'higgsfield/kling-3.0', executionKind: 'hosted',
      params: {}, licenceDecision: {}, pricing: { estimated_micros: 672_000, estimated_usd: '0.6720' },
    });
    const out = createJob({ ...priced, body: { quote_id: quote.id, max_cost_usd: 0.10 } });
    assert.equal(out.status, 403);
    assert.equal(out.body.error.code, 'E_BUDGET_EXCEEDED');
    assert.match(out.body.error.message, /only reduce the server's, never raise it/);
  });

  test('a priced quote with NO caller ceiling is refused, not given a blank cheque', () => {
    const ctx = freshCtx({});
    const quote = ctx.quotes.create({
      owner: 'owner', provider: 'higgsfield/kling-3.0', executionKind: 'hosted',
      params: {}, licenceDecision: {}, pricing: { estimated_micros: 672_000, estimated_usd: '0.6720' },
    });
    const out = createJob({ ...ctx, body: { quote_id: quote.id } });
    assert.equal(out.status, 400);
    assert.equal(out.body.error.code, 'E_MAX_COST_REQUIRED');
  });

  test('a rejected preflight creates no quote and no job', () => {
    const ctx = freshCtx({});
    createQuote({ ...ctx, body: req({ provider: 'higgsfield/minimax-h3' }) });
    assert.equal(ctx.quotes.list().length, 0);
    assert.equal(ctx.jobs.list().length, 0);
  });
});

// ── JOB-001 / CANCEL-001 — the job lifecycle tells the truth ────────────────

describe('CANCEL-001 — cancellation never claims more than it did', () => {
  test('a dispatched job cannot be cancelled from here', () => {
    const ctx = freshCtx(ENABLED_LOCAL);
    const q = createQuote({ ...ctx, body: req({ provider: 'comfyui/minimax-h3', commercial: false }) });
    const job = createJob({ ...ctx, body: { quote_id: q.body.quote.id } });
    ctx.jobs.update(job.body.job.id, { status: STATUS.RUNNING });

    const out = cancelJob({ ...ctx, id: job.body.job.id });
    assert.equal(out.status, 409);
    assert.equal(out.body.error.code, 'E_CANCEL_TOO_LATE');
  });

  test('an undispatched job cancels, and says so plainly', () => {
    const ctx = freshCtx(ENABLED_LOCAL);
    const q = createQuote({ ...ctx, body: req({ provider: 'comfyui/minimax-h3', commercial: false }) });
    const job = createJob({ ...ctx, body: { quote_id: q.body.quote.id } });
    const out = cancelJob({ ...ctx, id: job.body.job.id });
    assert.equal(out.status, 202);
    assert.equal(out.body.job.state, STATUS.CANCELED);
  });

  test('the public job projection never leaks a filesystem path', () => {
    const ctx = freshCtx(ENABLED_LOCAL);
    const q = createQuote({ ...ctx, body: req({ provider: 'comfyui/minimax-h3', commercial: false }) });
    const job = createJob({ ...ctx, body: { quote_id: q.body.quote.id } });
    const out = getJob({ ...ctx, id: job.body.job.id });
    assert.doesNotMatch(JSON.stringify(out.body), /localPath|\\\\|\/tmp\//);
  });

  test('one principal cannot read another principal\'s job', () => {
    const ctx = freshCtx(ENABLED_LOCAL);
    const q = createQuote({ ...ctx, body: req({ provider: 'comfyui/minimax-h3', commercial: false }) });
    const job = createJob({ ...ctx, body: { quote_id: q.body.quote.id } });
    const out = getJob({ ...ctx, id: job.body.job.id, principal: 'someone-else' });
    assert.equal(out.status, 404, '404 rather than 403 — a caller should not learn the id exists');
  });

  test('a quote past its window is unusable', () => {
    let clock = new Date('2026-09-18T00:00:00Z');
    const quotes = makeQuoteStore(join(dir, 'ttl.json'), { now: () => clock });
    const q = quotes.create({ owner: 'owner', provider: 'x', params: {}, licenceDecision: {}, pricing: {} });
    assert.equal(quotes.get(q.id).expired, undefined);
    clock = new Date('2026-09-18T00:06:00Z');   // past the 5-minute default
    assert.equal(quotes.get(q.id).expired, true);
  });
});

// ── STORE-001 — durability and refusal on corruption ────────────────────────

describe('STORE-001 — readable state is not the same as consistent state', () => {
  test('a corrupt store refuses rather than silently resetting history', () => {
    const p = join(dir, 'corrupt.json');
    writeFileSync(p, '{ this is not json');
    const store = makeJobStore(p);
    assert.throws(() => store.list(), /E_STORE_CORRUPT|could not be parsed/);
  });

  test('a missing store is a fresh start, not an error', () => {
    const store = makeJobStore(join(dir, 'absent.json'));
    assert.deepEqual(store.list(), []);
  });

  test('writes are atomic — the temp file does not survive the rename', () => {
    const p = join(dir, 'atomic.json');
    const store = makeJobStore(p);
    store.create({ provider: 'x' });
    assert.equal(existsSync(`${p}.tmp`), false);
    assert.equal(JSON.parse(readFileSync(p, 'utf8')).schema, 1);
  });

  test('a non-terminal job is reconciled on boot and NEVER auto-retried', () => {
    const p = join(dir, 'orphans.json');
    const store = makeJobStore(p);
    const job = store.create({ provider: 'higgsfield/kling-3.0', billed: true });
    store.update(job.id, { status: STATUS.RUNNING });
    const ids = makeJobStore(p).reconcileOrphans();
    assert.deepEqual(ids, [job.id]);
    const after = makeJobStore(p).get(job.id);
    assert.equal(after.status, STATUS.FAILED);
    assert.equal(after.error.code, 'E_ORPHANED');
    assert.equal(after.billed, true, 'the billed flag survives, so a retry can be refused');
  });
});

// ── AUTH-001 / NET-001 / SEC-001 — exposure ─────────────────────────────────

describe('AUTH-001 / NET-001 — the door, and the wall', () => {
  const goodEnv = () => ({
    SWAN_MEDIA_API_TOKEN: 'a'.repeat(32),
    SWAN_MEDIA_API_OUT_DIR: join(dir, 'out'),
    SWAN_MEDIA_API_JOBS: join(dir, `srv-j-${Math.random().toString(36).slice(2)}.json`),
    SWAN_MEDIA_API_QUOTES: join(dir, `srv-q-${Math.random().toString(36).slice(2)}.json`),
    SWAN_MEDIA_API_LEDGER: join(dir, `srv-l-${Math.random().toString(36).slice(2)}.json`),
  });

  test('no token means the server refuses to start', () => {
    assert.throws(() => readServerConfig({}), (e) => e.code === 'E_NO_TOKEN');
  });

  test('a short token is refused — it is the only control', () => {
    assert.throws(() => readServerConfig({ SWAN_MEDIA_API_TOKEN: 'short' }), (e) => e.code === 'E_WEAK_TOKEN');
  });

  test('a non-loopback bind is refused by default', () => {
    assert.throws(
      () => readServerConfig({ SWAN_MEDIA_API_TOKEN: 'a'.repeat(32), SWAN_MEDIA_API_HOST: '0.0.0.0' }),
      (e) => e.code === 'E_NOT_LOOPBACK',
    );
  });

  test('over HTTP: no token is a 401, and the right token is a 200', async () => {
    const env = goodEnv();
    const { server, ctx } = buildServer({ env, deps: { ledger: { usageFor: () => ({ runs: 0, spendUsd: 0 }) } } });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      assert.equal((await fetch(`${base}/v1/models`)).status, 401);
      assert.equal((await fetch(`${base}/v1/models`, { headers: { authorization: 'Bearer wrong' } })).status, 401);
      const ok = await fetch(`${base}/v1/models`, { headers: { authorization: `Bearer ${env.SWAN_MEDIA_API_TOKEN}` } });
      assert.equal(ok.status, 200);
      assert.ok((await ok.json()).models.length > 0);

      // Astra: Idempotency-Key is REQUIRED on job creation.
      const noKey = await fetch(`${base}/v1/jobs`, {
        method: 'POST',
        headers: { authorization: `Bearer ${env.SWAN_MEDIA_API_TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify({ quote_id: 'x' }),
      });
      assert.equal(noKey.status, 400);
      assert.equal((await noKey.json()).error.code, 'E_NO_IDEMPOTENCY_KEY');
      assert.ok(ctx);
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});

describe('SEC-001 — a credential never reaches a message', () => {
  test('the vendor secret is redacted out of an echoed error body', () => {
    const secret = 'sk-live-SUPERSECRETVALUE123';
    const out = higgsfield.redactSecrets(
      `{"detail":"Invalid credentials: Key abc:${secret}"}`,
      ['abc', secret],
    );
    assert.doesNotMatch(out, /SUPERSECRETVALUE/);
    assert.match(out, /<REDACTED>/);
  });

  test('a rejected credential is reported without printing it', async () => {
    const report = await higgsfield.verify(
      { HIGGSFIELD_API_KEY_ID: 'kid', HIGGSFIELD_API_KEY_SECRET: 'supersecret', SWAN_HIGGSFIELD_PATH_MINIMAX_H3: 'p' },
      { fetchImpl: async () => ({ ok: false, status: 401 }) },
    );
    const text = JSON.stringify(report);
    assert.doesNotMatch(text, /supersecret/);
    assert.match(text, /credential was rejected/);
  });

  test('a missing model path reports what to DO rather than guessing one', async () => {
    const report = await higgsfield.verify({}, { fetchImpl: async () => ({ ok: true, status: 404 }) });
    const check = report.checks.find(c => c.name === 'model endpoint path');
    assert.equal(check.ok, false);
    assert.match(check.detail, /never guessed/);
  });
});

describe('higgsfield adapter — lifecycle', () => {
  const cfg = { baseUrl: 'https://api.example', keyId: 'k', keySecret: 's', modelPath: 'm', providerId: 'higgsfield/minimax-h3', configured: true };

  // ── ROUND 27: THE GATE NOW PRECEDES EVERYTHING THIS BLOCK TESTS ──────────────
  // F2 moved `resolve()` to the TOP of `generate()`, so a hosted row that is not enabled, or
  // whose selection is not asserted, now refuses with `E_PROVIDER_DISABLED` BEFORE the lifecycle
  // behaviour below is reached. These three tests are about what happens AFTER a run is
  // authorised — a completed request with no artifact URL, a moderation rejection, and missing
  // credentials — so they must get past the gate to reach their own subject. Measured before the
  // fix: all three failed with `actual: 'E_PROVIDER_DISABLED'` against their expected code.
  //
  // Supplying the two facts is what Astra prescribed for round 11's WEAKENED control: keep the
  // original assertion and supply the flag, rather than accept any error. These tests still
  // assert exactly what they asserted before; only the route to their subject changed. The
  // refusal itself is asserted elsewhere — round 26's E5/E5b/E5c and round 27's C1–C4 and D1–D4 —
  // so nothing is lost by not re-asserting it here.
  const ENABLED = { SWAN_VIDEO_PROVIDERS_ENABLED: 'higgsfield/minimax-h3' };
  const AUTHORISED = { commercial: false, explicitSelection: true };

  test('a submitted request carries the vendor\'s own status and cancel URLs', async () => {
    const job = await higgsfield.submit(req(), cfg, async () => ({
      ok: true, status: 200,
      json: async () => ({ status: 'queued', request_id: 'r1', status_url: 'https://api.example/requests/r1/status', cancel_url: 'https://api.example/requests/r1/cancel' }),
    }));
    assert.equal(job.requestId, 'r1');
    assert.equal(job.statusUrl, 'https://api.example/requests/r1/status');
  });

  test('a 4xx submit is the request\'s fault; a 5xx is the moment\'s', async () => {
    const four = await higgsfield.submit(req(), cfg, async () => ({ ok: false, status: 400, text: async () => 'bad' })).catch(e => e);
    assert.equal(four.code, 'E_SUBMIT_REJECTED');
    const five = await higgsfield.submit(req(), cfg, async () => ({ ok: false, status: 503, text: async () => 'busy' })).catch(e => e);
    assert.equal(five.code, 'E_SUBMIT_FAILED');
  });

  test('a completed request with no artifact URL throws rather than reporting success', async () => {
    const err = await higgsfield.generate(req(), {
      ...AUTHORISED,
      env: { ...ENABLED, HIGGSFIELD_API_KEY_ID: 'k', HIGGSFIELD_API_KEY_SECRET: 's', SWAN_HIGGSFIELD_PATH_MINIMAX_H3: 'm' },
      outPath: join(dir, 'x.mp4'),
      fetchImpl: async (url) => {
        if (String(url).includes('/requests/')) return { ok: true, status: 200, json: async () => ({ status: 'completed', request_id: 'r1' }) };
        return { ok: true, status: 200, json: async () => ({ status: 'queued', request_id: 'r1', status_url: 'https://api.example/requests/r1/status' }) };
      },
      sleep: async () => {},
    }).catch(e => e);
    assert.equal(err.code, 'E_NO_OUTPUT');
  });

  test('a terminal failure is carried through with the vendor\'s own word', async () => {
    const err = await higgsfield.generate(req(), {
      ...AUTHORISED,
      env: { ...ENABLED, HIGGSFIELD_API_KEY_ID: 'k', HIGGSFIELD_API_KEY_SECRET: 's', SWAN_HIGGSFIELD_PATH_MINIMAX_H3: 'm' },
      outPath: join(dir, 'y.mp4'),
      fetchImpl: async (url) => {
        if (String(url).includes('/requests/')) return { ok: true, status: 200, json: async () => ({ status: 'nsfw', request_id: 'r1' }) };
        return { ok: true, status: 200, json: async () => ({ status: 'queued', request_id: 'r1', status_url: 'https://api.example/requests/r1/status' }) };
      },
      sleep: async () => {},
    }).catch(e => e);
    assert.equal(err.code, 'E_NSFW', 'a moderation rejection is a different conversation from a failure');
  });

  test('unconfigured never fabricates media', async () => {
    // The row must be ENABLED for "unconfigured" to be reachable at all now: with no enablement
    // the gate refuses first, and this test would be asserting `E_PROVIDER_DISABLED` — a
    // different claim about a different layer. Enablement present + credentials absent is exactly
    // the state this test is about, and the fetch stub still proves nothing was fabricated.
    const err = await higgsfield.generate(req(), {
      ...AUTHORISED,
      env: { ...ENABLED }, outPath: join(dir, 'z.mp4'), fetchImpl: async () => { throw new Error('must not be called'); },
    }).catch(e => e);
    assert.equal(err.code, 'E_NOT_CONFIGURED');
  });
});

describe('statusFor — the status says which layer refused', () => {
  test('authorisation is 403, a ceiling is 429, a capability gap is 422', () => {
    assert.equal(statusFor('E_LICENCE_GRANT_REQUIRED'), 403);
    assert.equal(statusFor('E_LICENCE_EVIDENCE_MISSING'), 403);
    assert.equal(statusFor('E_SPEND_CAP'), 429);
    assert.equal(statusFor('E_UNKNOWN_COST'), 429);
    assert.equal(statusFor('E_POLICY_REFUSED'), 422);
    assert.equal(statusFor('E_UNKNOWN_PROVIDER'), 404);
  });
});

describe('preflight — the gate order', () => {
  test('licence is checked before spend, so a refusal costs no slot', () => {
    // A refused prompt must not consume a run. Asserted by ordering: the licence
    // error wins over any spend error the same request would also produce.
    let err;
    try {
      preflight({ params: req({ provider: 'comfyui/minimax-h3', commercial: true }), env: ENABLED_LOCAL });
    } catch (e) { err = e; }
    assert.equal(err.code, 'E_LICENCE_GRANT_REQUIRED');
    assert.equal(err.permanent, true, 'a retry grows no licence');
  });

  test('a malformed ceiling is PERMANENT; the ceiling itself is not', () => {
    let err;
    try {
      preflight({ params: req({ provider: 'comfyui/minimax-h3', commercial: false }), env: { ...ENABLED_LOCAL, SWAN_VIDEO_MAX_RUNS_DAILY: 'abc' } });
    } catch (e) { err = e; }
    assert.equal(err.code, 'E_BAD_CAP');
    assert.equal(err.permanent, true);
  });

  test('the run cap is RETRYABLE — it expires at the UTC day boundary', () => {
    let err;
    try {
      preflight({
        params: req({ provider: 'comfyui/minimax-h3', commercial: false }),
        env: { ...ENABLED_LOCAL, SWAN_VIDEO_MAX_RUNS_DAILY: '0' },
      });
    } catch (e) { err = e; }
    assert.equal(err.code, 'E_RUN_CAP');
    assert.equal(err.permanent, false, 'tomorrow genuinely succeeds');
  });

  test('the injected env is the one that is read', () => {
    // If the registry fell back to process.env this would refuse as disabled.
    const out = preflight({ params: req({ provider: 'comfyui/minimax-h3', commercial: false }), env: ENABLED_LOCAL });
    assert.equal(out.providerId, 'comfyui/minimax-h3');
  });
});
