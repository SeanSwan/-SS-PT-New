/*
 * R3-01 and R3-02 — the read surface, round 3 (Astra, 2026-09-20).
 * AMENDED BY R4-01 (Astra round 4): two of these tests were passing for a reason
 * other than the one they named.
 *
 * WHY THESE ARE NOT IN `bridge.readsurface.test.mjs`. That file holds the R2-02
 * suite and sits just under the 300-line cap (rule 4). These are the two findings
 * round 3 raised AGAINST that suite, so they belong beside it rather than inside
 * it — and the setup they need now lives in `store-attacks.mjs`, a harness module
 * rather than a test file (S1-H13: a harness exported from a `.test.mjs`
 * re-registers that file's tests in every importer).
 *
 * THE DEFECT CLASS. R2-02 built a preflight that proved every path the engine
 * would join resolves inside the store. Round 3 measured the preflight and the
 * engine enumerating DIFFERENT SETS: the engine's `listPublished` filters on
 * nothing, while the walk delegated to a reader that returns `null` for a name
 * outside the console's alphabet. An entry the engine traversed was therefore
 * never proven, and the query served it. A preflight that covers most of what the
 * engine reads is a preflight that proves nothing about the rest.
 *
 * WHAT ROUND 4 CHANGED HERE, AND WHY IT MATTERS. R3-01a pointed its unnameable
 * entry at a generation OUTSIDE the store, and R3-02a did the same. Once the
 * resolver validates the generation (R4-01), both refusals arrive from the
 * GENERATION rule — so neither test was exercising the ALPHABET rule it was named
 * for. A test whose assertion holds under a rule other than the one it claims is
 * a test that will keep passing after its own mechanism is deleted. Each now
 * isolates ONE mechanism: a healthy generation for the alphabet cases, and a
 * valid namespace for the generation case.
 *
 * @module creator-brains-console/test/bridge.readsurface.r3
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BRAIN_NS, getJson, getRaw, seedPublishedBrain, withFixture } from './fixtures.mjs';
import { junction, outsideGeneration, repointOutside } from './store-attacks.mjs';

/* ── R3-01 · the enumeration must cover the engine's set, not the console's ── */

test('R3-01a: a namespace the console cannot NAME but the engine traverses is refused', async () => {
  await withFixture('r3-01a', async ({ r, base }) => {
    // A dot is outside `NAMESPACE`. The engine does not care — it filters on
    // nothing — so this pointer is read and its generation is joined.
    //
    // THE GENERATION IS HEALTHY AND CONTAINED ON PURPOSE (R4-01). Pointing this
    // entry at an OUTSIDE generation made the refusal observable for the
    // generation rule instead of the alphabet rule, so the test proved nothing
    // about the alphabet. With a good generation the ONLY defect left is the name.
    seedPublishedBrain(r, BRAIN_NS); // a healthy brain, which must ALSO be refused
    seedPublishedBrain(r, 'bad.name');

    const search = await getRaw(base, '/api/query?q=fixture');
    assert.equal(search.status, 409, 'an unnameable ENUMERATED namespace is store damage, never a skip');
    assert.match(
      search.text, /cannot name/,
      'the refusal must come from the ALPHABET rule — otherwise this test covers the generation rule twice',
    );
    // And the whole request is refused rather than answered around the bad entry:
    // a skipped creator is indistinguishable from one that never claimed anything.
    assert.ok(!search.text.includes('fixture-claim-1'), 'no brain is served while the store is unvouched for');
  });
});

test('R3-01b: a namespace longer than the engine can produce is refused, not skipped', async () => {
  await withFixture('r3-01b', async ({ r, base }) => {
    // `slugify` yields at most 60 characters and `NAMESPACE` admits 64, so a
    // 65-character directory is not something the engine writes. It is still an
    // entry the engine will READ, which is what makes it damage rather than noise.
    seedPublishedBrain(r, 'a'.repeat(65));

    const search = await getRaw(base, '/api/query?q=fixture');
    assert.equal(search.status, 409);
    assert.match(search.text, /cannot name/, 'refused by the alphabet rule, not by the generation rule');
  });
});

