/**
 * Cart identity must be REJECTED, not coerced (Kimi K3 DRIFT-1, 2026-08-04)
 * =========================================================================
 * normalizeAuthenticatedUserId used Number.parseInt(String(userId), 10), and
 * parseInt stops at the first non-digit:
 *
 *   parseInt('12f3a9...', 10) === 12
 *   parseInt('42abc',     10) === 42
 *
 * Every cart route scopes on the value it returns — `where userId = ?`, and the
 * checkout compare-and-swap — so a non-numeric or prefixed identifier (a legacy
 * token, an SSO subject, a migrated id) silently resolved to a DIFFERENT, REAL
 * user and the caller operated on that user's cart. An IDOR produced by
 * coercion rather than by a missing check.
 *
 * These pin rejection over coercion, and pin that the failure does not echo the
 * identifier back into logs or responses.
 */
import { describe, it, expect } from 'vitest';
import { normalizeAuthenticatedUserId } from '../../utils/cartSchemaRecovery.mjs';

describe('normalizeAuthenticatedUserId — rejects, never coerces', () => {
  it.each([
    ['hex-ish id that parseInt would truncate to 12', '12f3a9b4'],
    ['numeric prefix with suffix', '42abc'],
    ['id with a separator', '7-anything'],
    ['uuid', '3f2504e0-4f89-11d3-9a0c-0305e82c3301'],
    ['float string', '12.9'],
    ['exponent', '1e3'],
    ['leading zero', '007'],
    ['whitespace-padded non-numeric', '  12x  '],
    ['negative', '-5'],
    ['zero', '0'],
    ['empty', ''],
    ['plus-prefixed', '+3'],
  ])('rejects %s', (_label, value) => {
    expect(() => normalizeAuthenticatedUserId(value)).toThrow();
  });

  it('the specific regression: 12f3a9 must NOT become user 12', () => {
    // The whole point. Before the fix this returned 12 — a real, different user.
    let resolved = null;
    try { resolved = normalizeAuthenticatedUserId('12f3a9'); } catch { /* expected */ }
    expect(resolved).not.toBe(12);
    expect(resolved).toBeNull();
  });

  it.each([
    ['numeric string', '42', 42],
    ['plain number', 42, 42],
    ['large safe integer', '9007199254740991', 9007199254740991],
  ])('accepts %s', (_label, value, expected) => {
    expect(normalizeAuthenticatedUserId(value)).toBe(expected);
  });

  it.each([
    ['non-integer number', 12.5],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['unsafe integer', Number.MAX_SAFE_INTEGER + 2],
    ['null', null],
    ['undefined', undefined],
    ['object', { id: 12 }],
    ['array', [12]],
    ['boolean', true],
  ])('rejects %s', (_label, value) => {
    expect(() => normalizeAuthenticatedUserId(value)).toThrow();
  });

  it('does not echo the rejected identifier back into the error', () => {
    // The message reaches logs and, via ensureNumericCartUser, a 401 response.
    try {
      normalizeAuthenticatedUserId('12f3a9-secret-looking-value');
      throw new Error('should have thrown');
    } catch (error) {
      expect(error.message).not.toContain('12f3a9');
      expect(error.message).not.toContain('secret-looking-value');
    }
  });
});
