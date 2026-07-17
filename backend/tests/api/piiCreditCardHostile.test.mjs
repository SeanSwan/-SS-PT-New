/**
 * HOSTILE ROUND 1 — attack the credit_card Luhn gate I just wrote.
 *
 * The fix narrowed `credit_card` from /\b(?:\d[ -]*?){13,16}\b/g (which swallowed barbell
 * progressions) to card-shaped runs + a Luhn checksum. The risk of ANY narrowing is the
 * opposite failure: a real card slips through unredacted and reaches the LLM (Rule 8).
 *
 * These are the evasions I would use against my own pattern.
 */
import { describe, expect, it } from 'vitest';
import { sanitizeText } from '../../middleware/piiSanitizationMiddleware.mjs';

// All Luhn-valid test PANs (public test numbers, not real accounts).
const REAL_CARDS = [
  ['contiguous 16 (Visa)', '4111111111111111'],
  ['4-4-4-4 spaces', '4111 1111 1111 1111'],
  ['4-4-4-4 dashes', '4111-1111-1111-1111'],
  ['mixed separators', '4111 1111-1111 1111'],
  ['DOUBLE spaces', '4111  1111  1111  1111'],
  ['Amex 4-6-5', '3782 822463 10005'],
  ['Amex contiguous 15', '378282246310005'],
  ['13-digit Visa', '4222222222222'],
  ['Mastercard contiguous', '5555555555554444'],
  ['Discover 4-4-4-4', '6011 1111 1111 1117'],
];

// Real SwanStudios text. Zero PII. Must never be called critical.
const WORKOUT_TEXT = [
  ['barbell progression', 'Squat 135 135 185 185 225 225 245 for 3x5'],
  ['long warmup ladder', 'warmup 45 55 65 75 85 95 105 115 125 135 145 then work sets'],
  ['set log', 'logged sets: 45 45 95 95 135 135 155 155 185 today, felt strong'],
  ['rep scheme', 'Week plan 5 5 5 3 3 3 1 1 1 then deload 8 8 8'],
  ['tempo + rpe', 'Bench 3x8 @ RPE 7, tempo 3 1 1 0, rest 90 120 90 seconds'],
];

describe('HOSTILE: credit_card must catch real cards', () => {
  it.each(REAL_CARDS)('still blocks %s', (_label, card) => {
    const result = sanitizeText(`payment ${card} thanks`);
    expect(result.hasCriticalPII).toBe(true);
    expect(result.sanitized).not.toContain(card);
  });
});

describe('HOSTILE: credit_card must not eat workout data', () => {
  it.each(WORKOUT_TEXT)('does not flag %s', (_label, text) => {
    expect(sanitizeText(text).hasCriticalPII).toBe(false);
  });

  it('leaves the workout text byte-identical (no silent redaction)', () => {
    const text = 'Squat 135 135 185 185 225 225 245 for 3x5';
    expect(sanitizeText(text).sanitized).toBe(text);
  });
});

describe('HOSTILE: Luhn gate itself', () => {
  it('a card-shaped run that FAILS Luhn is not critical', () => {
    // 4-4-4-4 shaped but checksum-invalid -> not a card.
    expect(sanitizeText('ref 1234 5678 9012 3456').hasCriticalPII).toBe(false);
  });

  it('does not crash on adjacent digits/edges', () => {
    expect(() => sanitizeText('4111111111111111x')).not.toThrow();
    expect(() => sanitizeText('')).not.toThrow();
    expect(() => sanitizeText('   ')).not.toThrow();
  });
});
