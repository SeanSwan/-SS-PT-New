#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/bridge.hy4.structure.test.mjs
 * PURPOSE: Regression tests for the two STRUCTURAL findings from the HY4
 *          independent hostile review — the route allowlist (H6) and the
 *          300-line rule (H7).
 * PART OF: Creator Brains Console (blueprint 06-test-plan.md)
 * SLICE: S0
 * ============================================================================
 *
 * WHY THESE TWO LIVE TOGETHER, APART FROM THE SURFACE TESTS.
 *
 * H6 and H7 are both findings about the SHAPE OF THE CODEBASE rather than about
 * runtime behaviour, and both are the kind that no behavioural test can ever
 * catch:
 *
 *   H6  The plan and the contract declared routes S0 does not implement
 *       (`POST /api/run/daily`, `POST /api/repair`, `POST /api/backup`). The
 *       code was fine; the DOCUMENTS lied. A behavioural suite passes happily
 *       while the contract describes a surface that does not exist — and an
 *       absent route is invisible to review, because there is nothing to look at.
 *       FIXED by amending the plan and adding a POSITIVE allowlist below: the
 *       test reads the real dispatch table out of `server.mjs` and compares it
 *       to a frozen list, so adding a route requires a deliberate, reviewable
 *       edit in two places and forgetting one is a red test.
 *
 *   H7  Three files exceeded the repo's hard 300-line cap (CLAUDE.md rule 4):
 *       `server.mjs` 355, `api.mjs` 379, the test monolith 419. The cap is not
 *       cosmetic — the whole reason it exists is that a reviewer should be able
 *       to hold one concern in view at once, and the 379-line `api.mjs` had
 *       merged the TRUST BOUNDARY with the TRANSPORT CONTRACT.
 *       FIXED by splitting into `lib/*`. This file is one of the results, so it
 *       is also a live example of the rule being followed.
 *
 * Had this file's H7 test existed while H7 was being fixed, it would have been
 * the thing that caught the three over-length files rather than a human reading
 * `wc -l`. That is the point.
 *
 * @module creator-brains-console/test/bridge.hy4.structure
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync, readFileSync } from 'node:fs';
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
]);

test('HY4-H6: the declared S0 allowlist is exactly nine statements', () => {
  assert.equal(S0_ALLOWLIST.length, 9, 'seven reads and two writes');
  assert.ok(!S0_ALLOWLIST.some((r) => /run\/daily/.test(r)),
    'POST /api/run/daily is NOT in S0 — the plan was amended to defer it');
  assert.ok(!S0_ALLOWLIST.some((r) => /repair|backup|restore|rollback|authorize/i.test(r)),
    'no destructive or credential route may enter the allowlist without a tier review');
  // A regression guard on the guard: if someone "fixes" a failing test by
  // appending the route they just added, this catches the obvious version.
  assert.equal(new Set(S0_ALLOWLIST).size, S0_ALLOWLIST.length, 'no duplicate entries');
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
      ['POST', '/api/run/daily'],
      ['POST', '/api/repair'],
      ['POST', '/api/backup'],
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
    // The parametric write route must not accept a runaway id either — a
    // PATCH to a nonexistent channel is a validation refusal, never a write.
    const bogus = await rawRequest(b.url, '/api/creators/__proto__', {
      method: 'PATCH',
      body: JSON.stringify({ enabled: true }),
    });
    assert.ok([400, 422].includes(bogus.status),
      `a bogus channel id must be refused, got ${bogus.status}`);
  } finally { b.shutdown(); }
});

/* ── H7 · the file-size rule ─────────────────────────────────────────────── */

/**
 * Byte-for-byte the same `lineCount` the repo's own consistency check uses.
 *
 * WHY THIS IS MATCHED RATHER THAN IMPROVISED. The obvious
 * `text.split('\n').length` is WRONG by one for every file that ends in a
 * newline — which is every file in this repo — because `split` yields a trailing
 * empty element for the text after the final `\n`. The first version of this
 * test used that form and reported a 328-line file as a 329-line rule-4
 * violation: it invented a defect that did not exist while sitting one newline
 * away from missing a real one. `consistency-check.mjs` had already solved this;
 * the honest move was to match its definition of "a line" rather than to write a
 * second, subtly different one. If that definition ever changes, rule 4 should
 * change for the whole repo at once — not for this suite privately.
 */
