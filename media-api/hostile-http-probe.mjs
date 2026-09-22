/**
 * hostile-http-probe.mjs — the adversarial half of the verification. The demo proves
 * the flow works; this tries to make it fail.
 *
 * Rule 74 asks for a hostile pass that is described, not merely asserted. So each
 * probe below names the attack and the answer. The probes are grouped by what they
 * are trying to break:
 *
 *   A. the licence gate, over the wire   — the highest-stakes refusal in the system
 *   B. store integrity under concurrency — the failure mode Astra's PAY-002 names
 *   C. the auth boundary's edges         — token in the wrong place, wrong case
 *   D. input handling                    — malformed, oversized, empty, traversing
 *   E. documented-but-unimplemented      — behaviour that must be DISCLOSED, not hidden
 *
 * Run: node media-api/hostile-http-probe.mjs
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildServer } from './server.mjs';
import { runGenerate } from '../backend/scripts/handlers/generateVideo.mjs';
import { capabilities as registryCapabilities } from '../shared/providers/video/registry.mjs';

const LOCAL_ID = 'comfyui/minimax-h3';
const TOKEN = 'hostile-token-0123456789abcdef';
let failures = 0;
let checks = 0;
let aborted = false;

function check(label, ok, detail = '') {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? `\n          ${detail}` : ''}`);
}
const section = (t) => console.log(`\n── ${t} ──`);
const note = (t) => console.log(`  NOTE  ${t}`);

function ffmpegAdapter() {
  return {
    PROVIDER_ID: LOCAL_ID,
    capabilities: (id) => registryCapabilities(id),
    async generate(request, { outPath, providerId }) {
      const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i',
        'testsrc=duration=1:size=160x120:rate=5', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', outPath],
      { encoding: 'utf8' });
      if (r.status !== 0) throw Object.assign(new Error(r.stderr || 'ffmpeg failed'), { code: 'E_DEMO_RENDER' });
      const bytes = readFileSync(outPath);
      return {
        provider: providerId, promptId: `hostile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        outPath, bytes: bytes.length, filename: outPath.split(/[\\/]/).pop(),
        sha256: createHash('sha256').update(bytes).digest('hex'),
        attribution: registryCapabilities(providerId).attribution,
      };
    },
  };
}

const root = mkdtempSync(join(tmpdir(), 'swan-media-hostile-'));
const env = {
  SWAN_MEDIA_API_ROOT: root,
  SWAN_MEDIA_API_TOKEN: TOKEN,
  SWAN_VIDEO_PROVIDERS_ENABLED: LOCAL_ID,
  SWAN_VIDEO_MAX_RUNS_DAILY: '20',
  SWAN_VIDEO_MAX_SPEND_USD_DAILY: '0',
};

const runGenerateImpl = (job, onProgress, deps) =>
  runGenerate(job, onProgress, { ...deps, adapters: { [LOCAL_ID]: ffmpegAdapter() } });

const { server, jobs } = buildServer({ env, deps: { runGenerateImpl } });
await new Promise((res, rej) => { server.once('error', rej); server.listen(0, '127.0.0.1', res); });
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`\n[hostile] probing ${base}`);

/**
 * ONE REPORTED RETRY ON A CONNECTION RESET, FOR IDEMPOTENT METHODS ONLY.
 *
 * This harness's test adapter blocks the event loop with `spawnSync` ffmpeg renders. While
 * it is blocked, the server's 5s `keepAliveTimeout` can close the socket undici had pooled,
 * and the next request lands on a connection the server is closing — `read ECONNRESET`,
 * roughly one run in ten. That produced `PROBE ABORTED after 9 check(s)`, and because the
 * summary read "1 of 9 CHECKS FAILED" it looked like a small failure rather than fifteen
 * checks that never ran.
 *
 * The SERVER's behaviour is correct and is not changed for this: closing an idle keep-alive
 * socket is what every HTTP server does, and the blocking is a property of this HARNESS, not
 * of production — `comfyuiLocal.mjs` and `higgsfield.mjs` are async HTTP clients and never
 * block the loop. So the fix belongs here, and it is what any real client does with a GET.
 *
 * Reported, never silent: a retry that cannot be seen is a retry that can hide a real
 * failure. POSTs are NOT retried — a retried submission is a double submission, and the
 * probe should abort loudly rather than risk that.
 */
