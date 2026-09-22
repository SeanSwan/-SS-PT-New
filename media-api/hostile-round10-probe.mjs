#!/usr/bin/env node
/**
 * hostile-round10-probe.mjs — the TENTH hostile pass.
 *
 * Round 9 found two defects, so the loop is not closed and this pass exists to look for
 * what round 9's fixes may have disturbed and at the one surface no round has touched:
 * the RUNNER — the detached promise that turns a 202 into a terminal state.
 *
 *   A. the cancellation window, measured rather than assumed
 *   B. the runner's guarantee that a job ALWAYS reaches a terminal state
 *   C. the detached promise must not reject into nothing when the STORE is what failed
 *   D. idempotency, when the same key arrives with a different body
 *   E. the artifact path, end to end: no artifact, missing artifact, and real bytes
 *   F. disclosures
 *
 * ── WHAT "DRY" MEANS HERE ───────────────────────────────────────────────────
 * Not "no checks failed" — a section of tautologies passes trivially. Dry means: every
 * section ran its control, every claim was falsifiable, and nothing new was found.
 */

import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildServer } from './server.mjs';

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { fail += 1; failures.push(name); console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
}
function section(t) { console.log(`\n── ${t} ──`); }

const TOKEN = 'round10-token-0123456789abcdef';
const root = mkdtempSync(join(tmpdir(), 'swan-media-round10-'));
const env = {
  SWAN_MEDIA_API_ROOT: root,
  SWAN_MEDIA_API_TOKEN: TOKEN,
  SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/minimax-h3',
  SWAN_VIDEO_MAX_RUNS_DAILY: '500',
  SWAN_VIDEO_MAX_SPEND_USD_DAILY: '0',
};
const PARAMS = {
  provider: 'comfyui/minimax-h3',
  prompt: 'a slow dolly across a still lake at dawn',
  category: 'social-clip',
  style: 'cinematic',
  duration: 4,
  commercial: false,
};

/** A store stub whose `update` can be made to fail, so the runner's catch is exercised. */
function memJobs({ onUpdate = null } = {}) {
  const rows = new Map();
  return {
    rows,
    create(r) {
      const j = {
        id: r.id || `id-${rows.size + 1}`, owner: r.owner || 'owner', provider: r.provider,
        status: 'queued', progress: { pct: 0 }, output: null, error: null, billed: false,
      };
      rows.set(j.id, j);
      return j;
    },
    get(id) { return rows.get(id) || null; },
    list() { return [...rows.values()]; },
    update(id, patch) {
      if (onUpdate) onUpdate(id, patch);
      const j = rows.get(id);
      if (!j) return null;
      Object.assign(j, patch);
      return j;
    },
    reconcileOrphans() { return []; },
  };
}

async function listen(server) {
  await new Promise((res, rej) => { server.once('error', rej); server.listen(0, '127.0.0.1', res); });
  return `http://127.0.0.1:${server.address().port}`;
}

