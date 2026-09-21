/*
 * contract-readers.r9.test.mjs — the R9-06 / R9-07 parser repairs, WITH their mutants.
 *
 * WHY THIS FILE EXISTS AT ALL, which is the interesting part. The three repairs were
 * made, the suite went green, and a mutation run then reported:
 *
 *   M3 STAYED-GREEN   the fence's indent comparison
 *   M4 STAYED-GREEN   the refusal for an unreadable member line
 *
 * Two of the three fixes were covered by NO test. Reverting either left the suite fully
 * green — which is Astra's finding #7 ("the supplied contract readers retain silent
 * omission and legal-input refusal paths") turned on my own fix: a behaviour change with
 * nothing to notice its absence. The green suite was not evidence that the repairs were
 * load-bearing; it was evidence that nothing had broken. Those are different claims, and
 * only the second was true.
 *
 * So every case below names the mechanism it pins, and each is written so that the
 * corresponding mutant fails it. The mutations are recorded beside the case rather than
 * in a commit message, because the next reader's question is "what would go red if this
 * were wrong", not "what did the author intend".
 *
 * These are the EXTRA sites — the ones the shipped R8 tests did not reach. The shipped
 * R8-03b/R8-04a cases already pin escape handling and the continuation discriminator, and
 * are left exactly as they are.
 *
 * @module creator-brains-console/test/contract-readers.r9
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { interfaceFields } from './contract-scan.mjs';
import { rowIndexes, wholeObjectShape } from './contract-table.mjs';

const names = (lines) => interfaceFields(lines.join('\n'), 'X').map((f) => f.name);

/* ── R9-06 · wholeObjectShape: escaped quotes in the brace scanner ─────────── */

test('R9-06a: an escaped quote does not close the literal, so the shape is whole', () => {
  // MUTANT: delete the `escaped` branches from this scanner -> the escaped quote closes
  // the literal, the following quote opens another, the closing brace is swallowed and
  // this returns REFUSED instead of the shape. Pinned by R8-03b for the OTHER two
  // scanners, which is why the removal of both sites in one mutation is red: this case
  // is what makes the wholeObjectShape site load-bearing on its own.
  const shape = "{a: 'it\\'s'; b: number}";
  assert.equal(wholeObjectShape(shape, 'synthetic'), shape);

  // A brace inside a literal is not the end of the shape, and an escaped quote in a
  // DOUBLE-quoted literal is the same rule.
  assert.equal(wholeObjectShape('{a: "x}y"}', 'synthetic'), '{a: "x}y"}');
  assert.equal(wholeObjectShape('{a: "it\\"s"}', 'synthetic'), '{a: "it\\"s"}');

  // CONTROL: the unescaped form still closes normally, so the above is not passing
  // because the scanner stopped looking for a closing brace at all.
  assert.equal(wholeObjectShape("{a: 'x'; b: number}", 'synthetic'), "{a: 'x'; b: number}");
});

/* ── R9-07 · rowIndexes: fence LENGTH and INDENTATION ─────────────────────── */

test('R9-06b: a shorter marker inside a longer fence is CONTENT, not a closer', () => {
  // MUTANT: restore the single-character fence state -> the ``` line toggles the fence
  // closed, the row is exposed, and this returns [2] instead of [].
  const lines = ['````md', '```', '| `POST /api/x` | `200 {a: string}` |', '````'];
  assert.deepEqual(rowIndexes(lines, 'POST /api/x'), []);

  // MUTANT: drop the LENGTH comparison (`len >= fence.len`) -> the four-backtick closer
  // becomes content and the block never ends, which this pins by closing it.
  const closed = ['````md', '````', '| `POST /api/x` | `200 {a: string}` |'];
  assert.deepEqual(rowIndexes(closed, 'POST /api/x'), [2],
    'after the fence closes the row is a declaration again');

  assert.deepEqual(rowIndexes(['```md', '```', '| `POST /api/x` | `200 {a: string}` |'], 'POST /api/x'), [2]);
});

