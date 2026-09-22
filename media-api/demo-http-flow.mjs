/**
 * demo-http-flow.mjs — the authenticated local HTTP `quote -> job -> polling -> asset`
 * flow, demonstrated over a REAL socket.
 *
 * ── WHAT IS REAL AND WHAT IS NOT. READ THIS BEFORE BELIEVING ANY NUMBER BELOW. ──
 *
 * REAL: the HTTP server, its socket and the bearer boundary; every route; the job and
 * quote stores and the spend ledger, all on disk; the artifact bytes fetched over the
 * wire and hashed here; and **the engine's own `runGenerate`**. The only injection is
 * the TRANSPORT (`deps.adapters`), so the licence gate, `validateVideoRequest`,
 * `assertPromptAllowed`, `checkRunAllowed`, the ledger `record()` and `buildProvenance`
 * all execute for real. A demo that stubbed `runGenerate` would prove the HTTP wrapper
 * and nothing else.
 *
 * NOT REAL: **the GPU.** ComfyUI is not running here, so the ComfyUI adapter is replaced
 * by one that renders a real H.264 MP4 with ffmpeg on the CPU. The artifact is genuine,
 * decodable media — `ffprobe` verifies it below — but no model ran. **This is therefore
 * NOT Astra's Slice 1 exit evidence**, which requires a video from the real graph. See
 * the README's "NOT proven".
 *
 * Run: node media-api/demo-http-flow.mjs
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildServer } from './server.mjs';
import { runGenerate } from '../backend/scripts/handlers/generateVideo.mjs';
import { capabilities as registryCapabilities } from '../shared/providers/video/registry.mjs';
// The RECORD'S schema, imported rather than written as `1`: a check that hardcodes the number tests
// a COPY of the schema, so it fails on a bump while saying nothing about the record.
import { PROVENANCE_SCHEMA } from '../shared/providers/video/provenance.mjs';

const LOCAL_ID = 'comfyui/minimax-h3';
const TOKEN = 'demo-token-0123456789abcdef';
let failures = 0;
let checks = 0;

function check(label, ok, detail = '') {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? `\n          ${detail}` : ''}`);
}

function section(title) {
  console.log(`\n── ${title} ──`);
}

/** A real H.264 MP4, rendered on the CPU. The bytes are genuine media. */
function ffmpegAdapter({ paceMs = 0 } = {}) {
  return {
    PROVIDER_ID: LOCAL_ID,
    capabilities: (id) => registryCapabilities(id),
    async generate(request, { onProgress, outPath, providerId }) {
      await onProgress(20, 'demo transport: rendering with ffmpeg (CPU, no GPU)');
      // DEMO PACING, and it is honest to say so: without it the CPU render finishes
      // before the first poll, so the demo would only ever observe the terminal state
      // and "polling" would be untested. The delay changes nothing about the product —
      // it widens the window so the queued/running/succeeded transitions are observable
      // over the wire, which is the thing the required flow asks to be demonstrated.
      if (paceMs) await new Promise(r => setTimeout(r, paceMs));
      const r = spawnSync('ffmpeg', [
        '-y', '-v', 'error',
        '-f', 'lavfi', '-i', 'testsrc=duration=2:size=320x240:rate=10',
        '-pix_fmt', 'yuv420p', '-c:v', 'libx264', outPath,
      ], { encoding: 'utf8' });
      if (r.status !== 0) {
        throw Object.assign(new Error(`ffmpeg failed: ${r.stderr || r.error?.message}`), { code: 'E_DEMO_RENDER' });
      }
      const bytes = readFileSync(outPath);
      if (bytes.length === 0) {
        throw Object.assign(new Error('ffmpeg produced an empty file'), { code: 'E_EMPTY_ARTIFACT' });
      }
      await onProgress(85, 'demo transport: artifact in hand');
      return {
        provider: providerId,
        promptId: `demo-${Date.now()}`,
        outPath,
        bytes: bytes.length,
        filename: outPath.split(/[\\/]/).pop(),
        sha256: createHash('sha256').update(bytes).digest('hex'),
        attribution: registryCapabilities(providerId).attribution,
      };
    },
  };
}

