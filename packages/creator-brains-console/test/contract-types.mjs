/*
 * contract-types.mjs — read a DECLARED TYPE as text, and compare two shapes
 * including their types.
 *
 * WHY THIS IS NOT IN contract-parse.mjs. That module answers "which FIELD NAMES
 * does this declaration list", which is what `T-B27` needs and all it needs —
 * the live payload confirms names. This module answers a different question,
 * "what TYPE does each of those fields declare", and it exists because names
 * were not enough (R4-04): a probe retyped `runId` from `string | null` to
 * `number` and every check in the suite stayed green. Two concerns, two files —
 * and rule 4 caps each at 300 lines, which `contract-parse.mjs` is already
 * within sight of.
 *
 * WHY A MODULE AND NOT A TEST FILE. A harness is not a test (S1-H13): anything a
 * test file imports must not register tests of its own, or the suite's own count
 * stops measuring what it claims to measure.
 *
 * WHAT THIS MODULE IS NOT. It does NOT decide whether the code is correct — the
 * compiler does that, via `web/src/adapters/contract.assert.ts`. Text comparison
 * of two type expressions compares SPELLING: `string|null` and `string | null`
 * are one type written twice. So this module's job is the link the compiler
 * cannot see — `05-contracts.md` → the literal in that file — and nothing more.
 *
 * @module creator-brains-console/test/contract-types
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { CONTRACTS_MD } from './contract-parse.mjs';

/** The compiler-enforced copy of the deferred contract (R4-04). */
export const CONTRACT_ASSERT_TS = fileURLToPath(
  new URL('../web/src/adapters/contract.assert.ts', import.meta.url),
);

/**
 * Split a brace-list body on TOP-LEVEL `,` or `;`.
 *
 * DEPTH-AWARE, because a type may contain the delimiters it is split on:
 * `Record<string, number>` carries a comma at angle-depth 1 and
 * `Array<{ a: number }>` carries one inside braces. A plain `split(',')` cuts
 * those in half and then INVENTS fields — a false divergence, which is worse than
 * a missed one because it invites someone to "correct" a document that was right.
 * `contract-parse.mjs` records the same lesson from the other direction.
 */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of body) {
    if (ch === '<' || ch === '{' || ch === '[' || ch === '(') depth += 1;
    else if (ch === '>' || ch === '}' || ch === ']' || ch === ')') depth -= 1;
    if ((ch === ',' || ch === ';') && depth === 0) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  parts.push(current);
  return parts;
}

/** Whitespace is spelling, not meaning. Compare the meaning. */
export function normalizeType(type) {
  return type.replace(/\s+/g, ' ').replace(/[;,]\s*$/, '').trim();
}

/**
 * `{name: type, …}` → `[{name, type}]`, sorted by name.
 *
 * Sorted because field ORDER is not part of an object type — `{a, b}` and `{b, a}`
 * are the same type — and comparing in document order would report a divergence
 * for a reordering that changes nothing.
 *
 * IT REFUSES WHAT IT CANNOT READ (R6-03). The previous version mapped an unrecognised
 * member to `null` and filtered it away, so `readonly extra?: string`, `"extra"?: string`
 * and `[key: string]: unknown` each extracted to EXACTLY the same fields as a
 * declaration without them — the doc→literal link then reported AGREEMENT about a
 * document it had not read. A parser that ignores syntax it does not support makes
 * ignorance read as agreement, so every unsupported nonempty member is now a hard
 * failure naming the fragment. Supporting more TypeScript means extending this grammar
 * deliberately; it must never be silently absorbed.
 */
