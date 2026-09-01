/**
 * Every refusal code an Atelier service can throw has a deliberate HTTP status.
 * ============================================================================
 *
 * `atelierStatusMap.mjs` states that invariant in its own header — "a code missing from
 * this map is a bug the reader can see" — and nothing enforced it. So a code added at a
 * throw site and forgotten here fell through to 500, reporting a deliberate policy refusal
 * as a server fault. That is what sends an agent into retry against a decision that will
 * never change.
 *
 * It happened the first time the guard added `E_BIND_FOREIGN_KEY`, and it happened in TWO
 * places at once, because there were two mapping tables: this one and an inline ternary in
 * `renderAgentRoutes`. The ternary is gone. This test is what keeps the remaining table
 * honest, because "a bug the reader can see" only works if a reader looks.
 *
 * The scan is deliberately crude — a regex over the service sources for `'E_...'` string
 * literals. A cleverer scan (an AST walk for throw sites) would be more precise and would
 * also be a second implementation of the thing it checks. Crude and total beats precise and
 * partial for a drift test: a false positive costs one line in ALLOWED_UNMAPPED with a
 * reason beside it, and that line is itself the record of a decision.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATUS } from '../../routes/atelierStatusMap.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SERVICES = join(HERE, '..', '..', 'services', 'atelier');

/**
 * Codes that legitimately have no status. Each needs a REASON, not just an entry —
 * an unexplained exemption list is how a drift test becomes decorative.
 */
const ALLOWED_UNMAPPED = new Map([
  // E_REPLAY_CONTENTION WAS EXEMPTED HERE AND THE EXEMPTION WAS FALSE. I wrote "handled
  // inside compose rather than returned" without tracing it: `claimOrCoalesce` is called
  // OUTSIDE the try in composeStills, so it escapes to the route and was being answered
  // 400. It is mapped 429 now. Left as a comment rather than deleted, because the first
  // entry this list ever rotted was written by the person who built the list, one hour in
  // — an exemption is an assertion, and this one was never checked.

  // The rest are OUTCOME FIELDS, not refusals: each is carried inside a result object
  // (`{ ok: false, code }`, `{ status: 'rejected', reason: { code } }`, `batch.error`) and
  // travels in a 200 describing what happened to one item. A request that produced three
  // stills and one rejection is not an HTTP failure, and giving these statuses would invite
  // a future reader to return one.
  ['E_NO_IMAGE', 'composeBatch: per-candidate rejection reason inside a 200'],
  ['E_PROVIDER_ERROR', 'composeBatch: per-candidate rejection reason inside a 200'],
  ['E_BATCH_FAILED', 'batchStore: the `error.code` field recorded on a failed batch record'],
  ['E_BATCH_TIMEOUT', 'localBatchRunner/composeGpu: watchdog outcome recorded on the batch'],
  ['E_PERSIST_SKIPPED', 'composeStills/localBatchRunner: `{ ok: false, code }` on the persist result'],
  ['E_PERSIST_FAILED', 'persistStills: the code recorded on a still whose row could not be written'],
  // Sits in a ternary beside E_LAW_VIOLATION, which IS mapped — but only because that code
  // is ALSO thrown as a real refusal elsewhere. Here both are per-prompt fields. The thrown
  // sibling of this path is E_ALL_FAILED, which is mapped (502).
  ['E_TASTE_SHORT', 'promptSources: per-prompt `{ ok: false, code }`; the thrown sibling is E_ALL_FAILED'],
]);

function codesThrownBy(dir) {
  const found = new Map();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.mjs')) continue;
    const src = readFileSync(join(dir, entry.name), 'utf8');
    for (const m of src.matchAll(/'(E_[A-Z0-9_]+)'/g)) {
      if (!found.has(m[1])) found.set(m[1], entry.name);
    }
  }
  return found;
}

describe('the status map covers every code the atelier services can throw', () => {
  const thrown = codesThrownBy(SERVICES);

  it('finds codes at all — a scan that matches nothing would pass vacuously', () => {
    // The failure mode of every drift test: the instrument breaks, the assertion holds,
    // and the invariant quietly stops being checked. A wrong path here would find zero
    // codes and report a clean map forever.
    expect(thrown.size).toBeGreaterThan(20);
    expect(thrown.has('E_BIND_HASH_MISMATCH')).toBe(true);
  });

  it('maps every code, or names it as a deliberate exemption with a reason', () => {
    const unmapped = [...thrown]
      .filter(([code]) => !(code in STATUS) && !ALLOWED_UNMAPPED.has(code))
      .map(([code, file]) => `${code} (thrown in ${file})`);
    expect(unmapped, 'add these to atelierStatusMap.STATUS with a deliberate status, or to ALLOWED_UNMAPPED with a reason').toEqual([]);
  });

  it('every mapped status is a real HTTP code, not a typo', () => {
    for (const [code, status] of Object.entries(STATUS)) {
      expect(Number.isInteger(status), `${code} maps to ${status}`).toBe(true);
      expect(status, `${code} maps to ${status}`).toBeGreaterThanOrEqual(400);
      expect(status, `${code} maps to ${status}`).toBeLessThan(600);
    }
  });

  it('the exemption list has not rotted — every exemption is still a real code', () => {
    // An exemption for a code nobody throws any more is a stale decision pretending to be
    // a current one, and it is how the list grows until it means nothing.
    for (const code of ALLOWED_UNMAPPED.keys()) {
      expect(thrown.has(code) || code in STATUS, `${code} is exempted but no longer thrown`).toBe(true);
    }
  });

  it('the code this test was written for is mapped, and to a refusal not a fault', () => {
    expect(STATUS.E_BIND_FOREIGN_KEY).toBe(409);
  });
});

describe('a retryable refusal answers with a retryable status', () => {
  it('contention is 429, not the 400 an unmapped ComposeError defaults to', async () => {
    // `fail` in atelierComposeRoutes does `STATUS[err.code] || 400`. Unmapped, this told a
    // client its request was MALFORMED — do not retry — while the message beside it said
    // "retry in a moment; nothing was spent". The two were giving opposite instructions.
    expect(STATUS.E_REPLAY_CONTENTION).toBe(429);
  });

  it('the throw carries the retry hint that makes fail() emit Retry-After', async () => {
    // A 429 without Retry-After leaves the client to guess, and the guess that costs least
    // is to retry immediately — which is the contention it just lost.
    const { claimOrCoalesce } = await import('../../services/atelier/composeReplay.mjs');
    const store = new Map();
    // A key held by a live claim that never settles: every attempt coalesces onto a promise
    // that yields nothing usable, so the loop exhausts and throws.
    const held = { promise: Promise.resolve(null), expiresAt: Number.MAX_SAFE_INTEGER };
    const err = await claimOrCoalesce(
      { get: () => held, set: () => false, delete: () => false, has: () => true },
      'k',
      () => 1,
    ).catch((e) => e);
    expect(err.code).toBe('E_REPLAY_CONTENTION');
    expect(err.retryAfterSec).toBeGreaterThan(0);
  });
});
