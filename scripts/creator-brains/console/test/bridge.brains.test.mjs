/*
 * T-B22 — the LANE C read path, and the LANE B containment boundary
 * (S1 hostile review, round 5 pass 2).
 *
 * WHY THIS FILE EXISTS. `seedStore` creates an EMPTY `brains/` directory, so
 * every `/api/brains/:slug` assertion in the suite hit the 404 branch. The
 * route's **200 path had no coverage at all** — and that is exactly where the
 * defect was:
 *
 *   `brainDoc` joined `brains/<slug>` and read `index.md` / `topics.md` /
 *   `timeline.md` there. The engine publishes into
 *   `brains/<slug>/<generation>/` and swaps `current.json` LAST
 *   (`lib/render.mjs` `publishBrain`). So the route answered **200 with all
 *   three documents empty** for every published brain — correct slug, correct
 *   generation, correct title, no content. Indistinguishable from a brain that
 *   genuinely has no claims, and precisely the "empty document that looks like a
 *   brain with nothing in it" that the handler's own contract forbids.
 *
 * The containment half of this file pins the OTHER half of the same boundary:
 * `:slug` arrives **un-decoded**, and `?creator=` arrives **decoded** by
 * `URLSearchParams` — so the two parameters take opposite paths into the store
 * and each needs its own evidence. Both were checked and hold; the point of the
 * test is that they keep holding.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  BRAIN_NS, CANARY_PHRASE, CH_ONE, VID_1, getJson, getRaw, seedPublishedBrain, withFixture,
} from './fixtures.mjs';

/* ── the 200 path: a published brain must actually be served ─────────────── */

test('T-B22a: GET /api/brains/:slug serves the PUBLISHED generation documents', async () => {
  await withFixture('t-b22a', async ({ r, base }) => {
    const { ns, generation } = seedPublishedBrain(r);

    const { status, body } = await getJson(base, `/api/brains/${ns}`);

    assert.equal(status, 200);
    assert.equal(body.slug, ns);
    assert.equal(body.generation, generation, 'the pointer names the generation');
    assert.equal(body.title, 'Fixture Brain');
    // THE S1-H15 ASSERTION. A 200 whose three documents are all `''` is the bug,
    // and it is invisible to a test that only checks the status.
    assert.ok(body.index.length > 0, 'index.md must be served, not an empty string');
    assert.ok(body.topics.length > 0, 'topics.md must be served, not an empty string');
    assert.ok(body.timeline.length > 0, 'timeline.md must be served, not an empty string');
    assert.match(body.index, /A published claim about the fixture/);
    assert.match(body.timeline, new RegExp(VID_1));
    assert.deepEqual(body.skipped, [], 'nothing is missing, so nothing is reported as skipped');
  });
});

test('T-B22b: a document absent from the generation is REPORTED, not silently empty', async () => {
  await withFixture('t-b22b', async ({ r, base }) => {
    const { ns, genDir } = seedPublishedBrain(r);
    rmSync(join(genDir, 'topics.md'));

    const { status, body } = await getJson(base, `/api/brains/${ns}`);

    assert.equal(status, 200);
    assert.ok(body.index.length > 0, 'the documents that ARE present still serve');
    assert.equal(body.topics, '');
    assert.deepEqual(body.skipped, [
      { file: 'topics.md', reason: 'missing from the published generation' },
    ]);
  });
});

test('T-B22c: a pointer that names no generation says so instead of rendering three blanks', async () => {
  await withFixture('t-b22c', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r);
    writeFileSync(join(r, 'brains', ns, 'current.json'), JSON.stringify({ title: 'Pointerless' }), 'utf8');

    const { status, body } = await getJson(base, `/api/brains/${ns}`);

    assert.equal(status, 200, 'the pointer exists, so the brain exists — it is just incomplete');
    assert.equal(body.generation, null);
    assert.equal(body.index, '');
    // The REASON must distinguish "the pointer names no generation" from "the
    // files are missing from a generation that was named" — asserting only the
    // count of 3 passes under both, so it would not have caught the S1-H15 shape.
    assert.deepEqual(body.skipped, [
      { file: 'index.md', reason: 'the published pointer names no generation' },
      { file: 'topics.md', reason: 'the published pointer names no generation' },
      { file: 'timeline.md', reason: 'the published pointer names no generation' },
    ]);
  });
});

