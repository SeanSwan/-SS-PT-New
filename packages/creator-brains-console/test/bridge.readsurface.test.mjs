/*
 * R2-02 — THE READ SURFACE IS CONTAINED AT BOTH ENTRY POINTS (Astra round 2).
 *
 * WHY THIS FILE EXISTS. The drawer's containment covered the generation
 * DIRECTORY. It did not cover the pointer file, the namespace directory, any
 * leaf, or the QUERY route at all — and `queryBrains` resolves pointers itself,
 * so the query path never reached the drawer's check. Astra's probe returned a
 * hit after reading `outside/rules.jsonl`.
 *
 * A BOUNDARY AT ONE ENTRY POINT IS A BOUNDARY IMPLEMENTED ONCE AND A HALF. Every
 * vector below is therefore asserted against BOTH routes. A fix that closed the
 * drawer and left the query open would pass a drawer-only test.
 *
 * THE LINKS ARE REAL JUNCTIONS, NOT MOCKED PATHS. Astra's fix note asks for
 * "real Windows filesystem tests as a release gate", and the reason is the lesson
 * this suite has already learned twice: a test that cannot construct its own
 * attack proves nothing. A mocked filesystem would prove the check runs; only a
 * real junction proves it SEES what `readFileSync` would follow. Junctions are
 * creatable without administrator rights on Windows, which is why they are used
 * rather than symlinks.
 *
 * Every junction test asserts the junction EXISTS and RESOLVES OUTSIDE before it
 * asserts the refusal. Without that, a silently failed `symlinkSync` would leave
 * the test passing while testing an ordinary directory.
 *
 * @module creator-brains-console/test/bridge.readsurface
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BRAIN_NS, getJson, getRaw, seedPublishedBrain, withFixture } from './fixtures.mjs';
import { junction, outsideGeneration, repoint } from './store-attacks.mjs';

/* The three attack builders live in `store-attacks.mjs` — a harness module, not a
 * test file, so importing it does not re-register anything (S1-H13). */

/** Both entry points must refuse, and neither may serve the outside content. */
async function assertBothRoutesRefuse(base, ns, query = 'q=leaked') {
  const drawer = await getRaw(base, `/api/brains/${ns}`);
  assert.equal(drawer.status, 409, 'the drawer must refuse a store it cannot vouch for');
  assert.ok(!drawer.text.includes('OUTSIDE'), 'no outside content may reach the drawer');

  const search = await getRaw(base, `/api/query?${query}`);
  assert.equal(search.status, 409, 'the query route must refuse the same store');
  assert.ok(!search.text.includes('OUTSIDE'), 'no outside content may reach the query route');
  assert.ok(!search.text.includes('leaked-claim-1'), 'and no outside CLAIM either');
}

/* ── the round-2 probe, both routes ──────────────────────────────────────── */

test('R2-02a: a pointer naming a traversal generation is refused on BOTH routes', async () => {
  await withFixture('r2-02a', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r, BRAIN_NS);
    // Exactly the round-2 probe: the pointer itself is the vector.
    repoint(r, ns, '../../../outside/gen-0001');
    await assertBothRoutesRefuse(base, ns);
  });
});

/* ── real junctions: generation, namespace, leaf ─────────────────────────── */

test('R2-02b: a JUNCTION standing in for the generation directory is refused', async () => {
  await withFixture('r2-02b', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r, BRAIN_NS);
    const outside = outsideGeneration('r2-02b');
    // Lexically inside the store, really outside it — the shape `inside()` alone
    // cannot see and `realpathSync` can.
    junction(outside, join(r, 'brains', ns, 'gen-0002'), join(r, 'brains'));
    repoint(r, ns, 'gen-0002');
    await assertBothRoutesRefuse(base, ns);
  });
});

test('R2-02c: a JUNCTION standing in for the NAMESPACE directory is refused', async () => {
  await withFixture('r2-02c', async ({ r, base }) => {
    const outside = outsideGeneration('r2-02c');
    // The whole namespace is a link, and the pointer inside it is well-formed —
    // so nothing but a real-path check can tell this from a legitimate brain.
    junction(outside, join(r, 'brains', 'hostile-ns'), join(r, 'brains'));
    const drawer = await getRaw(base, '/api/brains/hostile-ns');
    assert.equal(drawer.status, 409);
    // The query route walks EVERY entry, so it must refuse even though the caller
    // never named the poisoned namespace.
    const search = await getRaw(base, '/api/query?q=leaked');
    assert.equal(search.status, 409, 'the whole-surface pass must see it');
    assert.ok(!search.text.includes('leaked-claim-1'));
  });
});

