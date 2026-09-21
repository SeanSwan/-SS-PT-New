/*
 * T-B25 — LANE C containment against an EXISTING hostile pointer and a LINK
 * escape (A1-11, Astra adjudication 2026-09-20).
 *
 * WHY A NEW FILE. `bridge.brains.test.mjs` T-B22d already probes hostile slug
 * FORMS and it passes — but only because every form it uses happens to resolve
 * to a `current.json` that does not exist. That is a fact about the probes, not
 * about the guard, and A1-11 says so in as many words: "Supplied probes mostly
 * use nonexistent hostile names." The two cases those probes cannot reach are
 * the two that matter:
 *
 *   1. a REAL published brain whose `current.json` is hostile. The pointer
 *      exists and parses, so nothing upstream stops it, and the generation
 *      component is joined into the path unvalidated;
 *   2. a real directory reached through a filesystem LINK. The path text is
 *      entirely legitimate — `brains/<ns>/gen-0001` — so no alphabet rule can
 *      see it. Only resolving the chain can.
 *
 * The positive control in T-B25a is not decoration: without it, "409" is
 * indistinguishable from "this route refuses everything", which is the shape of
 * a guard that has quietly become a bug.
 *
 * @module creator-brains-console/test/bridge.containment
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { BRAIN_NS, getJson, getRaw, seedPublishedBrain, withFixture } from './fixtures.mjs';

/** A phrase that exists ONLY outside the store. Its appearance is the leak. */
const OUTSIDE = 'OUTSIDE-THE-BRAINS-STORE-MUST-NEVER-BE-SERVED';

/**
 * A directory beside the store root, holding the three documents the route
 * reads. Sibling rather than child: a child would be inside `brainsDir` and
 * would prove nothing.
 *
 * UNIQUE AND SELF-CLEANING (round 9). This used to be
 * `join(r, '..', `outside-${label}`, 'gen-0001')` — a CONSTANT name in the SYSTEM
 * temp root. `withFixture` gave `r` a fresh `mkdtempSync` root and the exit reaper
 * tracked it, but this directory is a SIBLING of `r`, so nothing ever reaped it and
 * every run wrote to the same path.
 *
 * The consequence was the worst kind: three consecutive runs shared one directory, so a
 * run could inherit another run's half-written state, and once it became unwritable the
 * failure surfaced as `EPERM` inside `writeFileSync` — which reads as a broken fixture or
 * a sandbox fault, not as this defect. Measured 2026-09-21: nine `outside-*` directories
 * from a single run on 2026-09-20 01:23 were still on disk, and `T-B25b..e` failed with
 * `EPERM ... \outside-t-b25b\gen-0001\index.md` while an ordinary temp write succeeded.
 *
 * `realpathSync` rather than the literal parent, so the returned path still names where
 * the bytes really are when the system temp root is itself a link (Windows resolves
 * `%TEMP%` through `AppData\Local`). The containment assertions compare REAL paths, so a
 * lexical parent would be wrong for exactly the case this file exists to test.
 */
function outsideBrain(r, label) {
  const owner = join(realpathSync(join(r, '..')), `outside-${label}-${randomUUID()}`);
  const dir = join(owner, 'gen-0001');
  mkdirSync(dir, { recursive: true });
  for (const f of ['index.md', 'topics.md', 'timeline.md']) {
    writeFileSync(join(dir, f), `${OUTSIDE}\n`, 'utf8');
  }
  // Reap `owner` — the directory this function CREATED, captured in a variable rather
  // than re-derived. Re-deriving it as `join(dir, '..', '..')` was a real bug in the
  // first draft of this fix: that walks up from `gen-0001` twice, which leaves the
  // `outside-*` directory and lands on the TEMP ROOT ITSELF. Measured — a run with a
  // private temp root deleted the root, and on a SHARED root the second run then failed
  // all six tests because the root was gone. It would have deleted another session's
  // temp files. Capturing the created path is exact; a relative walk is not.
  //
  // `r`'s own reaper cannot reach a sibling, so the creator owns the cleanup — and the
  // label stays in the name so a leaked one is still identifiable by eye.
  process.on('exit', () => {
    try { rmSync(owner, { recursive: true, force: true }); } catch { /* best effort */ }
  });
  return dir;
}

/* ── T-B25a · the positive control ───────────────────────────────────────── */

test('T-B25a: a legitimate published brain still serves — the refusals mean something', async () => {
  await withFixture('t-b25a', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r);
    const { status, body } = await getJson(base, `/api/brains/${ns}`);
    assert.equal(status, 200);
    assert.ok(body.index.includes('A published claim about the fixture'));
    assert.ok(!JSON.stringify(body).includes(OUTSIDE));
  });
});

/* ── T-B25b · an EXISTING pointer naming a traversing generation ─────────── */

