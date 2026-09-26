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
 * All three fixes now live in `smokeHarness.mjs`, which this file uses. The checks below
 * say what each route should answer; the harness knows how to ask and how to record.
 *
 * Usage:
 *   node scripts/astra/surface/smoke.mjs [--port 7411] [--verbose]
 *
 * Exits 0 when every check passes, 1 otherwise. `--port 0` asks the OS for a free port.
 */

import { startServer } from './server.mjs';
import { readBrainVersion } from '../core/brain.mjs';
import { createHarness, report, stripComments } from './smokeHarness.mjs';

const argv = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};
const PORT = Number(argOf('--port', '0'));
const VERBOSE = argv.includes('--verbose');
const TOKEN = 'smoke-token-not-a-secret';

const BRIEF = { text: 'a frozen lake at dawn, low vantage, the ice breathing', intent: 'hero', aspect: '16:9' };

async function run() {
  const server = await startServer({ port: PORT, token: TOKEN });
  const base = server.url.replace(/\/$/, '');
  const state = { compileId: null };
  const { call, check, expect, rows } = createHarness({ base, port: server.port, token: TOKEN });

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
  for (const [path, slice] of [['/law', 'A5'], ['/state', 'A5'], ['/ledger', 'A6']]) {
    await check(`GET  ${path} (not built)`, async () => {
      const r = await call('GET', path);
      return { status: r.status, note: expect(r.status, 200, 'status')
        || (r.text.includes(slice) ? '' : `a not-built pane must name its slice (${slice})`) };
    });
  }
  await check('GET  /tune (REAL as of A4)', async () => {
    const r = await call('GET', '/tune');
    return { status: r.status, note: expect(r.status, 200, 'status')
      || (r.text.includes('KNOBS') ? '' : 'the Tune pane must render its knob table')
      || (r.text.includes('state:') ? '' : 'the pane must declare LIVE or STAGED')
      || (!/data-control="tuning\.(knob|stage|commit|revert)"/.test(r.text)
        ? 'the pane must emit its registry controls' : '')
      // The A4 build must no longer claim to be unbuilt.
      || (/arrive with A4/.test(r.text) ? 'the pane still renders as NOT BUILT' : '') };
  });
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

  // --- the Tune routes are REAL as of A4 -----------------------------------
  await check('GET  /api/tuning (live knobs)', async () => {
    const r = await call('GET', '/api/tuning');
    const cur = r.parsed?.view?.current ?? {};
    return {
      status: r.status,
      note: expect(r.status, 200, 'status')
        || (Object.keys(cur).length === 0 ? 'the live config produced no leaf knobs' : '')
        || (cur['auto.S'] === undefined ? 'auto.S is missing — the view is not reading the config' : '')
        || (r.parsed?.view?.staged && Object.keys(r.parsed.view.staged).length
          ? 'a fresh session must start with NOTHING staged' : ''),
    };
  });
  await check('POST /api/tuning-stage (empty = discard)', async () => {
    const r = await call('POST', '/api/tuning-stage', { body: { staged: {} } });
    return { status: r.status, note: expect(r.status, 200, 'status')
      || (r.parsed?.cleared === true ? '' : 'an empty patch must clear the stage, not error') };
  });
  // The read route must describe the SESSION, not a fresh config. A4 shipped a version
  // that returned `staged: {}` no matter what — so after a real stage the pane said
  // `STAGED (1)` and this endpoint said nothing was staged. A client polling it would
  // conclude a staged change had been discarded. This check is that defect's guard.
  await check('GET  /api/tuning (carries the stage)', async () => {
    const staged = await call('POST', '/api/tuning-stage', { body: { staged: { 'mergeBand.low': 0.4 } } });
    if (staged.status !== 200) return { status: staged.status, note: 'staging failed, so the read cannot be judged' };
    const r = await call('GET', '/api/tuning');
    const v = r.parsed?.view ?? {};
    const note = expect(r.status, 200, 'status')
      || (Object.keys(v.staged ?? {}).length === 1 ? ''
        : 'the view reported an empty stage while one was staged — a false all-clear')
      || expect(v.state, 'staged', 'state');
    await call('POST', '/api/tuning-stage', { body: { staged: {} } }); // leave no stage behind
    return { status: r.status, note };
  });
  await check('POST /api/tuning-stage (unknown key REFUSED)', async () => {
    const r = await call('POST', '/api/tuning-stage', { body: { staged: { 'nope.missing': 1 } } });
    return { status: r.status, code: r.parsed?.error?.code,
      note: expect(r.status, 400, 'status')
        || expect(r.parsed?.error?.code, 'E_TUNING_KEY_UNKNOWN', 'code') };
  });
  await check('POST /api/tuning-commit (nothing staged REFUSED)', async () => {
    // Refused BEFORE any write, so this check has no side effect on the real config.
    const r = await call('POST', '/api/tuning-commit', { body: { note: 'a smoke note long enough' } });
    return { status: r.status, code: r.parsed?.error?.code,
      note: expect(r.status, 400, 'status')
        || expect(r.parsed?.error?.code, 'E_TUNING_NO_CHANGES', 'code') };
  });
  // THE REVERT PATH IS DELIBERATELY NOT EXERCISED HERE. A real revert would WRITE the live
  // tuning.json, and a smoke run must not mutate the engine's configuration as a side
  // effect of a health check. The gate is asserted instead; the write path itself is proven
  // against temp copies in tests/a4-tune.test.mjs.
  await check('POST /api/tuning-revert (NO token = gate holds)', async () => {
    const r = await call('POST', '/api/tuning-revert', { body: {}, token: 'none' });
    return { status: r.status, code: r.parsed?.error?.code,
      note: expect(r.status, 401, 'status')
        || expect(r.parsed?.error?.code, 'E_TOKEN_REQUIRED', 'code') };
  });

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

  return report({ rows, base, brainVersion: readBrainVersion(), verbose: VERBOSE });
}

run().then((code) => process.exit(code)).catch((e) => {
  console.error(`smoke runner itself failed: ${e.message}`);
  process.exit(2);
});
