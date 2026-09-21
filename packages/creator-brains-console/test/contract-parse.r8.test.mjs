/*
 * contract-parse.r8.test.mjs — round 8's findings, pinned.
 *
 * WHY A SEPARATE FILE PER ROUND. Rule 4 caps every console source file at 300 lines and
 * test files are not exempt, so round 7's tests already live in their own file and
 * appending round 8's to it would break the cap and then tempt someone to golf the
 * comments that carry the reasoning. A round's findings also fail together and are read
 * together, which is the seam the cap is asking for.
 *
 * WHAT ROUND 8 FOUND, AND WHAT EACH TEST HERE IS FOR. Eight findings, all LOW, and the
 * headline is R8-07: R7-01 removed a string-prefix containment test from the guard and
 * left the SAME test standing one file over, in a fixture validator — the sixth
 * consecutive round in which "a fix aimed at a row is not a fix aimed at a class" held.
 * R8-07 itself is pinned in `store-attacks.r8.test.mjs`; this file pins the reader
 * findings, R8-01 through R8-06.
 *
 * A NOTE ON THE CONTROLS. Every refusal below is paired with a positive control, and
 * that is not ceremony. R7-03's first fix refused ANY non-empty tail and would have made
 * a correctly-written document unreadable; R8-05 was an over-refusal inside the very
 * grammar R7-04 built. A refusal that fires on legal input is a defect, so each
 * tightened reader is shown reading the real artifacts as well as refusing the broken
 * ones — `R8-01b` and `R8-02b` drive the SHIPPED document, not a fixture.
 *
 * @module creator-brains-console/test/contract-parse.r8
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { contractRowShape, interfaceFields } from './contract-parse.mjs';
import { memberNames, splitTopLevel, stripComments } from './contract-names.mjs';
import { contractRowTypedFields, normalizeType } from './contract-types.mjs';
import { responseShapeFor, rowIndexes } from './contract-table.mjs';

const HEADER = '| Method+Path | Tier | Owner slice | Engine function | Planned response 2xx | Planned errors |';
const SEPARATOR = '|---|---|---|---|---|---|';

/** A §2b-shaped row whose response cell is `cell` verbatim. */
const row = (route, cell) => `| \`${route}\` | T2 | S4 | f | ${cell} | — |`;
const table = (...rows) => [HEADER, SEPARATOR, ...rows].join('\n');

/* ── R8-01 · the extraction compared a FRAGMENT as the whole response ─────── */

test('R8-01a: a WRAPPER before the shape is refused, not read as its right-hand object', () => {
  // `text.indexOf('{')` found the first brace and DISCARDED everything before it, so
  // `Array<{a: string}>` returned `{a: string}` — the ELEMENT of an array, compared while
  // claiming to be the response shape. The head was never examined at all; the tail was.
  for (const shape of [
    'Array<{a: string}>', 'Partial<{a: string}>', 'Readonly<{a: string}>', 'Foo & {a: string}',
  ]) {
    assert.throws(
      () => responseShapeFor('POST /api/x', table(row('POST /api/x', `\`200 ${shape}\``))),
      /before its/,
      `${shape} must be refused — returning the inner object compares a FRAGMENT`,
    );
  }
  // THE POSITIVE CONTROL, and the property the old note was defending: the scan is still
  // BALANCED, so a nested object inside a member is not truncated at its inner brace.
  assert.equal(
    responseShapeFor('POST /api/x', table(row('POST /api/x', '`200 {a: {d: string}}`'))),
    'a: {d: string}',
  );
});

test('R8-01b: a SECOND shape-like code span is refused, a prose annotation is not', () => {
  // The reader took the FIRST code span and never looked at the rest, so a cell offering
  // two alternative shapes compared the first and reported agreement about the second.
  assert.throws(
    () => responseShapeFor('POST /api/x', table(row('POST /api/x', '`200 {a: string}` or `{b: number}`'))),
    /declares 2 code spans/,
  );
  // THE OVER-REFUSAL CONTROL, ON THE SHIPPED DOCUMENT. §2b's run row carries a SECOND
  // code span in the response cell (`progress via GET /api/run`), so a rule of "one span
  // at all" would refuse a document written the way this one is written. The rule is
  // "one span HOLDING A SHAPE", and these two rows are why.
  assert.deepEqual(contractRowShape('POST /api/run/daily'), ['requestId', 'runId']);
  assert.deepEqual(contractRowShape('POST /api/repair'), ['built', 'emptied', 'repaired']);
});

