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
import { stylesheetsOnDisk } from './shell.mjs';
// A4b's checks, and the guard that keeps this file's check list honest about the routes
// that exist. Sibling module for Rule 4 — this file sits at the 300-line cap, so A5's
// checks went into `smokeBoards.mjs` and the Tune block moved to `smokeTune.mjs`.
import { checkOverrides, checkRouteCoverage } from './smokeOverrides.mjs';
// A5's pane checks, and the Tune block that was split out to make room for them.
import { checkBoards, checkNoEnableRoute } from './smokeBoards.mjs';
import { checkTune } from './smokeTune.mjs';
import { MUTATION_ROUTES } from './routes.mjs';
import { PANE_PATHS } from './paneRoutes.mjs';

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
  // EVERY stylesheet, DISCOVERED rather than named. A5 split the CSS into three files
  // (`astra.css`, `astra-tune.css`, `astra-boards.css`), and a scan that still named
  // `astra.css` would have gone quiet about two thirds of the stylesheet — the same
  // "the scope was the defect" hole A4b found in the Rule 4 guard. The overflow rule is
  // `T-A-01`'s own precondition, so it has to hold for all of them.
  await check('GET  /static/*.css (every stylesheet)', async () => {
    const sheets = stylesheetsOnDisk();
    const bodies = [];
    let bad = null;
    for (const href of sheets) {
      const r = await call('GET', href);
      if (r.status !== 200) { bad = `${href} answered ${r.status}`; break; }
      bodies.push({ href, body: stripComments(r.text) });
    }
    const all = bodies.map((b) => b.body).join('\n');
    const overflow = bodies.find((b) => /overflow-x:\s*hidden/.test(b.body));
    return {
      status: 200,
      note: bad
        || (sheets.length < 2 ? `only ${sheets.length} stylesheet(s) discovered` : '')
        || (!all.includes('--bg') ? 'the stylesheets did not arrive intact (no --bg)' : '')
        || (overflow ? `overflow-x:hidden in ${overflow.href} — T-A-01 would be unable to fail` : ''),
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
  // `/law` and `/state` left this list in A5 — they are real panes now, and their
  // checks moved to `smokeBoards.mjs`. `/ledger` is still honestly unbuilt.
  for (const [path, slice] of [['/ledger', 'A6']]) {
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

  // --- the two read-only boards (A5) ---------------------------------------
  // `/law` and `/state` are real as of A5, and neither may emit a control. The checks
  // live in `smokeBoards.mjs` — this file is at the cap.
  await checkBoards({ call, check, expect });

  await check('GET  /nope (404)', async () => {
    const r = await call('GET', '/nope');    return { status: r.status, note: expect(r.status, 404, 'status') };
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

  // --- the override layer (A4b) --------------------------------------------
  await checkOverrides({ call, check, expect });

  // --- the Tune routes are REAL as of A4 -----------------------------------
  // Split into `smokeTune.mjs` for Rule 4 (A5). The checks are unchanged; the move
  // happened only because this file was at the cap and A5 needs room for two panes.
  await checkTune({ call, check, expect });

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

  // LAST, because it reads what was actually run. `${rows.length} checks` reads as "the
  // surface is covered"; this is what makes that a measured claim rather than a list length.
  await checkRouteCoverage({ rows, check, routes: MUTATION_ROUTES });
  // And the other completeness claim: no route can enable a REFUSED lane or spec mode.
  // PANE paths are scanned too — a pane route is a route, and `GET /state/enable-spec`
  // would otherwise be invisible to this check (A5 hostile review).
  await checkNoEnableRoute({ check, routes: MUTATION_ROUTES, panePaths: PANE_PATHS });

  await server.close();

  return report({ rows, base, brainVersion: readBrainVersion(), verbose: VERBOSE });
}

run().then((code) => process.exit(code)).catch((e) => {
  console.error(`smoke runner itself failed: ${e.message}`);
  process.exit(2);
});
