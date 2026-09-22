#!/usr/bin/env node
/**
 * hostile-round3-probe.mjs — the THIRD hostile pass.
 *
 * Round 1 attacked the documented surface (licence, auth, input, store concurrency).
 * Round 2 attacked the seams between the handler and the socket (crash paths, body
 * abandonment, stream errors) and found six defects.
 *
 * Round 3 goes after the two things neither pass touched: MONEY ARITHMETIC at its
 * boundaries, and DISAGREEMENT BETWEEN ENDPOINTS. Both are the kind of defect that
 * never shows up as a failed request — a run priced at zero still returns 202, and an
 * estimate that quotes a provider the quote endpoint refuses looks like a working flow
 * right up until it isn't.
 *
 * ── EVERY SECTION CARRIES A CONTROL ─────────────────────────────────────────
 * Round 2 taught this the hard way: a section whose request never reached the handler
 * passed every check for the wrong reason. A check that "the bad thing is refused" is
 * worthless unless a neighbouring check proves the good thing is accepted.
 *
 * ── NO GPU, NO VENDOR, NO NETWORK ───────────────────────────────────────────
 * Everything here is a pure handler call or a loopback socket against a child process
 * whose runner never settles.
 */

import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  toMicros, formatUsd, estimateRunCostMicros, withEstimatedRunCost,
} from '../shared/providers/video/costEstimate.mjs';
import { dayKey } from '../shared/providers/video/spendGuard.mjs';
import { VIDEO_PROVIDERS } from '../shared/providers/video/catalogue.mjs';
import { HOSTED_VIDEO_PROVIDERS } from '../shared/providers/video/catalogueHosted.mjs';
import { makeJobStore } from './store.mjs';
import { estimate, wallet } from './routesCatalog.mjs';
import { SERVED_PROVIDERS } from './preflight.mjs';

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