function lineCount(text) {
  const n = text.split('\n').length;
  return text.endsWith('\n') ? n - 1 : n;
}

/** CLAUDE.md rule 4 — hard cap, in one place. */
const RULE_4_CAP = 300;

/*
 * Directories that are not this repo's source and must never be measured:
 * `node_modules` is third-party code (its file lengths are not our rule 4
 * concern), `dist` is build output.
 *
 * S1 added `console/web/`, which put a `node_modules` tree under CONSOLE_ROOT
 * for the first time. Before this skip, the walk measured ~184 installed
 * packages instead of console sources — the test failed on a dependency's line
 * count, which is not a rule 4 violation by any reading.
 */
const NOT_OUR_SOURCE = new Set(['node_modules', 'dist', '.git']);

/*
 * S1-H7 — extensions rule 4 applies to.
 *
 * This list used to be `.mjs` alone (the `entry.endsWith('.mjs')` test below),
 * which meant that when S1 added `console/web/`, the whole TypeScript tree went
 * UNMEASURED: ~16 files including a 267-line component. The cap test stayed
 * green regardless of how large a UI file grew. Rule 4 is a repo-wide cap
 * (CLAUDE.md), not a Node-only one, so the walk has to see the UI too.
 */
const SOURCE_EXT = ['.mjs', '.ts', '.tsx', '.css'];

/** Recursively collect the console's own sources, skipping non-source dirs. */
function walkConsoleSources(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (NOT_OUR_SOURCE.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { walkConsoleSources(full, acc); continue; }
    if (SOURCE_EXT.some((ext) => entry.endsWith(ext))) acc.push(full);
  }
  return acc;
}

test('HY4-H7: every console source file honours the 300-line cap (rule 4)', () => {
  const files = walkConsoleSources(CONSOLE_ROOT);

  assert.ok(files.length >= 12,
    `the walk found only ${files.length} console sources — it is not reaching the whole tree`);

  const over = [];
  for (const f of files) {
    const lines = lineCount(readFileSync(f, 'utf8'));
    if (lines > RULE_4_CAP) over.push(`${f.replace(CONSOLE_ROOT, '.')} = ${lines}`);
  }
  assert.deepEqual(over, [],
    `rule 4 violations (cap ${RULE_4_CAP}): ${over.join(', ')}`);
});

test('HY4-H7: the walk itself is not fooled by a nested directory', () => {
  // A cap test that silently stops descending would pass forever. This asserts
  // the walk reaches a file that is two levels deep, which is enough to prove
  // the recursion works.
  const files = walkConsoleSources(CONSOLE_ROOT);
  const nested = files.filter((f) => f.includes(`${join('lib', '')}`) || /[\\/]lib[\\/]/.test(f));
  assert.ok(nested.length >= 5,
    `the walk reached ${nested.length} files under lib/ — it must descend two levels`);
});

test('HY4-H7: the walk reaches the web slice, not only the .mjs bridge (S1-H7)', () => {
  // The cap test is only as wide as this walk. When S1 added console/web/, the
  // walk still collected `.mjs` alone, so every UI file went unmeasured and the
  // cap test could not fail no matter how large a component grew. This asserts
  // the UI is inside the measurement, so that hole cannot silently reopen.
  const files = walkConsoleSources(CONSOLE_ROOT);
  const web = files.filter((f) => /[\\/]web[\\/]src[\\/]/.test(f));
  assert.ok(web.length >= 10,
    `the walk reached only ${web.length} files under web/src — the cap does not cover the UI`);

  const tsx = web.filter((f) => f.endsWith('.tsx'));
  assert.ok(tsx.length >= 2,
    `the walk reached ${tsx.length} .tsx files — components are not being measured`);
});
