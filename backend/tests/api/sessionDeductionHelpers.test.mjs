/**
 * Session Deduction Helpers & Constants Tests
 * ============================================
 * Unit tests for paymentRecovery.constants.mjs and sessionDeductionRoute.helpers.mjs
 */
import { describe, it, expect } from 'vitest';
import {
  VALID_PAYMENT_METHODS,
  METHODS_REQUIRING_REFERENCE,
  MAX_REFERENCE_LENGTH,
  MAX_NOTES_LENGTH,
  MIN_FORCE_REASON_LENGTH,
  MAX_FORCE_REASON_LENGTH,
  IDEMPOTENCY_INDEX_NAME,
  UUID_V4_REGEX,
  ERROR_CODE_MAP,
  sanitizeString,
  isValidUUID,
  maskReference,
  isIdempotencyViolation
} from '../../utils/paymentRecovery.constants.mjs';

import { mapServiceError } from '../../routes/sessionDeductionRoute.helpers.mjs';

// ═══════════════════════════════════════════════════════════════
// sanitizeString
// ═══════════════════════════════════════════════════════════════
describe('sanitizeString', () => {
  it('trims whitespace', () => {
    const { value, error } = sanitizeString('  hello  ', 100);
    expect(value).toBe('hello');
    expect(error).toBeNull();
  });

  it('strips control characters', () => {
    const { value, error } = sanitizeString('hello\x00world\x01!', 100);
    expect(value).toBe('helloworld!');
    expect(error).toBeNull();
  });

  it('strips newlines by default', () => {
    const { value } = sanitizeString('line1\nline2\ttab', 100);
    expect(value).toBe('line1line2tab');
  });

  it('preserves newlines and tabs when preserveNewlines=true', () => {
    const { value } = sanitizeString('line1\nline2\ttab', 100, true);
    expect(value).toBe('line1\nline2\ttab');
  });

  it('returns error for too-long strings', () => {
    const { value, error } = sanitizeString('a'.repeat(201), 200);
    expect(error).toBe('Must be 200 characters or fewer');
    expect(value.length).toBe(201); // value is still returned for caller inspection
  });

  it('returns empty string for null/undefined', () => {
    expect(sanitizeString(null, 100)).toEqual({ value: '', error: null });
    expect(sanitizeString(undefined, 100)).toEqual({ value: '', error: null });
  });

  it('coerces numbers to string', () => {
    const { value } = sanitizeString(42, 100);
    expect(value).toBe('42');
  });
});

