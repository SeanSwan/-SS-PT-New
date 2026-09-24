#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/bridge.hy4.allowlist.test.mjs
 * PURPOSE: HY4-H6 — the route allowlist, split out of the structure suite.
 * PART OF: Creator Brains Console (blueprint 06-test-plan.md)
 * SLICE: S0, extended by S3 when `POST /api/repair` was added
 * ============================================================================
 *
 * WHY THIS SPLIT OUT OF `bridge.hy4.structure.test.mjs`.
 * That file held both HY4 structural findings and crossed the repo's hard
 * 300-line cap (CLAUDE.md rule 4) the moment S3 added a tenth route to the
 * allowlist. Rule 4's repair is to extract at the seam — never to raise the
 * cap, never to line-golf the comments that carry the reasoning.
 *
 * The seam is real rather than convenient: H6 asks "what routes exist?" and H7
 * asks "how long are the files?". Both are structural, which is why they shared
 * a file, but they share no helper and no fixture — the imports below (a live
 * bridge and the request fixtures) came with H6, and H7 needs neither.
 *
 * @module creator-brains-console/test/bridge.hy4.allowlist
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { startBridge } from '../server.mjs';
import { fixtureRoot, rawRequest } from './fixtures.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONSOLE_ROOT = join(HERE, '..');
/* ── H6 · the route table is an explicit allowlist ───────────────────────── */

/**
 * The approved S0 surface, frozen. This is the CONTRACT the code must satisfy.
 *
 * S0 ships five reads and two writes. Everything else in the packet's route
 * table is deliberately deferred to a later slice that has its slice exit
 * criteria to justify it — most importantly the write routes, which carry tier
 * T2 responsibilities (spawn a child process, touch backups) that the first
 * slice has no business assuming.
 */
const S0_ALLOWLIST = Object.freeze([
  'GET /api/status',
  'GET /api/creators',
  'GET /api/query',
  'GET /api/brains/:slug',
  'GET /api/run',
  'GET /api/canary',
  'GET /api/backlog',
  'POST /api/creators',
  'PATCH /api/creators/:channelId',
  // ── ADDED BY S3, DELIBERATELY (not appended to silence a failure) ──────────
  // `POST /api/repair` is the tenth route, added when slice S3 landed. It is
  // listed here with its tier review recorded rather than inferred:
  //   Tier:   T2 (bounded write) — it mutates state, so it needs the write gate.
  //   Gate:   the SAME run-operation exclusion gate as S4's `POST /api/run/daily`
  //           (A1-06). The engine's repair path IS `runDaily({only:[…]})`, so a
  //           second, separate gate would leave the journal reachable through
  //           the other door — which is the defect this row exists to prevent.
  //   Slice:  S3 (OpsRail), contract `05 §2b`, exit test T-B10.
  // It is a bounded operation, NOT a destructive one: `backup`, `restore`,
  // `rollback` and `authorize` all remain absent, and the assertions below still
  // require that. The regression guard on the guard is unchanged.
  'POST /api/repair',
  // ── ADDED BY S4, DELIBERATELY (not appended to silence a failure) ──────────
  // `POST /api/run/daily` is the eleventh route, added when slice S4 landed. Its
  // tier review, recorded rather than inferred:
  //   Tier:   T2 — it spawns a detached child process and mutates the store.
  //   Gate:   THE SAME gate row as S3's repair, not a compatible one. Both call
  //           `underRunGate` from `lib/run-gate.mjs`, which is a single call site
  //           (A1-06). The gate test T-B10 asserts the call order there.
  //   Shape:  `202 {requestId: string, runId: null}` — ACCEPTANCE, not completion
  //           (A1-05). `runId` is null because the engine's `run-daily.mjs` takes
  //           no caller-supplied id, so any non-null value here would be a
  //           fabricated correlation. Progress is read from `GET /api/run`.
  //   Slice:  S4 (RunConsole), contract `05 §2b`, exit tests T-B4/B5.
  // It is NOT a destructive or credential route: `backup`, `restore`, `rollback`
  // and `authorize` all remain absent below, and this addition does not relax
  // that. It does spawn a process, which is why its tier is stated rather than
  // assumed.
  'POST /api/run/daily',
]);

