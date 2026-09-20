/*
 * T-B27 — THE WEB CONTRACT AND THE BRIDGE MUST AGREE (R2-01, Astra round 2).
 *
 * WHY THIS FILE EXISTS. `web/src/adapters/types.ts` says, in its own header, that
 * it is "transcribed verbatim from the contract; do not improve shapes here
 * without amending 05-contracts.md first". R2-01 found three declarations that had
 * drifted anyway: `ytdlp` omitted the health provenance, `BrainDoc` omitted
 * `generation`, and `CanaryReading` could not express the `unknown` source. None
 * of that was visible to any test, because the web suite tests the CLIENT against
 * its OWN fixtures — so a wrong declaration and a matching wrong fixture agree
 * perfectly and both pass. The bridge was never asked.
 *
 * A FOURTH DRIFT WAS FOUND WHILE FIXING IT, and it is the sharpest of the four:
 * A1-04 amended `05-contracts.md` to rename `BrainDoc.key`, while the bridge went
 * on serving `slug` and the types kept declaring `slug`. For a full round the
 * document, the declaration and the response disagreed in three directions, and
 * nothing compared them. That is why this file checks THREE artifacts, not two.
 *
 * THE HALF-FIX THIS AVOIDS. The obvious repair is a hand-written key list here,
 * checked against the payload. That is a fourth statement of the contract, and the
 * repo already treats a duplicated shape as a hazard (status.mjs header, blueprint
 * H10) — it would drift too, one round later, with nobody to blame.
 *
 * So ONE SIDE IS DERIVED, NOT RETYPED. `contract-parse.mjs` reads both declarations
 * as TEXT and extracts their field names; the other side is the live response. The
 * two things being compared are therefore the real declaration and the real
 * payload.
 *
 * @module creator-brains-console/test/bridge.contractsync
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  TYPES_TS, assertServed, contractsTsBlock, interfaceFields,
} from './contract-parse.mjs';
import { BRAIN_NS, getJson, seedPublishedBrain, withFixture } from './fixtures.mjs';

const names = (src, n) => interfaceFields(src, n).map((f) => f.name).sort();

/* ── the extractor itself must be trustworthy before anything rests on it ─── */

test('T-B27a: the types.ts extractor reads real interfaces, not an empty set', () => {
  const src = readFileSync(TYPES_TS, 'utf8');

  const status = interfaceFields(src, 'StatusInstrument');
  assert.ok(status.length >= 12, `StatusInstrument extracted only ${status.length} fields`);

  // Spot-check the shapes R2-01 named, so a parser that silently returns the
  // wrong depth is caught here rather than by a passing comparison later.
  assert.ok(names(src, 'BrainDoc').includes('generation'), 'BrainDoc must declare generation (R2-01)');
  assert.ok(names(src, 'CanaryReading').includes('source'), 'CanaryReading must declare source (R2-01)');
  assert.deepEqual(
    interfaceFields(src, 'CanaryReading').filter((f) => f.optional), [],
    'CanaryReading must declare no optional field — the bridge always sends all eight (R2-01)',
  );
  // Nesting must not leak: `creators` is one field, not four.
  assert.ok(names(src, 'StatusInstrument').includes('creators'));
  assert.ok(!names(src, 'StatusInstrument').includes('total'), 'nested keys must not surface as top-level');
});

test('T-B27d: the extractor is depth-correct and field-granular', () => {
  // ONE FIELD PER LINE (the types.ts style).
  const onePerLine = [
    'export interface Sample {',
    '  top: number;',
    '  nested: {',
    '    inner: string;',
    '  };',
    '  deep: Array<{ a: number }>;',
    '  maybe?: string;',
    '}',
  ].join('\n');
  assert.deepEqual(interfaceFields(onePerLine, 'Sample'), [
    { name: 'top', optional: false },
    { name: 'nested', optional: false },
    { name: 'deep', optional: false },
    { name: 'maybe', optional: true },
  ]);

  // SEVERAL FIELDS PER LINE (the 05-contracts.md style), including a field on the
  // same line as the opening brace, and an inline comment after the brace.
  const packed = [
    'export interface Packed {   // a trailing comment must not eat the next field',
    '  a: number; b: string | null;',
    '  c: { inner: number }; d?: boolean; e: string; }',
  ].join('\n');
  assert.deepEqual(interfaceFields(packed, 'Packed'), [
    { name: 'a', optional: false },
    { name: 'b', optional: false },
    { name: 'c', optional: false },
    { name: 'd', optional: true },
    { name: 'e', optional: false },
  ]);
});

/* ── every consumed route is checked against the declaration ─────────────── */

