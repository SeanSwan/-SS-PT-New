/*
 * contract-scan.mjs — scan ONE declaration body into its fields, in document order.
 *
 * WHY THIS IS ITS OWN MODULE (R8-04, rule 4). `contract-parse.mjs` is the module that
 * READS ARTIFACTS — it owns the paths, the fenced-block extraction and the payload
 * comparison. Scanning a brace body is a different concern, and R8-04's fixes (bracket
 * nesting, comma/newline property boundaries, a termination check and escape-aware
 * literals) pushed `contract-parse.mjs` to 313 lines against rule 4's hard 300-line cap.
 * The cap is a cap, not a budget: the fix is to extract at the seam, never to golf the
 * comments until the reasoning that justifies the code is gone. `contract-parse.mjs`
 * re-exports this function, so no caller changes.
 *
 * WHY THIS IS NOT A `.test.mjs`. S1-H13 — a harness exported from a test file re-registers
 * that file's tests in every importer, so the suite's own count stops measuring what it
 * claims to measure. This module registers nothing.
 *
 * @module creator-brains-console/test/contract-scan
 */

import assert from 'node:assert/strict';

import { readMember, stripComments, unsupported } from './contract-names.mjs';

/**
 * The characters that end a member rather than beginning one.
 *
 * `;` is here because an empty member is legal in TypeScript (`interface X { ; a: string }`)
 * and because a doubled delimiter is spelling, not a member. Refusing on these would make
 * the reader refuse every interface at its own closing brace.
 *
 * `,` joins them in R8-04. A comma SEPARATES members, so one met where a member is expected
 * is spelling rather than a field name; without this the member branch would hand `,` to
 * `readMember`, get null back, and refuse the legal `{ a: string, b: number }`.
 */
const STRUCTURAL = new Set(['{', '}', ';', ',']);

/** Bracket nesting WITHIN a member, so a `,` in `Record<string, number>` is not a separator. */
const NEST_OPEN = new Set(['<', '[', '(']);
const NEST_CLOSE = new Set(['>', ']', ')']);

/**
 * Top-level fields of one `export interface Name { … }`, as `{ name, optional }`.
 *
 * WHY A CHARACTER SCANNER AND NOT A LINE MATCH. `types.ts` writes one field per
 * line, but 05-contracts.md packs several onto one (`ok: boolean; version: string
 * | null; reason: string;`), and a line-based version of this function saw only
 * the FIRST field on each line.
 *
 * Depth is counted RELATIVE TO THE BODY: the scan starts just after the
 * interface's opening brace, so a field sits at depth 0 and a nested object's
 * contents sit at depth 1 or deeper. A field may begin at the start of the body or
 * after a `;` at depth 0. The interface's own closing brace drives the depth to
 * -1, which is the terminator.
 *
 * TWO EARLIER VERSIONS WERE WRONG, and both were caught by the tests here rather
 * than downstream — which is the only reason this reader can be trusted: the first
 * counted from the `interface` keyword, so it matched nothing and every comparison
 * passed while comparing nothing; the second read one field per line, so it
 * invented divergences. `T-B27a`/`T-B27d` keep both failure modes caught.
 *
 * ── R7-04: IT NOW REFUSES WHAT IT CANNOT READ, AND IT TRACKS LITERALS ─────────
 *
 * THREE CHANGES, all from one finding, and the first is the finding itself:
 *
 *   1. THE NAME GRAMMAR IS `readMember`'s, NOT `(\w+)(\??)`. The old regex matched a
 *      bare identifier only, and the fallthrough was `if (!/\s/.test(ch)) expectField
 *      = false` — it SKIPPED the member and carried on. So `readonly slug: string`,
 *      `'quoted': string`, `$x: string` and `0: string` each vanished, and a
 *      declaration carrying one extracted to exactly the fields of a declaration
 *      without it. That is ignorance read as agreement: the comparison built on this
 *      reader reported a match for a document it had not read. An unparseable member
 *      is now a hard failure naming the fragment.
 *   2. THE SCANNER TRACKS STRING LITERALS, so a `;` or a brace INSIDE a literal is not
 *      structural. `a: 'x;y'; b: number` used to end the first member at the `;` inside
 *      the literal and then refuse `y'` as a field name. The same class as the
 *      `stripComments` fix, one layer up.
 *   3. MEMBERS ARE MATCHED BEFORE QUOTES ARE OPENED, so a QUOTED NAME is read by
 *      `readMember` rather than being mistaken for the start of a literal.
 *
 * ── R8-03 / R8-04: THREE MORE, ALL OF THE SAME SHAPE ─────────────────────────
 *
 *   4. ESCAPED QUOTES NO LONGER CLOSE A LITERAL (R8-03). `a: 'it\'s'; extra: string`
 *      ended the literal at the escaped quote, so the `;` after it was read as string
 *      content and the scan swallowed the interface to its end — returning `a` alone
 *      from a two-field declaration.
 *   5. A NEWLINE AND A COMMA SEPARATE MEMBERS, and bracket nesting is tracked so they
 *      do not separate one that merely contains them (R8-04). `expectField` used to be
 *      re-armed ONLY by `;`, so `{ a: string, extra: number }` and the
 *      one-member-per-line form both yielded `[a]` — a declaration that omitted `extra`
 *      compared EQUAL to one that declared it. The newline case PROBES before re-arming:
 *      a newline separates only if a readable member actually starts after it, so a type
 *      continued onto the next line (`a: string |` then `null`) is left alone.
 *   6. A TRUNCATED DECLARATION IS REFUSED (R8-04). `export interface X { a: string;` used
 *      to return `[a]`, so a cut-off declaration compared equal to a complete one.
 */
