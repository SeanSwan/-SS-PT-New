/*
 * R5-04 (second half) — OPTIONALITY IS PART OF A DECLARED SHAPE (Astra round 5, 2026-09-20).
 *
 * THE DEFECT. `typedFields` stripped the optional marker while parsing:
 *
 *   { name: name.replace('?', ''), type }
 *
 * so `runId` and `runId?` extracted to IDENTICAL objects, and `assertSameShape` —
 * which compares with `deepEqual` — could not tell them apart. A document that
 * widened a field to optional therefore compared EQUAL to one that had not, which is
 * exactly the drift the doc→literal link exists to catch. Astra measured the hole at
 * `C/test/contract-types.mjs:83`.
 *
 * The compiler half of R5-04 (mutual assignability accepting `any` and optional extra
 * fields) is fixed in `web/src/adapters/contract.assert.ts` and is proven by COMPILE
 * probes rather than by a runtime test, because a type-level assertion has no runtime
 * behaviour to assert on. Those probes are run by the M17/M18/M19 harness against the
 * real adapter source and recorded with the round-5 fixes.
 *
 * @module creator-brains-console/test/contract-types.r5
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assertSameShape, typedFields } from './contract-types.mjs';

test('R5-04a: a required field and an optional field are DIFFERENT shapes', () => {
  const required = typedFields('runId: string | null');
  const optional = typedFields('runId?: string | null');

  assert.deepEqual(required, [{ name: 'runId', optional: false, type: 'string | null' }]);
  assert.deepEqual(optional, [{ name: 'runId', optional: true, type: 'string | null' }]);

  // The whole point: these used to be indistinguishable, so this comparison passed.
  assert.throws(
    () => assertSameShape(required, optional, 'runId vs runId?'),
    /the declared shapes differ/,
    'widening a declared field to optional must be reported as a divergence',
  );
});

test('R5-04b: optionality is carried alongside the type, not folded into it', () => {
  const fields = typedFields('a: string, b?: number, c: boolean');
  assert.deepEqual(fields, [
    { name: 'a', optional: false, type: 'string' },
    { name: 'b', optional: true, type: 'number' },
    { name: 'c', optional: false, type: 'boolean' },
  ]);
  // Sorted by name, so field ORDER stays out of the comparison — a reordering is
  // not a divergence, and `typedFields`' docstring says so.
  assert.deepEqual(fields.map((f) => f.name), ['a', 'b', 'c']);
});

test('R5-04c: two identical declarations still compare EQUAL', () => {
  // The control. A parser that marked everything optional, or a comparison that
  // always threw, would pass the tests above and be useless.
  assertSameShape(
    typedFields('repaired: number, built: number, emptied: number'),
    typedFields('repaired: number, built: number, emptied: number'),
    'identical declarations',
  );
});
