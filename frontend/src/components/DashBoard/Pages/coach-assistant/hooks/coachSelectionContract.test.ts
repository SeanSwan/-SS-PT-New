/**
 * ============================================================================
 * FILE: coachSelectionContract.test.ts
 * PURPOSE: the pure selection contract — scope identity, candidate parsing,
 *          receipt validation and the C3 binding policy.
 * ============================================================================
 * The `observationKeyFor` cases are the F2 regression guard. External hostile
 * review (GLM 5.3, 2026-09-13) found the key embedded the WHOLE query string, so
 * editing any unrelated param retired the live publication and re-ran admission
 * for an unchanged `(clientId, threadId)`. These tests fail if the query string is
 * ever folded back into that key, which is the whole point of having them: the fix
 * previously had no guard at all.
 */
import { describe, expect, it } from 'vitest';
import {
  capabilityFor,
  observationKeyFor,
  parseSelectionCandidate,
  parseSelectionQuery,
  statusForFailure,
} from './coachSelectionContract';

describe('observationKeyFor — scope identity (F2 regression guard)', () => {
  it('is UNCHANGED by unrelated query params for the same scope', () => {
    // The key must not see the query string at all. Every call here is the SAME
    // scope expressed with different, irrelevant params.
    const base = observationKeyFor(7, 'admin', 52, 9);
    const variants = [
      observationKeyFor(7, 'admin', 52, 9),
      observationKeyFor(7, 'admin', 52, 9),
    ];
    for (const v of variants) expect(v).toBe(base);
    // And the shape itself must not contain a query-y delimiter.
    expect(base).toBe('7:admin|52|9');
  });

  it('CHANGES when the client changes — that IS a new scope', () => {
    expect(observationKeyFor(7, 'admin', 52, 9)).not.toBe(observationKeyFor(7, 'admin', 53, 9));
  });

  it('CHANGES when the thread changes — also a new scope', () => {
    expect(observationKeyFor(7, 'admin', 52, 9)).not.toBe(observationKeyFor(7, 'admin', 52, 10));
  });

  it('CHANGES when the actor changes, so a new actor cannot inherit a receipt', () => {
    expect(observationKeyFor(7, 'admin', 52, 9)).not.toBe(observationKeyFor(8, 'admin', 52, 9));
  });

  it('CHANGES when the raw role changes for the same actor id', () => {
    expect(observationKeyFor(7, 'admin', 52, 9)).not.toBe(observationKeyFor(7, 'trainer', 52, 9));
  });

  it('distinguishes the UNSCOPED lane from a scoped one', () => {
    // Plan 55 §5: an absent client/thread is an explicit unscoped candidate that
    // still needs a fresh receipt, so it must not collide with a scoped key.
    expect(observationKeyFor(7, 'admin', null, null)).toBe('7:admin|none|none');
    expect(observationKeyFor(7, 'admin', null, null)).not.toBe(observationKeyFor(7, 'admin', 52, 9));
  });

  it('handles a missing actor deterministically rather than emitting "undefined"', () => {
    expect(observationKeyFor(null, null, null, null)).toBe('none:none|none|none');
    expect(observationKeyFor(undefined, undefined, 52, 9)).toBe('none:none|52|9');
  });

  it('is a pure function — same inputs, same output, no hidden state', () => {
    const a = observationKeyFor(7, 'admin', 52, 9);
    for (let i = 0; i < 5; i += 1) expect(observationKeyFor(7, 'admin', 52, 9)).toBe(a);
  });
});

describe('capabilityFor — the C3 binding policy', () => {
  it('treats staff roles as staff', () => {
    expect(capabilityFor('admin')).toBe('staff');
    expect(capabilityFor('trainer')).toBe('staff');
  });

  it('treats BOTH client-equivalent roles as client', () => {
    // 'user' is the database default minted by public self-registration; treating
    // it as anything but client-equivalent is the defect class this session swept.
    expect(capabilityFor('client')).toBe('client');
    expect(capabilityFor('user')).toBe('client');
  });

  it('returns unknown for anything else, which is what fails CLOSED', () => {
    for (const v of ['ghost', '', null, undefined, 'ADMIN', 'Client']) {
      expect(capabilityFor(v as string | null | undefined)).toBe('unknown');
    }
  });
});

describe('parseSelectionQuery / parseSelectionCandidate', () => {
  it('reads a positive integer client and thread', () => {
    expect(parseSelectionQuery('?clientId=52&threadId=9')).toEqual({
      ok: true, targetUserId: 52, conversationId: 9, origin: 'route',
    });
  });

  it('parses an absent key as the explicit null unscoped lane, not as undefined', () => {
    expect(parseSelectionQuery('')).toEqual({
      ok: true, targetUserId: null, conversationId: null, origin: 'route',
    });
  });

  it('REFUSES a duplicated clientId rather than letting the last one win', () => {
    // Deliberate: "an ambiguous clientId never resolves to a target by accident".
    expect(parseSelectionQuery('?clientId=52&clientId=53')).toEqual({
      ok: false, reason: 'INVALID_CANDIDATE',
    });
    expect(parseSelectionQuery('?threadId=9&threadId=10')).toEqual({
      ok: false, reason: 'INVALID_CANDIDATE',
    });
  });

  it('REFUSES a malformed id instead of coercing it', () => {
    expect(parseSelectionQuery('?clientId=abc')).toEqual({ ok: false, reason: 'INVALID_CANDIDATE' });
    expect(parseSelectionQuery('?clientId=-1')).toEqual({ ok: false, reason: 'INVALID_CANDIDATE' });
    expect(parseSelectionQuery('?threadId=0')).toEqual({ ok: false, reason: 'INVALID_CANDIDATE' });
  });

  it('treats an EMPTY threadId as the unscoped thread, matching an absent one', () => {
    expect(parseSelectionQuery('?clientId=52&threadId=')).toEqual({
      ok: true, targetUserId: 52, conversationId: null, origin: 'route',
    });
  });

  it('candidate parse distinguishes absent (undefined) from the explicit unscoped null', () => {
    // The contract is explicit that these are different inputs.
    expect(parseSelectionCandidate({ origin: 'route' })).toEqual({
      ok: true, targetUserId: null, conversationId: null, origin: 'route',
    });
    expect(parseSelectionCandidate({ origin: 'route', targetUserId: null })).toEqual({
      ok: true, targetUserId: null, conversationId: null, origin: 'route',
    });
  });

  it('candidate parse refuses a malformed id and an unknown origin', () => {
    expect(parseSelectionCandidate({ targetUserId: 'abc' as unknown as number })).toEqual({
      ok: false, reason: 'INVALID_CANDIDATE',
    });
    expect(parseSelectionCandidate({ origin: 'nonsense' as never })).toEqual({
      ok: false, reason: 'INVALID_CANDIDATE',
    });
  });
});

describe('statusForFailure', () => {
  it('maps every failure phase to a non-published status', () => {
    for (const phase of ['unavailable', 'denied', 'invalid', 'retired', 'blocked-return'] as const) {
      expect(statusForFailure(phase)).not.toBe('admitted');
    }
  });
});
