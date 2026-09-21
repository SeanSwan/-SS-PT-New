/*
 * contract-parse.mjs — read a TypeScript interface declaration as TEXT.
 *
 * WHY THIS IS NOT IN A .test.mjs FILE. Two reasons, both learned here. First, the
 * repo's rule 4 caps every console source file at 300 lines, and `bridge.contractsync.test.mjs`
 * was 321 with this logic inline — the cap reported it by name, which is the cap
 * doing its job. Second, and the same reason `fixtures.mjs` lives outside the test
 * files: **a harness is not a test.** A module that a test file imports must not
 * register tests, or the suite's own count stops measuring what it claims to
 * measure (S1-H13). This module registers nothing.
 *
 * WHAT IT IS FOR. R2-01 found that `web/src/adapters/types.ts` and
 * `05-contracts.md` had both drifted from what the bridge actually serves, and
 * that NOTHING COULD SEE IT — the web suite tests the client against its own
 * fixtures, so a wrong declaration and a matching wrong fixture agree perfectly.
 * The fix needs one side derived rather than retyped, and these are the readers
 * that derive it. The same trick HY4-H6 uses when it reads the route table as
 * text instead of importing it.
 *
 * @module creator-brains-console/test/contract-parse
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { memberNames, readMember, stripComments, unsupported } from './contract-names.mjs';
import { responseShapeFor } from './contract-table.mjs';

/** The web contract as the client declares it. */
export const TYPES_TS = fileURLToPath(new URL('../web/src/adapters/types.ts', import.meta.url));

/** The contract of record, whose fenced `ts` block is compared too. */
export const CONTRACTS_MD = fileURLToPath(
  new URL('../../../docs/ai-workflow/blueprints/creator-brains-console-20260917/05-contracts.md', import.meta.url),
);

/**
 * Strip comments so they cannot be read as fields.
 *
 * THE IMPLEMENTATION MOVED TO `contract-names.mjs` (R7-04) and is re-exported here so
 * every existing import keeps working. It is a WALK now, not two `replace` calls: the
 * old second call stripped from `//` to the end of the line ANYWHERE, which is correct
 * for a comment and wrong inside a string literal — `url: 'https://…'` lost its type
 * from the `//` onward. The module header records the residual (a regex literal
 * containing `//` is still stripped) rather than hiding it.
 */
export { stripComments };

/**
 * The characters that end a member rather than beginning one.
 *
 * `;` is here because an empty member is legal in TypeScript (`interface X { ; a: string }`)
 * and because a doubled delimiter is spelling, not a member. Refusing on these would make
 * the reader refuse every interface at its own closing brace.
 */
const STRUCTURAL = new Set(['{', '}', ';']);

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
 */
export function interfaceFields(source, name) {
  const text = stripComments(source);
  const marker = `export interface ${name} {`;
  const start = text.indexOf(marker);
  assert.notEqual(start, -1, `no declaration of interface ${name} was found`);

  const fields = [];
  let depth = 0;
  let expectField = true;
  let quote = null;
  const body = text.slice(start + marker.length);

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    // The STRUCTURAL guard is not decoration. Without it this branch consumes the
    // interface's own closing brace — `readMember` returns null for `}`, the branch
    // `continue`s instead of falling through, and the brace is skipped on every
    // iteration. The scan then runs past the interface into the NEXT declaration and
    // refuses there, which is how this was found.
    if (depth === 0 && expectField && !STRUCTURAL.has(ch)) {
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
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') {
      depth += 1;
      expectField = false;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth < 0) break; // the interface's own closing brace
      expectField = false;
      continue;
    }
    if (ch === ';') {
      expectField = depth === 0;
      continue;
    }
  }
  return fields;
}

/**
 * The single fenced `ts` block of 05-contracts.md — the contract of record.
 *
 * WHY THE DOC IS COMPARED TOO (and not just types.ts). A1-04 amended the contract
 * to rename `BrainDoc.key` while the bridge kept serving `slug` and the web types
 * kept declaring `slug`. For a full round the three disagreed and NO TEST COULD SEE
 * IT, because nothing had ever compared the document to the response. R2-01 is
 * that divergence surfacing. Comparing `types.ts` alone would leave the same hole
 * one artifact over.
 */
export function contractsTsBlock() {
  const text = readFileSync(CONTRACTS_MD, 'utf8');
  const m = text.match(/```ts\n([\s\S]*?)\n```/);
  assert.ok(m, '05-contracts.md must contain a fenced ts block');
  return m[1];
}

/**
 * Every declared non-optional field must be a key of `payload`.
 *
 * THE DIRECTION IS DELIBERATE. Declared ⊆ served. A declared field the bridge does
 * not send is a LIE the client will dereference; a served field nobody declared is
 * forward compatibility, and refusing it would make every additive bridge change a
 * breaking one. Optional fields are not required — demanding them would invent a
 * false refusal for a field the bridge may legitimately omit.
 */
