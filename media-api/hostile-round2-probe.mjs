#!/usr/bin/env node
/**
 * hostile-round2-probe.mjs — the SECOND hostile pass.
 *
 * The first pass (`hostile-http-probe.mjs`) attacked the documented surface: licence,
 * auth edges, input handling, store concurrency. It found four defects. This pass
 * attacks what a first pass does not reach — the seams between the handler and the
 * socket, and the vocabulary the code claims but never uses.
 *
 * ── WHY SOME CHECKS RUN IN A CHILD PROCESS ──────────────────────────────────
 * Several of these are claims that the server CAN BE KILLED by a request. A probe that
 * makes that claim and then runs the attack in its own process proves nothing, because
 * the proof is the probe dying. So those checks spawn a real child, attack it, let the
 * dust settle, and then ask whether the child is still alive. `alive()` is the
 * assertion; the stderr is the evidence.
 *
 * ── EVERY SECTION CARRIES A CONTROL ─────────────────────────────────────────
 * Written the honest way round: this file was first written with a `raw()` helper that
 * forgot the blank line terminating the header block, so the server waited for more
 * headers and answered nothing. Every "the process survived" check PASSED — vacuously,
 * because the handler never ran. A control that must succeed is what makes a survival
 * claim mean anything. There is one in every section that has a survival or a refusal
 * claim to make.
 *
 * ── WHAT THIS FILE DELIBERATELY DOES NOT DO ─────────────────────────────────
 * It does not touch the GPU, the network, or a vendor. `runGenerateImpl` in the child is
 * a promise that never settles, so jobs stay `running` — which is what the concurrency
 * check needs, and it keeps this probe free of a render.
 */

import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { EventEmitter } from 'node:events';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readBody, authorized } from './http.mjs';
import { buildServer } from './server.mjs';
import { createJob, getAssetContent } from './routes.mjs';

const TOKEN = 'probe-token-0123456789abcdef';
const SELF = import.meta.filename;

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { fail += 1; failures.push(name); console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
}
function section(t) { console.log(`\n── ${t} ──`); }
const settle = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * A well-formed raw request. The header block MUST end with a blank line; omitting it
 * is how this probe first produced six vacuous passes.
 * `abandonAfter` truncates mid-body and then resets — the client that dies talking.
 */
