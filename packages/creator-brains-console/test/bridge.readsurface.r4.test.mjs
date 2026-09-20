/*
 * R4-01 — the contained pointer reader, round 4 (Astra, 2026-09-20).
 *
 * THE DEFECT. The console had TWO pointer readers that did not agree:
 * `brain-read.mjs` validated the generation and contained its directory, while
 * `read-surface.mjs` called the engine's lax `readPointer` and kept anything with
 * a truthy `generation`. Astra round 4 executed the actual imported readers with
 * filesystem responses substituted and produced this table:
 *
 *   a valid namespace naming `../../../outside/gen-0001`  count 1, NO DAMAGE
 *   `generation: 42` (a number)                           count 1, NO DAMAGE
 *   malformed pointer JSON                                count 0, NO DAMAGE
 *   pointer read raises EACCES                            count 0, NO DAMAGE
 *   enumeration raises EACCES                             count 0, NO DAMAGE
 *
 * Every row is the same fault: DAMAGE REPORTED AS A HEALTHY COUNT, or as healthy
 * emptiness. The status route published a confident number over a store it could
 * not read. These tests pin each row, and pin the AGREEMENT between the two
 * routes, because disagreement was the defect.
 *
 * WHY THIS IS NOT IN `bridge.readsurface.r3.test.mjs`. That file holds the round-3
 * findings and sits near the 300-line cap (rule 4). These are the round-4 findings
 * against the fixes that file's tests were meant to cover.
 *
 * WHAT IS CONSTRUCTIBLE HERE, STATED RATHER THAN IMPLIED. Astra's EACCES rows
 * need privileges this host does not have, and a read-only session cannot create
 * them. The "failed read of an existing pointer" branch is reached instead by
 * making `current.json` a DIRECTORY, which raises `EISDIR` — the same branch, a
 * different errno. The enumeration branch is reached by making `brains` a FILE,
 * which raises `ENOTDIR`. Both are real filesystem conditions, not mocks; neither
 * is the errno Astra named, and saying otherwise would be the overclaim this
 * suite exists to avoid.
 *
 * @module creator-brains-console/test/bridge.readsurface.r4
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BRAIN_NS, getJson, getRaw, seedPublishedBrain, withFixture } from './fixtures.mjs';
import { repoint, repointOutside } from './store-attacks.mjs';

/**
 * The status route must report the count as UNTAKEN and name the damage.
 *
 * Asserted together everywhere because the pair is the contract: a `null` count
 * with no damage would be an unexplained blank, and a count with damage would be
 * the lie R4-01 found.
 */
async function assertCountUntaken(base, expected) {
  const res = await getJson(base, '/api/status');
  assert.equal(res.status, 200, 'status stays a composite instrument — damage is a FIELD');
  assert.equal(res.body.publishedBrains, null, 'a count that cannot be taken is null, never 0');
  assert.ok(res.body.publishedBrainsDamaged, 'and the damage is NAMED, never an unexplained blank');
  assert.match(res.body.publishedBrainsDamaged.detail, expected);
  return res;
}

/** The query route must refuse the whole request for the same condition. */
async function assertQueryRefuses(base, expected) {
  const search = await getRaw(base, '/api/query?q=fixture');
  assert.equal(search.status, 409, 'the query refuses rather than answering around the damage');
  assert.match(search.text, expected);
}

/* ── the pointer NAMES a generation the engine cannot join ────────────────── */

test('R4-01a: a NUMERIC generation is damage, not a healthy count', async () => {
  await withFixture('r4-01a', async ({ r, base }) => {
    seedPublishedBrain(r, BRAIN_NS);
    // `path.join(base, ns, 42)` throws TypeError — so the engine does NOT drop
    // this entry, it FAILS on it. Counting it as one healthy brain was the
    // round-4 row. The previous code coerced it to `null` and called the brain
    // "incomplete", which the query then disagreed with.
    repoint(r, BRAIN_NS, 42);

    await assertCountUntaken(base, /cannot join/);
    await assertQueryRefuses(base, /cannot join/);
  });
});

test('R4-01b: the drawer and the count AGREE about a numeric generation', async () => {
  await withFixture('r4-01b', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r, BRAIN_NS);
    repoint(r, ns, 42);

    // Disagreement between these two routes WAS the defect. Both must refuse,
    // and the drawer must not render three empty documents for it — a store fault
    // dressed as a legitimate brain with nothing in it is the S1-H15 shape.
    const drawer = await getRaw(base, `/api/brains/${ns}`);
    assert.equal(drawer.status, 409, 'the drawer refuses the same condition the count refuses');
    assert.ok(!drawer.text.includes('"docs"'), 'and serves no page for it');
  });
});

/* ── the pointer EXISTS and cannot be read ────────────────────────────────── */

test('R4-01c: a malformed pointer is a FAILED READ, never healthy emptiness', async () => {
  await withFixture('r4-01c', async ({ r, base }) => {
    seedPublishedBrain(r, BRAIN_NS);
    // The file is there. It is not JSON. The engine's `readJson` would swallow
    // this and drop the entry, and reporting that drop as a count of 0 is how a
    // broken store comes to look like an empty one.
    writeFileSync(join(r, 'brains', BRAIN_NS, 'current.json'), '{ this is not json', 'utf8');

    await assertCountUntaken(base, /not valid JSON/);
    await assertQueryRefuses(base, /not valid JSON/);
  });
});

test('R4-01d: an UNREADABLE pointer is damage, not absence (EISDIR)', async () => {
  await withFixture('r4-01d', async ({ r, base }) => {
    seedPublishedBrain(r, BRAIN_NS);
    // Astra's row was EACCES, which needs privileges this host lacks. A
    // DIRECTORY at the pointer path raises EISDIR and reaches the SAME branch —
    // "it exists and could not be read". The errno differs and is named here
    // rather than glossed.
    rmSync(join(r, 'brains', BRAIN_NS, 'current.json'));
    mkdirSync(join(r, 'brains', BRAIN_NS, 'current.json'), { recursive: true });

    await assertCountUntaken(base, /could not be read/);
  });
});

/* ── the STORE cannot be enumerated ───────────────────────────────────────── */

test('R4-01e: a store that cannot be LISTED is damage, not an empty store', async () => {
  await withFixture('r4-01e', async ({ base, r }) => {
    // `paths.mjs`'s `listDir` catches every error and returns `[]`, so an
    // unlistable store is indistinguishable from an empty one. Astra's row was
    // EACCES on the directory; ENOTDIR reaches the same branch.
    rmSync(join(r, 'brains'), { recursive: true, force: true });
    writeFileSync(join(r, 'brains'), 'not a directory', 'utf8');

    await assertCountUntaken(base, /could not be enumerated/);
  });
});

/* ── the control: a HEALTHY store is still counted, and the escape still named ── */

test('R4-01f: the fix did not turn damage reporting into blanket refusal', async () => {
  await withFixture('r4-01f', async ({ r, base }) => {
    seedPublishedBrain(r, BRAIN_NS);
    seedPublishedBrain(r, 'second-brain');

    const healthy = await getJson(base, '/api/status');
    assert.equal(healthy.body.publishedBrains, 2, 'a healthy store is still counted exactly');
    assert.equal(healthy.body.publishedBrainsDamaged, null, 'and names no damage');

    // Now damage ONE of them and confirm the count goes UNTAKEN rather than
    // dropping to 1 — a count that quietly omits what it cannot read is the same
    // defect wearing a smaller number.
    repointOutside(r, 'second-brain', 'r4-01f');
    await assertCountUntaken(base, /never writes/);
  });
});