/* ── the containment half: two parameters, two opposite paths ────────────── */

test('T-B22d: LANE B containment — no hostile slug form reaches owner-private text', async () => {
  await withFixture('t-b22d', async ({ r, base }) => {
    seedPublishedBrain(r); // a real brain exists, so the route is genuinely live

    // The `..` forms are normalized away BEFORE the wire by `fetch` (undici runs
    // the URL parser), so they cannot express the attack — the same lesson the
    // request-target tests record. The `%2e%2e%2f` forms survive normalization
    // and reach the handler as literal, un-decoded text, which is what the
    // handler must contain.
    const ENCODED = [
      '/api/brains/%2e%2e%2f%2e%2e%2fregistry.json',
      `/api/brains/..%2F..%2Fdocs%2F${CH_ONE}%2F${VID_1}.json`,
      '/api/brains/..%5C..%5Cregistry.json',
      '/api/brains/%00../../registry.json',
      `/api/brains/docs/${CH_ONE}`,
      `/api/brains/${CH_ONE}`,
      '/api/brains//etc/passwd',
      `/api/brains/${'a'.repeat(500)}`,
    ];
    const ALL = ['/api/brains/../../registry.json', ...ENCODED];

    for (const path of ALL) {
      const { text } = await getRaw(base, path);
      assert.ok(!text.includes(CANARY_PHRASE), `LANE B LEAK on '${path}'`);
      assert.ok(!text.includes('Fixture One'), `store leak (registry title) on '${path}'`);
      assert.ok(!text.includes('"creators"'), `store leak (registry body) on '${path}'`);
    }
    for (const path of ENCODED) {
      const { status } = await getRaw(base, path);
      assert.equal(status, 404, `'${path}' must be a named refusal`);
    }
  });
});

test('T-B22e: ?creator= is a COMPARISON, not a path — traversal yields no hits and no leak', async () => {
  await withFixture('t-b22e', async ({ r, base }) => {
    seedPublishedBrain(r);

    for (const creator of [
      `../../docs/${CH_ONE}`,
      `..%2F..%2Fdocs%2F${CH_ONE}`,
      '/etc/passwd',
      'nope',
      '',
    ]) {
      const { status, body } = await getJson(
        base, `/api/query?q=fixture&creator=${encodeURIComponent(creator)}`,
      );
      assert.equal(status, 200);
      assert.ok(!JSON.stringify(body).includes(CANARY_PHRASE), `LANE B LEAK via creator='${creator}'`);
      if (creator !== '') {
        assert.deepEqual(body.hits, [], `creator='${creator}' must match no namespace`);
      }
    }

    // ...and the real namespace still works, so the refusals above are not just
    // "the filter rejects everything".
    const ok = await getJson(base, `/api/query?q=fixture&creator=${BRAIN_NS}`);
    assert.equal(ok.body.hits.length, 1, 'the legitimate filter still returns the published claim');
  });
});

test('T-B22f: the query route searches LANE C only — transcript words are not findable', async () => {
  await withFixture('t-b22f', async ({ r, base }) => {
    seedPublishedBrain(r);

    for (const q of ['quarantine hydraulic manifold', 'hydraulic', 'manifold']) {
      const { status, body } = await getJson(base, `/api/query?q=${encodeURIComponent(q)}`);
      assert.equal(status, 200);
      assert.deepEqual(body.hits, [], `'${q}' exists only in LANE B and must not be indexed`);
      assert.ok(!JSON.stringify(body).includes(CANARY_PHRASE));
    }
  });
});