function raw(port, { method = 'GET', path = '/', headers = {}, abandonAfter = 0 } = {}) {
  const lines = [`${method} ${path} HTTP/1.1`, ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`)];
  const text = `${lines.join('\r\n')}\r\n\r\n`;
  return new Promise((resolve) => {
    const sock = connect(port, '127.0.0.1', () => {
      if (abandonAfter > 0) { sock.write(text.slice(0, abandonAfter)); setTimeout(() => sock.destroy(), 60); return; }
      sock.write(text);
    });
    let buf = '';
    sock.on('data', (d) => { buf += d; });
    sock.on('error', () => {});
    sock.on('close', () => resolve(buf));
    setTimeout(() => { sock.destroy(); resolve(buf); }, 2500);
  });
}
const statusOf = (reply) => (reply.match(/^HTTP\/1\.1 (\d+)/) || [])[1] || 'NO RESPONSE';

/** Spawn the real gateway as a child so a crash is observable from out here. */
async function withServer(extraEnv, fn) {
  const child = spawn(process.execPath, [SELF, '--serve'], {
    env: { ...process.env, SWAN_MEDIA_API_TOKEN: TOKEN, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = ''; let err = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { err += d; });
  const port = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`harness never ready. stderr: ${err}`)), 15000);
    const poll = setInterval(() => {
      const m = out.match(/\{"ready":true,"port":(\d+)\}/);
      if (m) { clearInterval(poll); clearTimeout(t); resolve(Number(m[1])); }
    }, 25);
    child.on('exit', (c) => { clearInterval(poll); clearTimeout(t); reject(new Error(`exited early (${c}): ${err}`)); });
  });
  const alive = () => child.exitCode === null && child.signalCode === null;
  try { return await fn({ port, alive, stderr: () => err }); }
  finally { if (alive()) child.kill(); }
}
const H = { authorization: `Bearer ${TOKEN}`, connection: 'close' };

async function main() {
  console.log('HOSTILE PROBE — ROUND 2\n');

  // ── A. readBody must SETTLE when the client vanishes mid-body ──────────────
  section('A. a request that dies mid-body must not leave the handler parked');
  {
    const fake = new EventEmitter();
    fake.headers = {};
    let settled = false;
    const p = readBody(fake).then(() => { settled = true; }, () => { settled = true; });
    fake.emit('data', Buffer.from('{"params":'));   // 10 bytes of a promised body
    fake.emit('aborted');
    fake.emit('close');
    await Promise.race([p, settle(400)]);
    check('readBody settles on abort instead of hanging forever', settled,
      settled ? 'settled' : 'STILL PENDING after abort+close — the awaiting handler is retained');

    // Control: a COMPLETE body must still resolve, or "settles on abort" could be
    // satisfied by a function that never works at all.
    const whole = new EventEmitter();
    whole.headers = {};
    const p2 = readBody(whole);
    whole.emit('data', Buffer.from('{"a":1}'));
    whole.emit('end');
    const got = await Promise.race([p2, settle(400)]);
    check('CONTROL: a complete body still resolves', got?.a === 1, JSON.stringify(got));

    // And a truncated body must never resolve to a half-parsed object.
    const cut = new EventEmitter();
    cut.headers = {};
    let resolved;
    readBody(cut).then((v) => { resolved = v; }, () => { resolved = 'REJECTED'; });
    cut.emit('data', Buffer.from('{"params":'));
    cut.emit('close');
    await settle(300);
    check('a truncated body never resolves to a partial object',
      resolved === 'REJECTED' || resolved === undefined,
      `resolved to ${JSON.stringify(resolved)}${resolved === undefined ? ' (never settled)' : ''}`);
  }

  // ── B. authorized() with no configured token ──────────────────────────────
  section('B. a missing configured token must not authenticate "undefined"');
  {
    const unguarded = authorized({ headers: { authorization: 'Bearer undefined' } }, undefined);
    check('Bearer undefined is refused when no token is configured', unguarded === false,
      unguarded ? 'ACCEPTED — String(undefined) is "undefined", a 9-character token matching itself' : 'refused by type guard');
    check('CONTROL: the real token is accepted', authorized({ headers: { authorization: `Bearer ${TOKEN}` } }, TOKEN) === true);
    check('an empty bearer value is refused', authorized({ headers: { authorization: 'Bearer ' } }, TOKEN) === false);
    check('a missing Authorization header is refused', authorized({ headers: {} }, TOKEN) === false);
  }

  // ── C. a malformed Host header ────────────────────────────────────────────
  section('C. a malformed Host header must not take the process down');
  {
    const attacks = [
      ['port out of range', '127.0.0.1:99999999'],
      ['empty host', ':8080'],
      ['bare colon', 'a:'],
      ['a space', 'a b'],
      ['unclosed bracket', '[::1'],
    ];
    for (const [label, host] of attacks) {
      const res = await withServer({}, async ({ port, alive, stderr }) => {
        const reply = await raw(port, { path: '/v1/models', headers: { ...H, host } });
        await settle(400);
        return { status: statusOf(reply), alive: alive(), stderr: stderr() };
      });
      check(`Host ${label} (${JSON.stringify(host)}) does not kill the process`, res.alive,
        res.alive ? `survived, answered ${res.status}` : `PROCESS DIED — ${res.stderr.trim().split('\n')[0] || 'no stderr'}`);
    }
    // The control: a request that MUST be answered. Without it, every line above
    // passes for the wrong reason.
    const ctrl = await withServer({}, async ({ port }) => {
      const reply = await raw(port, { path: '/v1/models', headers: { ...H, host: `127.0.0.1:${port}` } });
      return statusOf(reply);
    });
    check('CONTROL: a well-formed request is answered 200', ctrl === '200', `answered ${ctrl}`);

    const unauthed = await withServer({}, async ({ port, alive, stderr }) => {
      await raw(port, { path: '/v1/models', headers: { host: '127.0.0.1:99999999', connection: 'close' } });
      await settle(400);
      return { alive: alive(), stderr: stderr() };
    });
    check('a malformed-Host crash does not require a token', unauthed.alive,
      unauthed.alive ? 'survived' : 'DIED WITHOUT A TOKEN — reachable before auth');
  }

  // ── D. the asset stream ───────────────────────────────────────────────────
  section('D. an unreadable artifact must not take the process down');
  {
    const root = mkdtempSync(join(tmpdir(), 'swan-probe-d-'));
    const dir = join(root, 'actually-a-directory');
    mkdirSync(dir, { recursive: true });
    const jobsPath = join(root, 'jobs.json');
    writeFileSync(jobsPath, JSON.stringify({
      schema: 1,
      jobs: [
        {
          id: 'asset-dir-0001', owner: 'owner', provider: 'comfyui/minimax-h3', executionKind: 'local_gpu',
          status: 'succeeded', params: {}, quoteId: null,
          createdAt: '2026-09-18T00:00:00.000Z', updatedAt: '2026-09-18T00:00:00.000Z',
          backendId: null, progress: { pct: 100, message: 'succeeded' },
          output: { filename: 'x.mp4', bytes: 10, mime: 'video/mp4', localPath: dir, sha256: 'deadbeef' },
          error: null, billed: false, maxCostUsd: null, estimateUsd: null,
        },
        {
          id: 'asset-ok-0002', owner: 'owner', provider: 'comfyui/minimax-h3', executionKind: 'local_gpu',
          status: 'succeeded', params: {}, quoteId: null,
          createdAt: '2026-09-18T00:00:01.000Z', updatedAt: '2026-09-18T00:00:01.000Z',
          backendId: null, progress: { pct: 100, message: 'succeeded' },
          output: { filename: 'y.mp4', bytes: 5, mime: 'video/mp4', localPath: jobsPath, sha256: 'cafe' },
          error: null, billed: false, maxCostUsd: null, estimateUsd: null,
        },
      ],
    }), 'utf8');
    const env = { SWAN_MEDIA_API_JOBS: jobsPath, SWAN_MEDIA_API_ROOT: root };

    const res = await withServer(env, async ({ port, alive, stderr }) => {
      const reply = await raw(port, { path: '/v1/assets/asset-dir-0001/content', headers: { ...H, host: '127.0.0.1' } });
      await settle(700);
      return { status: statusOf(reply), alive: alive(), stderr: stderr() };
    });
    check('a directory recorded as an artifact does not kill the process', res.alive,
      res.alive ? `survived, answered ${res.status}` : `PROCESS DIED — ${res.stderr.trim().split('\n')[0] || 'no stderr'}`);

    // Control: a readable file at the same route must actually stream, or the
    // survival above could just mean the route is broken.
    const ctrl = await withServer(env, async ({ port }) => {
      const reply = await raw(port, { path: '/v1/assets/asset-ok-0002/content', headers: { ...H, host: '127.0.0.1' } });
      return { status: statusOf(reply), bytes: reply.length };
    });
    check('CONTROL: a readable artifact streams', ctrl.status === '200' && ctrl.bytes > 0,
      `answered ${ctrl.status}, ${ctrl.bytes} bytes on the wire`);
  }

  // ── E. the idempotency race ───────────────────────────────────────────────
  section('E. two concurrent submissions on ONE Idempotency-Key');
  {
    const root = mkdtempSync(join(tmpdir(), 'swan-probe-e-'));
    const out = await withServer({ SWAN_MEDIA_API_ROOT: root, SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/minimax-h3' }, async ({ port }) => {
      const base = `http://127.0.0.1:${port}`;
      const q = await fetch(`${base}/v1/quotes`, {
        method: 'POST',
        headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify({ params: { provider: 'comfyui/minimax-h3', prompt: 'a probe', category: 'exercise-demo', style: 'cinematic', duration: 2, commercial: false } }),
      });
      const quoteId = (await q.json()).quote.id;
      const submit = () => fetch(`${base}/v1/jobs`, {
        method: 'POST',
        headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json', 'idempotency-key': 'the-same-key' },
        body: JSON.stringify({ quote_id: quoteId, max_cost_usd: 1 }),
      }).then(async (r) => ({ status: r.status, id: (await r.json()).job?.id }));
      const both = await Promise.all([submit(), submit()]);
      const listed = await fetch(`${base}/v1/wallet`, { headers: { authorization: `Bearer ${TOKEN}` } });
      const w = await listed.json();
      return { both, runs: w.wallet?.runs ?? w.runs };
    });
    const ids = new Set(out.both.map((r) => r.id));
    check('one Idempotency-Key yields exactly ONE job', ids.size === 1,
      `${ids.size} distinct id(s): ${[...ids].join(', ')}`);
    check('CONTROL: the submissions were actually accepted', out.both.every((r) => r.status === 202),
      out.both.map((r) => r.status).join(', '));
  }

  // ── F. the caller's ceiling: type coercion ────────────────────────────────
  section('F. max_cost_usd must be a NUMBER, not something Number() tolerates');
  {
    const quote = {
      id: 'q-priced', owner: 'owner', expired: false, provider: 'higgsfield/kling-3.0',
      executionKind: 'hosted', params: {}, pricing: { estimated_micros: 780_000, estimated_usd: '0.7800' },
    };
    const accepted = [];
    const jobs = {
      create(record) {
        const job = { id: `job-${accepted.length}`, status: 'queued', progress: {}, output: null, error: null, ...record };
        accepted.push(job);
        return job;
      },
    };
    const attempt = (value) => {
      const before = accepted.length;
      createJob({
        body: { quote_id: 'q-priced', max_cost_usd: value },
        jobs, quotes: { get: () => quote }, runner: () => {}, env: {}, principal: 'owner', now: () => new Date(),
      });
      return accepted.length > before;
    };
    // CONTROL FIRST. Without it, "everything was refused" is satisfied by a function
    // that refuses everything — which is exactly how this section first passed.
    check('CONTROL: a plain numeric ceiling IS accepted', attempt(1.0) === true,
      'if this fails, every refusal below is meaningless');
    for (const [label, value] of [['true', true], ['[5]', [5]], ['"5"', '5'], ['{}', {}], ['1e400', 1e400], ['NaN', 'not-a-number']]) {
      const took = attempt(value);
      check(`max_cost_usd ${label} is refused on a priced route`, took === false,
        took ? 'ACCEPTED — Number() coerced a non-number into a dollar ceiling' : 'refused by type');
    }
  }

  // ── G. what an error message is allowed to contain ────────────────────────
  section('G. an error must not hand back an internal filesystem path');
  {
    const missing = join(tmpdir(), 'swan-probe-g-does-not-exist', 'artifact.mp4');
    const out = getAssetContent({
      id: 'job-g',
      jobs: { get: () => ({ id: 'job-g', owner: 'owner', status: 'succeeded', output: { localPath: missing, mime: 'video/mp4' } }) },
      principal: 'owner',
    });
    const msg = out.body?.error?.message ?? '';
    check('E_ARTIFACT_MISSING does not disclose the server path', !msg.includes(missing),
      msg.includes(missing) ? `LEAKED: ${msg}` : 'no path in the message');
  }

  console.log(`\n${pass + fail} CHECKS — ${pass} passed, ${fail} failed`);
  if (failures.length) console.log(`failed: ${failures.join(' | ')}`);
  process.exit(fail === 0 ? 0 : 1);
}

// The child harness. Started by `withServer`; never by a human.
if (process.argv.includes('--serve')) {
  const { server } = buildServer({
    env: process.env,
    // Never settles: a job stays `running`, which is what the race check needs and
    // keeps this probe free of a render, a GPU and a vendor.
    deps: { runGenerateImpl: () => new Promise(() => {}) },
  });
  server.listen(0, '127.0.0.1', () => {
    process.stdout.write(`${JSON.stringify({ ready: true, port: server.address().port })}\n`);
  });
} else {
  await main();
}
