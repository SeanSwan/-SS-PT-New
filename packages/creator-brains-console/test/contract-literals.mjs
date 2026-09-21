/*
 * contract-literals.mjs — WHERE A STRING LITERAL STARTS AND ENDS, for the contract readers.
 *
 * WHY THIS IS ITS OWN MODULE (R9-06/R9-07, rule 4). `contract-names.mjs` held two
 * concerns: the NAME GRAMMAR (`readMember`, `memberNames` — "what is this member
 * called") and three LITERAL SCANNERS (`stripComments`, `splitTopLevel`,
 * `wholeObjectShape` — "where does a literal start and end"). Moving
 * `wholeObjectShape` into that file to satisfy the 300-line cap took it to 366 and
 * simply RELOCATED the violation, which is the thing to notice: a cap checked after the
 * fact will happily be honoured by pushing the excess somewhere else. The literal
 * scanners are the seam, because they are what round 9 changed — three scanners that had
 * drifted apart on escape state now share one model.
 *
 * WHY THIS IS NOT A `.test.mjs`. S1-H13 — a harness exported from a test file
 * re-registers that file's tests in every importer. This module registers nothing.
 *
 * @module creator-brains-console/test/contract-literals
 */

import assert from 'node:assert/strict';

/** The quote characters that open a literal in the artifacts this suite reads. */
const QUOTES = new Set(["'", '"', '`']);

/**
 * The refusal for a member this grammar does not support.
 *
 * IT LIVES HERE, NOT IN `contract-names.mjs` (rule 4). `splitTopLevel` below throws it on a
 * mismatched delimiter and on an unclosed one, and putting it in the name grammar would
 * make this module import from the module that imports this one. `contract-names.mjs`
 * re-exports it, so every existing import site is unchanged.
 */
export function unsupported(fragment, why) {
  return new Error(
    `unsupported contract member \`${String(fragment).trim()}\`: ${why}. Extend this `
      + 'parser\'s grammar deliberately rather than letting the member be ignored — a '
      + 'member this reader drops is a member it cannot compare.',
  );
}

/**
 * Remove comments, WITHOUT touching the inside of a string literal (R7-04).
 *
 * The previous form was two `replace` calls, the second of them a global regex meaning
 * "strip from `//` to the end of the line, ANYWHERE". That is right for a comment and
 * wrong for a literal: `url: 'https://…'` lost everything from the `//` onward, so the
 * member's type was truncated to `'https:` and the reader then compared a string that is
 * not in the file. A `//` inside a literal is not a comment marker, and only a walk that
 * tracks literal state can tell the two apart.
 *
 * A COMMENT IS REPLACED BY A NEWLINE, not by nothing, so the line structure the callers
 * depend on survives (`interfaceFields` counts nothing by line, but the r6 fixtures and
 * every diagnostic quote the document as written).
 *
 * RESIDUAL, named rather than hidden: a REGEX literal containing `//` (e.g. `/a\/\//`)
 * is still stripped. Deciding whether a `/` opens a regex or is division needs the
 * preceding token — the same ambiguity the TypeScript scanner resolves with parser
 * state, which this reader does not have. No regex literal appears in either artifact
 * this suite reads; if one appears, the member it sits in fails a comparison rather
 * than silently passing one.
 */
export function stripComments(text) {
  let out = '';
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote !== null) {
      out += ch;
      if (ch === '\\') {
        out += text[i + 1] ?? '';
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (QUOTES.has(ch)) {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      out += '\n';
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
      // A COMMENT IS REPLACED BY A SPACE, not by nothing (R8-05). Deleting it outright
      // JOINS the tokens on either side: `readonly/* note */slug: string` came out as
      // `readonlyslug: string`, so an edit that only removed a comment silently RENAMED
      // a field — and the reader then compared a name that is not in the file. The `//`
      // branch above emits a newline for the same reason: a comment is trivia, and
      // trivia must not change what the surrounding tokens ARE.
      out += ' ';
      continue;
    }
    out += ch;
  }
  return out;
}

/** The delimiter pairs a type may open. Tracked as a STACK, not a counter (R8-04). */
const PAIRS = { '<': '>', '{': '}', '[': ']', '(': ')' };
const CLOSERS = new Set(Object.values(PAIRS));