test('R9-06c: an INDENTED marker is content, and a fence still closes unindented', () => {
  // MUTANT: drop the indent comparison -> the indented `   ``` `` line is read as a
  // closer and the row below it is exposed.
  const indented = ['```md', '   ```', '| `POST /api/x` | `200 {a: string}` |', '```'];
  assert.deepEqual(rowIndexes(indented, 'POST /api/x'), []);

  const plain = ['```md', '```', '| `POST /api/x` | `200 {a: string}` |'];
  assert.deepEqual(rowIndexes(plain, 'POST /api/x'), [2]);

  // A fence that closes with NON-WHITESPACE after it is content, so the row stays hidden.
  const trailing = ['```md', '``` not-a-closer', '| `POST /api/x` | `200 {a: string}` |', '```'];
  assert.deepEqual(rowIndexes(trailing, 'POST /api/x'), []);

  // A tilde fence is a different marker and does not close a backtick fence (the R8-02
  // rule, re-pinned here because the state object changed shape and this is what would
  // have been lost by the new form).
  const mixed = ['```md', '~~~', '| `POST /api/x` | `200 {a: string}` |', '```'];
  assert.deepEqual(rowIndexes(mixed, 'POST /api/x'), []);
});

/* ── R9-07 · interfaceFields: a refused member line, and the continuations ── */

test('R9-07a: a member line the grammar cannot read is REFUSED, not absorbed', () => {
  // MUTANT: remove the refusal (`if (false)`) -> `foo(): void` is read as the
  // continuation of `a: string` and the method silently vanishes, so this case does not
  // throw and the declaration extracts to `['a']`. That was the shipped behaviour and it
  // is what Astra's finding #7 measured: `[a]` is exactly what a declaration WITHOUT the
  // method extracts to, so the comparison reported agreement about a member it never read.
  assert.throws(() => names(['export interface X {', '  a: string', '  foo(): void', '}']),
    /unsupported contract member/);
  assert.throws(() => names(['export interface X {', '  a: string', '  [k: string]: unknown', '}']),
    /unsupported contract member/);
});

test('R9-07b: a CONTINUED type is not refused, because it is not a member line', () => {
  // THE OTHER DIRECTION, and the reason the first form of this guard was wrong. Both a
  // continuation and an unreadable member are indented, so indentation cannot tell them
  // apart — that version refused the legal `a: string |` + `null` that R8-04a pins, and
  // refused every one-, two- and three-field control as well by treating the closing
  // brace as an unreadable member.
  //
  // MUTANT: neuter the discriminator (`const OPEN_ENDED = /$^/`) -> the `|` and `&`
  // continuations below are refused. Red.
  assert.deepEqual(names(['export interface X {', '  a: string |', '  null', '}']), ['a']);
  assert.deepEqual(names(['export interface X {', '  a: A &', '  B', '}']), ['a']);
  assert.deepEqual(names(['export interface X {', '  a: (x: number,', '  y: string)', '}']), ['a']);
  assert.deepEqual(names(['export interface X {', '  a: Array<', '  string', '>', '}']), ['a']);
});

test('R9-07c: the closing brace on its own line is not a member, and is not refused', () => {
  // MUTANT: drop the `token !== '}'` exclusion -> EVERY declaration whose last member is
  // followed by a newline is refused, quoting `}` as the unreadable member. Red on this
  // case and on the shipped suite, which is how it was found.
  assert.deepEqual(names(['export interface X {', '  a: string', '}']), ['a']);
  assert.deepEqual(names(['export interface X {', '  a: string', '  b: number', '}']), ['a', 'b']);
  assert.deepEqual(names(['export interface X {', '  a: string', '  b: number', '  c: number', '}']),
    ['a', 'b', 'c']);
  // And the real documents still read, which is the control that the refusal has not
  // become a blanket one: both artifacts this suite compares must keep parsing.
  assert.deepEqual(names(['export interface X { a: string, extra: number }']), ['a', 'extra']);
});