test('R3-01c: an entry the ENGINE also drops is NOT damage (the over-refusal control)', async () => {
  await withFixture('r3-01c', async ({ r, base }) => {
    seedPublishedBrain(r, BRAIN_NS);
    // Four shapes the engine drops, and therefore this walk must drop too:
    // `listPublished` keeps only pointers whose `generation` is truthy. Refusing
    // on these would let a stray file kill every query in the store.
    writeFileSync(join(r, 'brains', '.DS_Store'), 'junk', 'utf8');
    mkdirSync(join(r, 'brains', 'not-a-brain'), { recursive: true });
    writeFileSync(join(r, 'brains', 'not-a-brain', 'current.json'), JSON.stringify({ title: 'no generation' }), 'utf8');
    // An UNNAMEABLE entry with no generation is the sharpest case: the same
    // alphabet mismatch as R3-01a, but nothing for the engine to traverse.
    mkdirSync(join(r, 'brains', 'also.bad'), { recursive: true });

    const search = await getJson(base, '/api/query?q=fixture');
    assert.equal(search.status, 200, 'entries the engine drops must not be reported as damage');
    assert.equal(search.body.hits.length, 1, 'and the real brain must still answer');
  });
});

/* ── R3-02 · the status route reads no unchecked pointer ─────────────────── */

test('R3-02a: status reports an UNKNOWN count when the GENERATION escapes', async () => {
  await withFixture('r3-02a', async ({ r, base }) => {
    // A VALID namespace, so the alphabet rule cannot be what refuses this
    // (R4-01). The pointer names a generation outside the store; `resolvePointer`
    // refuses it on the generation rule, which is the mechanism this test names.
    seedPublishedBrain(r, BRAIN_NS);
    repointOutside(r, BRAIN_NS, 'r3-02a');

    const res = await getJson(base, '/api/status');
    assert.equal(res.status, 200, 'status is a composite instrument — damage is a FIELD here');
    assert.equal(res.body.publishedBrains, null, 'a count that cannot be taken is null, never 0');
    assert.equal(res.body.publishedBrainsDamaged.file, 'current.json');
    assert.match(
      res.body.publishedBrainsDamaged.detail, /never writes/,
      'the refusal must name the GENERATION rule — the alphabet is not in play here',
    );
    // The unrelated instruments are the reason this route does not refuse like
    // /api/query: losing them is the cost the operator can least afford.
    assert.ok(res.body.creators, 'the roster is still readable');
    assert.ok(Array.isArray(res.body.backlog.lines), 'the backlog is still readable');
  });
});

test('R3-02b: status counts a healthy store, and reports no damage', async () => {
  await withFixture('r3-02b', async ({ r, base }) => {
    seedPublishedBrain(r, BRAIN_NS);
    seedPublishedBrain(r, 'second-brain');

    const res = await getJson(base, '/api/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.publishedBrains, 2, 'the contained enumerator counts real brains');
    assert.equal(res.body.publishedBrainsDamaged, null, 'and names no damage');
  });
});

test('R3-02c: a JUNCTION namespace makes status report UNKNOWN, for a different reason', async () => {
  await withFixture('r3-02c', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r, BRAIN_NS);
    // Lexically inside, really outside: the REALPATH guard, not the alphabet
    // guard. Two mechanisms, two messages — so these two tests cannot both pass
    // because one guard happens to cover the other's case.
    junction(outsideGeneration('r3-02c'), join(r, 'brains', 'hostile-ns'), join(r, 'brains'));

    const res = await getJson(base, '/api/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.publishedBrains, null);
    assert.match(
      res.body.publishedBrainsDamaged.detail, /resolves outside the brains store/,
      'the refusal must name ESCAPE, not the alphabet — otherwise R3-02a covers it twice',
    );

    // And the real brain is still there: this is a count that could not be TAKEN,
    // not a store with nothing in it.
    const drawer = await getRaw(base, `/api/brains/${ns}`);
    assert.ok(drawer.status === 409 || drawer.status === 200, 'the drawer answers something definite');
  });
});