const root = mkdtempSync(join(tmpdir(), 'swan-media-demo-'));
const env = {
  SWAN_MEDIA_API_ROOT: root,
  SWAN_MEDIA_API_TOKEN: TOKEN,
  // Explicit, temporary, operator-scoped enablement — Astra's Slice 1 entry gate.
  SWAN_VIDEO_PROVIDERS_ENABLED: LOCAL_ID,
  SWAN_VIDEO_MAX_RUNS_DAILY: '5',
  SWAN_VIDEO_MAX_SPEND_USD_DAILY: '0',
};

// The engine runs for real; only the transport is swapped.
const runGenerateImpl = (job, onProgress, deps) =>
  runGenerate(job, onProgress, { ...deps, adapters: { [LOCAL_ID]: ffmpegAdapter({ paceMs: 1200 }) } });

const { server, cfg } = buildServer({ env, deps: { runGenerateImpl } });

await new Promise((res, rej) => {
  server.once('error', rej);
  server.listen(0, '127.0.0.1', res);
});
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`\n[media-api] real socket on ${base}`);
console.log(`[media-api] root ${root}`);

const call = async (method, path, { token = TOKEN, body, headers = {} } = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const ct = res.headers.get('content-type') || '';
  const payload = ct.includes('json') ? await res.json().catch(() => null) : Buffer.from(await res.arrayBuffer());
  return { status: res.status, payload, ct };
};

