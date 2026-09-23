import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, '../../routes/v2PaymentRoutes.mjs'), 'utf8');
const compactSource = source.replace(/\s+/g, ' ');

/**
 * E-01 regression guard (hostile review seat 3, 2026-09-18).
 *
 * The verify-session session-package branch used to compare
 * `Number(session.client_reference_id) !== userId` where userId is
 * req.user.id — ALWAYS a string (protect -> toStringId -> String(id)).
 * `42 !== "42"` is true in strict mode, so every session-package buyer
 * got 404 ORDER_NOT_FOUND from the success page. The fix normalizes both
 * sides with String() before comparing.
 *
 * This file pins both the fixed comparison and the semantics it protects.
 */
describe('verify-session session-package id-type guard (E-01)', () => {
  it('compares user ids as strings, not Number !== String', () => {
    expect(compactSource).toContain(
      'String(packageUserId) !== String(userId)'
    );
    // the old always-true comparison must not come back
    expect(compactSource).not.toContain('packageUserId !== userId');
  });

  it('still rejects non-integer client_reference_id values', () => {
    // the Number.isInteger guard ahead of the comparison must remain
    expect(compactSource).toContain('Number.isInteger(packageUserId)');
  });

  it('documents why the normalization exists (E-01 anchor)', () => {
    expect(source).toContain('E-01 fix (hostile review seat 3)');
  });
});

describe('E-01 semantics: strict comparison across types', () => {
  // Executable proof of the bug class the source guard pins.
  it('Number !== String is always true even for equal values', () => {
    const packageUserId = Number('42');
    const stringUserId = String(42);
    expect(packageUserId).not.toBe(stringUserId);       // different types
    expect(packageUserId !== stringUserId).toBe(true);  // the old bug
    expect(String(packageUserId) === String(stringUserId)).toBe(true); // fixed
  });

  it('toStringId produces strings for both integer and string inputs', async () => {
    const { toStringId } = await import('../../utils/idUtils.mjs');
    expect(toStringId(42)).toBe('42');
    expect(typeof toStringId(42)).toBe('string');
    expect(toStringId('42')).toBe('42');
  });
});
