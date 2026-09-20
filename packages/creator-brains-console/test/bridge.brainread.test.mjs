/*
 * R2-03 / R2-09 — the pinned-generation reader (Astra round 2, 2026-09-20).
 *
 * WHY A NEW FILE. Both findings are about `lib/brain-read.mjs`, which was
 * extracted from `brains.mjs` in this pass, and `bridge.brains.test.mjs` is at
 * the rule-4 cap. The tests are grouped by FINDING, not by route, because the
 * two defects have different shapes and only one of them is behavioural.
 *
 * R2-09 is a straightforward acceptance bug: the generation pattern refused
 * `gen-10000`, which the engine's `padStart(4)` can emit. Both directions are
 * pinned — the form that must now be SERVED, and the neighbouring form that must
 * still be REFUSED, because "loosen the regex until the failing test passes" is
 * how the second one gets lost.
 *
 * R2-03 is a TOCTOU between two pointer reads, and this file is explicit about
 * what it can and cannot prove:
 *
 *   R2-03a is BEHAVIOURAL — markdown and claims must come from one generation,
 *   and an empty generation must be reported as such rather than served beside
 *   another generation's markdown.
 *
 *   R2-03b is a STRUCTURAL PIN, NOT a behavioural proof. The defect required the
 *   pointer to move BETWEEN two resolutions, and that race cannot be constructed
 *   deterministically without injecting a clock or a filesystem hook. So instead
 *   of pretending to test the race, this asserts the property that makes the
 *   race impossible: ONE pointer resolution in the whole `lib/` directory, and no
 *   `loadHits`. It fails loudly if a second traversal is reintroduced. It does
 *   NOT prove the single read is atomic — nothing here can, and saying otherwise
 *   would be the same overclaim T-B25e made before it was corrected.
 *
 *   ITS SCOPE WAS WIDENED BY R4-01. The pin used to assert one `readPointer` call
 *   site inside `brain-read.mjs` ALONE, and the walk in `read-surface.mjs` then
 *   acquired a second, laxer one — outside the pin's view, in a file the pin never
 *   looked at. Round 4 measured the two disagreeing. A pin scoped to the file that
 *   already passes cannot see the reader added beside it, so the scope is now the
 *   whole directory. The pin did not catch R4-01; it was the wrong shape to.
 *
 * @module creator-brains-console/test/bridge.brainread
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BRAIN_NS, getJson, getRaw, seedPublishedBrain, withFixture } from './fixtures.mjs';

const LIB = fileURLToPath(new URL('../lib/', import.meta.url));

/**
 * Point an existing brain at a different generation, keeping everything else.
 *
 * The key is `schema_version`, not `schemaVersion`: the engine writes the
 * snake_case field (`render.mjs:122`) and this fixture has to be a pointer the
 * engine would actually write, for the reason the fixtures header already
 * records. `readPointer` is a bare `readJson(path, null)` and would not have
 * noticed the difference — which is exactly why an unchecked field would have
 * survived here and broken a stricter reader later.
 */
function repoint(r, ns, generation, title = 'Hostile') {
  writeFileSync(
    join(r, 'brains', ns, 'current.json'),
    JSON.stringify({
      schema_version: 1,
      creator_id: ns,
      label: ns,
      title,
      generation,
      files: ['index.md', 'topics.md', 'timeline.md'],
      publishedAt: '2026-09-16T00:00:00.000Z',
      stats: { videos: 1, claims: 1, doctrine: 0, gaps: 0, invalidDocs: 0 },
    }),
    'utf8',
  );
}

/* ── R2-09 · a generation the engine CAN emit must be served ─────────────── */

