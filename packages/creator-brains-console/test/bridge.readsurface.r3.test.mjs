/*
 * R3-01 and R3-02 — the read surface, round 3 (Astra, 2026-09-20).
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
 * @module creator-brains-console/test/bridge.readsurface.r3
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BRAIN_NS, getJson, getRaw, seedPublishedBrain, withFixture } from './fixtures.mjs';
import { junction, outsideGeneration, repointOutside } from './store-attacks.mjs';

/**
 * A namespace directory the ENGINE will traverse and the CONSOLE cannot name.
 *
 * The engine reads `brains/<entry>/current.json` for every entry, so a directory
 * with a pointer naming a generation is traversed whatever it is called. The
 * console's alphabet is narrower, which is exactly the mismatch under test.
 */
function unnameableNamespace(r, name, label) {
  mkdirSync(join(r, 'brains', name), { recursive: true });
  const traversal = repointOutside(r, name, label);
  assert.ok(traversal.includes('..'), 'precondition: the pointer names a path outside the store');
  return traversal;
}

/** The outside content must not reach the caller, by any route. */
function assertNoLeak(text, what) {
  assert.ok(!text.includes('leaked-claim-1'), `${what} must not serve the outside claim`);
  assert.ok(!text.includes('OUTSIDE'), `${what} must not serve outside documents`);
}

/* ── R3-01 · the enumeration must cover the engine's set, not the console's ── */

test('R3-01a: a namespace the console cannot NAME but the engine traverses is refused', async () => {
  await withFixture('r3-01a', async ({ r, base }) => {
    // A dot is outside `NAMESPACE`. The engine does not care — it filters on
    // nothing — so this pointer is read and its generation is joined.
    unnameableNamespace(r, 'bad.name', 'r3-01a');

    const search = await getRaw(base, '/api/query?q=leaked');
    assert.equal(search.status, 409, 'an unnameable ENUMERATED namespace is store damage, never a skip');
    assertNoLeak(search.text, 'the query route');

    // The drawer cannot name it either, so it must not serve it.
    const drawer = await getRaw(base, '/api/brains/bad.name');
    assertNoLeak(drawer.text, 'the drawer');
  });
});

test('R3-01b: a namespace longer than the engine can produce is refused, not skipped', async () => {
  await withFixture('r3-01b', async ({ r, base }) => {
    // `slugify` yields at most 60 characters and `NAMESPACE` admits 64, so a
    // 65-character directory is not something the engine writes. It is still an
    // entry the engine will READ, which is what makes it damage rather than noise.
    const long = 'a'.repeat(65);
    unnameableNamespace(r, long, 'r3-01b');

    const search = await getRaw(base, '/api/query?q=leaked');
    assert.equal(search.status, 409);
    assertNoLeak(search.text, 'the query route');
  });
});

test('R3-01c: an entry the ENGINE also drops is NOT damage (the over-refusal control)', async () => {
  await withFixture('r3-01c', async ({ r, base }) => {
    seedPublishedBrain(r, BRAIN_NS);
    // Three shapes the engine drops, and therefore this walk must drop too:
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

test('R3-02a: status reports an UNKNOWN count, not zero, when a pointer escapes', async () => {
  await withFixture('r3-02a', async ({ r, base }) => {
    unnameableNamespace(r, 'bad.name', 'r3-02a');

    const res = await getJson(base, '/api/status');
    assert.equal(res.status, 200, 'status is a composite instrument — damage is a FIELD here');
    assert.equal(res.body.publishedBrains, null, 'a count that cannot be taken is null, never 0');
    assert.equal(res.body.publishedBrainsDamaged.file, 'current.json');
    assert.match(res.body.publishedBrainsDamaged.detail, /cannot name/);
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
