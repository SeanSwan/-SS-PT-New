/*
 * contract-table.mjs — find a route's RESPONSE COLUMN in a markdown table and return
 * the whole type expression that column declares.
 *
 * WHY THIS IS ITS OWN MODULE. `contract-types.mjs` was already at 241 of the 300-line
 * cap (rule 4) when R7-03 needed header-driven column selection, balanced-brace
 * extraction and a whole-expression check. The seam was already there: this file reads
 * TABLE STRUCTURE, that file reads TYPE TEXT. Nothing here knows what a type is.
 *
 * THE DEFECT THIS CLOSES (R7-03, measured by Astra round 7). The previous reader was:
 *
 *   .find((line) => line.startsWith(`| \`${route}\``));
 *   const m = /\{([^}]*)\}/.exec(row.replace(/\\\|/g, '|'));
 *
 * Three failures in two lines, and only the first is about strictness:
 *
 *   1. `.find()` takes the FIRST row for the route. A route declared twice silently
 *      compared the first declaration and never read the second.
 *   2. `/\{([^}]*)\}/` takes the first brace pair ANYWHERE in the row. In
 *      `05-contracts.md` §2b the ERRORS column carries `{holder}`, and an
 *      engine-function column carrying braces would be read as the response shape.
 *   3. `[^}]*` stops at the first `}`. So `{…} & {…}` and `{…} | {…}` were truncated to
 *      their first object and compared as if that were the whole declaration — a
 *      fragment compared while claiming to be the declaration.
 *
 * Strictness inside `typedFields()` cannot see any of that: it receives only the
 * substring this file handed it. A parser is only as complete as its extraction.
 *
 * @module creator-brains-console/test/contract-table
 */

import assert from 'node:assert/strict';

/*
 * THE TYPE SCANNER MOVED TO `contract-names.mjs` (R9-06/R9-07, rule 4).
 *
 * The R9-06 and R9-07 fixes — escape-aware literals in this scanner, and a fence state
 * that records LENGTH and INDENTATION rather than a single character — took this file to
 * 316 lines against rule 4's hard 300-line cap. The cap is a cap, not a budget: the fix
 * is to extract at the seam, never to golf the comments until the reasoning that
 * justifies the code is gone.
 *
 * THE SEAM IS THE ONE THIS HEADER ALREADY NAMED: "this file reads TABLE STRUCTURE, that
 * file reads TYPE TEXT. Nothing here knows what a type is." `wholeObjectShape` is the
 * one function here that knows what a type is — it walks a brace-list expression
 * tracking string literals, which is the concern `contract-names.mjs` already owns for
 * `splitTopLevel` and `stripComments`. It lives there now, beside them.
 *
 * IT IS IMPORTED AS WELL AS RE-EXPORTED, and that is not redundancy. A re-export makes
 * the name available to importers of THIS module but does NOT bind it in this module's
 * own scope, so `responseShapeFor` below — which calls it — would have compiled and then
 * failed at call time with `wholeObjectShape is not defined`. Measured, before the
 * import was added: 18 tests red with exactly that ReferenceError. Re-exporting it
 * separately keeps every existing `from './contract-table.mjs'` import working, so no
 * caller changes.
 */
import { wholeObjectShape } from './contract-names.mjs';

export { wholeObjectShape } from './contract-names.mjs';

/**
 * Split a markdown table row into cells on UNESCAPED pipes.
 *
 * `\|` is how a table escapes a pipe inside a cell — and §2b's response column is full
 * of them, because a TypeScript union is written `string \| null` there. Splitting on a
 * bare `|` would cut the type in half and then read the halves as separate columns.
 * A NUL placeholder is used rather than a printable sentinel so a cell can never be
 * mistaken for one.
 */
export function tableCells(row) {
  return row
    .replace(/\\\|/g, '\u0000')
    .split('|')
    .map((cell) => cell.replace(/\u0000/g, '|'));
}

/** The index of the column whose header names the response, or -1 when there is none. */
export function responseColumnIndex(header) {
  return tableCells(header).findIndex((cell) => /response/i.test(cell));
}

/** The `|---|---|` separator between a header and its rows. */
const SEPARATOR = /^\|[\s:|-]+\|$/;