test('T-B27b: the live payloads serve every field types.ts declares', async () => {
  await withFixture('t-b27b', async ({ r, base }) => {
    const src = readFileSync(TYPES_TS, 'utf8');
    const { ns } = seedPublishedBrain(r, BRAIN_NS);

    const status = await getJson(base, '/api/status');
    assert.equal(status.status, 200);
    assertServed('/api/status', interfaceFields(src, 'StatusInstrument'), status.body);
    // The health sub-object is the R2-01 defect site, so it is checked at depth
    // rather than trusted because its parent passed.
    assertServed('/api/status', interfaceFields(src, 'HealthReading'), status.body.ytdlp, '.ytdlp');

    const canary = await getJson(base, '/api/canary');
    assert.equal(canary.status, 200);
    assertServed('/api/canary', interfaceFields(src, 'CanaryReading'), canary.body);

    const run = await getJson(base, '/api/run');
    assert.equal(run.status, 200);
    assertServed('/api/run', interfaceFields(src, 'RunState'), run.body);

    const brain = await getJson(base, `/api/brains/${ns}`);
    assert.equal(brain.status, 200);
    assertServed('/api/brains/:slug', interfaceFields(src, 'BrainDoc'), brain.body);

    const creators = await getJson(base, '/api/creators');
    assert.equal(creators.status, 200);
    assert.ok(Array.isArray(creators.body) && creators.body.length > 0);
    for (const row of creators.body) {
      assertServed('/api/creators', interfaceFields(src, 'CreatorRow'), row);
    }

    const query = await getJson(base, '/api/query?q=fixture');
    assert.equal(query.status, 200);
    assertServed('/api/query', interfaceFields(src, 'QueryResult'), query.body);
    for (const hit of query.body.hits) {
      assertServed('/api/query', interfaceFields(src, 'QueryHit'), hit, '.hits[]');
    }
  });
});

test('T-B27c: the check is falsifiable — a declared field the bridge omits fails it', () => {
  // Guards against the whole file being vacuous. If `assertServed` tolerated a
  // missing key, every assertion above would pass for a bridge that serves
  // nothing — which is exactly what happened while this reader was being written,
  // and T-B27a is what caught it.
  assert.throws(
    () => assertServed('/api/x', [{ name: 'present' }, { name: 'absent' }], { present: 1 }),
    /missing: absent/,
  );
  // ...and an OPTIONAL declared field is not demanded, or the gate would refuse a
  // healthy bridge the first time the bridge legitimately omitted one.
  assert.doesNotThrow(() => assertServed('/api/x', [{ name: 'maybe', optional: true }], {}));
});

/* ── and the CONTRACT DOCUMENT must agree with the bridge too ─────────────── */

test('T-B27e: 05-contracts.md declares the fields the bridge actually serves', async () => {
  await withFixture('t-b27e', async ({ r, base }) => {
    const doc = contractsTsBlock();
    const { ns } = seedPublishedBrain(r, BRAIN_NS);

    const status = await getJson(base, '/api/status');
    const canary = await getJson(base, '/api/canary');
    const run = await getJson(base, '/api/run');
    const brain = await getJson(base, `/api/brains/${ns}`);
    const creators = await getJson(base, '/api/creators');
    assert.equal(status.status + canary.status + run.status + brain.status + creators.status, 1000);

    assertServed('05-contracts.md: /api/status', interfaceFields(doc, 'StatusInstrument'), status.body);
    assertServed('05-contracts.md: /api/status', interfaceFields(doc, 'CanaryReading'), status.body.ytdlp, '.ytdlp');
    assertServed('05-contracts.md: /api/canary', interfaceFields(doc, 'CanaryReading'), canary.body);
    assertServed('05-contracts.md: /api/run', interfaceFields(doc, 'RunState'), run.body);
    assertServed('05-contracts.md: /api/brains/:slug', interfaceFields(doc, 'BrainDoc'), brain.body);
    for (const row of creators.body) {
      assertServed('05-contracts.md: /api/creators', interfaceFields(doc, 'CreatorRow'), row);
    }

    // AND THE TWO DECLARATIONS MUST AGREE WITH EACH OTHER, field for field. This
    // is the assertion that would have caught A1-04's doc-only rename: the
    // contract said `key`, the types said `slug`, and each was "valid" alone.
    const types = readFileSync(TYPES_TS, 'utf8');
    for (const n of ['StatusInstrument', 'CanaryReading', 'RunState', 'BrainDoc', 'CreatorRow', 'QueryHit']) {
      assert.deepEqual(
        names(doc, n), names(types, n),
        `${n} is declared differently in 05-contracts.md and web/src/adapters/types.ts`,
      );
    }
  });
});

test('T-B27f: the two declarations differ on a renamed field, and the check catches it', () => {
  // Falsifiability for T-B27e's cross-artifact half. Without this, a `key`/`slug`
  // divergence could sit in the document indefinitely while every assertion above
  // passed, because each artifact was compared only to the bridge.
  assert.throws(
    () => assert.deepEqual(
      names('export interface X { key: string; b: number; }', 'X'),
      names('export interface X { slug: string; b: number; }', 'X'),
    ),
    /deep-equal|deepStrictEqual/,
  );
});
