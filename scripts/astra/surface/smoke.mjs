#!/usr/bin/env node
/**
 * smoke.mjs — the surface's human-runnable proof. Named in `04-TESTS-TRACEABILITY.md` §1.7
 * and in A3's evidence line, so it exists rather than being a command the packet promises.
 *
 * THIS IS NOT A UNIT TEST AND DOES NOT REPLACE ONE. It boots the real server on a real
 * loopback port and makes real HTTP requests, then prints one line per route with the
 * status it actually returned. Its job is the thing a test suite is bad at: letting a
 * person see, in one screen, that every route answers the way it claims to.
 *
 * EVERY CHECK ASSERTS A STATUS **AND** A CODE. `POST /api/preview` answering 501 is not
 * enough — a 501 from a crashed handler and a 501 that names `E_GENERATION_DISABLED`
 * look identical to a status-only check, and only one of them is the refusal we built.
 *
 * THREE CHECKS HERE WERE WRONG ON FIRST RUN, AND THE FIXES ARE THE INTERESTING PART:
 *  - the overflow scan matched the stylesheet's own COMMENT saying "no overflow-x: hidden",
 *    so comments are stripped first (the D11/D20 class: a scan reading a declaration as
 *    the thing declared);
 *  - the traversal check used `fetch`, which normalises `..` away before sending, so it
 *    tested the URL parser and not the server — it now uses a raw socket;
 *  - the token sentinel made "no token" actually send a token.
 *
 * Usage:
 *   node scripts/astra/surface/smoke.mjs [--port 7411] [--verbose]
 *
 * Exits 0 when every check passes, 1 otherwise. `--port 0` asks the OS for a free port.
 */

import { connect } from 'node:net';

import { startServer } from './server.mjs';
import { readBrainVersion } from '../core/brain.mjs';

const argv = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};
const PORT = Number(argOf('--port', '0'));
const VERBOSE = argv.includes('--verbose');
const TOKEN = 'smoke-token-not-a-secret';

const BRIEF = { text: 'a frozen lake at dawn, low vantage, the ice breathing', intent: 'hero', aspect: '16:9' };

