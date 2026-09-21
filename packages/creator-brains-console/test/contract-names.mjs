/*
 * contract-names.mjs — the member-name grammar and the comment stripper, shared by
 * both contract readers.
 *
 * WHY THIS IS ITS OWN MODULE (R7-04). `contract-parse.mjs` and `contract-types.mjs`
 * both read the same thing — a brace list of TypeScript members — and they disagreed
 * about what a member IS. `contract-types.mjs` REFUSES a member it cannot read;
 * `contract-parse.mjs` dropped it on the floor. Two readers of one grammar, one strict
 * and one silent, is the R7-04 defect: a member the silent reader drops is a member it
 * cannot compare, and the comparison built on it then reports agreement about a
 * declaration that was never read.
 *
 * It is also the seam rule 4 wants. `contract-parse.mjs` was at 215 of the 300-line cap
 * when R7-04 needed a literal-aware comment stripper, a wider name grammar and a
 * refusing `memberNames()`. None of those three is about READING A FILE, which is what
 * that module is for, so they live here and both readers import them.
 *
 * WHAT THIS MODULE DOES NOT DO. It does not decide which artifact declares what, and it
 * does not compare anything. It turns text into member names, and it REFUSES text it
 * cannot read rather than returning a shorter list.
 *
 * ── A DELIBERATE ASYMMETRY, NAMED RATHER THAN LEFT TO BE FOUND ────────────────
 *
 * `memberNames()` here READS `readonly x: string`, `'quoted': string`, `$x: string` and
 * `0: string`. `typedFields()` in `contract-types.mjs` REFUSES the first two — that is
 * R6-03's shipped grammar, pinned by `contract-types.r6.test.mjs`, and it is not changed
 * here. So one row can be readable by the NAME link and refused by the doc→literal link.
 *
 * The two readers differ because they are asked different questions, and the difference
 * is deliberate on both sides:
 *
 *   `memberNames`  answers "which fields does this declare", and the live payload is the
 *                  other side of that comparison. A `readonly` field is a field the
 *                  bridge serves, so REFUSING it would make a legal declaration
 *                  unreadable and the payload check vacuous — an over-refusal.
 *   `typedFields`  answers "what TYPE does each field declare", for a link that compares
 *                  type expressions. R6-03's rule there is that unsupported syntax is a
 *                  hard failure rather than something absorbed, because an absorbed
 *                  member compares EQUAL to one that was never declared.
 *
 * `interfaceFields()` CANNOT delegate to `typedFields()` even if that were wanted: the
 * former must return members in DOCUMENT ORDER (`T-B27d` pins it) and `typedFields`
 * returns them SORTED. Two readers is therefore structural, not an oversight — and this
 * note exists so round 8 can judge it as a decision rather than report it as a discovery.
 *
 * @module creator-brains-console/test/contract-names
 */

/** The quote characters that open a literal in the artifacts this suite reads. */
const QUOTES = new Set(["'", '"', '`']);

/** The refusal for a member this grammar does not support. */
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
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * One member name at offset `i`, or `null` when there is none.
 *
 * THE GRAMMAR IS WIDER THAN `(\w+)(\??)` (R7-04). The old reader matched a bare
 * identifier and nothing else, so `readonly slug: string`, `'quoted-name': string`,
 * `$store: string` and `0: string` each failed to match — and the caller then ran
 * `if (!/\s/.test(ch)) expectField = false`, which SKIPS the member and carries on. A
 * declaration carrying an unreadable member therefore extracted to exactly the fields
 * of one without it: ignorance read as agreement.
 *
 * `readonly` IS MATCHED ONLY WHEN WHITESPACE FOLLOWS IT, because `readonly: boolean` is
 * a legal field NAME — without that condition the modifier and the name are
 * indistinguishable, and `readonly: boolean` would be read as a member called `boolean`.
 *
 * `length` is counted FROM `i`, so the caller resumes after the `:` without rescanning.
 */
export function readMember(text, i) {
  let j = i;
  while (j < text.length && /\s/.test(text[j])) j += 1;
  const m = /^(?:readonly\s+)?(?:'([^']+)'|"([^"]+)"|([\w$]+))(\?)?\s*:/.exec(text.slice(j));
  if (!m) return null;
  return {
    name: m[1] ?? m[2] ?? m[3],
    optional: m[4] === '?',
    length: (j - i) + m[0].length,
  };
}

/**
 * Split a brace-list body on TOP-LEVEL `,` or `;`.
 *
 * DEPTH-AWARE, because a type may contain the delimiters it is split on:
 * `Record<string, number>` carries a comma at angle-depth 1 and
 * `Array<{ a: number }>` carries one inside braces. A plain `split(',')` cuts those in
 * half and then INVENTS members — a false divergence, which is worse than a missed one
 * because it invites someone to "correct" a document that was right.
 *
 * Quoted literals are tracked too, for the same reason one step further out: `'a,b'` is
 * one type, not two members.
 */
export function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (const ch of body) {
    if (quote !== null) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (QUOTES.has(ch)) { quote = ch; current += ch; continue; }
    if (ch === '<' || ch === '{' || ch === '[' || ch === '(') depth += 1;
    else if (ch === '>' || ch === '}' || ch === ']' || ch === ')') depth -= 1;
    if ((ch === ',' || ch === ';') && depth === 0) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  parts.push(current);
  return parts;
}

/**
 * The member names a brace-list BODY declares, sorted — refusing what it cannot read.
 *
 * This replaces a private `fieldNames()` that ended in
 * `.filter((name) => /^\w+$/.test(name))` (R7-04). The filter WAS the defect: `readonly x:
 * string` parsed to `readonly x`, failed the test, and vanished — so `{a: string}` and
 * `{a: string; readonly x: string}` produced the SAME name list, and the comparison built
 * on it reported agreement about a declaration it had not read. Optionality was dropped
 * the same way (`x?: string` → `x?` → dropped), which is the R5-04 hole one artifact over.
 *
 * THE OPTIONAL MARKER IS KEPT, as `x?`. A name list that cannot express optionality is
 * blind to a field being widened to optional — the exact drift R5-04 exists to catch.
 *
 * A trailing delimiter is spelling (`{a,}`); an interior empty member is malformed and is
 * refused. The member name must END AT THE FIRST `:` — checked against `readMember`'s own
 * consumption rather than by a second regex, so the grammar has one definition.
 */
export function memberNames(body) {
  const parts = splitTopLevel(body);
  const out = [];
  for (let i = 0; i < parts.length; i += 1) {
    const raw = parts[i].trim();
    if (raw === '') {
      if (i === parts.length - 1) continue;
      throw unsupported(parts[i], 'it is an empty member between two delimiters');
    }
    const at = raw.indexOf(':');
    if (at === -1) throw unsupported(raw, 'it declares no `: type`');
    const m = readMember(raw, 0);
    if (!m || m.length !== at + 1) {
      throw unsupported(raw, `\`${raw.slice(0, at).trim()}\` is not a field name this reader understands`);
    }
    out.push(m.optional ? `${m.name}?` : m.name);
  }
  return out.sort();
}