test('T-B25b: an existing pointer naming a traversing generation is refused as damage', async () => {
  await withFixture('t-b25b', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r);
    const outside = outsideBrain(r, 't-b25b');

    // A pointer that parses and EXISTS, naming a generation that walks out of
    // the store. Pre-fix this served the target directory's three documents with
    // a 200 (measured). It is now refused by the generation alphabet, which runs
    // before `containedDir` — so this test pins the FIRST of the two checks, and
    // T-B25c/d pin the containment check that a link forces past the alphabet.
    writeFileSync(
      join(r, 'brains', ns, 'current.json'),
      JSON.stringify({ schema_version: 1, title: 'Hostile', generation: `../../../${outside.split(/[\\/]/).slice(-2).join('/')}` }),
      'utf8',
    );

    const { status, text } = await getRaw(base, `/api/brains/${ns}`);
    assert.equal(status, 409, 'a pointer the engine could not have written is a store fault, not an empty brain');
    assert.ok(!text.includes(OUTSIDE), 'the traversal must not have been followed');
  });
});

test('T-B25b2: an existing pointer naming a non-generation directory is refused as damage', async () => {
  await withFixture('t-b25b2', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r);
    for (const generation of ['..', '.', 'gen-1', 'gen-00001', 'GEN-0001', '../../registry.json', 'gen-0001/../..']) {
      writeFileSync(
        join(r, 'brains', ns, 'current.json'),
        JSON.stringify({ title: 'Hostile', generation }),
        'utf8',
      );
      const { status, text } = await getRaw(base, `/api/brains/${ns}`);
      assert.equal(status, 409, `generation '${generation}' was not refused`);
      assert.ok(!text.includes(OUTSIDE) && !text.includes('"creators"'), `leak on generation '${generation}'`);
    }
  });
});

/* ── T-B25c/d · the link escapes an alphabet rule cannot see ─────────────── */

test('T-B25c: a generation directory that is a LINK out of the store is refused', async () => {
  await withFixture('t-b25c', async ({ r, base }) => {
    const { ns, genDir } = seedPublishedBrain(r);
    const outside = outsideBrain(r, 't-b25c');

    // Every character of this path is legitimate. Only `realpathSync` can see
    // that the directory is a junction pointing outside the store.
    rmSync(genDir, { recursive: true, force: true });
    symlinkSync(outside, genDir, 'junction');

    const { status, text } = await getRaw(base, `/api/brains/${ns}`);
    assert.equal(status, 409, 'a link out of the store is a containment fault');
    assert.ok(!text.includes(OUTSIDE), 'readFileSync FOLLOWS a junction — containment of the path is not containment of the file');
  });
});

test('T-B25d: a NAMESPACE that is a LINK out of the store is refused', async () => {
  await withFixture('t-b25d', async ({ r, base }) => {
    const outside = outsideBrain(r, 't-b25d');
    const ns = 'linked-ns';
    const outsideRoot = join(outside, '..');
    writeFileSync(join(outsideRoot, 'current.json'), JSON.stringify({ title: 'Linked', generation: 'gen-0001' }), 'utf8');

    symlinkSync(outsideRoot, join(r, 'brains', ns), 'junction');

    const { status, text } = await getRaw(base, `/api/brains/${ns}`);
    assert.equal(status, 409, 'the slug is inside the alphabet but the directory is not inside the store');
    assert.ok(!text.includes(OUTSIDE));
  });
});

/* ── T-B25e · the slug is refused BEFORE the pointer read ────────────────── */

test('T-B25e: an unnameable slug never reaches the pointer read', async () => {
  await withFixture('t-b25e', async ({ r, base }) => {
    seedPublishedBrain(r);
    const outside = outsideBrain(r, 't-b25e');
    const outsideRoot = join(outside, '..');
    writeFileSync(join(outsideRoot, 'current.json'), JSON.stringify({ title: 'Outside', generation: 'gen-0001' }), 'utf8');

    // PRE-ENCODED, DELIBERATELY. `fetch` runs the URL parser, which removes `.`
    // and `..` segments BEFORE the wire — so `'.'` and `'..'` cannot express
    // anything here and asserting a status for them tests the client, not the
    // guard (the same lesson T-B22d records). The encoded forms DO reach the
    // handler as literal text, which is what the handler must contain.
    //
    // THIS TEST IS A PIN, NOT A REGRESSION PROOF — and saying so is the point.
    // MEASURED against the pre-fix code (mutation, 2026-09-20): every one of
    // these already answered 404 and leaked nothing, because the router does not
    // decode `%2F` and so `pointerPath` never saw a `..`. The slug is therefore
    // safe TODAY only because another module declines to decode — an assumption
    // owned elsewhere, one `decodeURIComponent` away from being false. This test
    // makes the console's own rule explicit so that day is a failing test rather
    // than a silent reopening. The live vectors are T-B25b/c/d.
    const hostile = [
      '..%2F..%2Foutside-t-b25e',
      '%2e%2e%2f%2e%2e%2foutside-t-b25e',
      '..%5C..%5Coutside-t-b25e',
      'ns%00x',
      'a%2Fb',
      'a%5Cb',
      'x'.repeat(65),
      '%2e%2e',
      'a%20b',
    ];
    for (const name of hostile) {
      const { status, text } = await getRaw(base, `/api/brains/${name}`);
      assert.equal(status, 404, `'${name}' must be refused before any read`);
      assert.ok(!text.includes(OUTSIDE), `leak on slug '${name}'`);
    }

    // ...and the legitimate slug still works, so the refusals above are not
    // simply "this route refuses everything".
    assert.equal((await getJson(base, `/api/brains/${BRAIN_NS}`)).status, 200);
  });
});