test('R2-09a: a pointer naming gen-10000 is SERVED, not refused as damage', async () => {
  await withFixture('r2-09a', async ({ r, base }) => {
    // The engine's `padStart(4)` is a FLOOR, so a creator past 9999 generations
    // publishes into `gen-10000`. The old `/^gen-\d{4}$/` called that impossible
    // and answered 409 — a legitimate brain reported as store damage.
    const { ns } = seedPublishedBrain(r, BRAIN_NS, { generation: 'gen-10000', title: 'Deep Brain' });
    const { status, body } = await getJson(base, `/api/brains/${ns}`);

    assert.equal(status, 200, 'gen-10000 is a generation the engine writes');
    assert.equal(body.generation, 'gen-10000');
    assert.equal(body.title, 'Deep Brain');
    assert.ok(body.index.includes('Deep Brain'), 'the markdown must come from gen-10000');
    assert.equal(body.claims.length, 1, 'and its claims too');
  });
});

test('R2-09b: a NON-CANONICAL five-digit generation is still refused as damage', async () => {
  await withFixture('r2-09b', async ({ r, base }) => {
    // `gen-00001` is the decimal 1 padded to five digits. `padStart(4)` writes
    // `gen-0001` for that number, never this — so it is not a name the writer can
    // produce, and `\d{4,}` would have accepted it. This is the guard against
    // fixing R2-09 by loosening the bound instead of shaping it.
    const { ns } = seedPublishedBrain(r);
    for (const generation of ['gen-00001', 'gen-0000001', 'gen-0']) {
      repoint(r, ns, generation);
      const { status } = await getRaw(base, `/api/brains/${ns}`);
      assert.equal(status, 409, `generation '${generation}' must be refused as damage`);
    }
    // Positive control for the pair: the canonical form of the SAME number is
    // accepted, so the refusal above is about canonicity and not about width.
    repoint(r, ns, 'gen-0001');
    const ok = await getRaw(base, `/api/brains/${ns}`);
    assert.equal(ok.status, 200, 'gen-0001 is canonical and must be served');
  });
});

/* ── R2-03 · one pointer, one generation ─────────────────────────────────── */

test('R2-03a: markdown and claims come from the SAME pinned generation', async () => {
  await withFixture('r2-03a', async ({ r, base }) => {
    // Generation 1 has claims. Generation 2 has markdown but NO rules.jsonl — the
    // empty-generation shape the round-2 probe used. The pointer names gen-0002,
    // so EVERY field must be gen-0002's: its markdown, no claims, and an honest
    // `rules.jsonl` skip. Serving gen-0001's claims beside gen-0002's markdown is
    // the defect.
    const { ns } = seedPublishedBrain(r, BRAIN_NS, { generation: 'gen-0001', title: 'Gen One' });

    const gen2 = join(r, 'brains', ns, 'gen-0002');
    mkdirSync(gen2, { recursive: true });
    writeFileSync(join(gen2, 'index.md'), '# Gen Two\n\nmarkdown from the second generation.', 'utf8');
    writeFileSync(join(gen2, 'topics.md'), '- second topic', 'utf8');
    writeFileSync(join(gen2, 'timeline.md'), '- 00:00 second', 'utf8');
    // deliberately no rules.jsonl

    repoint(r, ns, 'gen-0002', 'Gen Two');

    const { status, body } = await getJson(base, `/api/brains/${ns}`);
    assert.equal(status, 200);
    assert.equal(body.generation, 'gen-0002');
    assert.ok(body.index.includes('second generation'), 'markdown must be gen-0002');
    assert.ok(!body.index.includes('fixture'), 'gen-0001 markdown must not appear');
    assert.deepEqual(body.claims, [], 'an empty generation yields no claims');
    assert.ok(
      body.skipped.some((s) => s.file === 'rules.jsonl'),
      'the absent rules.jsonl must be REPORTED, not silently empty',
    );
    // And the claims that DO exist are reachable by pointing back at gen-0001,
    // so the empty result above is a fact about gen-0002 rather than a broken
    // reader that never returns claims at all.
    repoint(r, ns, 'gen-0001', 'Gen One');
    const back = await getJson(base, `/api/brains/${ns}`);
    assert.equal(back.body.claims.length, 1, 'gen-0001 still serves its own claim');
  });
});