test('HY4-H6: the declared S0 allowlist is exactly nine statements', () => {
  // S0's OWN count is still asserted at nine, then each slice's addition is
  // asserted separately. Folding them into one number would erase which slice is
  // responsible for the change — and the next slice would have no place to say so.
  const s0 = S0_ALLOWLIST.filter((r) => r !== 'POST /api/repair' && r !== 'POST /api/run/daily');
  assert.equal(s0.length, 9, 'seven reads and two writes at S0');
  assert.ok(!s0.some((r) => /run\/daily/.test(r)),
    'POST /api/run/daily is NOT in S0 — the plan was amended to defer it to S4');
  assert.ok(!s0.some((r) => /repair|backup|restore|rollback|authorize/i.test(r)),
    'no destructive or credential route may enter the allowlist without a tier review');
  // A regression guard on the guard: if someone "fixes" a failing test by
  // appending the route they just added, this catches the obvious version.
  assert.equal(new Set(S0_ALLOWLIST).size, S0_ALLOWLIST.length, 'no duplicate entries');
  // And each LATER slice is counted on its own, so the arithmetic above cannot
  // quietly absorb a fourth addition nobody reviewed.
  assert.equal(S0_ALLOWLIST.filter((r) => r === 'POST /api/repair').length, 1, "S3's one addition");
  assert.equal(S0_ALLOWLIST.filter((r) => r === 'POST /api/run/daily').length, 1, "S4's one addition");
});

test('HY4-H6: the routes that must stay ABSENT are still absent from the allowlist', () => {
  // R9's doctrine: "no dangerous route may appear unnoticed". `repair` was added
  // by S3 and `run/daily` by S4, each with a reviewed tier; these four have no
  // such review and must not arrive by the same route-shaped accident. Each is
  // named individually so a failure says WHICH one appeared rather than "a regex
  // matched".
  for (const absent of ['backup', 'restore', 'rollback', 'authorize']) {
    assert.ok(
      !S0_ALLOWLIST.some((r) => new RegExp(`/${absent}\\b`, 'i').test(r)),
      `${absent} may not enter the allowlist — A1-08 / D4 is still open and the contract `
      + 'says backup stays visible-but-blocked with NO endpoint',
    );
  }
  // The two run-operation routes ARE present, and they are the pair A1-06 makes
  // inseparable: gating one and shipping the other gates nothing. Asserted
  // positively so a future reader cannot remove one door and leave this green.
  assert.ok(S0_ALLOWLIST.includes('POST /api/run/daily'), "S4's run route is in the table");
  assert.ok(S0_ALLOWLIST.includes('POST /api/repair'), "S3's repair route is in the table");
});

test('HY4-H6: the implemented route table matches the allowlist exactly', () => {
  // Reads the REAL dispatch table as text. This is what makes the allowlist
  // binding rather than decorative: adding a route without editing the list above
  // turns this red, so the addition cannot be silent.
  //
  // BOTH FILES ARE READ (round 5, S2 prep). The route table moved to `routes.mjs`
  // when `server.mjs` hit the 300-line cap with zero headroom. Reading only the
  // new file would leave a hole big enough to drive the check through: a route
  // added back into `server.mjs` would be dispatched by the bridge and invisible
  // to this test. The extractor therefore runs over the concatenation, so the
  // allowlist binds the bridge rather than one file.
  const source = ['routes.mjs', 'server.mjs']
    .map((f) => readFileSync(join(CONSOLE_ROOT, f), 'utf8'))
    .join('\n');

  const found = new Set();
  const re = /req\.method === '([A-Z]+)'\s*&&\s*p\s*(===|\.startsWith\()\s*'([^']+)'/g;
  for (const m of source.matchAll(re)) {
    const [, method, op, path] = m;
    if (!path.startsWith('/api/')) continue;
    // `startsWith` routes are the parametric ones; the contract spells the
    // parameter by name, so the extractor normalises to that spelling.
    if (op === '.startsWith(') {
      const named = path.replace(/\/$/, '') === '/api/brains'
        ? 'GET /api/brains/:slug'
        : 'PATCH /api/creators/:channelId';
      found.add(named);
      continue;
    }
    // The two literal collection routes carry no parameter.
    found.add(`${method} ${path}`);
  }

  assert.ok(found.size >= S0_ALLOWLIST.length,
    `extracted ${found.size} routes from routes.mjs + server.mjs but the allowlist declares `
    + `${S0_ALLOWLIST.length} — the extractor is stale and is no longer proving anything`);

  const declared = new Set(S0_ALLOWLIST);
  const undeclared = [...found].filter((r) => !declared.has(r)).sort();
  const missing = [...declared].filter((r) => !found.has(r)).sort();

  assert.deepEqual(undeclared, [],
    `the bridge dispatches routes that are NOT in the S0 allowlist: ${undeclared.join(', ')}`
    + ' — either remove them or add them here deliberately');
  assert.deepEqual(missing, [],
    `the allowlist promises routes the bridge does not dispatch: ${missing.join(', ')}`
    + ' — the contract and the code have diverged');
});

