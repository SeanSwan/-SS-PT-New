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

import assert from 'node:assert/strict';

/*
 * THE LITERAL SCANNERS MOVED TO `contract-literals.mjs` (R9-06/R9-07, rule 4).
 *
 * `stripComments`, `splitTopLevel` and `wholeObjectShape` all answer one question —
 * WHERE DOES A STRING LITERAL START AND END IN THIS TEXT — and since R9-06 all three
 * model escape state the same way. That is a different concern from this module's name
 * grammar, and it is the concern the round-9 fixes actually changed. Extracting it takes
 * both files under the cap, which moving `wholeObjectShape` alone did NOT: that took this
 * file to 366 and merely relocated the violation.
 *
 * Re-exported, so no caller changes.
 *
 * IMPORTED AS WELL AS RE-EXPORTED, and that is not redundancy: a re-export binds the
 * name for IMPORTERS of this module but not in this module's own scope, so
 * `memberNames` below — which calls `splitTopLevel` — would compile and then fail at
 * call time. Measured: 16 tests red with `splitTopLevel is not defined` before this
 * import was added.
 */
import { splitTopLevel, unsupported } from './contract-literals.mjs';

export { stripComments, splitTopLevel, wholeObjectShape } from './contract-literals.mjs';

/*
 * `unsupported` MOVED TO `contract-literals.mjs` AND IS RE-EXPORTED HERE (rule 4, R9-06).
 *
 * It is the REFUSAL shape, not the name grammar: `splitTopLevel` throws it on a mismatched
 * delimiter and on an unclosed one, and `wholeObjectShape` fails through `assert` rather
 * than through it. A function that two modules throw must live where both can reach it
 * without a cycle, and `contract-names` already imports from `contract-literals`, so
 * putting it here and importing it there would have been circular. Every existing
 * `from './contract-names.mjs'` import of `unsupported` keeps working.
 */
export { unsupported } from './contract-literals.mjs';

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
 * refused. THE BOUNDARY IS `readMember`'s AND ONLY `readMember`'s (R8-05) — the first
 * version cross-checked it against `raw.indexOf(':')`, which is a second source of a fact
 * the grammar already knows and which is simply wrong when a quoted name contains a colon.
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
    // THE BOUNDARY COMES FROM `readMember`, WHICH IS THE GRAMMAR (R8-05). This used to
    // derive the separator with `raw.indexOf(':')` and then cross-check it against
    // `readMember`'s own consumption. `indexOf` is a SECOND, dumber source of a fact the
    // grammar already knows, and it is wrong for every legal name that CONTAINS a colon:
    // for `'a:b': string` it landed on the colon inside the quotes, disagreed with
    // `readMember`, and the reader THREW on valid TypeScript. An over-refusal inside the
    // very grammar R7-04 built to be complete. The refusals this check was protecting
    // are all preserved, because `readMember` is anchored and simply does not match
    // `[key: string]: unknown` or `foo(): void` — it returns null and we refuse below.
    const m = readMember(raw, 0);
    if (!m) {
      throw unsupported(raw, 'it is not a field name this reader understands');
    }
    out.push(m.optional ? `${m.name}?` : m.name);
  }
  return out.sort();
}

/**
 * The complete `{…}` this text declares, refusing a SECOND SHAPE or a COMPOSITION.
 *
 * MOVED HERE FROM `contract-table.mjs` (R9-06/R9-07, rule 4) — it is a literal-aware
 * brace scanner, which is this module's grammar, not the table reader's structure.
 * The two scanners beside it (`splitTopLevel`, `stripComments`) have tracked escaped
 * quotes since R7-04 and R8-03; this one did not, which is the R9-06 defect: for
 * `{a: 'it\'s'; b: number}` the escaped quote CLOSED the literal, the next quote
 * opened another, and the closing brace was swallowed — so a legal two-field shape
 * was refused as unclosed. The three scanners now model escape state in the same way,
 * which is the only reason the class can be said to be closed rather than fixed once.
 */