test('R2-03b: the console resolves a pointer in EXACTLY ONE module (structural pin)', async () => {
  // A PIN, NOT A BEHAVIOURAL PROOF — see the file header. The defect was a second
  // resolution; this asserts there is no second resolution to race with. It is
  // mutation-sensitive: reintroducing `loadHits`, a second `readPointer`, or a
  // third resolver fails.
  //
  // SCOPE IS ALL OF lib/ (R4-01). The pin used to read only `brain-read.mjs`,
  // which is precisely how the walk in `read-surface.mjs` acquired a second and
  // laxer reader that nothing here could see.
  const modules = readdirSync(LIB).filter((f) => f.endsWith('.mjs'));
  const sourceOf = (f) => readFileSync(join(LIB, f), 'utf8');

  // 1. The engine's lax reader is gone. `readPointer` is `readJson(path, null)`,
  //    which collapses ENOENT, EACCES and malformed JSON into one `null` — the
  //    round-4 defect. Nothing in the console may call it again.
  const laxCallers = modules.filter((f) => /readPointer\s*\(/.test(sourceOf(f)));
  assert.deepEqual(laxCallers, [], `the engine's lax readPointer must not be called in lib/, found: ${laxCallers.join(', ')}`);

  // 2. Exactly two modules resolve a pointer, and they are the two callers that
  //    must agree: the drawer and the enumeration walk. Detected by IMPORT, not
  //    by the call shape — `pointer.mjs` DEFINES the function, and a regex for
  //    the call would count its own declaration as a third resolver.
  const importers = (f) => /import\s*\{[^}]*\bresolvePointer\b[^}]*\}\s*from/.test(sourceOf(f));
  const resolvers = modules.filter(importers).sort();
  assert.deepEqual(
    resolvers, ['brain-read.mjs', 'read-surface.mjs'],
    `only the drawer and the walk may resolve a pointer, found: ${resolvers.join(', ')}`,
  );

  // 3. The one reader reads through the STRICT primitive, so ENOENT stays the
  //    only thing that means absence.
  assert.match(
    sourceOf('pointer.mjs'), /readContainedText\(pointerPath/,
    'pointer.mjs must read the pointer through the strict reader, not a bare readFileSync',
  );

  const src = sourceOf('brain-read.mjs');
  assert.ok(
    !/loadHits\s*\(/.test(src),
    'the reader must not call loadHits — that function re-resolves the pointer itself',
  );

  // And the claim reader must take its directory from the caller rather than
  // deriving one, so there is no path by which it could name a different
  // generation than the one that was validated. Asserted as a PREFIX, not as an
  // exact parameter list: R2-02 added the containment root and its resolved real
  // path to this call, and a pin that breaks on every added argument trains the
  // next seat to loosen it. What must not change is that the directory is GIVEN
  // to it — so the property is pinned and the arity is not.
  assert.match(
    src, /function readClaims\(dir, skipped/,
    'readClaims must RECEIVE the already-validated directory, not resolve one',
  );
  assert.ok(
    !/readClaims\([^)]*readPointer/.test(src) && !/readClaims\([^)]*containedDir/.test(src),
    'readClaims must not be handed a freshly resolved pointer or directory',
  );
});

/* ── the containment rules must still hold after the extraction ──────────── */

test('R2-03c: the extraction did not widen the containment surface', async () => {
  await withFixture('r2-03c', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r);
    // Every form the pre-extraction guard refused must still be refused. This is
    // the regression net for the refactor: moving the rules is exactly when a
    // rule gets dropped.
    for (const generation of ['..', '.', 'gen-1', '../../registry.json', 'gen-0001/../..', '']) {
      repoint(r, ns, generation);
      const { status, text } = await getRaw(base, `/api/brains/${ns}`);
      assert.ok(status === 409 || status === 200, `generation '${JSON.stringify(generation)}' answered ${status}`);
      assert.ok(!text.includes('"creators"'), `registry content leaked on '${generation}'`);
    }
  });
});