/* ── R8-02 · row discovery counted FORMATTING, and could not see a fence ──── */

test('R8-02a: a row written without the space after `|` is FOUND, so a duplicate is not hidden', () => {
  // The space after the leading pipe was part of the match, so this row was invisible —
  // and a route declared twice, once each way, reported ONE row and passed the
  // "exactly one row" guard while a second declaration sat unread.
  const tight = '|`POST /api/x`|T2|S4|f|`200 {b: number}`|—|';
  const lines = table(row('POST /api/x', '`200 {a: string}`'), tight).split('\n');
  assert.deepEqual(rowIndexes(lines, 'POST /api/x'), [2, 3]);
  assert.throws(() => responseShapeFor('POST /api/x', lines.join('\n')), /declares 2 table rows/);
});

test('R8-02b: a FENCED example is an example, not a declaration', () => {
  const lines = [
    HEADER, SEPARATOR,
    row('POST /api/x', '`200 {a: string}`'),
    '```md',
    row('POST /api/x', '`200 {b: number}`'),
    '```',
  ];
  assert.deepEqual(rowIndexes(lines, 'POST /api/x'), [2]);
  // ...and the document still reads through it, which is the control: fence awareness
  // must not cost the reader the rows that ARE declarations.
  assert.deepEqual(contractRowShape('POST /api/x', lines.join('\n')), ['a']);
  // A fence closes only on its OWN marker: a ``` inside a ~~~ block is content.
  const tilde = ['~~~', '```', row('POST /api/x', '`200 {a: string}`'), '~~~'];
  assert.deepEqual(rowIndexes(tilde, 'POST /api/x'), [], 'the inner fence must not reopen the block');
});

test('R8-02c: PIN — the route is matched in the METHOD+PATH cell, not anywhere on the line', () => {
  // THIS IS A STRUCTURAL PIN, NOT A MUTATION-PROOF OF R8-02, and it is labelled because
  // the distinction matters. The old reader was `lines[i].startsWith(...)`, which is
  // already anchored to the start of the LINE — so a route named in the engine column was
  // never matched, and this test would have passed BEFORE the fix too. No mutant of the
  // old code can redden it.
  //
  // What it pins is the new reader's contract: the row is identified by CELL, so a naive
  // rewrite that searched the line for the route text would count a row whose engine
  // column merely mentions it. That is a real regression risk introduced by moving from a
  // line prefix to a cell, which is why the pin exists.
  const lines = [HEADER, SEPARATOR,
    '| `GET /api/other` | T0 | f | `GET /api/x` | `200 {a: string}` | — |'];
  assert.deepEqual(rowIndexes(lines, 'GET /api/x'), []);
  assert.deepEqual(rowIndexes(lines, 'GET /api/other'), [2]);
});

/* ── R8-03 · an ESCAPED quote was structural in three scanners ────────────── */

test('R8-03a: the DECLARATION SCANNER does not end a literal at an escaped quote', () => {
  // `a: 'it\'s'; b: number;` used to end the literal at the escaped quote, so the `;`
  // after it was read as string content and the interface was swallowed to its end —
  // returning `a` alone from a two-field declaration.
  const src = ['export interface X {', "  a: 'it\\'s';", '  b: number;', '}'].join('\n');
  assert.deepEqual(interfaceFields(src, 'X').map((f) => f.name), ['a', 'b']);
});

test('R8-03b: the SPLITTER and the NAME READER do not end a literal at an escaped quote', () => {
  // Same class, one scanner over: without the escape the `,` after the literal was read as
  // string content, so the remaining members vanished from the list.
  assert.deepEqual(splitTopLevel("a: 'it\\'s', b: number"), ["a: 'it\\'s'", ' b: number']);
  assert.deepEqual(memberNames("a: 'it\\'s', b: number"), ['a', 'b']);
});