function raw(port, { method = 'GET', path = '/', headers = {} } = {}) {
  const lines = [`${method} ${path} HTTP/1.1`, ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`)];
  const text = `${lines.join('\r\n')}\r\n\r\n`;
  return new Promise((resolve) => {
    const sock = connect(port, '127.0.0.1', () => sock.write(text));
    let buf = '';
    sock.on('data', (d) => { buf += d; });
    sock.on('error', () => {});
    sock.on('close', () => resolve(buf));
    setTimeout(() => { sock.destroy(); resolve(buf); }, 2500);
  });
}
const statusOf = (r) => (r.match(/^HTTP\/1\.1 (\d+)/) || [])[1] || 'NO RESPONSE';
const bodyOf = (r) => { const i = r.indexOf('\r\n\r\n'); return i < 0 ? '' : r.slice(i + 4); };

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

async function main() {
  console.log('HOSTILE PROBE — ROUND 3\n');

  // ── A. a rate that bills must never be priced as free ─────────────────────
  section('A. a NONZERO rate must never price as $0.00');
  {
    const priced = (rate, duration = 6) => estimateRunCostMicros(
      { provider: 'probe/x', rateUnit: 'second', costPerSecondUsd: rate }, { duration });

    check('CONTROL: a normal published rate still prices normally', priced('0.13') === 780_000,
      `0.13/sec x 6s -> ${priced('0.13')} micros`);
    // `toMicros` truncated at the sixth decimal, so a rate of 0.0000009 became 0 micros —
    // and `estimateRunCostMicros` reads `rateMicros === 0` as "explicitly free". A
    // vendor rate that bills, priced at nothing, and the ceiling is never charged.
    for (const rate of ['0.0000009', '0.0000004', '0.0000001']) {
      const got = priced(rate);
      check(`rate ${rate}/sec is not treated as free`, got !== 0,
        got === 0 ? 'PRICED AT ZERO — a billing rate became a free run' : `-> ${got} micros`);
    }
    check('CONTROL: an EXPLICIT zero rate still means free', priced('0') === 0,
      `rate "0" -> ${priced('0')} micros`);
  }

  // ── B. toMicros must not round a rate DOWN ────────────────────────────────
  section('B. converting a rate must not understate it');
  {
    check('CONTROL: an exact 4-decimal rate is unchanged', toMicros('0.0738') === 73_800);
    for (const [rate, floor] of [['0.1234567', 123_457], ['0.9999999', 1_000_000], ['0.0000009', 1]]) {
      const got = toMicros(rate);
      check(`toMicros(${rate}) does not understate the rate`, got >= floor,
        `got ${got}, want >= ${floor}${got < floor ? ' — TRUNCATED DOWN, which understates cost' : ''}`);
    }
  }

  // ── C. formatUsd must not understate a cost ───────────────────────────────
  section('C. rendering a cost must not understate it');
  {
    check('CONTROL: an exact figure renders exactly', formatUsd(780_000) === '0.7800');
    // Truncating to 4 decimals reports 1.2345 for 1.234567 and 0.0000 for 1 micro.
    // For a MONEY display the unsafe direction is down: a caller reads a ceiling
    // comparison off this string.
    const got = formatUsd(1_234_567);
    check('formatUsd does not render below the true value', Number(got) >= 1.234567,
      `formatUsd(1234567) = ${got}`);
    // The carry path. 999999 micros is 0.999999, which at four decimals must round UP
    // into the whole dollars rather than render as "0.10000" or truncate to "0.9999".
    check('formatUsd carries correctly at the rounding boundary', formatUsd(999_999) === '1.0000',
      `formatUsd(999999) = ${formatUsd(999_999)}`);
    // NOT asserted: that a nonzero cost never renders as zero. Four decimals cannot
    // express a cost below 0.00005 USD, so 1 micro renders as "0.0000" and no rounding
    // can change that. It is a precision limit, not a bug — and it is safe only because
    // every gate compares integer micros and the string travels beside them as display.
    const microsCarried = estimateRunCostMicros({ provider: 'p', rateUnit: 'second', costPerSecondUsd: '0.0000004' }, { duration: 6 });
    check('a sub-precision cost is reported as UNKNOWN, never as zero', microsCarried === null,
      `0.0000004/sec -> ${JSON.stringify(microsCarried)}`);
  }

  // ── D. an acknowledged job must be retrievable ────────────────────────────
  section('D. a job the API acknowledged must be in the store');
  {
    const dir = mkdtempSync(join(tmpdir(), 'swan-probe3-d-'));
    const path = join(dir, 'jobs.json');
    // A frozen clock makes every createdAt identical, which is the tie the prune sort
    // resolves by insertion order — putting the NEWEST job last, where the slice cuts.
    const frozen = () => new Date('2026-09-18T00:00:00.000Z');
    const store = makeJobStore(path, { maxJobs: 2, now: frozen });
    const a = store.create({ provider: 'p', id: 'job-a' });
    const b = store.create({ provider: 'p', id: 'job-b' });
    const c = store.create({ provider: 'p', id: 'job-c' });
    check('CONTROL: the store is bounded as configured', store.list().length === 2,
      `${store.list().length} rows kept of 3 created`);
    const kept = new Set(store.list().map((j) => j.id));
    check('the job just created is among those kept', kept.has(c.id),
      `created ${[a.id, b.id, c.id].join(', ')}; kept ${[...kept].join(', ')}`
      + (kept.has(c.id) ? '' : ' — the API returned 202 for a job it never persisted'));
  }

  // ── E. a corrupt store must not hand back its path ────────────────────────
  section('E. a corrupt store must not disclose its path to the caller');
  {
    const dir = mkdtempSync(join(tmpdir(), 'swan-probe3-e-'));
    const jobsPath = join(dir, 'jobs.json');
    const res = await withServer({ SWAN_MEDIA_API_JOBS: jobsPath, SWAN_MEDIA_API_ROOT: dir }, async ({ port, alive, stderr }) => {
      // Corrupt the store AFTER boot, deliberately. Corrupting it before boot tests the
      // startup path — and the gateway correctly refuses to start at all, which is the
      // right behaviour but not the question. The request path is where a message
      // reaches a caller, so that is what gets corrupted.
      writeFileSync(jobsPath, '{"schema":1,"jobs":', 'utf8');   // truncated mid-write
      const reply = await raw(port, { path: '/v1/jobs/anything', headers: { authorization: `Bearer ${TOKEN}`, connection: 'close', host: '127.0.0.1' } });
      await settle(300);
      return { status: statusOf(reply), body: bodyOf(reply), alive: alive(), stderr: stderr() };
    });
    check('CONTROL: a corrupt store is refused, not silently emptied', res.status === '500',
      `answered ${res.status}`);
    check('the corrupt-store error does not disclose the store path', !res.body.includes(jobsPath),
      res.body.includes(jobsPath) ? `LEAKED: ${res.body.slice(0, 160)}` : 'no path in the body');
    check('the process survives a corrupt store', res.alive);
  }

  // ── F. estimate and quotes must agree about what exists ───────────────────
  section('F. /v1/estimate must not price a provider /v1/quotes refuses');
  {
    const served = new Set(SERVED_PROVIDERS);
    const known = new Set([...Object.keys(VIDEO_PROVIDERS), ...Object.keys(HOSTED_VIDEO_PROVIDERS)]);
    const unserved = [...known].filter((id) => !served.has(id));
    check('CONTROL: there ARE catalogue rows this gateway does not serve', unserved.length > 0,
      `${unserved.length} unserved row(s): ${unserved.slice(0, 6).join(', ')}${unserved.length > 6 ? ', …' : ''}`);

    const quoted = new Set();
    for (const id of unserved) {
      const out = estimate({ body: { params: { provider: id, duration: 6 } } });
      if (out.status === 200) quoted.add(id);
    }
    check('no unserved provider is priced by /v1/estimate', quoted.size === 0,
      quoted.size ? `PRICED ${quoted.size} provider(s) that /v1/quotes would refuse: ${[...quoted].join(', ')}` : 'all refused');

    // Control: a SERVED provider must still be priced, or "all refused" is vacuous.
    const ok = estimate({ body: { params: { provider: 'higgsfield/kling-3.0', duration: 6 } } });
    check('CONTROL: a served provider IS priced', ok.status === 200, `status ${ok.status}`);
  }

  // ── G. one day, one definition ────────────────────────────────────────────
  section('G. the wallet and the guard must agree on which day it is');
  {
    const when = new Date('2026-09-18T23:30:00.000Z');
    const out = wallet({ env: {}, now: () => when, ledger: null });
    check('CONTROL: the wallet reports a day', Boolean(out.body.day), `day=${out.body.day}`);
    check('the wallet day matches the guard\'s dayKey', out.body.day === dayKey(when),
      `wallet=${out.body.day} guard=${dayKey(when)}`);
  }

  console.log(`\n${pass + fail} CHECKS — ${pass} passed, ${fail} failed`);
  if (failures.length) console.log(`failed: ${failures.join(' | ')}`);
  process.exit(fail === 0 ? 0 : 1);
}

if (process.argv.includes('--serve')) {
  const { buildServer } = await import('./server.mjs');
  const { server } = buildServer({
    env: process.env,
    deps: { runGenerateImpl: () => new Promise(() => {}) },
  });
  server.listen(0, '127.0.0.1', () => {
    process.stdout.write(`${JSON.stringify({ ready: true, port: server.address().port })}\n`);
  });
} else {
  await main();
}
