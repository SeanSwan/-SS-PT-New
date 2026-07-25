/**
 * Dispatcher Client-Scope Invariant
 * =================================
 *
 * EXECUTABLE LAW, not a style check.
 *
 * Swan Coach dispatchers receive two competing client identities:
 *   - `params.clientId`      — what the intent classifier extracted from speech
 *   - `ctx.resolvedClient.id` — the client the trainer actually has selected
 *
 * The selected client MUST win. When it doesn't, a misparsed pronoun in
 * "schedule her for Tuesday" writes to the WRONG client's record — clients read
 * their own plans and pain notes feed NASM-protocol decisions, so a
 * misattribution is trust-ending and liability-adjacent.
 *
 * `clientScope.mjs#resolveCommandClientId` encodes that precedence once, and
 * validates the id is a positive safe integer (an inlined
 * `Number(a ?? b)` silently yields NaN for a malformed id — a bad write).
 *
 * THE LAW: any dispatcher that reads `params.clientId` must resolve it through
 * the shared helper. No private copies, no re-derived precedence.
 *
 * WHY THIS FILE EXISTS: `scheduleWriteDispatchers.mjs` was missed by the
 * original client-scope sweep and shipped a live wrong-client WRITE path to
 * production (found 2026-07-24, C0 of the Coach Hive-Mind program). Every other
 * family had a hand-written guard test; nothing enforced the rule across the
 * set, so a new dispatcher could — and did — regress it silently. This closes
 * that gap for every dispatcher added from here on.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveCommandClientId } from '../../services/ai/dispatchers/clientScope.mjs';

const DISPATCHER_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../services/ai/dispatchers',
);

/** The helper itself defines the precedence — it is not a consumer of it. */
const SELF = 'clientScope.mjs';

/**
 * Files allowed to read `params.clientId` without the shared helper.
 * Adding an entry requires a written reason — an empty allowlist is the goal.
 */
const EXEMPT = new Map([]);

function dispatcherFiles() {
  return readdirSync(DISPATCHER_DIR)
    .filter((f) => f.endsWith('.mjs') && f !== SELF)
    .map((f) => ({ name: f, source: readFileSync(join(DISPATCHER_DIR, f), 'utf8') }));
}

/**
 * Two ways a dispatcher gets at the classifier's client id. BOTH must be caught.
 *
 * The destructuring form is not hypothetical: `sessionDispatchers.mjs` used
 * `const { sessionId, clientId, date } = params;` and fed it straight into the
 * lookup that decides WHICH SESSION TO CANCEL. A property-access-only check
 * missed it entirely — that miss is why this pattern is here.
 */
const READS_PARAMS_CLIENT_ID = [
  /params\s*\??\.\s*clientId/,                          // params.clientId
  /const\s*\{[^}]*\bclientId\b[^}]*\}\s*=\s*params/,    // const { clientId } = params
];
const USES_SHARED_HELPER = /resolveCommandClientId/;
// An inlined precedence chain — the exact shape that drifted three times.
const INLINE_PRECEDENCE = /resolvedClient\s*\??\.\s*id\s*\?\?/;

const readsClassifierClientId = (source) => READS_PARAMS_CLIENT_ID.some((re) => re.test(source));

describe('dispatcher client-scope invariant', () => {
  it('every dispatcher reading the classifier client id resolves it through the shared helper', () => {
    const violations = dispatcherFiles()
      .filter(({ name }) => !EXEMPT.has(name))
      .filter(({ source }) => readsClassifierClientId(source))
      .filter(({ source }) => !USES_SHARED_HELPER.test(source))
      .map(({ name }) => name);

    expect(violations, [
      'These dispatchers read the classifier-supplied params.clientId without',
      'resolving through clientScope.mjs#resolveCommandClientId, so a misparsed',
      'client reference can be written against the wrong client.',
      'Fix: import { resolveCommandClientId } from \'./clientScope.mjs\' and use',
      'resolveCommandClientId(params, ctx) as the single source of client identity.',
    ].join('\n')).toEqual([]);
  });

  it('no dispatcher re-derives the precedence inline', () => {
    const inlined = dispatcherFiles()
      .filter(({ source }) => INLINE_PRECEDENCE.test(source))
      .map(({ name }) => name);

    expect(inlined, [
      'These dispatchers hand-roll the resolvedClient ?? params precedence.',
      'Inline copies drift when the shared rule changes (e.g. when a session',
      'client-lock is added) and skip the positive-integer validation, so a',
      'malformed id becomes NaN instead of falling back.',
      'Fix: call resolveCommandClientId(params, ctx) instead.',
    ].join('\n')).toEqual([]);
  });

  it('the shared helper prefers the resolved client over classifier params', () => {
    expect(resolveCommandClientId({ clientId: 999 }, { resolvedClient: { id: 42 } })).toBe(42);
  });

  it('the shared helper falls back to params when no client is resolved', () => {
    expect(resolveCommandClientId({ clientId: 42 }, {})).toBe(42);
    expect(resolveCommandClientId({ clientId: 42 }, { resolvedClient: undefined })).toBe(42);
  });

  it('the shared helper rejects malformed resolved ids instead of yielding NaN', () => {
    // The exact failure an inlined Number(a ?? b) produces: a bad write.
    for (const bad of [0, -1, 'abc', null, undefined, 1.5, Number.NaN]) {
      expect(resolveCommandClientId({ clientId: 42 }, { resolvedClient: { id: bad } })).toBe(42);
    }
  });

  it('the shared helper returns null when neither source is usable', () => {
    expect(resolveCommandClientId({}, {})).toBeNull();
    expect(resolveCommandClientId({ clientId: 'nope' }, { resolvedClient: { id: 0 } })).toBeNull();
  });
});