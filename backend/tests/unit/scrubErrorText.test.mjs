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
import { scrubErrorText, scrubLogMeta, SCRUB_MAX_LENGTH } from '../../utils/scrubErrorText.mjs';

describe('scrubErrorText', () => {
  it('redacts an email PG quoted back in a type error', () => {
    const out = scrubErrorText('invalid input syntax for type uuid: "sean@example.com"');
    expect(out).not.toContain('sean@example.com');
    expect(out).toContain('<redacted');
    // The SHAPE survives — that is what names the root cause.
    expect(out).toContain('invalid input syntax for type uuid');
  });

  it('redacts the value half of a unique-violation detail, keeping the column', () => {
    const out = scrubErrorText('Key (email)=(member@example.com) already exists.');
    expect(out).not.toContain('member@example.com');
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
    // Real words, not a 5000-char blob: a blob is itself an opaque token and is
    // redacted to a short marker, which would test the wrong rule.
    const long = 'column does not exist in relation orders '.repeat(200);
    expect(scrubErrorText(long)).toHaveLength(SCRUB_MAX_LENGTH);
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

describe('scrubErrorText — round 2 hardening', () => {
  it('redacts a card number written with separators', () => {
    for (const raw of ['4111 1111 1111 1111', '4111-1111-1111-1111']) {
      const out = scrubErrorText(`payment ${raw} declined`);
      expect(out).not.toContain('4111');
      expect(out).toContain('<redacted-num>');
    }
  });

  it('redacts a formatted phone number', () => {
    const out = scrubErrorText('contact +1 (415) 555-2671 failed');
    expect(out).not.toContain('555-2671');
  });

  it('redacts an opaque token (JWT segment, base64 key)', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9aaaaaaaaaaaaaaaaaaaa';
    const out = scrubErrorText(`auth rejected ${jwt}`);
    expect(out).not.toContain(jwt);
    expect(out).toContain('<redacted-token>');
  });

  it('KEEPS a quoted SQL identifier — the constraint name is the diagnosis', () => {
    const out = scrubErrorText('duplicate key value violates unique constraint "users_email_key"');
    expect(out).toContain('"users_email_key"');
    expect(out).toContain('unique constraint');
  });

  it('still redacts a quoted VALUE that is not an identifier', () => {
    const out = scrubErrorText('invalid input syntax for type integer: "not a number"');
    expect(out).not.toContain('not a number');
    expect(out).toContain('"<redacted>"');
  });

  it('keeps short numbers that carry diagnosis (ports, PG codes)', () => {
    expect(scrubErrorText('42703 at port 5432')).toContain('42703');
  });
});

describe('scrubLogMeta', () => {
  it('scrubs every string in the object, including fields nobody remembered', () => {
    const out = scrubLogMeta({
      userId: 7,
      ok: true,
      message: 'failed for someone@example.com',
      nested: { detail: 'Key (email)=(a@b.co) already exists' },
      aFieldAddedLater: 'token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9aaaaaaaaaaaaaaaaaaaa',
    });
    expect(out.userId).toBe(7);
    expect(out.ok).toBe(true);
    expect(out.message).not.toContain('someone@example.com');
    expect(out.nested.detail).not.toContain('a@b.co');
    expect(out.aFieldAddedLater).toContain('<redacted-token>');
  });

  it('passes non-objects through untouched', () => {
    expect(scrubLogMeta(null)).toBeNull();
    expect(scrubLogMeta(undefined)).toBeUndefined();
  });
});