export function typedFields(body) {
  const parts = splitTopLevel(body);
  const seen = new Set();
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const raw = parts[i].trim();
    // A TRAILING delimiter is spelling (`{a: string,}`). An INTERIOR empty member is a
    // malformed fragment and is refused — it is precisely the shape that used to vanish
    // into `.filter(Boolean)`.
    if (raw === '') {
      if (i === parts.length - 1) continue;
      throw unsupported(parts[i], 'it is an empty member between two delimiters');
    }
    const at = raw.indexOf(':');
    if (at === -1) throw unsupported(raw, 'it declares no `: type`');
    const name = raw.slice(0, at).trim();
    const type = normalizeType(raw.slice(at + 1));
    if (!/^\w+\??$/.test(name)) throw unsupported(raw, `\`${name}\` is not a plain field name`);
    if (!type) throw unsupported(raw, 'it declares an empty type');
    // OPTIONALITY IS PART OF THE SHAPE (R5-04). Stripping `?` made `runId` and
    // `runId?` extract identically, so a document that widened a field to
    // optional compared EQUAL to one that had not — the doc→literal link was
    // blind to exactly the drift it exists to catch. `assertSameShape` compares
    // with `deepEqual`, so carrying the flag is what makes the comparison see it.
    const bare = name.replace('?', '');
    if (seen.has(bare)) throw unsupported(raw, `\`${bare}\` is declared twice`);
    seen.add(bare);
    out.push({ name: bare, optional: name.endsWith('?'), type });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** The refusal for a member this grammar does not support (R6-03). */
function unsupported(fragment, why) {
  return new Error(
    `unsupported contract member \`${String(fragment).trim()}\`: ${why}. Extend this `
      + 'parser\'s grammar deliberately rather than letting the member be ignored — a '
      + 'member this reader drops is a member it cannot compare.',
  );
}

/**
 * The response shape `05-contracts.md` declares for a route, WITH its types.
 *
 * `source` is injectable so a regression can drive THIS reader over an in-memory
 * mutated document (R6-03). Testing the tokenizer alone cannot catch a bypass that
 * lives in the row extraction, and Astra's finding was exactly that: the added members
 * were accepted by the real table reader, not merely by `typedFields()`.
 */
export function contractRowTypedFields(route, source = readFileSync(CONTRACTS_MD, 'utf8')) {
  const row = source
    .split('\n')
    .find((line) => line.startsWith(`| \`${route}\``));
  assert.ok(row, `05-contracts.md declares no row for ${route}`);
  // The row's shape is inside a code span; `\|` is how a table escapes a pipe.
  const m = /\{([^}]*)\}/.exec(row.replace(/\\\|/g, '|'));
  assert.ok(m, `the row for ${route} declares no response shape`);
  const fields = typedFields(m[1]);
  assert.notEqual(fields.length, 0, `the row for ${route} declares no typed fields`);
  return fields;
}

/**
 * The return-object fields a method's `Promise<{…}>` declares, WITH their types.
 *
 * THROWS when the method declares no object return type, rather than returning an
 * empty list — an empty list compares equal to a document declaring nothing and
 * passes while checking nothing.
 */
export function methodReturnTypedFields(source, method) {
  const m = new RegExp(`\\b${method}\\s*\\([^)]*\\)\\s*:\\s*Promise<\\{([^}]*)\\}>`).exec(source);
  assert.ok(m, `no Promise<{…}> return type was found for ${method}`);
  const fields = typedFields(m[1]);
  assert.notEqual(fields.length, 0, `${method} declares no typed fields`);
  return fields;
}

/**
 * Every `Assert<Exact<…>>` in the compiler assertion file, as data.
 *
 * THE COUNT IS THE GUARD. This regex is the one place in this chain that reads
 * structure rather than content, so a formatting change could make it match
 * nothing — and every comparison built on it would then pass while comparing
 * nothing. Callers assert how many entries they expect, so an empty read fails
 * loudly instead of quietly agreeing.
 */
export function contractAssertions(source) {
  const out = [];
  const re = /export type (\w+) = Assert<Exact<\s*([\s\S]*?),\s*\{([^{}]*)\}\s*>>;/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const [, name, subject, literal] = m;
    const iface = /Returns<'(\w+)'>/.exec(subject);
    const impl = /ImplReturns<(\w+),\s*'(\w+)'>/.exec(subject);
    assert.ok(iface || impl, `assertion ${name} names neither an interface method nor an implementation`);
    out.push({
      name,
      subject: iface ? 'ConsoleDataAdapter' : impl[1],
      method: iface ? iface[1] : impl[2],
      fields: typedFields(literal),
    });
  }
  return out;
}

/** Require two shapes to be equal field for field AND type for type. */
export function assertSameShape(actual, expected, label) {
  assert.deepEqual(actual, expected, `${label}: the declared shapes differ`);
}