/*
 * R2-02d — THE LEAF. Read the note on TARGETING THE MUTATION before trusting this.
 *
 * A junction can only point at a DIRECTORY, so reading one raises EISDIR — which
 * the leaf reader refuses anyway. A status-only assertion therefore passes with
 * the leaf containment REMOVED, refusing for the wrong reason. What distinguishes
 * the two is the MESSAGE: containment refuses because the leaf ESCAPES, and the
 * unreadable-leaf path refuses because it could not be read. Only the first is a
 * boundary, so the REASON is asserted. (A file symlink would give a readable
 * escaping leaf, but `symlinkSync` returns EPERM without Developer Mode, so it is
 * not available as a release gate here.)
 *
 * EVERY LEAF GETS ITS OWN TEST, AND THAT IS NOT PADDING. The four leaves are read
 * by TWO code paths — `rules.jsonl` by `readClaims`, the three documents by the
 * page loop — so a single-leaf test only ever enters one of the two guards. The
 * first version of this test used `rules.jsonl` alone and was recorded as green
 * under a mutation applied to the DOCUMENT guard: the mutation was on a code path
 * the test never reached, so the "proof" was worth nothing. Four named tests are
 * what let the two mutants redden DIFFERENT tests.
 */
const LEAF_FILES = ['index.md', 'topics.md', 'timeline.md', 'rules.jsonl'];

test('R2-02d0: the leaf list covers EVERY file the store publishes', async () => {
  await withFixture('r2-02d0', async ({ r }) => {
    const { ns } = seedPublishedBrain(r, BRAIN_NS);
    const published = readdirSync(join(r, 'brains', ns, 'gen-0001')).sort();
    assert.deepEqual(
      published, [...LEAF_FILES].sort(),
      'the leaf tests must cover every published file, or a guard goes untested',
    );
  });
});

for (const file of LEAF_FILES) {
  const label = `r2-02d-${file.replace(/\W/g, '-')}`;
  test(`R2-02d/${file}: a JUNCTION standing in for a leaf is refused`, async () => {
    await withFixture(label, async ({ r, base }) => {
      const { ns } = seedPublishedBrain(r, BRAIN_NS);
      const outside = outsideGeneration(label);
      // The generation directory is REAL and contained. Only the leaf escapes —
      // which is exactly the case the pre-R2-02 reader served.
      const leaf = join(r, 'brains', ns, 'gen-0001', file);
      rmSync(leaf); // symlinkSync refuses to overwrite, which is how this was caught
      junction(outside, leaf, join(r, 'brains'));

      const drawer = await getRaw(base, `/api/brains/${ns}`);
      assert.equal(drawer.status, 409);
      assert.match(
        drawer.text, /resolves outside the brains store/,
        `${file} must be refused for ESCAPING, not merely for being unreadable`,
      );
      assert.ok(!drawer.text.includes('OUTSIDE'), 'and no outside content may be served');

      // The query half: the whole-surface pass must see the same leaf.
      const search = await getRaw(base, '/api/query?q=leaked');
      assert.equal(search.status, 409, 'the query route must refuse the same store');
      assert.ok(!search.text.includes('leaked-claim-1'), 'and must not serve the outside claim');
    });
  });
}

/* ── A2-R2-01 · a failed read is not an absent file ──────────────────────── */

test('R2-02e: a leaf that cannot be READ is damage, not absence (A2-R2-01)', async () => {
  await withFixture('r2-02e', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r, BRAIN_NS);
    // A directory where a document belongs. `readFileSync` raises EISDIR — a
    // non-ENOENT failure, constructible on Windows without privileges, and the
    // stand-in for any permission or I/O fault. The old reader caught everything
    // and reported "missing from the published generation", which presents an
    // unreadable store as a creator who published nothing.
    const leaf = join(r, 'brains', ns, 'gen-0001', 'index.md');
    const saved = readFileSync(leaf, 'utf8');
    assert.ok(saved.includes('Fixture'), 'precondition: the leaf was a real file');
    // Replace the file with a directory of the same name.
    rmSync(leaf);
    mkdirSync(leaf);

    const drawer = await getRaw(base, `/api/brains/${ns}`);
    assert.equal(drawer.status, 409, 'an unreadable leaf is store damage');
    assert.ok(!/missing from the published generation/.test(drawer.text), 'and must NOT be reported as absent');
  });
});

/* ── the fix must not be "refuse everything" ─────────────────────────────── */

test('R2-02f: an ordinary store still serves BOTH routes', async () => {
  await withFixture('r2-02f', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r, BRAIN_NS);
    const drawer = await getJson(base, `/api/brains/${ns}`);
    assert.equal(drawer.status, 200);
    assert.equal(drawer.body.generation, 'gen-0001');
    assert.ok(drawer.body.index.includes('Fixture'));

    const search = await getJson(base, '/api/query?q=fixture');
    assert.equal(search.status, 200);
    assert.equal(search.body.hits.length, 1, 'the containment pass must not drop real hits');
  });
});

test('R2-02g: a store with no brains at all is not damage', async () => {
  await withFixture('r2-02g', async ({ r, base }) => {
    // The pass walks `brains/` — an empty directory must not be an escape, and
    // must not be reported as damage. Absence is not a fault.
    const search = await getRaw(base, '/api/query?q=anything');
    assert.equal(search.status, 200);
  });
});
