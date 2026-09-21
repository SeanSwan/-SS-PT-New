/*
 * R7 — THE CONTRACT READERS: extraction, grammar, and normalisation
 * (Astra round 7, 2026-09-20).
 *
 * WHAT THIS FILE IS FOR. Round 7 filed five findings against the readers that derive the
 * contract from text, and the fixes for all five landed together — which is why the
 * regressions for R7-03, R7-04 and R7-05 share one file. They share a subject, not just
 * a date: each one is a reader that produced an ANSWER where it should have produced a
 * REFUSAL, or refused where it should have produced an answer.
 *
 *   R7-03  the response-shape extraction took the first row and the first brace pair
 *   R7-04  the member grammar could not read `readonly`/quoted/`$` names and SKIPPED them
 *   R7-05  whitespace normalisation merged distinct string literals and split one type
 *
 * ── AND THE FIXES' OWN DEFECTS, WHICH ARE TESTED HERE TOO ─────────────────────
 *
 * The R7-03 fix introduced four defects, three of them caught by the SHIPPED suite the
 * moment it ran (`T-B27m2b`, `R6-03j`, `R6-03k`, `R5-04a`) and one — the over-strict
 * tail — caught by reading the document. They are pinned here rather than left to the
 * tests that happened to catch them, because a defect caught by accident is one refactor
 * away from being invisible:
 *
 *   `headerFor` returned the row ABOVE, not the header (only the row directly under a
 *   separator made those the same line) — `R7-03e`/`R7-03f`
 *   `responseShapeFor` handed over a BRACED expression where both consumers take a body
 *   — `R7-03g`
 *   the tail check refused ANY annotation, and this document annotates responses
 *   — `R7-03d`
 *   `normalizeType` emitted `string|null` and so rewrote the spelling every document
 *   and test pins — `R7-05c`
 *
 * @module creator-brains-console/test/contract-parse.r7
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  CONTRACTS_MD, contractRowShape, interfaceFields, stripComments,
} from './contract-parse.mjs';
import { memberNames } from './contract-names.mjs';
import {
  headerFor, responseColumnIndex, responseShapeFor, rowIndexes,
} from './contract-table.mjs';
import { contractRowTypedFields, normalizeType } from './contract-types.mjs';

/* ── R7-04 · the comment stripper and the member grammar ──────────────────── */

test('R7-04a: a `//` inside a string literal is not a comment', () => {
  // The old stripper ran `//[^\n]*` ANYWHERE, so this line lost its type from `//` on.
  assert.equal(stripComments("url: 'https://x/y';"), "url: 'https://x/y';");
  assert.equal(stripComments('a: string; // gone').trim(), 'a: string;');
  // A BLOCK COMMENT IS REPLACED BY A SPACE, NOT DELETED (R8-05). This assertion used to
  // read `' a: string'` — one space, which is the comment DELETED and the source's own
  // space left behind. That encoded the defect: deleting a comment JOINS the tokens on
  // either side, so `readonly/* note */slug` came out as `readonlyslug`. The property
  // is asserted rather than the whitespace, because the whitespace is an artifact.
  assert.equal(stripComments('/* gone */a: string'), ' a: string');
  assert.equal(stripComments('readonly/* gone */slug: string'), 'readonly slug: string');
  // An ESCAPED quote must not close the literal early, or the `//` after it is read as a
  // comment again.
  assert.equal(stripComments("s: 'it\\'s//x';"), "s: 'it\\'s//x';");
});

test('R7-04b: `readonly`, quoted, `$` and numeric member names are READ, not skipped', () => {
  // Every one of these was invisible to `(\w+)(\??)` and then SKIPPED, so a declaration
  // carrying them extracted to exactly the fields of one without them.
  const src = [
    'export interface Wide {',
    '  readonly slug: string;',
    "  'quoted-name': number;",
    '  $store: boolean;',
    '  0: string;',
    '}',
  ].join('\n');
  assert.deepEqual(interfaceFields(src, 'Wide'), [
    { name: 'slug', optional: false },
    { name: 'quoted-name', optional: false },
    { name: '$store', optional: false },
    { name: '0', optional: false },
  ]);
});

test('R7-04b2: `readonly` is a MODIFIER before a name and a NAME on its own', () => {
  // The two are told apart by whether whitespace follows, which is the only signal
  // TypeScript gives either.
  assert.deepEqual(interfaceFields('export interface M { readonly a: string; readonly: boolean; }', 'M'), [
    { name: 'a', optional: false },
    { name: 'readonly', optional: false },
  ]);
});