try {
  section('the auth boundary, over the wire');
  const noAuth = await call('GET', '/health', { token: null });
  check('no token -> 401', noAuth.status === 401, `got ${noAuth.status}`);
  const badAuth = await call('GET', '/health', { token: 'not-the-token-xxxxxxxx' });
  check('wrong token -> 401', badAuth.status === 401, `got ${badAuth.status}`);
  const goodAuth = await call('GET', '/health');
  check('valid token -> 200', goodAuth.status === 200, `got ${goodAuth.status} ${JSON.stringify(goodAuth.payload)}`);
  const quoteNoAuth = await call('POST', '/v1/quotes', { token: null, body: { provider: LOCAL_ID, prompt: 'x' } });
  check('unauthenticated quote -> 401', quoteNoAuth.status === 401, `got ${quoteNoAuth.status}`);

  section('the catalogue');
  const models = await call('GET', '/v1/models');
  const local = models.payload?.models?.find(m => m.id === LOCAL_ID);
  check('GET /v1/models -> 200', models.status === 200, `got ${models.status}`);
  // This is the check that caught the defect: the endpoint used to report the frozen
  // catalogue value, so it said "disabled" while a quote for that very provider succeeded.
  check(`"${LOCAL_ID}" reports the RUNTIME enablement, not the shipped default`,
    local?.enabled === true && local?.readiness?.enabled === true,
    JSON.stringify(local?.readiness));
  check('the shipped default is kept separately', local?.readiness?.catalog_enabled === false,
    `catalog_enabled=${local?.readiness?.catalog_enabled}`);
  check('and reported runnable', local?.readiness?.runnable === true, JSON.stringify(local?.readiness));
  // 'run' is correct here: the local row is priced per run (at zero), not per second.
  // The demo previously asserted 'none' and was wrong, not the code.
  check('rate unit is named, not implied', local?.rate?.unit === 'run', `unit=${local?.rate?.unit}`);
  const hostedRow = models.payload?.models?.find(m => m.id === 'higgsfield/minimax-h3');
  check('a hosted row stays non-runnable even though it is declared',
    hostedRow?.readiness?.runnable === false && hostedRow?.enabled === false,
    JSON.stringify(hostedRow?.readiness));

  section('POST /v1/quotes');
  const params = {
    provider: LOCAL_ID,
    prompt: 'a slow dolly across a still lake at dawn',
    category: 'social-clip',
    style: 'cinematic',
    duration: 4,
    // H3 is `commercialUse: 'requires-grant'` and excludes US territory. A commercial
    // request would be refused here, which is the licence gate doing its job. The demo
    // declares non-commercial rather than asserting a grant nobody recorded.
    commercial: false,
  };
  const q = await call('POST', '/v1/quotes', { body: params });
  check('quote -> 201', q.status === 201, `got ${q.status} ${JSON.stringify(q.payload)?.slice(0, 200)}`);
  const quoteId = q.payload?.quote?.id;
  check('quote carries an id', Boolean(quoteId), quoteId);
  check('local lane prices at zero', q.payload?.quote?.pricing?.estimated_usd === '0.0000',
    JSON.stringify(q.payload?.quote?.pricing));
  check('the pricing basis names the unit', q.payload?.quote?.pricing?.basis === 'run',
    `basis=${q.payload?.quote?.pricing?.basis}`);
  check('quote records that no licence grant was established',
    q.payload?.quote?.licence_decision?.grant_recorded === false,
    JSON.stringify(q.payload?.quote?.licence_decision));
  check('quote says it authorises nothing',
    String(q.payload?.quote?.note || '').includes('authorises nothing'),
    q.payload?.quote?.note);

  section('POST /v1/jobs');
  const noKey = await call('POST', '/v1/jobs', { body: { quote_id: quoteId } });
  check('missing Idempotency-Key -> 400', noKey.status === 400 && noKey.payload?.error?.code === 'E_NO_IDEMPOTENCY_KEY',
    `${noKey.status} ${noKey.payload?.error?.code}`);

  const key = 'demo-idem-key-0001';
  const j1 = await call('POST', '/v1/jobs', { body: { quote_id: quoteId }, headers: { 'idempotency-key': key } });
  check('job -> 202', j1.status === 202, `got ${j1.status} ${JSON.stringify(j1.payload)?.slice(0, 200)}`);
  const jobId = j1.payload?.job?.id;
  check('job carries an id and starts queued', Boolean(jobId) && j1.payload?.job?.state === 'queued',
    `${jobId} state=${j1.payload?.job?.state}`);

  const j2 = await call('POST', '/v1/jobs', { body: { quote_id: quoteId }, headers: { 'idempotency-key': key } });
  check('same Idempotency-Key replays, does not re-render',
    j2.payload?.job?.id === jobId,
    `first=${jobId} replay=${j2.payload?.job?.id}`);
  // A replay must answer with the SAME projection. It used to return a hand-rolled
  // `{id, state}`, so a client written against the first 202 read `undefined` for
  // every field it actually needed.
  check('the replay returns the same body shape as the first call',
    j2.status === j1.status
    && j2.payload?.job?.provider === j1.payload?.job?.provider
    && j2.payload?.job?.quote_id === j1.payload?.job?.quote_id,
    `first keys=[${Object.keys(j1.payload?.job || {}).join(',')}] replay keys=[${Object.keys(j2.payload?.job || {}).join(',')}]`);

  section('GET /v1/jobs/:id — polling to a terminal state');
  let job = null;
  const states = [];
  for (let i = 0; i < 120; i += 1) {
    const r = await call('GET', `/v1/jobs/${jobId}`);
    job = r.payload?.job;
    if (job && states[states.length - 1] !== job.state) states.push(job.state);
    if (job && ['succeeded', 'failed', 'nsfw', 'canceled'].includes(job.state)) break;
    await new Promise(r2 => setTimeout(r2, 100));
  }
  check('job reached a terminal state', job?.state === 'succeeded',
    `state=${job?.state} reason=${job?.state_reason} err=${JSON.stringify(job?.error)}`);
  // The flow is "polling", so the polling has to be observed actually observing
  // something. One observed state would mean the render finished before the first
  // request and the loop proved nothing.
  check('polling observed the job in flight, not just at rest',
    states.length >= 2 && states[0] !== 'succeeded',
    `states seen: ${states.join(' -> ')}`);
  check('progress reported', typeof job?.progress?.pct === 'number', JSON.stringify(job?.progress));
  check('public job exposes NO local filesystem path',
    !JSON.stringify(job || {}).includes(root.replace(/\\/g, '\\\\')) && !JSON.stringify(job || {}).includes(root),
    JSON.stringify(job));

  section('GET /v1/assets/:id');
  const asset = await call('GET', `/v1/assets/${jobId}`);
  const a = asset.payload?.asset;
  check('asset metadata -> 200', asset.status === 200, `got ${asset.status}`);
  check('asset carries a sha256', typeof a?.sha256 === 'string' && a.sha256.length === 64, a?.sha256);
  check('asset carries provenance', a?.provenance?.schema === PROVENANCE_SCHEMA, JSON.stringify(a?.provenance)?.slice(0, 120));
  check('provenance records the licence snapshot',
    a?.provenance?.licence?.commercialUse === 'requires-grant',
    JSON.stringify(a?.provenance?.licence)?.slice(0, 200));
  check('provenance records the prompt hash',
    typeof a?.provenance?.request?.promptSha256 === 'string',
    a?.provenance?.request?.promptSha256);
  check('asset advertises its content url', a?.content_url === `/v1/assets/${jobId}/content`, a?.content_url);

  section('GET /v1/assets/:id/content — the bytes');
  const content = await call('GET', `/v1/assets/${jobId}/content`);
  check('content -> 200', content.status === 200, `got ${content.status} ct=${content.ct}`);
  const bytes = Buffer.isBuffer(content.payload) ? content.payload : Buffer.alloc(0);
  check('bytes are non-empty', bytes.length > 0, `${bytes.length} bytes`);
  const wireHash = createHash('sha256').update(bytes).digest('hex');
  check('served bytes match the recorded sha256', wireHash === a?.sha256, `wire=${wireHash} recorded=${a?.sha256}`);
  const servedPath = join(root, 'served-over-the-wire.mp4');
  const fsMod = await import('node:fs');
  fsMod.writeFileSync(servedPath, bytes);
  const probe = spawnSync('ffprobe', [
    '-v', 'error', '-show_entries', 'stream=codec_name,width,height,nb_frames',
    '-of', 'default=nw=1', servedPath,
  ], { encoding: 'utf8' });
  check('served artifact is real, decodable video',
    probe.status === 0 && /codec_name=h264/.test(probe.stdout),
    probe.stdout.trim().replace(/\n/g, ' ') || probe.stderr);

  section('GET /v1/wallet — the ledger');
  const wallet = await call('GET', '/v1/wallet');
  check('wallet -> 200', wallet.status === 200, `got ${wallet.status}`);
  check('the run was counted against the ceiling', wallet.payload?.runs >= 1, JSON.stringify(wallet.payload));
  check('local runs cost nothing', Number(wallet.payload?.spend_usd) === 0, `spend=${wallet.payload?.spend_usd}`);
  check('GPU budget is honestly labelled', wallet.payload?.gpu_budget_enforcement === 'metered_only',
    wallet.payload?.gpu_budget_enforcement);
  check('ledger is not degraded', wallet.payload?.ledger_degraded === false, `${wallet.payload?.ledger_degraded}`);

  section('the refusals that must still hold over HTTP');
  const cancel = await call('POST', `/v1/jobs/${jobId}/cancel`, { body: {} });
  check('cancelling a finished job -> 409', cancel.status === 409, `${cancel.status} ${cancel.payload?.error?.code}`);
  const noSuchJob = await call('GET', '/v1/jobs/does-not-exist');
  check('unknown job -> 404', noSuchJob.status === 404, `${noSuchJob.status} ${noSuchJob.payload?.error?.code}`);
  const noRoute = await call('GET', '/v1/nope');
  check('unknown route -> 404', noRoute.status === 404, `${noRoute.status} ${noRoute.payload?.error?.code}`);
  const hosted = await call('POST', '/v1/quotes', {
    body: { provider: 'higgsfield/minimax-h3', prompt: 'x', category: 'social-clip', style: 'cinematic', duration: 6 },
  });
  check('hosted row is refused over HTTP', hosted.status === 403,
    `${hosted.status} ${hosted.payload?.error?.code}`);

  console.log(`\n[media-api] artifacts on disk: ${existsSync(cfg.outDir) ? cfg.outDir : '(none)'}`);
} catch (err) {
  failures += 1;
  console.error(`\nDEMO ABORTED: ${err.stack || err.message}`);
} finally {
  await new Promise(res => server.close(res));
}

console.log(`\n${failures === 0 ? `ALL ${checks} CHECKS PASSED` : `${failures} of ${checks} CHECKS FAILED`}`);
console.log(`demo root kept at ${root}\n`);
process.exit(failures === 0 ? 0 : 1);