export function assertServed(route, fields, payload, label = '') {
  const missing = fields
    .filter((f) => !f.optional && !Object.hasOwn(payload, f.name))
    .map((f) => f.name);
  assert.deepEqual(
    missing, [],
    `${route}${label} does not serve every field its declaration requires — missing: ${missing.join(', ')}`,
  );
}

/* ── R3-05 · the DEFERRED methods, which have no live payload to compare ─── */

/**
 * The return-object field names a method's `Promise<{…}>` declares.
 *
 * WHY A METHOD AND NOT AN INTERFACE (R3-05). `T-B27` compares interface FIELDS,
 * which the live payload can confirm. The two deferred operations have no route
 * yet, so there is nothing to observe — and that is exactly why they drifted: the
 * R2-06 sweep amended `05 §2b` and left `types.ts`, `LocalEngineAdapter.ts` and
 * `MockAdapter.ts` still declaring `{runId: string}` and `{requeued: number}`. A
 * contract restated in four artifacts, corrected in one, is the R2-01 hazard.
 *
 * THROWS when the method declares no object return type, rather than returning an
 * empty list. An empty list would compare equal to a document that declares nothing
 * and pass while checking nothing — the failure mode both earlier field extractors
 * had, and the reason `T-B27m0` exists.
 *
 * THE NAME READER IS NOW `memberNames` (R7-04). It used to be a private `fieldNames`
 * ending in `.filter((name) => /^\w+$/.test(name))`, which DROPPED any name it could not
 * parse — including `x?`, because it stripped optionality before testing. So an optional
 * field and a required one produced the same list, which is the R5-04 hole one artifact
 * over, and `readonly x` disappeared entirely. `memberNames` refuses instead of dropping
 * and keeps the `?`.
 */
export function methodReturnFields(source, method) {
  const text = stripComments(source);
  const m = new RegExp(`\\b${method}\\s*\\([^)]*\\)\\s*:\\s*Promise<\\{([^}]*)\\}>`).exec(text);
  assert.ok(m, `no Promise<{…}> return type was found for ${method}`);
  return memberNames(m[1]);
}

/**
 * The route a deferred adapter stub names, read from the RAW source.
 *
 * NOT STRIPPED, because the route is stated in the comment INSIDE the stub:
 * `// POST /api/run/daily is deferred to S4 (05-contracts.md §2b)`. Taking the join
 * key from the artifact that has to be right is what keeps this check from needing
 * a hand-written method→route table — a table that would be a fifth statement of
 * the contract.
 *
 * IT ANCHORS ON THE DECLARATION, NOT ON THE NAME. The first version searched for
 * the bare method name, and `LocalEngineAdapter`'s own header names `repair` before
 * the method is declared — so the search started in the header and returned the
 * NEXT route in the file, which was the daily run's. The check failed loudly rather
 * than passing, which is how it was caught, but the anchor is what makes it right:
 * a signature is `name(…) :`, and that is what is matched.
 */
export function deferredRoute(adapterSource, method) {
  const decl = new RegExp(`\\b${method}\\s*\\([^)]*\\)\\s*:`).exec(adapterSource);
  assert.ok(decl, `${method} is not declared in the adapter`);
  const m = /(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[\w/:.-]+)/.exec(adapterSource.slice(decl.index));
  assert.ok(m, `${method} does not name the route it defers to`);
  return `${m[1]} ${m[2]}`;
}

/**
 * The response shape `05-contracts.md` declares for one route's table row, as names.
 *
 * ── R7-03's CLASS, COMPLETED (found while fixing R7-04) ────────────────────────
 *
 * This function carried R7-03's defect VERBATIM, and it is worth being blunt about how
 * it was found: R7-03 was filed against `contract-types.mjs`'s `contractRowTypedFields`,
 * the fix moved the extraction into `contract-table.mjs` — and left this sibling reading
 * the table the old way, one file over, with `.find()` for the first row and
 * `/\{([^}]*)\}/` for the first brace pair ANYWHERE in the row. The three failures are
 * the same three `contract-table.mjs` documents. **A fix aimed at a row is not a fix
 * aimed at a class**, and this is the fifth consecutive round in which that held.
 *
 * It is REACHABLE, not merely latent: `T-B27m0` and `T-B27m` call it on the live
 * document, so the first row to carry a brace in its engine-function column — or the
 * first route to be declared twice — would have been read as agreement about a
 * declaration this reader never saw.
 *
 * Both readers now go through `responseShapeFor`, so the extraction has ONE definition.
 * The name projection stays separate from `contractRowTypedFields` because the two
 * answer different questions: `T-B27m` compares NAMES against `methodReturnFields`,
 * `T-B27m2b` compares names AND types against the compiler literals.
 *
 * `source` IS INJECTABLE, for the same reason `contractRowTypedFields` takes one (R6-03):
 * a regression that could only call this on the real document would pass while a bypass
 * lived in the extraction, which is exactly the shape of the defect being fixed here.
 */
export function contractRowShape(route, source = readFileSync(CONTRACTS_MD, 'utf8')) {
  return memberNames(responseShapeFor(route, source));
}