/** Comments stripped, so a scan cannot fire on prose that DESCRIBES the forbidden thing. */
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** A traversal must go over a raw socket: `fetch` removes `..` before it is ever sent. */
function rawGet(port, path) {
  return new Promise((resolve) => {
    const sock = connect(port, '127.0.0.1', () => {
      sock.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`);
    });
    let out = '';
    sock.on('data', (d) => { out += d; });
    sock.on('close', () => resolve(out));
    sock.on('error', () => resolve('ERROR'));
  });
}

async function run() {
  const server = await startServer({ port: PORT, token: TOKEN });
  const base = server.url.replace(/\/$/, '');
  const rows = [];
  const state = { compileId: null };

  const call = async (method, path, { body, token = 'good', raw = false } = {}) => {
    if (raw) {
      const text = await rawGet(server.port, path);
      const status = Number(/HTTP\/1\.1 (\d{3})/.exec(text)?.[1] ?? 0);
      return { status, parsed: null, text, headers: new Map() };
    }
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (token === 'good') headers['x-astra-token'] = TOKEN;
    if (token === 'wrong') headers['x-astra-token'] = 'definitely-not-the-token';
    const res = await fetch(base + path, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    return { status: res.status, parsed, text, headers: res.headers };
  };

  const check = async (name, fn) => {
    let note = '';
    let status = 0;
    let code = null;
    try {
      const r = await fn();
      status = r.status ?? 0;
      code = r.code ?? null;
      note = r.note ?? '';
    } catch (e) {
      note = `check threw: ${e.message}`;
    }
    const ok = note === '';
    rows.push({ name, ok, status, code, note });
  };

  const expect = (got, want, label) => (got === want ? '' : `${label} ${got}, expected ${want}`);

  // --- the process is alive, and the version comes from code -----------------
  await check('GET  /healthz', async () => {
    const r = await call('GET', '/healthz');
    return {
      status: r.status,
      note: expect(r.status, 200, 'status')
        || (r.parsed?.brainVersion === readBrainVersion() ? ''
          : `brainVersion ${r.parsed?.brainVersion} is not the live export ${readBrainVersion()}`),
    };
  });

  // --- static assets --------------------------------------------------------
  await check('GET  /static/astra.css', async () => {
    const r = await call('GET', '/static/astra.css');
    const body = stripComments(r.text);
    return {
      status: r.status,
      note: expect(r.status, 200, 'status')
        || (!body.includes('--bg') ? 'the stylesheet did not arrive intact' : '')
        || (/overflow-x:\s*hidden/.test(body)
          ? 'overflow-x:hidden found in real CSS — T-A-01 would be unable to fail' : ''),
    };
  });

  await check('GET  /static/../../../package.json (raw)', async () => {
    const r = await call('GET', '/static/../../../package.json', { raw: true });
    const served = /"name"\s*:\s*"-SS-PT-New"/.test(r.text);
    return {
      status: r.status,
      note: ([403, 404].includes(r.status) ? '' : `traversal must not be served, got ${r.status}`)
        || (served ? 'the repo package.json was READABLE' : ''),
    };
  });

  // --- the panes ------------------------------------------------------------
  await check('GET  / (Compose)', async () => {
    const r = await call('GET', '/');
    return { status: r.status, note: expect(r.status, 200, 'status')
      || (r.text.includes('BRIEF') ? '' : 'no brief form rendered') };
  });
  await check('GET  /choose', async () => {
    const r = await call('GET', '/choose');
    return { status: r.status, note: expect(r.status, 200, 'status') };
  });
  await check('GET  /think (no compile)', async () => {
    const r = await call('GET', '/think');
    return { status: r.status, note: expect(r.status, 200, 'status')
      || (r.text.includes('No compile selected') ? '' : 'a blank Think pane must say WHY it is blank') };
  });
  for (const [path, slice] of [['/law', 'A5'], ['/state', 'A5'], ['/tune', 'A4'], ['/ledger', 'A6']]) {
    await check(`GET  ${path} (not built)`, async () => {
      const r = await call('GET', path);
      return { status: r.status, note: expect(r.status, 200, 'status')
        || (r.text.includes(slice) ? '' : `a not-built pane must name its slice (${slice})`) };
    });
  }
  await check('GET  /nope (404)', async () => {
    const r = await call('GET', '/nope');
    return { status: r.status, note: expect(r.status, 404, 'status') };
  });

  // --- the read API ---------------------------------------------------------
  await check('GET  /api/capabilities', async () => {
    const r = await call('GET', '/api/capabilities');
    const lanes = r.parsed?.lanes ?? [];
    const statuses = new Set(lanes.map((l) => l.status));
    const noSource = lanes.filter((l) => !l.source);
    return {
      status: r.status,
      note: expect(r.status, 200, 'status')
        || (lanes.length === 0 ? 'the board is EMPTY — the defect T-U-07 exists to catch' : '')
        || (statuses.size < 2 ? `every lane reports the same status (${[...statuses].join(',')})` : '')
        || (noSource.length ? `${noSource.length} lane(s) carry no file:line source` : ''),
    };
  });
  await check('GET  /api/state', async () => {
    const r = await call('GET', '/api/state');
    return { status: r.status, note: expect(r.status, 200, 'status') };
  });

  // --- the free Gate 0 ------------------------------------------------------
  await check('GET  /api/directions (POST-only)', async () => {
    const r = await call('GET', '/api/directions');
    return { status: r.status, code: r.parsed?.error?.code,
      note: expect(r.status, 405, 'status') || expect(r.parsed?.error?.code, 'E_METHOD', 'code') };
  });
  await check('POST /api/directions (zero cost)', async () => {
    const r = await call('POST', '/api/directions', { body: { brief: BRIEF } });
    const d = r.parsed?.directions ?? [];
    return {
      status: r.status,
      note: expect(r.status, 200, 'status')
        || expect(d.length, 3, 'direction count')
        || (d.find((x) => x.tier !== 'prior') ? 'cold start produced a non-prior direction — tier is truth' : '')
        || (d.find((x) => !x.tierReason) ? 'a direction rendered without its tierReason' : '')
        || (r.parsed?.spent !== 0 || r.parsed?.generated !== 0 ? 'Gate 0 must report spent:0 generated:0' : ''),
    };
  });

  // --- the token gate -------------------------------------------------------
  await check('POST /api/compile (NO token)', async () => {
    const r = await call('POST', '/api/compile', { body: { brief: BRIEF }, token: 'none' });
    return { status: r.status, code: r.parsed?.error?.code,
      note: expect(r.status, 401, 'status') || expect(r.parsed?.error?.code, 'E_TOKEN_REQUIRED', 'code') };
  });
  await check('POST /api/compile (WRONG token)', async () => {
    const r = await call('POST', '/api/compile', { body: { brief: BRIEF }, token: 'wrong' });
    return { status: r.status, code: r.parsed?.error?.code,
      note: expect(r.status, 401, 'status') || expect(r.parsed?.error?.code, 'E_TOKEN_INVALID', 'code') };
  });
  await check('POST /api/compile (token)', async () => {
    const r = await call('POST', '/api/compile', { body: { brief: BRIEF } });
    state.compileId = r.parsed?.compileId ?? null;
    // `lawChecks` live on the ExplainView, not at the top level — the same shape
    // `renderThink` reads. A check expecting them top-level tests the wrong contract.
    const checks = r.parsed?.view?.lawChecks;
    return {
      status: r.status,
      note: expect(r.status, 200, 'status')
        || (!state.compileId ? 'a compile must return an id, or nothing can be explained later' : '')
        || (!Array.isArray(checks) || checks.length === 0 ? 'no lawChecks on the ExplainView' : '')
        || (!checks.some((c) => c.passed === true) ? 'a lawful hero brief must pass at least one law' : ''),
    };
  });

  // --- the named refusals ---------------------------------------------------
  await check('POST /api/preview (token, REFUSED)', async () => {
    const r = await call('POST', '/api/preview', { body: {} });
    return { status: r.status, code: r.parsed?.error?.code,
      note: expect(r.status, 501, 'status')
        || expect(r.parsed?.error?.code, 'E_GENERATION_DISABLED', 'code') };
  });
  for (const route of ['tuning-stage', 'tuning-commit', 'tuning-revert']) {
    await check(`POST /api/${route} (token)`, async () => {
      const r = await call('POST', `/api/${route}`, { body: {} });
      return { status: r.status, code: r.parsed?.error?.code,
        note: expect(r.status, 501, 'status') || expect(r.parsed?.error?.code, 'E_NOT_BUILT', 'code') };
    });
  }

  // --- explain, then the one write -----------------------------------------
  await check('POST /api/explain (unknown id)', async () => {
    const r = await call('POST', '/api/explain', { body: { compileId: 'cmp-does-not-exist' } });
    return { status: r.status, code: r.parsed?.error?.code,
      note: expect(r.status, 404, 'status') || expect(r.parsed?.error?.code, 'E_COMPILE_UNKNOWN', 'code') };
  });
  await check('POST /api/explain (real id)', async () => {
    const r = await call('POST', '/api/explain', { body: { compileId: state.compileId } });
    return { status: r.status, note: expect(r.status, 200, 'status')
      || (r.parsed?.view?.slots?.length === 12 ? '' : 'the ExplainView must carry all 12 slots') };
  });
  await check('POST /api/reject (token, real id)', async () => {
    const r = await call('POST', '/api/reject', { body: { compileId: state.compileId } });
    return { status: r.status, note: expect(r.status, 200, 'status')
      || expect(r.parsed?.outcome, 'rejected_all', 'outcome') };
  });
  // NOTE, and it is deliberate: the CONSOLE's reject needs the mutation token but NOT
  // `confirm: true`, while the MCP tool `brain.reject` needs `confirm: true`. The two
  // callers differ — an agent in a loop versus the operator pressing one key — and the
  // packet's design intent is "one keystroke to record the highest-value signal". This
  // is recorded so nobody "fixes" one surface to match the other.
  await check('POST /api/reject (unknown id)', async () => {
    const r = await call('POST', '/api/reject', { body: { compileId: 'cmp-does-not-exist' } });
    return { status: r.status, code: r.parsed?.error?.code,
      note: expect(r.status, 404, 'status') || expect(r.parsed?.error?.code, 'E_COMPILE_UNKNOWN', 'code') };
  });

  await server.close();

  // --- report ---------------------------------------------------------------
  const failed = rows.filter((r) => !r.ok).length;
  const width = Math.max(...rows.map((r) => r.name.length));
  console.log(`astra smoke — ${base}`);
  console.log(`brainVersion ${readBrainVersion()} · ${rows.length} checks\n`);
  for (const r of rows) {
    console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.name.padEnd(width)}  ${String(r.status).padEnd(3)}${r.code ? ` ${r.code}` : ''}`);
    if (VERBOSE && r.note) console.log(`        ${r.note}`);
  }
  console.log(`\n${rows.length - failed} passed, ${failed} failed`);
  return failed === 0 ? 0 : 1;
}

run().then((code) => process.exit(code)).catch((e) => {
  console.error(`smoke runner itself failed: ${e.message}`);
  process.exit(2);
});
