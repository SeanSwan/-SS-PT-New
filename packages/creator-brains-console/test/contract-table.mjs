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

/**
 * The complete `{…}` this text declares, refusing a SECOND SHAPE or a COMPOSITION.
 *
 * BALANCED, so a nested object survives — `Array<{ d: string }>` is supported syntax
 * and must keep working.
 *
 * THE TAIL IS PART OF THE CHECK, but the check is aimed at a NAMED DEFECT CLASS rather
 * than at deviation in general. `{a} & {b}` adds requirements, `{a} | {b}` admits
 * alternatives, and a second `{…}` is a second shape: in all three cases returning the
 * first brace pair would compare a FRAGMENT while claiming to compare the declaration.
 *
 * THE FIRST VERSION REFUSED *ANY* NON-EMPTY TAIL, and that was an OVER-REFUSAL — the
 * sibling of R7-01, in the same round, which is worth recording. §2a and §2b both
 * annotate a response in the same cell as the shape (`StatusInstrument` — **200 even
 * when damaged**; `{…}` (progress via `GET /api/run`)), so "no tail at all" would have
 * refused a document written the way this document is written. Today those annotations
 * sit OUTSIDE the code span this function is handed, so the strict form happened to
 * pass — it was correct by authoring convention, not by construction. A refusal that
 * fires on legal input is a defect: it makes a correct document unreadable and invites
 * someone to edit the document to satisfy the reader.
 *
 * RESIDUALS, named rather than hidden. A tail is NOT examined for:
 *   - `[]`, so `{a: string}[]` is read as the element's members. The other side of the
 *     comparison cannot express an array return (`methodReturnTypedFields` requires
 *     `Promise<{…}>`), so it refuses rather than agreeing.
 *   - a conditional type (`{a} extends B ? C : D`), which is not a shape this document
 *     uses and which no rule here can distinguish from prose.
 *   - prose containing a brace, which is refused — it is indistinguishable from a second
 *     shape, and refusing is the safe direction.
 */
export function wholeObjectShape(text, what) {
  const start = text.indexOf('{');
  assert.notEqual(start, -1, `${what} declares no \`{…}\` response shape`);
  let depth = 0;
  let quote = null;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quote !== null) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') { depth += 1; continue; }
    if (ch !== '}') continue;
    depth -= 1;
    if (depth > 0) continue;
    const tail = text.slice(i + 1).trim();
    assert.ok(
      !/[{}]/.test(tail) && !/^[&|]/.test(tail),
      `${what} declares \`{…}\` followed by \`${tail}\`. This reader compares a WHOLE `
        + 'response shape, so an intersection, a union or a second object is refused '
        + 'rather than silently dropped — dropping it would report agreement about a '
        + 'declaration that was never read.',
    );
    return text.slice(start, i + 1);
  }
  assert.fail(`${what} declares an unclosed \`{\` — the shape is not a shape`);
}

/** Every line index in `source` that is a table row for `route`. */
export function rowIndexes(lines, route) {
  const prefix = `| \`${route}\``;
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(prefix)) out.push(i);
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
  const span = /`([^`]*)`/.exec(cell);
  assert.ok(span, `the row for ${route} declares no code span in its response column`);
  // The leading status code is the column's convention (`202 {…}`), not part of the type.
  const shape = wholeObjectShape(span[1].replace(/^\s*\d{3}\s*/, ''), `the row for ${route}`);
  return shape.slice(1, -1);
}
