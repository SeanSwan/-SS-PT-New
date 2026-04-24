import { describe, expect, it } from 'vitest';
import { getEffectiveReadUserId } from '../../utils/viewAs/getEffectiveReadUserId.mjs';

describe('getEffectiveReadUserId', () => {
  it.each([
    ['valid target', { viewAsUserId: 42, user: { id: 7 } }, 42],
    ['undefined target', { user: { id: 7 } }, 7],
    ['zero target', { viewAsUserId: 0, user: { id: 7 } }, 7],
    ['negative target', { viewAsUserId: -1, user: { id: 7 } }, 7],
    ['fractional target', { viewAsUserId: 1.5, user: { id: 7 } }, 7],
    ['infinite target', { viewAsUserId: Infinity, user: { id: 7 } }, 7],
    ['NaN target', { viewAsUserId: NaN, user: { id: 7 } }, 7],
    ['string target', { viewAsUserId: '42', user: { id: 7 } }, 7],
    ['unsafe integer target', { viewAsUserId: Number.MAX_SAFE_INTEGER + 1, user: { id: 7 } }, 7],
    ['missing auth context', {}, undefined],
  ])('returns expected id for %s', (_label, req, expected) => {
    expect(getEffectiveReadUserId(req)).toBe(expected);
  });
});