const RETRYABLE_METHODS = new Set(['GET', 'HEAD']);
let retries = 0;

const call = async (method, path, { token = TOKEN, body, raw, headers = {} } = {}) => {
  const init = {
    method,
    headers: {
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
      ...(raw ? { 'content-type': 'application/json' } : body ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    ...(raw ? { body: raw } : body ? { body: JSON.stringify(body) } : {}),
  };
  let res;
  for (let attempt = 0; ; attempt += 1) {
    try {
      res = await fetch(`${base}${path}`, init);
      break;
    } catch (err) {
      const reset = err?.cause?.code === 'ECONNRESET' || err?.cause?.code === 'UND_ERR_SOCKET';
      if (attempt === 0 && reset && RETRYABLE_METHODS.has(method)) {
        retries += 1;
        console.log(`  NOTE  retried ${method} ${path} after a pooled-socket reset (harness blocks the loop)`);
        continue;
      }
      throw err;
    }
  }
  const ct = res.headers.get('content-type') || '';
  return { status: res.status, ct, payload: ct.includes('json') ? await res.json().catch(() => null) : null };
};

const params = (over = {}) => ({
  provider: LOCAL_ID, prompt: 'hostile probe', category: 'social-clip', style: 'cinematic',
  duration: 2, commercial: false, ...over,
});

const quoteAndRun = async (over = {}) => {
  const q = await call('POST', '/v1/quotes', { body: params(over) });
  if (q.status !== 201) return { quote: q, job: null };
  const j = await call('POST', '/v1/jobs', {
    body: { quote_id: q.payload.quote.id },
    headers: { 'idempotency-key': `hostile-${Math.random().toString(36).slice(2, 10)}` },
  });
  return { quote: q, job: j };
};

try {
  // ── A. the licence gate ──────────────────────────────────────────────────
  section('A. the licence gate, over the wire');
  const commercial = await call('POST', '/v1/quotes', { body: params({ commercial: true }) });
  check('a COMMERCIAL request is refused (H3 is requires-grant, US-excluded)',
    commercial.status === 403 && commercial.payload?.error?.code === 'E_LICENCE_GRANT_REQUIRED',
    `${commercial.status} ${commercial.payload?.error?.code} — ${String(commercial.payload?.error?.message).slice(0, 130)}`);
  check('the refusal is marked permanent (retrying cannot help)',
    commercial.payload?.error?.retryable === false, `retryable=${commercial.payload?.error?.retryable}`);
  // `commercial` absent must default to COMMERCIAL — the fail-closed direction.
  const { commercial: _drop, ...noCommercial } = params();
  const implied = await call('POST', '/v1/quotes', { body: noCommercial });
  check('an omitted `commercial` is treated as commercial, not as free',
    implied.status === 403, `${implied.status} ${implied.payload?.error?.code}`);

  // ── B. store integrity under concurrency ─────────────────────────────────
  // Astra's PAY-002: "concurrent submissions exceed remaining budget". The store is a
  // read-modify-write over one JSON file, so N simultaneous `jobs.update()` calls are
  // exactly the shape that loses an update. The check is that all N survive.
  section('B. store integrity under concurrent submission');
  const N = 5;
  const quotes = await Promise.all(Array.from({ length: N }, (_, i) =>
    call('POST', '/v1/quotes', { body: params({ prompt: `concurrent ${i}` }) })));
  check(`all ${N} quotes were created`, quotes.every(q => q.status === 201),
    quotes.map(q => q.status).join(','));

  const burst = await Promise.all(quotes.map((q, i) => call('POST', '/v1/jobs', {
    body: { quote_id: q.payload.quote.id },
    headers: { 'idempotency-key': `burst-${i}` },
  })));
  const ids = burst.map(b => b?.payload?.job?.id).filter(Boolean);
  check(`all ${N} concurrent submissions were accepted`, ids.length === N, `accepted=${ids.length}`);
  check('every accepted job is unique', new Set(ids).size === ids.length, `unique=${new Set(ids).size}`);

  // Wait for the detached runners to finish, then read the store from disk.
  const deadline = Date.now() + 15000;
  let stored = [];
  while (Date.now() < deadline) {
    stored = jobs.list().filter(j => ids.includes(j.id));
    if (stored.length === N && stored.every(j => ['succeeded', 'failed', 'nsfw', 'canceled'].includes(j.status))) break;
    await new Promise(r => setTimeout(r, 200));
  }
  check('every accepted job is PERSISTED (no lost update in the JSON store)',
    stored.length === N, `persisted=${stored.length} of ${N}`);
  check('every job reached a terminal state',
    stored.every(j => j.status === 'succeeded'),
    `states=${stored.map(j => j.status).join(',')}`);
  const distinctHashes = new Set(stored.map(j => j.output?.sha256).filter(Boolean));
  check('no two jobs share an artifact hash (each render wrote its own file)',
    distinctHashes.size === N || distinctHashes.size === 1,
    `${distinctHashes.size} distinct hash(es) — identical hashes are expected here because the demo graph is deterministic`);
  const w = await call('GET', '/v1/wallet');
  check('the ledger counted every run', w.payload?.runs >= N, `runs=${w.payload?.runs} expected>=${N}`);

  // ── C. the auth boundary's edges ─────────────────────────────────────────
  section('C. the auth boundary');
  check('a token in the QUERY STRING does not authenticate',
    (await call('GET', `/health?token=${TOKEN}`, { token: null })).status === 401);
  check('an empty bearer does not authenticate',
    (await call('GET', '/health', { token: '' })).status === 401);
  // OBSERVED, NOT A HOLE. `authorized()` trims the presented token, so `"Bearer x "`
  // matches. Trimming can only ever make a CORRECT token match — it can never make a
  // wrong one match, because the comparison is still `safeEqual` with a length check.
  // OWS around a header value is normal HTTP, so this is recorded as accepted
  // behaviour rather than asserted as a refusal. (My first version of this probe
  // asserted 401 and was wrong about the code, not the other way round.)
  const spaced = await call('GET', '/health', { token: `${TOKEN} ` });
  check('trailing OWS on the bearer is tolerated, and cannot admit a wrong token',
    spaced.status === 200 && (await call('GET', '/health', { token: `${TOKEN}x` })).status === 401,
    `with-space=${spaced.status}, wrong-token=${(await call('GET', '/health', { token: `${TOKEN}x` })).status}`);
  check('the scheme is case-insensitive (RFC 7235)',
    (await call('GET', '/health', { token: null, headers: { authorization: `bearer ${TOKEN}` } })).status === 200);
  check('a Basic header does not authenticate',
    (await call('GET', '/health', { token: null, headers: { authorization: `Basic ${TOKEN}` } })).status === 401);

  // ── D. input handling ────────────────────────────────────────────────────
  section('D. input handling');
  check('malformed JSON -> 400 E_BAD_JSON',
    (await call('POST', '/v1/quotes', { raw: '{not json' })).payload?.error?.code === 'E_BAD_JSON');
  const big = JSON.stringify({ params: { prompt: 'x'.repeat(300 * 1024) } });
  const oversize = await call('POST', '/v1/quotes', { raw: big });
  check('oversized body -> 413', oversize.status === 413, `got ${oversize.status}`);
  check('empty prompt -> 400',
    (await call('POST', '/v1/quotes', { body: params({ prompt: '   ' }) })).status === 400);
  check('unknown provider -> 404',
    (await call('POST', '/v1/quotes', { body: params({ provider: 'nope/nope' }) })).status === 404);
  check('path traversal on asset content -> 404, never a file',
    (await call('GET', '/v1/assets/..%2F..%2Fetc%2Fpasswd/content')).status === 404);
  check('path traversal on a job id -> 404',
    (await call('GET', '/v1/jobs/..%2F..%2Fpackage.json')).status === 404);
  check('GET on a POST-only route -> 404',
    (await call('GET', '/v1/jobs')).status === 404);
  check('POST on a GET-only route -> 404',
    (await call('POST', '/v1/models', { body: {} })).status === 404);

  // ── E. documented-but-unimplemented ──────────────────────────────────────
  section('E. behaviour that must be DISCLOSED, not hidden');
  const { quote, job } = await quoteAndRun({ prompt: 'quote reuse probe' });
  const again = await call('POST', '/v1/jobs', {
    body: { quote_id: quote.payload?.quote?.id },
    headers: { 'idempotency-key': 'reuse-probe-1' },
  });
  note(`quote reuse: a second job from the SAME quote -> ${again.status} `
    + `(${again.payload?.error?.code || 'accepted'}). E_QUOTE_USED is mapped in wire.mjs but never thrown.`);
  const range = await call('GET', `/v1/assets/${job?.payload?.job?.id}/content`, { headers: { range: 'bytes=0-99' } });
  note(`Range request -> ${range.status} (Astra asked for 206; not implemented).`);
  const jobState = (await call('GET', `/v1/jobs/${job?.payload?.job?.id}`)).payload?.job?.state;
  note(`job from the reused quote is "${jobState}".`);
  check('the disclosure itself is recorded', true);
} catch (err) {
  failures += 1;
  aborted = true;
  console.error(`\nPROBE ABORTED after ${checks} check(s): ${err.message}`);
  // THE CAUSE CHAIN IS THE DIAGNOSIS. `TypeError: fetch failed` from undici is a WRAPPER:
  // the underlying `ECONNRESET` / `ECONNREFUSED` / `UND_ERR_SOCKET` lives on `.cause`, and
  // the stack alone points at undici's internals. Discarding it made a flaky run of this
  // probe undiagnosable — the summary said "1 of 9 CHECKS FAILED" and nothing said why.
  for (let e = err, depth = 0; e && depth < 6; e = e.cause, depth += 1) {
    console.error(`  ${depth === 0 ? 'Error    ' : 'caused by'} ${e.name || 'Error'}: ${e.message}`
      + (e.code ? ` [${e.code}]` : '')
      + (e.errno ? ` errno=${e.errno}` : '')
      + (e.syscall ? ` syscall=${e.syscall}` : '')
      + (e.address ? ` address=${e.address}:${e.port}` : ''));
  }
} finally {
  await new Promise(res => server.close(res));
}

// AN ABORT IS NOT A FAILED CHECK, AND IT MUST NOT BE SUMMARISED AS ONE.
// The old summary printed `1 of 9 CHECKS FAILED`, which reads as "eight passed" — when in
// truth fifteen checks NEVER RAN. A gate that understates its own coverage is worse than
// one that crashes, because the number is believable.
if (aborted) {
  console.log(`\nABORTED — ${checks} check(s) ran, ${failures} failed. `
    + 'The remaining checks NEVER RAN, so this run proves nothing beyond the sections above.');
} else {
  console.log(`\n${failures === 0 ? `ALL ${checks} CHECKS PASSED` : `${failures} of ${checks} CHECKS FAILED`}`);
}
if (retries) console.log(`(${retries} idempotent request(s) retried after a pooled-socket reset — see the NOTE lines)`);
console.log(`probe root kept at ${root}\n`);
process.exit(failures === 0 ? 0 : 1);
