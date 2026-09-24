/**
 * Card 1.2 — the PRE-COLLAPSE client pair (finding FF19).
 *
 * `resolveCommandClientId` collapses the SELECTED client and the
 * CLASSIFIER-EXTRACTED client into one value before anything downstream can
 * compare them. That is right for dispatch — the selection must win — and fatal
 * for the cross-client alarm: a tier computed from post-collapse values compares
 * a number with itself, so `cross_client` is unreachable by construction and its
 * tests pass while proving nothing.
 *
 * These pin BOTH halves: the pair exposes the two candidates, and the effective
 * value stays byte-identical to the collapsing helper so dispatch is unchanged.
 */
import { describe, it, expect } from 'vitest';
import { resolveCommandClientId, resolveCommandClientPair } from '../../services/ai/dispatchers/clientScope.mjs';

describe('resolveCommandClientPair', () => {
  it('keeps BOTH candidates when they disagree — the case the alarm needs', () => {
    const pair = resolveCommandClientPair({ clientId: 47 }, { resolvedClient: { id: 42 } });
    expect(pair).toEqual({ locked: 42, target: 47, effective: 42, collapsedFrom: 'selection' });
  });

  it('a target named while nothing is locked is visible as such (F16g shape)', () => {
    const pair = resolveCommandClientPair({ clientId: 47 }, {});
    expect(pair).toEqual({ locked: null, target: 47, effective: 47, collapsedFrom: 'params' });
  });

  it('neither present → none', () => {
    expect(resolveCommandClientPair({}, {})).toEqual({
      locked: null, target: null, effective: null, collapsedFrom: 'none',
    });
  });

  it('string ids from a stringifying transport are the SAME client — no false alarm', () => {
    const pair = resolveCommandClientPair({ clientId: '42' }, { resolvedClient: { id: 42 } });
    expect(pair.locked).toBe(42);
    expect(pair.target).toBe(42);
  });

  it('malformed ids degrade to null rather than NaN', () => {
    const pair = resolveCommandClientPair({ clientId: 'not-a-number' }, { resolvedClient: { id: 0 } });
    expect(pair.locked).toBeNull();
    expect(pair.target).toBeNull();
    expect(pair.effective).toBeNull();
  });

  it('effective is byte-identical to resolveCommandClientId in every shape — dispatch is unchanged', () => {
    const shapes = [
      [{ clientId: 47 }, { resolvedClient: { id: 42 } }],
      [{ clientId: 47 }, {}],
      [{}, { resolvedClient: { id: 42 } }],
      [{}, {}],
      [{ clientId: '9' }, { resolvedClient: { id: null } }],
      [{ clientId: -3 }, {}],
    ];
    for (const [params, ctx] of shapes) {
      expect(resolveCommandClientPair(params, ctx).effective).toBe(resolveCommandClientId(params, ctx));
    }
  });
});
