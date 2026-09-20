/*
 * R4-04 — THE DEFERRED CONTRACT IS COMPILER-ENFORCED, NOT NAME-ENFORCED
 * (Astra round 4, 2026-09-20).
 *
 * WHY THIS FILE EXISTS. `T-B27m` compares the FIELD NAMES a declaration lists
 * against the names `05-contracts.md` §2b lists. Names are not a contract. The
 * round-4 probe retyped `runId` from `string | null` to `number` in `types.ts`
 * and the whole suite stayed green, because `runId` was still spelled `runId`.
 * The suite could see a RENAMED field and was blind to a RETYPED one.
 *
 * WHAT NOW ENFORCES IT, AND WHICH LINK EACH PIECE COVERS:
 *
 *   types.ts drift        → the compiler, via `contract.assert.ts` (TS2344)
 *   an adapter widening   → the compiler, via the same file. `implements` alone
 *                           does NOT catch this: a wider return type is
 *                           assignable, so it satisfies the interface while
 *                           serving a shape nobody declared. `T-B27m2d` proves
 *                           that distinction rather than asserting it.
 *   the DOCUMENT drifting → `T-B27m2b` here, which compares §2b's declared types
 *                           against the literals the compiler is checking.
 *
 * WHY THE DOCUMENT LINK IS TEXT AND NOT A COMPILER CHECK. It cannot be: the
 * document is prose. And a text comparison of two type expressions compares
 * SPELLING, which is why it is deliberately the *smallest* part of the chain —
 * it only has to catch the document drifting away from a literal, not decide
 * whether any TypeScript is right. `contract-types.mjs` says the same thing.
 *
 * @module creator-brains-console/test/bridge.contracttypes.r4
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import {
  CONTRACT_ASSERT_TS, assertSameShape, contractAssertions, contractRowTypedFields,
} from './contract-types.mjs';

const WEB_DIR = fileURLToPath(new URL('../web', import.meta.url));
const TSC = join(WEB_DIR, 'node_modules', 'typescript', 'bin', 'tsc');
const assertSource = readFileSync(CONTRACT_ASSERT_TS, 'utf8');

/** The route each deferred method's row is written under in §2b. */
const ROUTE = { startDailyRun: 'POST /api/run/daily', repair: 'POST /api/repair' };

/** Every method §2b defers, and every source that must agree about its shape. */
const EXPECTED_SUBJECTS = [
  ['ConsoleDataAdapter', 'startDailyRun'],
  ['LocalEngineAdapter', 'startDailyRun'],
  ['MockAdapter', 'startDailyRun'],
  ['ConsoleDataAdapter', 'repair'],
  ['LocalEngineAdapter', 'repair'],
  ['MockAdapter', 'repair'],
];

/* ── the checker, and the guard on the checker ───────────────────────────── */

test('T-B27m2a: the compiler assertion file pins every deferred method on every source', () => {
  const found = contractAssertions(assertSource);
  // THE COUNT IS THE GUARD. `contractAssertions` reads structure with a regex, so
  // a formatting change could make it match nothing — and every comparison built
  // on it would then pass while comparing nothing. This is the assertion that
  // turns "the regex matched nothing" into a failure instead of a green suite.
  assert.deepEqual(
    found.map((a) => [a.subject, a.method]),
    EXPECTED_SUBJECTS,
    'every deferred method must be pinned on the interface AND on both implementations',
  );
  for (const a of found) {
    assert.notEqual(a.fields.length, 0, `${a.name} pins no fields, so it can never fail`);
  }
});

test('T-B27m2c: the assertion reader can FAIL — a retyped literal is not invisible to it', () => {
  // THE R2-01 LESSON, APPLIED TO THIS READER. Two earlier readers in this suite
  // were wrong and their assertions passed while comparing nothing. So this one is
  // shown to give a DIFFERENT answer for a different literal, and to read nothing
  // at all from something that is not an assertion.
  const good = contractAssertions(assertSource);
  const retyped = assertSource.replace('runId: string | null }', 'runId: number }');
  assert.notEqual(retyped, assertSource, 'the fixture must actually change the text');

  const after = contractAssertions(retyped);
  assert.notDeepEqual(
    after, good,
    'a retyped literal must produce a different reading, or the comparison is vacuous',
  );
  assert.notDeepEqual(
    after.find((a) => a.method === 'startDailyRun').fields,
    good.find((a) => a.method === 'startDailyRun').fields,
  );

  // A source with no assertions reads as EMPTY rather than as "everything agrees"
  // — which is what makes the count guard above the thing that catches it.
  assert.deepEqual(contractAssertions('// nothing to see here'), []);
});

