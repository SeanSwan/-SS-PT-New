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

/** The web contract as the client declares it. */
export const TYPES_TS = fileURLToPath(new URL('../web/src/adapters/types.ts', import.meta.url));

/** The contract of record, whose fenced `ts` block is compared too. */
export const CONTRACTS_MD = fileURLToPath(
  new URL('../../../docs/ai-workflow/blueprints/creator-brains-console-20260917/05-contracts.md', import.meta.url),
);

/**
 * Strip comments so they cannot be read as fields.
 *
 * `//` is stripped ANYWHERE on a line, not just at its start. Both artifacts
 * annotate declarations inline — `export interface StatusInstrument {   // R2 —
 * mirrors status-command sources` — and an anchored-only rule left that comment in
 * the body, where the scanner consumed it as a token and then treated the next
 * real field as already-seen. The symptom was two fields of `StatusInstrument`
 * reported as missing from a document that declares them: a FALSE divergence,
 * which is worse than a missed one because it invites someone to "fix" a correct
 * document.
 */
export function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

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
 */
export function interfaceFields(source, name) {
  const text = stripComments(source);
  const marker = `export interface ${name} {`;
  const start = text.indexOf(marker);
  assert.notEqual(start, -1, `no declaration of interface ${name} was found`);

  const fields = [];
  let depth = 0;
  let expectField = true;
  const body = text.slice(start + marker.length);

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
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
    if (depth === 0 && expectField) {
      const m = /^(\w+)(\??)\s*:/.exec(body.slice(i));
      if (m) {
        fields.push({ name: m[1], optional: m[2] === '?' });
        i += m[0].length - 1;
        expectField = false;
        continue;
      }
      if (!/\s/.test(ch)) expectField = false;
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