test('R8-03c: the TYPE NORMALISER does not rewrite the inside of a literal', () => {
  // The escape used to end the literal early, so the whitespace after it was normalised as
  // TYPE TEXT — and `'it\'s  two'` collapsed onto `'it\'s two'`, making two DIFFERENT
  // literal types compare equal. That defeats R7-05's own rule, which says whitespace is
  // spelling only OUTSIDE a literal.
  assert.notEqual(normalizeType("'it\\'s  two'"), normalizeType("'it\\'s two'"));
  assert.equal(normalizeType("'it\\'s'"), "'it\\'s'");
});

/* ── R8-04 · incomplete input was accepted as a shorter, complete-looking list ─ */

test('R8-04a: a comma and a newline SEPARATE members, not only a semicolon', () => {
  // `expectField` was re-armed ONLY by `;`, so in both of these forms the second property
  // was never read and the declaration compared EQUAL to one that omitted it.
  assert.deepEqual(
    interfaceFields('export interface X { a: string, extra: number }', 'X').map((f) => f.name),
    ['a', 'extra'],
  );
  assert.deepEqual(
    interfaceFields(['export interface X {', '  a: string', '  extra: number', '}'].join('\n'), 'X')
      .map((f) => f.name),
    ['a', 'extra'],
  );
  // THE PROBE'S JOB. A type continued onto the next line must NOT be split, or the reader
  // would invent a member called `null`.
  assert.deepEqual(
    interfaceFields(['export interface X {', '  a: string |', '  null', '}'].join('\n'), 'X')
      .map((f) => f.name),
    ['a'],
  );
});

test('R8-04b: a TRUNCATED declaration is refused, not returned as a shorter list', () => {
  // `export interface X { a: string;` used to yield `[a]`, so a cut-off declaration
  // compared EQUAL to a complete one.
  assert.throws(() => interfaceFields('export interface X { a: string;', 'X'), /is not terminated/);
  assert.throws(() => splitTopLevel('a: Array<string'), /unclosed/);
  assert.throws(() => memberNames('a: Array<string'), /unclosed/);
  // A STACK, NOT A COUNTER: `Array<(string]>` is balanced by COUNT and malformed by KIND.
  assert.throws(() => splitTopLevel('a: Array<(string]>'), /is still open/);
});

/* ── R8-05 · an OVER-REFUSAL inside the grammar R7-04 built ───────────────── */

test('R8-05a: a colon INSIDE a quoted name is read, not refused', () => {
  // `raw.indexOf(':')` is a second, dumber source of a fact the grammar already knows. For
  // `'a:b': string` it landed on the colon inside the quotes, disagreed with `readMember`,
  // and the reader THREW on valid TypeScript.
  assert.deepEqual(memberNames("'a:b': string"), ['a:b']);
  assert.deepEqual(memberNames('"x:y"?: number'), ['x:y?']);
  // The refusals this check was protecting are all preserved, because `readMember` is
  // anchored and simply does not match an index signature.
  assert.throws(() => memberNames('[key: string]: unknown'), /unsupported contract member/);
});

test('R8-05b: a comment between two tokens does not JOIN them', () => {
  // Deleting a comment outright renamed a field: `readonly/* note */slug` came out as
  // `readonlyslug`. A comment is trivia, and trivia must not change what a token IS.
  assert.equal(stripComments('readonly/* note */slug: string'), 'readonly slug: string');
  assert.deepEqual(
    interfaceFields(['export interface X {', '  a/* note */: string;', '  b: number;', '}'].join('\n'), 'X')
      .map((f) => f.name),
    ['a', 'b'],
  );
});

/* ── R8-01/R8-02 · the two readers still agree on the shipped document ─────── */

test('R8-01c: the tightened extraction still reads the real document, both ways', () => {
  // The class-level control. R8-01 and R8-02 both tighten the SAME seam, so a mistake in
  // either would show up here as a refusal of the contract of record rather than as a
  // wrong answer — which is the direction that fails loudly.
  for (const route of ['POST /api/run/daily', 'POST /api/repair']) {
    const typed = contractRowTypedFields(route).map((f) => (f.optional ? `${f.name}?` : f.name)).sort();
    assert.deepEqual(contractRowShape(route), typed, `${route}: the two readers disagree`);
  }
});