/* ── the document link ───────────────────────────────────────────────────── */

test('T-B27m2b: 05-contracts.md §2b declares the same shape, INCLUDING types', () => {
  const pinned = contractAssertions(assertSource);
  // Derived from the document, never retyped: a hand-written second copy of the
  // contract would be a fifth statement of it, and would drift like the other four.
  const doc = new Map(
    Object.entries(ROUTE).map(([method, route]) => [method, contractRowTypedFields(route)]),
  );

  for (const a of pinned) {
    assertSameShape(
      a.fields, doc.get(a.method),
      `${a.name}: the compiler is pinned to a shape §2b does not declare`,
    );
  }

  // And the types really are declared, so the comparison above is not two empty
  // lists of names agreeing. Without this the whole test passes on a row that
  // declares `{requestId, runId}` with no types at all — which is exactly the
  // under-specification R4-04 is about.
  for (const [method, route] of Object.entries(ROUTE)) {
    for (const f of doc.get(method)) {
      assert.match(
        f.type, /\S/,
        `${route} declares no type for '${f.name}', so a retype there would be invisible`,
      );
    }
  }
  assert.deepEqual(
    doc.get('startDailyRun').map((f) => f.type).sort(),
    ['string', 'string | null'],
    'the run row must declare both types, not just the field names',
  );
  assert.deepEqual(
    doc.get('repair').map((f) => f.type),
    ['number', 'number', 'number'],
    'the repair row must declare its three counts as numbers',
  );
});

/* ── the compiler link, proven rather than asserted ──────────────────────── */

/**
 * The real assertion file, with its three imports replaced by local stubs.
 *
 * THE FILE UNDER TEST IS THE REAL ONE — only its imports are substituted, so the
 * `Exact<>`/`Assert<>` machinery and every literal are the shipped article. A
 * probe that retyped its own copy of the machinery would prove nothing about the
 * machinery that ships.
 */
function probeSource({ runId = 'string | null', localRepair = 'number; built: number; emptied: number' } = {}) {
  const stubs = [
    'interface ConsoleDataAdapter {',
    `  startDailyRun(perHour: number): Promise<{ requestId: string; runId: ${runId} }>;`,
    '  repair(): Promise<{ repaired: number; built: number; emptied: number }>;',
    '}',
    'declare class LocalEngineAdapter {',
    `  startDailyRun(perHour: number): Promise<{ requestId: string; runId: ${runId} }>;`,
    `  repair(): Promise<{ repaired: ${localRepair} }>;`,
    '}',
    'declare class MockAdapter {',
    `  startDailyRun(perHour: number): Promise<{ requestId: string; runId: ${runId} }>;`,
    '  repair(): Promise<{ repaired: number; built: number; emptied: number }>;',
    '}',
  ].join('\n');

  const body = assertSource
    .split('\n')
    .filter((line) => !line.startsWith('import type '))
    .join('\n');
  return `${stubs}\n${body}\n`;
}

/** Compile one file with the shipped TypeScript, and return `{ok, output}`. */
function compile(file) {
  try {
    const output = execFileSync(process.execPath, [
      TSC, '--noEmit', '--strict', '--skipLibCheck',
      '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', file,
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, output };
  } catch (err) {
    return { ok: false, output: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

test('T-B27m2d: a WIDER adapter return fails the compile — the assertion is not decoration', () => {
  const dir = tempRoot('r404-tsc');
  const good = join(dir, 'good.ts');
  const widened = join(dir, 'widened.ts');
  writeFileSync(good, probeSource(), 'utf8');
  // The same file with ONE change: `LocalEngineAdapter.repair` resolves to an
  // extra property. This is the case `implements` cannot see — a wider return
  // type IS assignable to the interface — so if `Exact<>` were doing nothing, the
  // adapter would be free to serve a shape no document declares.
  writeFileSync(widened, probeSource({ localRepair: 'number; built: number; emptied: number; extra: string' }), 'utf8');

  const clean = compile(good);
  assert.equal(clean.ok, true, `the pinned shapes must compile:\n${clean.output}`);

  const drift = compile(widened);
  assert.equal(drift.ok, false, 'a widened adapter return must NOT compile');
  assert.match(drift.output, /TS2344/, 'the failure must be the assertion, not something incidental');
  assert.match(
    drift.output, /does not satisfy the constraint 'true'/,
    'the diagnostic must be the Assert<> constraint — this is the exact message the round-4 probe produced',
  );
});