test('R7-04c: a member the reader cannot parse is REFUSED, not skipped', () => {
  // The index signature is genuinely outside this grammar; the point is that it fails
  // LOUDLY rather than vanishing, because a member this reader drops is a member it
  // cannot compare.
  assert.throws(
    () => interfaceFields('export interface Bad { a: string; [key: string]: unknown; }', 'Bad'),
    (err) => {
      assert.match(err.message, /unsupported contract member/);
      assert.match(err.message, /\[key/);
      return true;
    },
  );
});

test('R7-04d: a `;` inside a string literal does not end a member', () => {
  // Same class as R7-04a, one layer up: the scanner's structure has to respect literals
  // too, or `a: 'x;y'` ends at the `;` and `y'` is then refused as a field name.
  assert.deepEqual(interfaceFields("export interface Lit { a: 'x;y'; b: number; }", 'Lit'), [
    { name: 'a', optional: false },
    { name: 'b', optional: false },
  ]);
});

test('R7-04e: the name reader keeps `?`, so optional is not the same as required', () => {
  // The old `fieldNames` stripped the marker BEFORE testing the name, so `b?` failed
  // `/^\w+$/` and was dropped — an optional field and a required one produced the same
  // list. That is the R5-04 hole one artifact over.
  assert.deepEqual(memberNames('a: string, b?: number'), ['a', 'b?']);
  assert.notDeepEqual(memberNames('a: string, b?: number'), memberNames('a: string, b: number'));
});

/* ── R7-03 · the extraction, and the seam the fix created ─────────────────── */

const HEADER = '| Method+Path | Tier | Owner slice | Engine function | Planned response 2xx | Planned errors |';
const SEPARATOR = '|---|---|---|---|---|---|';

/**
 * A one-row §2b-shaped table declaring `shape` in its response column.
 *
 * THE HELPER APPLIES THE DOCUMENT'S ESCAPING. A `|` inside a markdown cell MUST be
 * written `\|`, which is why §2b's response column is full of `string \| null`; an
 * unescaped pipe splits the cell and the reader then finds no code span in the column it
 * selected. Applying it here lets a fixture be written as the TYPE it declares rather
 * than as the markdown that encodes it — and the errors column carries `{holder}`
 * deliberately, so a fixture that ignored column selection could not pass.
 */
function table(shape, route = 'POST /api/x') {
  return [
    HEADER,
    SEPARATOR,
    `| \`${route}\` | T2 | S4 | spawn | \`200 ${shape.replace(/\|/g, '\\|')}\` | \`409 RUN_LOCKED {holder}\` |`,
  ].join('\n');
}

test('R7-03d: a composition after the shape is refused, a PROSE annotation is not', () => {
  // The ARRAY SUFFIX joined this list in R8-01: `{a: string}[]` is an array OF that
  // object, so reading the element's members as the response shape is the same
  // fragment-compared-as-whole defect the other three spell differently. It used to be
  // a documented residual, which is another way of saying it was unexamined.
  for (const shape of [
    '{a: string} & {b: number}', '{a: string} | null', '{a: string} | {b: number}', '{a: string}[]',
  ]) {
    assert.throws(
      () => responseShapeFor('POST /api/x', table(shape)),
      /an intersection, a union, an array suffix or a second object/,
      `${shape} must be refused — reading only the first object compares a fragment`,
    );
  }
  // THE OVER-REFUSAL CONTROL. The first version of this check refused any tail at all,
  // and this document annotates responses in the same cell as the shape — §2b's own run
  // row reads `{…} (progress via GET /api/run)`. A refusal that fires on legal input
  // makes a correct document unreadable.
  assert.deepEqual(
    memberNames(responseShapeFor('POST /api/x', table('{a: string} — a projected result'))),
    ['a'],
  );
});

test('R7-03e: a row EIGHT rows into a table still finds its OWN header', () => {
  // The regression as the shipped suite found it: `GET /api/backlog` is eight rows into
  // §2a, and `headerFor` returned the row above it — the `/api/run` row, whose columns
  // carry no `Response` header — so the response column came back as -1.
  const lines = readFileSync(CONTRACTS_MD, 'utf8').split('\n');
  const rows = rowIndexes(lines, 'GET /api/backlog');
  assert.equal(rows.length, 1, 'the real document declares exactly one backlog row');

  const header = headerFor(lines, rows[0]);
  assert.match(header, /Method\+Path/, 'the header, not the previous route row');
  assert.notEqual(responseColumnIndex(header), -1, 'and it has a response column');
  assert.deepEqual(
    memberNames(responseShapeFor('GET /api/backlog', lines.join('\n'))),
    ['lines'],
  );
});

test('R7-03f: headerFor returns the line above the SEPARATOR, not above the row', () => {
  // The shape of the bug, without a document: row 3 is the second data row and the
  // header is three lines above it. "The line above the row" is row 2.
  const lines = [
    '| A | Response 2xx |',
    '|---|---|',
    '| `r1` | `{a: string}` |',
    '| `r2` | `{b: string}` |',
  ];
  assert.equal(headerFor(lines, 3), '| A | Response 2xx |');
  assert.equal(headerFor(lines, 2), '| A | Response 2xx |');
  // ...and a table with no header above its separator is reported as headerless rather
  // than borrowing an unrelated line.
  assert.equal(headerFor(['|---|---|', '| `r1` | `{a}` |'], 1), null);
});

test('R7-03g: responseShapeFor hands over a BODY, which is what its consumers take', () => {
  // Both `typedFields` and `memberNames` take a brace-list body. Handing over the braced
  // expression made `typedFields` see one member called `{requestId`, which is how
  // `T-B27m2b` and `R6-03j` failed.
  assert.equal(responseShapeFor('POST /api/x', table('{a: string, b?: number}')), 'a: string, b?: number');
  assert.deepEqual(contractRowTypedFields('POST /api/x', table('{a: string, b?: number}')).map((f) => f.name), ['a', 'b']);
});

test('R7-03h: two rows for one route are refused by BOTH readers', () => {
  // R7-03's class completion. `contractRowShape` used `.find()` and read the first row
  // while claiming to have read the declaration; the extraction has one definition now,
  // so the names reader refuses a second row exactly as the typed reader does.
  const twice = [HEADER, SEPARATOR,
    '| `POST /api/x` | T2 | S4 | f | `200 {a: string}` | — |',
    '| `POST /api/x` | T2 | S4 | f | `200 {b: string}` | — |',
  ].join('\n');
  assert.throws(() => responseShapeFor('POST /api/x', twice), /declares 2 table rows/);
  assert.throws(() => contractRowTypedFields('POST /api/x', twice), /declares 2 table rows/);
  // ...and through the NAMES reader, which is the half that used to read the first row
  // silently. Without this assertion the delegation in `contractRowShape` is unproven:
  // reverting it would leave every other test in this file green.
  assert.throws(() => contractRowShape('POST /api/x', twice), /declares 2 table rows/);
});

test('R7-03h2: the NAMES reader reads the RESPONSE column, not the first brace in the row', () => {
  // The defect the old reader had, aimed at the column that triggers it: an
  // engine-function cell carrying a brace pair. `/\{([^}]*)\}/` over the whole row
  // returned `force` — a member of the ENGINE CALL, reported as the response shape.
  const src = [HEADER, SEPARATOR,
    '| `POST /api/x` | T2 | S4 | spawn({force: true}) | `200 {a: string}` | `409 RUN_LOCKED {holder}` |',
  ].join('\n');
  assert.deepEqual(contractRowShape('POST /api/x', src), ['a']);
  assert.deepEqual(contractRowTypedFields('POST /api/x', src).map((f) => f.name), ['a']);
});

test('R7-03i: the names reader reads the REAL document for both deferred routes', () => {
  // Guards the delegation itself: `contractRowShape` now goes through the table reader,
  // so this is the assertion that the delegation did not change the answer.
  assert.deepEqual(contractRowShape('POST /api/run/daily'), ['requestId', 'runId']);
  assert.deepEqual(contractRowShape('POST /api/repair'), ['built', 'emptied', 'repaired']);
});

test('R7-03j: the name reader and the TYPED reader agree on the real document', () => {
  // Two projections of one extraction. If they ever disagree, one of them is reading a
  // different part of the row than the other.
  for (const route of ['POST /api/run/daily', 'POST /api/repair']) {
    const typed = contractRowTypedFields(route).map((f) => (f.optional ? `${f.name}?` : f.name)).sort();
    assert.deepEqual(contractRowShape(route), typed, `${route}: the two readers disagree`);
  }
});

/* ── R7-05 · normalisation ────────────────────────────────────────────────── */

test('R7-05a: `string|null` and `string | null` are ONE type written twice', () => {
  // The old rule collapsed whitespace to a single space EVERYWHERE, so these compared
  // UNEQUAL and a legitimate edit to a contracts row was reported as drift.
  for (const spelling of ['string|null', 'string | null', 'string |null', 'string| null']) {
    assert.equal(normalizeType(spelling), 'string | null', spelling);
  }
  assert.equal(normalizeType('string  |  null'), 'string | null');
});

test('R7-05b: whitespace INSIDE a string literal is meaning, not spelling', () => {
  // The other direction: the old rule made these compare EQUAL, so a real difference was
  // invisible. Both halves matter — a fix that only unions the spellings would merge the
  // literals, and one that only preserves literals would split the union.
  assert.equal(normalizeType("'two  spaces'"), "'two  spaces'");
  assert.notEqual(normalizeType("'two  spaces'"), normalizeType("'two spaces'"));
  // A pipe inside a literal is part of the literal, not a union separator.
  assert.equal(normalizeType("'a|b'"), "'a|b'");
});

test('R7-05c: the canonical spelling is the one the project writes, `string | null`', () => {
  // The first R7-05 version was internally consistent but emitted `string|null`, which
  // silently rewrote every document and every pinned literal. Normalising toward the
  // spelling the project already writes is the fix; away from it is a rewrite.
  assert.equal(normalizeType('string | null'), 'string | null');
  assert.equal(normalizeType('Array<{ d: string }>'), 'Array<{ d: string }>');
  assert.equal(normalizeType(' number '), 'number');
});