/**
 * The nearest preceding table header for the row at index `i`, or null.
 *
 * THE HEADER IS THE LINE ABOVE THE `|---|` SEPARATOR, and the first version of this
 * function got that wrong: it skipped separator lines and returned the first other
 * `|`-line it met going up, which is the ROW IMMEDIATELY ABOVE — a data row, not a
 * header. It appeared to work for §2b only because those two rows sit directly under
 * their separator, so "the line above" and "the header" happened to be the same line.
 * For every row further down the table it returned the previous route's row, whose
 * columns carry no `Response` header, and `responseColumnIndex` then answered -1.
 * `R6-03k` caught it by parsing `GET /api/backlog`, which is eight rows into §2a.
 *
 * So the walk goes UP TO THE SEPARATOR and takes the line ABOVE it. A separator with no
 * `|`-line above it is a headerless table and is reported as such rather than borrowing
 * an unrelated row.
 */
export function headerFor(lines, i) {
  for (let j = i - 1; j >= 0; j--) {
    const line = lines[j];
    if (!line.startsWith('|')) return null;
    if (!SEPARATOR.test(line)) continue;
    const header = lines[j - 1];
    return header !== undefined && header.startsWith('|') ? header : null;
  }
  return null;
}

/** The trimmed content of the FIRST code span in a cell, or null when it has none. */
function cellCode(cell) {
  const m = /`([^`]*)`/.exec(cell);
  return m === null ? null : m[1].trim();
}

/**
 * Every line index in `source` that is a table row declaring `route` in its FIRST cell.
 *
 * ── R8-02: ROW DISCOVERY COUNTED FORMATTING, AND COULD NOT SEE A FENCE ────────
 *
 * The previous form was a literal prefix test over every line:
 *
 *   if (lines[i].startsWith(`| \`${route}\``)) out.push(i);
 *
 * Three failures, and the first is a false NEGATIVE that hides a duplicate:
 *
 *   1. THE SPACE AFTER THE LEADING PIPE WAS PART OF THE MATCH. A row written
 *      `|`GET /api/x`|…` — legal markdown, and what a formatter may well emit — was not
 *      found at all. A route declared twice, once with the space and once without,
 *      yielded ONE row, so the "exactly one row" guard in `responseShapeFor` passed
 *      while a second declaration sat unread. Counting formatting is not counting
 *      declarations.
 *   2. NO FENCE AWARENESS. Every line was a candidate, so a fenced EXAMPLE of a table —
 *      the form this document uses constantly to show a shape — was counted as a
 *      declaration of the route it names. A route with one real row and one fenced
 *      example reported TWO rows and was refused.
 *
 * THE FENCE STATE IS A LENGTH AND AN INDENTATION, NOT A SINGLE CHARACTER (R9-06).
 * It used to record only the marker character, so a four-backtick opener followed by a
 * three-backtick line TOGGLED the fence closed on that inner marker — and then the
 * shorter marker on the next line toggled it OPEN again, exposing the very example row
 * the fence was hiding. Measured before the fix: the row was returned. CommonMark closes
 * a fence only on a run of the SAME character AT LEAST AS LONG as the opener; an indented
 * closer is literal content, not a closer (the indentation would split the run in the
 * opener too, so the opener's run length is measured after its indent either way).
 *   3. IT MATCHED ANYWHERE ON THE LINE, not in the method+path column. A row whose
 *      engine column happened to carry the route text counted as a declaration of it.
 *
 * So the row is identified by CELL now: the line is split with `tableCells` (which
 * applies the document's `\|` escaping), and the FIRST cell must hold exactly the route
 * inside a code span. Whitespace is formatting and is ignored; the route itself is
 * compared EXACTLY, so one route is never a prefix of another.
 */
export function rowIndexes(lines, route) {
  const out = [];
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opening = /^( *)(`{3,}|~{3,})/.exec(line);
    if (opening !== null) {
      const indent = opening[1].length;
      const ch = opening[2][0];
      const len = opening[2].length;
      if (fence === null) {
        fence = { ch, len, indent };
      } else if (
        ch === fence.ch && indent === fence.indent && len >= fence.len
        && line.slice(indent + len).trim() === ''
      ) {
        // A CLOSER, and only then. A fence closes on a run of the SAME character at
        // least as long as its opener, at the same indentation, with nothing but
        // whitespace after it. A shorter run, a longer run, a longer line and an
        // indented run are all CONTENT — which is why a four-backtick block can hold a
        // three-backtick example without the example's own marker ending the block.
        fence = null;
      }
      continue;
    }
    if (fence !== null) continue;
    if (!line.startsWith('|')) continue;
    // `tableCells` yields an empty leading cell for the run before the first `|`.
    if (cellCode(tableCells(line)[1] ?? '') === route) out.push(i);
  }
  return out;
}

/**
 * The response type expression `source` declares for `route`, as a brace-list BODY.
 *
 * ── WHY IT RETURNS THE BODY AND NOT THE BRACED EXPRESSION ─────────────────────
 *
 * The first version returned `wholeObjectShape`'s result, braces included, and that broke
 * two shipped tests (`T-B27m2b`, `R6-03j`) the moment this seam was introduced. Both
 * consumers — `typedFields()` and `memberNames()` — take a brace-list BODY, which is what
 * the inline reader this replaced produced (`typedFields(m[1])`, where `m[1]` came from
 * `/\{([^}]*)\}/` and so excluded the braces). Changing what the seam hands over without
 * changing the callers is the defect: `typedFields` received `{requestId: …}`, split it on
 * the top-level delimiters, found the whole braced expression at depth 1 as a single
 * member, and refused it as `` `{requestId` is not a plain field name ``.
 *
 * So the contract is explicit here and `wholeObjectShape` keeps returning the braced
 * expression it validates — the braces are what the tail check needs to see.
 *
 * EXACTLY ONE ROW, OR A REFUSAL. Two rows for one route is two declarations, and a
 * reader that compares only one of them reports agreement about a document it did not
 * fully read.
 */
export function responseShapeFor(route, source) {
  const lines = source.split('\n');
  const rows = rowIndexes(lines, route);
  assert.equal(
    rows.length, 1,
    `05-contracts.md declares ${rows.length} table rows for ${route}; this reader `
      + 'requires exactly one, because a second row is a second declaration and only '
      + 'one of them would be compared.',
  );
  const header = headerFor(lines, rows[0]);
  assert.ok(header, `the row for ${route} has no table header above it`);
  const column = responseColumnIndex(header);
  assert.notEqual(column, -1, `the table above ${route} declares no response column`);
  const cell = tableCells(lines[rows[0]])[column];
  assert.ok(cell !== undefined, `the row for ${route} has no response column`);
  // ── R8-01 · EXACTLY ONE CODE SPAN MAY HOLD THE SHAPE ───────────────────────
  // The first version took the FIRST code span and never looked at the rest. A cell
  // written `` `{a: string}` or `{b: number}` `` therefore compared the first
  // alternative and reported agreement about the second — a fragment compared while
  // claiming to be the declaration. So EVERY span is examined, and exactly one may
  // hold a `{…}`.
  //
  // "A SPAN THAT HOLDS A BRACE" RATHER THAN "ONE SPAN AT ALL", because this document
  // annotates a response in the same cell and the annotation may itself be code: §2b's
  // run row reads `` `202 {…}` (progress via `GET /api/run`) ``. Refusing any second
  // span outright would refuse a document written the way this one is written — the
  // over-refusal R7-03 already paid for once.
  const spans = [...cell.matchAll(/`([^`]*)`/g)].map((m) => m[1]);
  assert.ok(spans.length > 0, `the row for ${route} declares no code span in its response column`);
  const shapes = spans.filter((s) => /[{}]/.test(s));
  assert.equal(
    shapes.length, 1,
    `the row for ${route} declares ${shapes.length} code spans holding a \`{…}\` shape. `
      + 'This reader compares ONE response shape, so a second shape-like span is '
      + 'refused rather than skipped — skipping it would report agreement about a '
      + 'declaration that was never read.',
  );
  // The leading status code is the column's convention (`202 {…}`), not part of the type.
  const shape = wholeObjectShape(shapes[0].replace(/^\s*\d{3}\s*/, ''), `the row for ${route}`);
  return shape.slice(1, -1);
}
