/**
 * scrubErrorText — behavioural tests against the messages Postgres actually sends.
 *
 * GLM 5.3 hostile round 1, finding 1. The cart route began logging error.message
 * to make a 500 diagnosable, and the accompanying test asserted that the LOGGER
 * never names a PII field — which it never did. The PII was in the error TEXT:
 * PG quotes the offending value straight back at you. That test passed while the
 * defect shipped, so this one exercises the scrubber with hostile input instead
 * of reading the source.
 */
import { describe, it, expect } from 'vitest';
import { scrubErrorText, SCRUB_MAX_LENGTH } from '../../utils/scrubErrorText.mjs';

describe('scrubErrorText', () => {
  it('redacts an email PG quoted back in a type error', () => {
    const out = scrubErrorText('invalid input syntax for type uuid: "sean@example.com"');
    expect(out).not.toContain('sean@example.com');
    expect(out).toContain('<redacted');
    // The SHAPE survives — that is what names the root cause.
    expect(out).toContain('invalid input syntax for type uuid');
  });

  it('redacts the value half of a unique-violation detail, keeping the column', () => {
    const out = scrubErrorText('Key (email)=(member@swanstudios.com) already exists.');
    expect(out).not.toContain('member@swanstudios.com');
    expect(out).toContain('(email)');
    expect(out).toContain('already exists');
  });

  it('redacts a raw uuid', () => {
    const out = scrubErrorText('cart 3f2504e0-4f89-11d3-9a0c-0305e82c3301 not found');
    expect(out).not.toContain('3f2504e0-4f89-11d3-9a0c-0305e82c3301');
    expect(out).toContain('<redacted-uuid>');
  });

  it('redacts long digit runs (ids, phone numbers, card-ish sequences)', () => {
    const out = scrubErrorText('user 4111111111111111 failed');
    expect(out).not.toContain('4111111111111111');
    expect(out).toContain('<redacted-num>');
  });

  it('keeps short numbers that carry diagnosis, not identity', () => {
    expect(scrubErrorText('42703 column does not exist')).toContain('42703');
  });

  it('caps length so one error cannot flood the log', () => {
    expect(scrubErrorText('x'.repeat(5000))).toHaveLength(SCRUB_MAX_LENGTH);
  });

  it('returns null for a missing or empty message rather than the string "undefined"', () => {
    expect(scrubErrorText(undefined)).toBeNull();
    expect(scrubErrorText(null)).toBeNull();
    expect(scrubErrorText('')).toBeNull();
    expect(scrubErrorText(42)).toBeNull();
  });

  it('leaves an already-clean message intact', () => {
    const clean = 'Models cache not initialized. Call initializeModelsCache() during server startup.';
    expect(scrubErrorText(clean)).toBe(clean);
  });
});
