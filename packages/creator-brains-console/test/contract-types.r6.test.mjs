/*
 * R6-03 — THE CONTRACT PARSER MUST REFUSE WHAT IT CANNOT READ
 * (Astra round 6, 2026-09-20).
 *
 * THE DEFECT. R5-04's document-side fix carried the optionality flag, and left the
 * fragment-dropping beside it standing: `typedFields` mapped an unrecognised member to
 * `null` and filtered it away, so each of these extracted to EXACTLY the same fields as
 * a declaration without them —
 *
 *   readonly extra?: string
 *   "extra"?: string
 *   [key: string]: unknown
 *
 * — and the doc→literal link then reported AGREEMENT about a document it had not read.
 * A parser that ignores syntax it does not support makes ignorance read as agreement,
 * which is worse than a missing check because it is indistinguishable from a passing one.
 *
 * WHY THE REGRESSION GOES THROUGH `contractRowTypedFields()`. Astra's finding was not
 * about the tokenizer: it exercised the ACTUAL table reader with in-memory document
 * mutations, and the added members were accepted there. A test that only called
 * `typedFields()` could pass while a bypass lived in the row extraction. R6-03j drives the
 * real reader over a mutated document, which is why `contractRowTypedFields` takes an
 * injectable `source`.
 *
 * WHAT THIS MUST NOT DO. It must not reject the declarations the project actually writes.
 * R6-03k parses the real `05-contracts.md`, and the full suite passing unchanged is the
 * wider evidence that the strictness is aimed at unsupported syntax rather than at the
 * documents.
 *
 * @module creator-brains-console/test/contract-types.r6
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { CONTRACTS_MD } from './contract-parse.mjs';
import { contractRowTypedFields, typedFields } from './contract-types.mjs';

/* ── every unsupported member is refused, and the refusal names it ─────────── */

for (const [label, body, expected] of [
  ['readonly-modifier', 'a: string, readonly extra?: string', /readonly extra/],
  ['quoted-name', 'a: string, "extra"?: string', /"extra"/],
  ['index-signature', 'a: string, [key: string]: unknown', /\[key/],
  ['duplicate-name', 'a: string, a: number', /declared twice/],
  ['empty-type', 'a: string, b: ', /empty type/],
  ['shorthand', 'a: string, b', /no `: type`/],
  ['interior-empty-member', 'a: string, , b: number', /empty member/],
]) {
  test(`R6-03/${label}: an unsupported member is REFUSED, not silently dropped`, () => {
    assert.throws(
      () => typedFields(body),
      (err) => {
        assert.match(err.message, /unsupported contract member/, 'the refusal is named as such');
        assert.match(err.message, expected, 'and it quotes the fragment that caused it');
        return true;
      },
    );
  });
}

/* ── the controls: supported syntax is unchanged ───────────────────────────── */

test('R6-03h: supported declarations still parse, optionality included', () => {
  const fields = typedFields('a: string, b?: number, c: Array<{ d: string }>');
  assert.deepEqual(fields, [
    { name: 'a', optional: false, type: 'string' },
    { name: 'b', optional: true, type: 'number' },
    // The nested braces must not be split on, and the type must survive normalization.
    { name: 'c', optional: false, type: 'Array<{ d: string }>' },
  ]);
});

test('R6-03i: a TRAILING delimiter is spelling, not a malformed fragment', () => {
  // `{a: string,}` is legal TypeScript. Only an INTERIOR empty member is malformed, and
  // the difference matters because the trailing case is what a hand-edited row looks like.
  assert.deepEqual(
    typedFields('a: string,'),
    [{ name: 'a', optional: false, type: 'string' }],
  );
});

/* ── the regression Astra asked for: through the real table reader ─────────── */

/** One contract-table row declaring `shape`, in the document's own escaping. */
function row(shape) {
  return `| \`POST /api/run/daily\` | T2 | S4 | spawn | \`202 ${shape}\` | — |\n`;
}

test('R6-03j: the TABLE READER refuses a widened row, not only the tokenizer', () => {
  const base = '{requestId: string, runId: string \\| null}';
  const widened = '{requestId: string, runId: string \\| null, readonly extra?: string}';

  // The control first, so the refusal below is attributable to the ADDED member rather
  // than to the row shape or the `\|` unescaping.
  assert.deepEqual(
    contractRowTypedFields('POST /api/run/daily', row(base)).map((f) => f.name),
    ['requestId', 'runId'],
  );

  // Before the fix this returned exactly those two names for the widened row as well.
  assert.throws(
    () => contractRowTypedFields('POST /api/run/daily', row(widened)),
    (err) => {
      assert.match(err.message, /unsupported contract member/);
      assert.match(err.message, /readonly extra/);
      return true;
    },
  );
});

test('R6-03k: the REAL contract document still parses for the routes it declares', () => {
  const source = readFileSync(CONTRACTS_MD, 'utf8');
  for (const route of ['GET /api/backlog', 'POST /api/run/daily', 'POST /api/repair']) {
    const fields = contractRowTypedFields(route, source);
    assert.notEqual(fields.length, 0, `${route} declares typed fields`);
    for (const f of fields) {
      assert.equal(typeof f.type, 'string');
      assert.ok(f.type.length > 0, `${route}: ${f.name} has a type`);
    }
  }
});