async function main() {
  console.log('HOSTILE PROBE — ROUND 10\n');

  // ── A. THE CANCELLATION WINDOW, MEASURED ───────────────────────────────────
  // The endpoint's own comment says "only a job that has not been dispatched can actually
  // be stopped". With an in-process runner that promotes the job on a microtask, that
  // window may be zero-width — in which case the success branch is unreachable through the
  // wire and the endpoint can only ever refuse. That is a claim about reachability, so it
  // is measured, not reasoned about.
  section('A. the cancellation window, measured');

  const pending = buildServer({ env, deps: { runGenerateImpl: () => new Promise(() => {}) } });
  const baseA = await listen(pending.server);
  const H = { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' };
  const call = async (method, path, body, headers = {}) => {
    const res = await fetch(baseA + path, {
      method,
      headers: { ...H, ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const submit = async (key) => {
    const q = await call('POST', '/v1/quotes', { params: PARAMS });
    const j = await call('POST', '/v1/jobs', { quote_id: q.body.quote.id, max_cost_usd: 1 }, { 'idempotency-key': key });
    return j.body.job;
  };

  const first = await submit('r10-a-1');
  check('CONTROL: submission answers 202 with a job in "queued"',
    first.state === 'queued', `state=${first.state}`);

  const cancel = await call('POST', `/v1/jobs/${first.id}/cancel`, {});
  check('CONTROL: a cancel is answered, and refused with E_CANCEL_TOO_LATE',
    cancel.status === 409 && cancel.body.error.code === 'E_CANCEL_TOO_LATE',
    `${cancel.status} ${cancel.body.error?.code}`);

  const after = await call('GET', `/v1/jobs/${first.id}`);
  check('CONTROL: the job really is non-terminal and running (so the refusal is truthful)',
    after.body.job.state === 'running', `state=${after.body.job.state}`);

  let succeeded = 0;
  const ATTEMPTS = 12;
  for (let i = 0; i < ATTEMPTS; i += 1) {
    const job = await submit(`r10-a-loop-${i}`);
    const c = await call('POST', `/v1/jobs/${job.id}/cancel`, {});
    if (c.status === 202) succeeded += 1;
  }
  check('DISCLOSURE: the cancel success path is UNREACHABLE over the wire with the runner as it is',
    succeeded === 0,
    `${succeeded} of ${ATTEMPTS} cancellations succeeded — the 202's "queued" is true at the instant it is written and stale on arrival`);
  check('CONTROL: the refusal is about STATE, not a ceiling (so the endpoint was reached)',
    cancel.body.error.code === 'E_CANCEL_TOO_LATE' && cancel.body.error.code !== 'E_RUN_CAP',
    `refused with ${cancel.body.error.code}`);

  // ── B. THE RUNNER ALWAYS REACHES A TERMINAL STATE ──────────────────────────
  section('B. a job always reaches a terminal state');

  const mk = async (impl) => {
    const jobs = memJobs();
    const built = buildServer({ env, deps: { runGenerateImpl: impl, jobs } });
    return { jobs, built };
  };

  const okRun = await mk(async () => ({ filename: 'f.mp4', bytes: 1, mime: 'video/mp4', localPath: '/tmp/f.mp4' }));
  okRun.built.ctx.runner(okRun.jobs.create({ provider: 'comfyui/minimax-h3' }), {});
  await new Promise((r) => setTimeout(r, 20));
  check('CONTROL: a runner that succeeds reaches "succeeded"',
    [...okRun.jobs.rows.values()][0].status === 'succeeded',
    `status=${[...okRun.jobs.rows.values()][0].status}`);

  const syncThrow = await mk(() => { const e = new Error('the adapter exploded'); e.code = 'E_ADAPTER'; throw e; });
  syncThrow.built.ctx.runner(syncThrow.jobs.create({ provider: 'comfyui/minimax-h3' }), {});
  await new Promise((r) => setTimeout(r, 20));
  const syncJob = [...syncThrow.jobs.rows.values()][0];
  check('a SYNCHRONOUS throw in the runner still reaches a terminal state',
    syncJob.status === 'failed', `status=${syncJob.status}`);
  check('  …and the error names the adapter\'s own code, not a generic one',
    syncJob.error?.code === 'E_ADAPTER', `code=${syncJob.error?.code}`);

  const rejected = await mk(async () => { throw new Error('the vendor refused'); });
  rejected.built.ctx.runner(rejected.jobs.create({ provider: 'comfyui/minimax-h3' }), {});
  await new Promise((r) => setTimeout(r, 20));
  const rejJob = [...rejected.jobs.rows.values()][0];
  check('a REJECTED promise still reaches a terminal state',
    rejJob.status === 'failed', `status=${rejJob.status}`);

  const nsfw = await mk(async () => { const e = new Error('moderation'); e.code = 'E_NSFW'; throw e; });
  nsfw.built.ctx.runner(nsfw.jobs.create({ provider: 'comfyui/minimax-h3' }), {});
  await new Promise((r) => setTimeout(r, 20));
  check('a moderation rejection becomes "nsfw", not "failed" (a different conversation)',
    [...nsfw.jobs.rows.values()][0].status === 'nsfw');

  // ── C. THE DETACHED PROMISE MUST NOT REJECT INTO NOTHING ───────────────────
  // Every `jobs.update` in the runner can throw: a full disk, a read-only volume, or the
  // store's own `E_STORE_CORRUPT` refusal. When the STORE is the thing that failed, the
  // first update throws, the catch runs, and its update throws again — out of a detached
  // promise, where nothing is listening. Node's default policy turns that into a process
  // exit, so one bookkeeping fault would take every other in-flight render with it.
  section('C. a failing STORE write must not kill the process');

  const rejections = [];
  const onRejection = (e) => rejections.push(e?.message ?? String(e));
  process.on('unhandledRejection', onRejection);
  try {
    const doomed = memJobs({ onUpdate: () => { throw new Error('the store is unwritable'); } });
    const built = buildServer({ env, deps: { runGenerateImpl: async () => ({}), jobs: doomed } });
    const job = doomed.create({ provider: 'comfyui/minimax-h3' });
    built.ctx.runner(job, {});
    await new Promise((r) => setTimeout(r, 60));
    check('a store that refuses EVERY write produces no unhandled rejection',
      rejections.length === 0,
      rejections.length ? `unhandled: ${JSON.stringify(rejections)} — Node exits on this by default` : '');
    check('CONTROL: the runner was actually exercised (the store refused the write)',
      doomed.rows.get(job.id).status === 'queued',
      'the job is left non-terminal on purpose; the next boot reconciles it');

    const half = memJobs({ onUpdate: (_id, patch) => { if (patch.status === 'succeeded') throw new Error('failed at the finish line'); } });
    const built2 = buildServer({ env, deps: { runGenerateImpl: async () => ({ filename: 'f.mp4', bytes: 1, mime: 'video/mp4', localPath: '/tmp/f.mp4' }), jobs: half } });
    half.create({ provider: 'comfyui/minimax-h3', id: 'h1' });
    built2.ctx.runner({ id: 'h1' }, {});
    await new Promise((r) => setTimeout(r, 60));
    check('a store that fails only on the FINAL write also produces no unhandled rejection',
      rejections.length === 0, rejections.length ? JSON.stringify(rejections) : '');
  } finally {
    process.off('unhandledRejection', onRejection);
  }

  // ── D. IDEMPOTENCY WHEN THE BODY DIFFERS ───────────────────────────────────
  section('D. one key is one job, even when the body changes');

  const idem = buildServer({ env, deps: { runGenerateImpl: () => new Promise(() => {}) } });
  const baseD = await listen(idem.server);
  const callD = async (path, body, headers = {}) => {
    const res = await fetch(baseD + path, { method: 'POST', headers: { ...H, ...headers }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const qa = await callD('/v1/quotes', { params: PARAMS });
  const qb = await callD('/v1/quotes', { params: { ...PARAMS, prompt: 'a completely different prompt' } });

  const firstD = await callD('/v1/jobs', { quote_id: qa.body.quote.id, max_cost_usd: 1 }, { 'idempotency-key': 'r10-d' });
  const replay = await callD('/v1/jobs', { quote_id: qb.body.quote.id, max_cost_usd: 1 }, { 'idempotency-key': 'r10-d' });
  check('CONTROL: the first submission created a job', firstD.status === 202 && Boolean(firstD.body.job.id));
  check('a replayed key returns the FIRST job, not a job for the new quote',
    replay.status === 202 && replay.body.job.id === firstD.body.job.id,
    `first=${firstD.body.job.id} replay=${replay.body.job.id}`);
  check('  …so the replay did NOT submit a second render',
    idem.jobs.list().filter((j) => j.idempotencyKey === 'r10-d').length === 1,
    `jobs carrying that key: ${idem.jobs.list().filter((j) => j.idempotencyKey === 'r10-d').length}`);

  const distinct = await callD('/v1/jobs', { quote_id: qb.body.quote.id, max_cost_usd: 1 }, { 'idempotency-key': 'r10-d-other' });
  check('CONTROL: a DIFFERENT key does create a second job',
    distinct.status === 202 && distinct.body.job.id !== firstD.body.job.id);

  // ── E. THE ARTIFACT PATH, END TO END ───────────────────────────────────────
  section('E. the artifact path says WHICH kind of absence it is');

  const artDir = join(root, 'artifacts');
  mkdirSync(artDir, { recursive: true });
  const realFile = join(artDir, 'real.mp4');
  const BYTES = Buffer.from('not really an mp4, but it is a real file with a real size');
  writeFileSync(realFile, BYTES);

  const jobsE = memJobs();
  const builtE = buildServer({ env, deps: { jobs: jobsE } });
  const baseE = await listen(builtE.server);
  const getE = async (p) => {
    const res = await fetch(baseE + p, { headers: { authorization: `Bearer ${TOKEN}` } });
    const ct = res.headers.get('content-type');
    const cl = res.headers.get('content-length');
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: res.status, ct, cl, len: buf.length, body: ct?.includes('json') ? JSON.parse(buf.toString()) : null };
  };

  const mkJob = (id, status, output) => { const j = jobsE.create({ provider: 'comfyui/minimax-h3', id }); Object.assign(j, { status, output }); return j; };

  mkJob('e-running', 'running', null);
  mkJob('e-dir', 'succeeded', { localPath: artDir, mime: 'video/mp4', filename: 'artifacts', bytes: 1 });
  mkJob('e-gone', 'succeeded', { localPath: join(artDir, 'never-written.mp4'), mime: 'video/mp4', filename: 'never-written.mp4', bytes: 1 });
  mkJob('e-real', 'succeeded', {
    localPath: realFile, mime: 'video/mp4', filename: 'real.mp4', bytes: BYTES.length,
    sha256: 'deadbeef', attribution: { model: 'minimax-h3' }, provenance: { licence: {} },
  });

  const running = await getE('/v1/assets/e-running');
  check('CONTROL: a job with no artifact is 409 E_NO_ARTIFACT',
    running.status === 409 && running.body.error.code === 'E_NO_ARTIFACT');

  const dir = await getE('/v1/assets/e-dir/content');
  check('a DIRECTORY where a file is recorded is 410 E_ARTIFACT_MISSING, not a crash',
    dir.status === 410 && dir.body.error.code === 'E_ARTIFACT_MISSING',
    `${dir.status} ${dir.body?.error?.code}`);

  const gone = await getE('/v1/assets/e-gone/content');
  check('a MISSING file is 410 E_ARTIFACT_MISSING',
    gone.status === 410 && gone.body.error.code === 'E_ARTIFACT_MISSING');
  check('  …and the message does not leak the absolute path',
    gone.body.error.message.includes('never-written.mp4') && !gone.body.error.message.includes(root),
    gone.body.error.message);

  const real = await getE('/v1/assets/e-real/content');
  check('CONTROL: a REAL file streams with the right type and length',
    real.status === 200 && real.ct === 'video/mp4' && real.len === BYTES.length,
    `status=${real.status} ct=${real.ct} len=${real.len} of ${BYTES.length}`);
  check('  …and content-length matches the bytes actually sent',
    Number(real.cl) === BYTES.length, `content-length=${real.cl} bytes=${BYTES.length}`);

  const meta = await getE('/v1/assets/e-real');
  check('CONTROL: the metadata route reports the artifact',
    meta.status === 200 && meta.body.asset.sha256 === 'deadbeef');
  check('the metadata route never exposes localPath',
    !JSON.stringify(meta.body).includes(artDir),
    'a filesystem path on the wire is a deployment layout');

  // ── F. DISCLOSURES ─────────────────────────────────────────────────────────
  section('F. what this gateway does NOT do');

  const never = await mk(async () => new Promise(() => {}));
  const stuck = never.jobs.create({ provider: 'comfyui/minimax-h3', id: 'stuck' });
  never.built.ctx.runner(stuck, {});
  await new Promise((r) => setTimeout(r, 20));
  check('DISCLOSURE: a runner that never settles leaves the job non-terminal until the next boot',
    never.jobs.rows.get('stuck').status === 'running',
    'reconcileOrphans marks it E_ORPHANED then — the weaker claim, chosen deliberately');

  check('DISCLOSURE: there is no queue, so a job is dispatched in the same tick it is accepted',
    true,
    'this is why section A measures a zero-width cancel window, and why "cancelled" is not '
    + 'a state any caller can reach today');

  for (const s of [pending.server, idem.server, builtE.server]) s.close();

  console.log(`\n${pass + fail} CHECKS — ${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log('\nFAILED:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('PROBE CRASHED — the checks below the crash NEVER RAN:', err);
  process.exit(2);
});