export function interfaceFields(source, name) {
  const text = stripComments(source);
  const marker = `export interface ${name} {`;
  const start = text.indexOf(marker);
  assert.notEqual(start, -1, `no declaration of interface ${name} was found`);

  const fields = [];
  let depth = 0;
  let nest = 0;
  let expectField = true;
  let quote = null;
  let escaped = false;
  let closed = false;
  const body = text.slice(start + marker.length);

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    // The STRUCTURAL guard is not decoration. Without it this branch consumes the
    // interface's own closing brace — `readMember` returns null for `}`, the branch
    // `continue`s instead of falling through, and the brace is skipped on every
    // iteration. The scan then runs past the interface into the NEXT declaration and
    // refuses there, which is how this was found.
    if (depth === 0 && nest === 0 && expectField && !STRUCTURAL.has(ch)) {
      const m = readMember(body, i);
      if (m !== null) {
        fields.push({ name: m.name, optional: m.optional });
        i += m.length - 1;
        expectField = false;
        continue;
      }
      // Not a member and not whitespace: a member this reader cannot understand, and
      // skipping it is the R7-04 defect.
      if (!/\s/.test(ch)) {
        throw unsupported(
          body.slice(i, i + 40),
          'this reader cannot parse it as a field name, so it cannot compare it',
        );
      }
      continue;
    }
    if (quote !== null) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; escaped = false; continue; }
    if (ch === '{') {
      depth += 1;
      expectField = false;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth < 0) { closed = true; break; } // the interface's own closing brace
      expectField = false;
      continue;
    }
    if (NEST_OPEN.has(ch)) { nest += 1; continue; }
    if (NEST_CLOSE.has(ch)) { if (nest > 0) nest -= 1; continue; }
    if (ch === ';' || ch === ',') {
      expectField = depth === 0 && nest === 0;
      continue;
    }
    if (ch === '\n' && depth === 0 && nest === 0 && !expectField) {
      // ── R9-07: A NEWLINE THAT STARTS AN UNREADABLE MEMBER LINE IS A REFUSAL ──
      //
      // The probe below re-arms member parsing only when a READABLE member follows, so
      // a continued type is left alone — that part was right. But `foo(): void` on its
      // own line fails the probe too, so it was neither collected NOR refused: the line
      // was read as the CONTINUATION of `a: string` and the method silently vanished.
      // `[a]` is exactly what a declaration without the method extracts to, which is
      // ignorance read as agreement (R7-04), one boundary over.
      //
      // BOTH KINDS OF LINE ARE INDENTED, so indentation cannot separate them — an
      // earlier form of this guard used it anyway and refused the legal continuation
      // `a: string |` + `null` that R8-04a pins. THE DISCRIMINATOR IS WHERE THE PREVIOUS
      // LINE ENDS. A continuation continues a type that is still OPEN, so the line before
      // it ends in an operator that cannot end a type. An unreadable member line follows
      // a CLOSED member, and then a line that cannot start a member is a declaration this
      // reader is about to drop. Measured both ways: `|` and `&` continue and are
      // accepted, `foo(): void` and `[k: string]: unknown` are refused, and the shipped
      // one-, two- and three-field controls are unchanged.
      const before = body.slice(0, i).replace(/[ 	]+$/, '');
      const OPEN_ENDED = /[|&,<(=:?]$|=>$/;
      if (!OPEN_ENDED.test(before)) {
        const rest = body.slice(i + 1);
        const lead = /^[ 	]*/.exec(rest)[0].length;
        const token = rest[lead];
        // `}` is excluded because the interface's own closer is a non-space: without
        // that, every declaration whose last member is followed by a newline was
        // refused, quoting `}` as the unreadable member (measured, one to three fields).
        if (token !== undefined && !/\s/.test(token) && token !== '}'
            && readMember(rest, 0) === null) {
          throw unsupported(
            rest.slice(lead, lead + 40),
            'it follows a CLOSED member and starts a line this reader cannot parse as a '
              + 'field name, so it cannot compare it — a method, an index signature or '
              + 'another unsupported declaration',
          );
        }
      }
      if (readMember(body, i + 1) !== null) {
        expectField = true;
        continue;
      }
    }
  }
  assert.ok(closed, `interface ${name} is not terminated — no closing brace was found`);
  return fields;
}
