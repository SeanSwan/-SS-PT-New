/*
 * R5-01 — malformed pointer SHAPES and falsy generation TYPES, round 5 (Astra, 2026-09-20).
 *
 * THE DEFECT. R4-01 replaced the lax pointer reader with a strict contained one, and
 * closed the row Astra had named (`{"generation":42}` — a number the engine cannot
 * join). It left the NEIGHBOURING ROWS of the same class standing, because the guard
 * it wrote used a FALSY test as a PRESENCE test:
 *
 *   if (!pointer || typeof pointer !== 'object' || !pointer.generation)
 *
 * Consequences, all of them "damage reported as health":
 *   `null`, `false`, `42`   -> `!pointer` / the typeof test, both true  -> healthy 0
 *   `[]`                    -> `typeof [] === 'object'` is TRUE         -> healthy 0
 *   `{"generation":0}`      -> `!0` is true                             -> healthy 0
 *   `{"generation":false}`  -> `!false` is true                         -> healthy 0
 *
 * The adopted round-4 contract is explicit (P/17-astra-mega-reply-r4.md:538-542):
 *   rule 3 — malformed JSON, NON-OBJECT JSON and non-absence read failures are damage
 *   rule 4 — only a MISSING, `null` or empty-string generation is an incomplete pointer
 *   rule 5 — every other generation value must be a string matching the canonical pattern
 * and the same package supplied a `non-object-pointer` case with body `'[]'` asserting
 * `409 STORE_DAMAGED` (`:845`). That case was never implemented, which is why the
 * sibling rows survived. These tests are it, plus the falsy-type rows.
 *
 * WHY THIS IS NOT IN `bridge.readsurface.r4.test.mjs`. That file holds the round-4
 * findings; these are the round-5 findings against the fix those tests were meant to
 * cover, and rule 4 (300-line cap) applies to test files too.
 *
 * @module creator-brains-console/test/bridge.pointer.r5
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BRAIN_NS, getJson, getRaw, seedPublishedBrain, withFixture } from './fixtures.mjs';

/** Write a raw pointer body, bypassing `repoint` so the SHAPE is under test. */
function writePointer(r, body, ns = BRAIN_NS) {
  writeFileSync(join(r, 'brains', ns, 'current.json'), body, 'utf8');
}

/** The status route must report the count UNTAKEN and NAME the damage. */
async function assertCountUntaken(base, expected) {
  const res = await getJson(base, '/api/status');
  assert.equal(res.status, 200, 'status stays a composite instrument — damage is a FIELD');
  assert.equal(res.body.publishedBrains, null, 'a count that cannot be taken is null, never 0');
  assert.ok(res.body.publishedBrainsDamaged, 'and the damage is NAMED, never an unexplained blank');
  assert.match(res.body.publishedBrainsDamaged.detail, expected);
  return res;
}

/** An INCOMPLETE pointer is a skip, not damage: count 0, and NO damage named. */
async function assertIncompleteNotDamaged(base) {
  const res = await getJson(base, '/api/status');
  assert.equal(res.status, 200);
  assert.equal(res.body.publishedBrains, 0, 'an incomplete pointer is dropped, not damaged');
  assert.equal(res.body.publishedBrainsDamaged, null, 'and it must NOT be reported as damage');
  return res;
}

/* ── a NON-OBJECT pointer is damage, not absence ──────────────────────────── */

for (const [name, body] of [
  ['array', '[]'],
  ['number', '42'],
  ['boolean', 'false'],
  ['null', 'null'],
]) {
  test(`R5-01a/${name}: a non-object pointer is DAMAGE, not healthy emptiness`, async () => {
    await withFixture(`r5-01a-${name}`, async ({ r, base }) => {
      seedPublishedBrain(r, BRAIN_NS);
      writePointer(r, body);

      await assertCountUntaken(base, /not a JSON object/);

      const query = await getRaw(base, '/api/query?q=fixture');
      assert.equal(query.status, 409, 'and the query refuses rather than answering around it');
    });
  });
}

/* ── a PRESENT but FALSY generation is damage, not an incomplete pointer ──── */

for (const [name, body, expected] of [
  ['zero', '{"generation":0}', /cannot join/],
  ['false', '{"generation":false}', /cannot join/],
]) {
  test(`R5-01b/${name}: a falsy generation is DAMAGE, not an incomplete pointer`, async () => {
    await withFixture(`r5-01b-${name}`, async ({ r, base }) => {
      seedPublishedBrain(r, BRAIN_NS);
      writePointer(r, body);

      // The engine cannot JOIN these either: `path.join` throws on a non-string,
      // so it FAILS on the entry rather than dropping it — the same reasoning as
      // R4-01a's numeric row, reached by a different falsy value.
      await assertCountUntaken(base, expected);
    });
  });
}

/* ── the CONTROLS: a genuinely incomplete pointer is still a skip ─────────── */

test('R5-01c: a MISSING generation is still an incomplete pointer, not damage', async () => {
  await withFixture('r5-01c', async ({ r, base }) => {
    seedPublishedBrain(r, BRAIN_NS);
    writePointer(r, JSON.stringify({ channel: 'UC-fixture', publishedAt: '2026-09-20' }));

    // This is the R3-01 skip, and it must survive the fix: the whole point of
    // narrowing the guard is that it stops swallowing these into `null` WITHOUT
    // turning every incomplete pointer into a store fault.
    await assertIncompleteNotDamaged(base);
  });
});

test('R5-01d: a null or empty-string generation is incomplete, not damage', async () => {
  await withFixture('r5-01d', async ({ r, base }) => {
    seedPublishedBrain(r, BRAIN_NS);

    writePointer(r, '{"generation":null}');
    await assertIncompleteNotDamaged(base);

    writePointer(r, '{"generation":""}');
    await assertIncompleteNotDamaged(base);
  });
});

test('R5-01e: a HEALTHY store is still counted exactly', async () => {
  await withFixture('r5-01e', async ({ r, base }) => {
    seedPublishedBrain(r, BRAIN_NS);
    seedPublishedBrain(r, 'second-brain');

    const healthy = await getJson(base, '/api/status');
    assert.equal(healthy.body.publishedBrains, 2, 'the narrowing did not break the happy path');
    assert.equal(healthy.body.publishedBrainsDamaged, null);
  });
});
