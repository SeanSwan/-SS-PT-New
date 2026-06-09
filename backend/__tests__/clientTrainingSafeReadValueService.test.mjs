/**
 * Client Training Safe Read Value Service Tests
 * ============================================
 *
 * Locks shared value-normalization helpers used by LLM-facing client-training
 * read models so dates, IDs, strings, and booleans stay deterministic.
 */
import { describe, expect, it } from 'vitest';

import {
  compactString,
  compactStringOr,
  stringIdOrNull,
  toBoolean,
  toDateOnly,
  toPlainObject,
  valueOr,
} from '../services/clientTrainingSafeReadValueService.mjs';

describe('clientTrainingSafeReadValueService', () => {
  it('normalizes values without leaking object wrappers or invalid dates', () => {
    const row = { toJSON: () => ({ id: 42 }) };

    expect(toPlainObject(row)).toEqual({ id: 42 });
    expect(compactString('  active  ')).toBe('active');
    expect(compactString('   ')).toBeNull();
    expect(compactStringOr('', 'fallback')).toBe('fallback');
    expect(stringIdOrNull(42)).toBe('42');
    expect(stringIdOrNull(null)).toBeNull();
    expect(toBoolean(true)).toBe(true);
    expect(toBoolean('true')).toBe(false);
    expect(valueOr(undefined, 'fallback')).toBe('fallback');
    expect(valueOr(0, 'fallback')).toBe(0);
    expect(toDateOnly('2026-06-07')).toBe('2026-06-07');
    expect(toDateOnly('2026-06-07T16:00:00.000Z')).toBe('2026-06-07');
    expect(toDateOnly(new Date('2026-06-07T16:00:00.000Z'))).toBe('2026-06-07');
    expect(toDateOnly('not-a-date')).toBeNull();
  });
});