test('HY4-H6: routes the plan deferred are really absent from the bridge', async () => {
  const r = fixtureRoot('hy4-deferred');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    for (const [method, path] of [
      // `POST /api/run/daily` was on this list from when it was deferred out of
      // S0, exactly as `repair` was. S4 has now landed it, so it is asserted
      // PRESENT below instead. It is NOT deleted from the suite: a route that
      // quietly stops existing is as much a contract breach as one that quietly
      // appears, and only an assertion can tell the two apart.
      ['POST', '/api/backup'],
      // `GET /api/run/daily` stays here, and it is a DIFFERENT fact from the line
      // above it: S4 added the POST. A GET on that path dispatches nothing, so it
      // must still 404 — this is what stops "the route exists" from decaying into
      // "any method on that path is fine".
      ['GET', '/api/run/daily'],
      ['POST', '/api/restore'],
      ['POST', '/api/rollback'],
      ['POST', '/api/authorize'],
    ]) {
      // `rawRequest`, not `fetch` — see the T-B8 note in bridge.boundary.test.mjs:
      // the A1-09 write gate answers 403 before dispatch, which would mask a 404.
      const res = await rawRequest(b.url, path, { method });
      assert.equal(res.status, 404, `${method} ${path} was deferred out of S0 and must not exist`);
    }

    // ...and the TWO that stopped being deferred are really there. Asserting only
    // the absences would let either delivered route be deleted in silence.
    const repair = await rawRequest(b.url, '/api/repair', { method: 'POST' });
    assert.notEqual(repair.status, 404,
      "POST /api/repair is S3's delivered route — the deferral ended when the slice landed");
    // It may still refuse for a FIXTURE reason (an empty store, a held lock), and
    // that is the point: a refusal that is not a 404 proves the route exists and
    // reached its handler. Pinning the exact code here would couple this
    // structure test to the repair implementation, which T-B10 already owns.
    assert.ok([200, 409, 422, 503].includes(repair.status),
      `repair must be dispatchable, got ${repair.status} — a 500 here means it exists but throws`);

    // S4's route. It SPAWNS, so this case must NOT send a valid `perHour`: that
    // would start a real detached daily run against the fixture store and this
    // structure test would have a side effect it never cleans up. An INVALID
    // `perHour` is the right probe — it reaches the handler, exercises the
    // validation boundary, and returns before any spawn.
    const daily = await rawRequest(b.url, '/api/run/daily', {
      method: 'POST', body: JSON.stringify({ perHour: 0 }),
    });
    assert.notEqual(daily.status, 404,
      "POST /api/run/daily is S4's delivered route — the deferral ended when the slice landed");
    assert.equal(daily.status, 400,
      'an invalid perHour must be refused with VALIDATION before anything is spawned');
    // The control that this 400 is about `perHour` and not about the route being
    // unconditionally broken: a DIFFERENTLY invalid value must also be 400, and a
    // non-numeric one must not 500. Both are refusals that cost no process.
    const alsoBad = await rawRequest(b.url, '/api/run/daily', {
      method: 'POST', body: JSON.stringify({ perHour: 'lots' }),
    });
    assert.equal(alsoBad.status, 400, 'a non-numeric perHour is a validation refusal, not a 500');
    // And validation happens BEFORE the gate, so a bad request cannot be masked by
    // a 409 from a held lock: the refusal must be the input's, deterministically.
    // `rawRequest.body` is the PARSED json (the helper parses it), not a string.
    assert.equal(daily.body && daily.body.error && daily.body.error.code, 'VALIDATION',
      'the refusal must carry the VALIDATION code, so a client can tell it from RUN_LOCKED');

    // The parametric write route must not accept a runaway id either — a
    // PATCH to a nonexistent channel is a validation refusal, never a write.
    const bogus = await rawRequest(b.url, '/api/creators/__proto__', {
      method: 'PATCH',
      body: JSON.stringify({ enabled: true }),
    });
    assert.ok([400, 422].includes(bogus.status),
      `a bogus channel id must be refused, got ${bogus.status}`);
  } finally { await b.shutdown(); }
});