export function splitTopLevel(body) {
  const parts = [];
  const open = [];
  let quote = null;
  let escaped = false;
  let current = '';
  for (const ch of body) {
    if (quote !== null) {
      current += ch;
      // AN ESCAPED QUOTE DOES NOT CLOSE THE LITERAL (R8-03). Without this, `'it\'s'`
      // ended the literal at the escaped quote, so everything after it — including the
      // `;` that separates the NEXT member — was read as string content and the
      // remaining members vanished. `stripComments` has modelled this since R7-04; the
      // three scanners beside it had not.
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (QUOTES.has(ch)) { quote = ch; current += ch; continue; }
    if (Object.hasOwn(PAIRS, ch)) { open.push(PAIRS[ch]); current += ch; continue; }
    if (open.length > 0 && CLOSERS.has(ch)) {
      // A STACK, NOT A DEPTH COUNTER. `Array<(string]>` is balanced by count and
      // malformed by kind, so a counter accepted it (R8-04). A closer that does not
      // match the innermost opener is refused. A closer met with an EMPTY stack is
      // left alone on purpose: that is `>` in `(a: string) => void`, which is an
      // operator here and not a delimiter.
      if (ch !== open[open.length - 1]) {
        throw unsupported(body.slice(0, 80),
          `it closes \`${ch}\` while \`${open[open.length - 1]}\` is still open`);
      }
      open.pop();
      current += ch;
      continue;
    }
    if ((ch === ',' || ch === ';') && open.length === 0) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  // AN UNCLOSED DELIMITER IS REFUSED, not silently accepted (R8-04). `a: Array<string`
  // used to be read as one well-formed member whose type merely spelled oddly, so a
  // truncated declaration compared EQUAL to a complete one.
  if (open.length > 0) {
    throw unsupported(body.slice(0, 80), `it leaves \`${open.join('')}\` unclosed`);
  }
  parts.push(current);
  return parts;
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
 * ── R8-01: THE HEAD IS EXAMINED TOO, AND AN ARRAY SUFFIX IS REFUSED ──────────
 *
 * THE HEAD WAS NOT CHECKED AT ALL. `text.indexOf('{')` found the first brace and
 * everything before it was DISCARDED, so `Array<{a: string}>` returned `{a: string}` —
 * the ELEMENT of an array, compared while claiming to be the response shape. The same
 * held for `Partial<{…}>`, `Readonly<{…}>` and `Foo & {…}`: a wrapper or a composition
 * whose right-hand object was read as the whole declaration. `Array<{…}>` was
 * documented here as "supported syntax that must keep working", and that note was
 * itself the over-permissive assumption — what is preserved is the BALANCED scan, so a
 * nested object is not truncated; what is refused is claiming a fragment is the whole
 * shape. The other side of the comparison cannot express an array return
 * (`methodReturnTypedFields` requires `Promise<{…}>`), so refusing here agrees with it
 * rather than inventing a new strictness.
 *
 * A leading `[]` in the tail joins the refusal for the same reason: `{a: string}[]` is
 * an ARRAY of that object, and reading the element's members as the response shape is
 * the identical fragment-compared-as-whole defect. Only the literal `[]` is refused, so
 * a prose annotation that happens to open with a bracket (`{…} [see note]`) is still
 * read as prose.
 *
 * RESIDUALS, named rather than hidden. A tail is NOT examined for:
 *   - a conditional type (`{a} extends B ? C : D`), which is not a shape this document
 *     uses and which no rule here can distinguish from prose.
 *   - a function type (`{a} => void`), likewise indistinguishable from prose without a
 *     type grammar, and likewise unexpressible on the other side of the comparison.
 *   - prose containing a brace, which is refused — it is indistinguishable from a second
 *     shape, and refusing is the safe direction.
 */
export function wholeObjectShape(text, what) {
  const start = text.indexOf('{');
  assert.notEqual(start, -1, `${what} declares no \`{…}\` response shape`);
  // THE HEAD MUST BE EMPTY (R8-01). Anything before the `{` means the object is a
  // COMPONENT of a larger type — `Array<`, `Partial<`, `Foo & ` — and returning it
  // would compare a fragment while claiming to compare the declaration. This is the
  // mirror of the tail check below, and the first version had the tail and not the head.
  const head = text.slice(0, start).trim();
  assert.equal(
    head, '',
    `${what} declares \`${head}\` before its \`{…}\`. This reader compares a WHOLE `
      + 'response shape, so a wrapper or a composition is refused rather than read as '
      + 'its right-hand object — that would report agreement about a declaration that '
      + 'was never read.',
  );
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quote !== null) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; escaped = false; continue; }
    if (ch === '{') { depth += 1; continue; }
    if (ch !== '}') continue;
    depth -= 1;
    if (depth > 0) continue;
    const tail = text.slice(i + 1).trim();
    assert.ok(
      !/[{}]/.test(tail) && !/^[&|]/.test(tail) && !/^\[\]/.test(tail),
      `${what} declares \`{…}\` followed by \`${tail}\`. This reader compares a WHOLE `
        + 'response shape, so an intersection, a union, an array suffix or a second '
        + 'object is refused rather than silently dropped — dropping it would report '
        + 'agreement about a declaration that was never read.',
    );
    return text.slice(start, i + 1);
  }
  assert.fail(`${what} declares an unclosed \`{\` — the shape is not a shape`);
}