// ═══════════════════════════════════════════════════════════════
// isValidUUID
// ═══════════════════════════════════════════════════════════════
describe('isValidUUID', () => {
  it('accepts valid UUID v4', () => {
    expect(isValidUUID('a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5')).toBe(true);
  });

  it('rejects non-v4 UUIDs (version 1)', () => {
    // version 1 has "1" in the third group
    expect(isValidUUID('a1b2c3d4-e5f6-1a7b-8c9d-e0f1a2b3c4d5')).toBe(false);
  });

  it('rejects empty/null/undefined', () => {
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);
  });

  it('rejects strings longer than 36 chars', () => {
    expect(isValidUUID('a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5x')).toBe(false);
  });

  it('rejects non-string types', () => {
    expect(isValidUUID(12345)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// maskReference
// ═══════════════════════════════════════════════════════════════
describe('maskReference', () => {
  it('masks long references, showing last 4 chars', () => {
    expect(maskReference('VENMO-12345678')).toBe('***5678');
  });

  it('fully masks short references (4 chars or fewer)', () => {
    expect(maskReference('abc')).toBe('***');
    expect(maskReference('abcd')).toBe('***');
  });

  it('returns *** for null/undefined/non-string', () => {
    expect(maskReference(null)).toBe('***');
    expect(maskReference(undefined)).toBe('***');
    expect(maskReference(123)).toBe('***');
  });
});

// ═══════════════════════════════════════════════════════════════
// isIdempotencyViolation
// ═══════════════════════════════════════════════════════════════
describe('isIdempotencyViolation', () => {
  it('returns true for constraint match via error.original', () => {
    const error = {
      name: 'SequelizeUniqueConstraintError',
      original: { constraint: IDEMPOTENCY_INDEX_NAME },
      errors: []
    };
    expect(isIdempotencyViolation(error)).toBe(true);
  });

  it('returns true for constraint match via error.parent', () => {
    const error = {
      name: 'SequelizeUniqueConstraintError',
      parent: { constraint: IDEMPOTENCY_INDEX_NAME },
      errors: []
    };
    expect(isIdempotencyViolation(error)).toBe(true);
  });

  it('returns true for field path fallback', () => {
    const error = {
      name: 'SequelizeUniqueConstraintError',
      errors: [{ path: 'idempotencyKey' }]
    };
    expect(isIdempotencyViolation(error)).toBe(true);
  });

  it('returns false for non-UniqueConstraintError', () => {
    const error = {
      name: 'SequelizeValidationError',
      original: { constraint: IDEMPOTENCY_INDEX_NAME }
    };
    expect(isIdempotencyViolation(error)).toBe(false);
  });

  it('returns false for different constraint name', () => {
    const error = {
      name: 'SequelizeUniqueConstraintError',
      original: { constraint: 'orders_pkey' },
      parent: { constraint: 'orders_pkey' },
      errors: [{ path: 'id' }]
    };
    expect(isIdempotencyViolation(error)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// ERROR_CODE_MAP
// ═══════════════════════════════════════════════════════════════
describe('ERROR_CODE_MAP', () => {
  it('maps DUPLICATE_PAYMENT_WINDOW to 409', () => {
    expect(ERROR_CODE_MAP.DUPLICATE_PAYMENT_WINDOW).toBe(409);
  });

  it('maps DUPLICATE_IDEMPOTENCY_KEY to 409', () => {
    expect(ERROR_CODE_MAP.DUPLICATE_IDEMPOTENCY_KEY).toBe(409);
  });

  it('maps CLIENT_NOT_FOUND to 404', () => {
    expect(ERROR_CODE_MAP.CLIENT_NOT_FOUND).toBe(404);
  });

  it('maps MODELS_UNAVAILABLE to 503', () => {
    expect(ERROR_CODE_MAP.MODELS_UNAVAILABLE).toBe(503);
  });

  it('maps INTERNAL_ERROR to 500', () => {
    expect(ERROR_CODE_MAP.INTERNAL_ERROR).toBe(500);
  });

  it('has all expected error codes', () => {
    const expectedCodes = [
      'DUPLICATE_PAYMENT_WINDOW', 'DUPLICATE_IDEMPOTENCY_KEY',
      'CLIENT_NOT_FOUND', 'PACKAGE_NOT_FOUND', 'PACKAGE_INACTIVE',
      'INVALID_ROLE', 'NO_SESSIONS_IN_PACKAGE', 'INVALID_PAYMENT_METHOD',
      'MISSING_PAYMENT_REFERENCE', 'INVALID_IDEMPOTENCY_TOKEN',
      'MISSING_FORCE_REASON', 'PAYMENT_REFERENCE_TOO_LONG',
      'ADMIN_NOTES_TOO_LONG', 'FORCE_REASON_TOO_LONG',
      'INVALID_CLIENT_ID', 'INVALID_STOREFRONT_ITEM_ID',
      'MODELS_UNAVAILABLE', 'INTERNAL_ERROR'
    ];
    for (const code of expectedCodes) {
      expect(ERROR_CODE_MAP).toHaveProperty(code);
      expect(typeof ERROR_CODE_MAP[code]).toBe('number');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// mapServiceError (route helper)
// ═══════════════════════════════════════════════════════════════
describe('mapServiceError', () => {
  it('maps coded errors to correct status + code', () => {
    const error = new Error('Client not found');
    error.code = 'CLIENT_NOT_FOUND';
    const mapped = mapServiceError(error);
    expect(mapped).toEqual({ statusCode: 404, errorCode: 'CLIENT_NOT_FOUND' });
  });

  it('maps DUPLICATE_PAYMENT_WINDOW to 409', () => {
    const error = new Error('Duplicate');
    error.code = 'DUPLICATE_PAYMENT_WINDOW';
    const mapped = mapServiceError(error);
    expect(mapped).toEqual({ statusCode: 409, errorCode: 'DUPLICATE_PAYMENT_WINDOW' });
  });

  it('maps SequelizeUniqueConstraintError on idempotency key to 409', () => {
    const error = {
      name: 'SequelizeUniqueConstraintError',
      message: 'Unique constraint violation',
      original: { constraint: IDEMPOTENCY_INDEX_NAME },
      errors: []
    };
    const mapped = mapServiceError(error);
    expect(mapped).toEqual({ statusCode: 409, errorCode: 'DUPLICATE_IDEMPOTENCY_KEY' });
  });

  it('returns null for unknown errors', () => {
    const error = new Error('Something random');
    expect(mapServiceError(error)).toBeNull();
  });

  it('returns null for SequelizeUniqueConstraintError on other index', () => {
    const error = {
      name: 'SequelizeUniqueConstraintError',
      message: 'Unique constraint violation',
      original: { constraint: 'orders_orderNumber_key' },
      parent: { constraint: 'orders_orderNumber_key' },
      errors: [{ path: 'orderNumber' }]
    };
    expect(mapServiceError(error)).toBeNull();
  });

  it('prefers error.code over SequelizeUniqueConstraintError', () => {
    const error = {
      name: 'SequelizeUniqueConstraintError',
      message: 'Already processed',
      code: 'DUPLICATE_IDEMPOTENCY_KEY',
      original: { constraint: IDEMPOTENCY_INDEX_NAME },
      errors: []
    };
    const mapped = mapServiceError(error);
    // Should map via code path, not constraint path
    expect(mapped).toEqual({ statusCode: 409, errorCode: 'DUPLICATE_IDEMPOTENCY_KEY' });
  });
});

// ═══════════════════════════════════════════════════════════════
// Constants sanity checks
// ═══════════════════════════════════════════════════════════════
describe('Constants', () => {
  it('VALID_PAYMENT_METHODS includes expected methods', () => {
    expect(VALID_PAYMENT_METHODS).toEqual(['cash', 'venmo', 'zelle', 'check']);
  });

  it('METHODS_REQUIRING_REFERENCE is a subset of VALID_PAYMENT_METHODS', () => {
    for (const m of METHODS_REQUIRING_REFERENCE) {
      expect(VALID_PAYMENT_METHODS).toContain(m);
    }
  });

  it('UUID_V4_REGEX matches valid UUIDs', () => {
    expect(UUID_V4_REGEX.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('field limits are reasonable', () => {
    expect(MAX_REFERENCE_LENGTH).toBeGreaterThan(0);
    expect(MAX_NOTES_LENGTH).toBeGreaterThan(MAX_REFERENCE_LENGTH);
    expect(MIN_FORCE_REASON_LENGTH).toBeLessThan(MAX_FORCE_REASON_LENGTH);
  });
});
