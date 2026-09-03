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

describe('scrubErrorText — round 3: one rule must not cancel another', () => {
  it('KEEPS a REAL composite constraint name (44 chars — longer than the token rule)', () => {
    // GLM round 3 blocker 1. The opaque-token rule ate any 40-char run, so the
    // identifier the quoted rule had just preserved was redacted a line later.
    // The old test passed only because its fixture was a short 15-char name.
    const name = 'workout_sessions_user_id_completed_at_unique';
    expect(name.length).toBeGreaterThan(40);
    const out = scrubErrorText(`duplicate key value violates unique constraint "${name}"`);
    expect(out).toContain(`"${name}"`);
    expect(out).not.toContain('<redacted-token>');
  });

  it('REDACTS an identifier-shaped USER VALUE (the carve-out must not re-admit PII)', () => {
    // GLM round 3 blocker 2: usernames are identifier-shaped.
    for (const value of ['sean-connor', 'bobby_o_shea']) {
      const out = scrubErrorText(`invalid input syntax for type uuid: "${value}"`);
      expect(out).not.toContain(value);
      expect(out).toContain('"<redacted>"');
    }
  });

  it('keeps a date — an invalid date IS the diagnosis', () => {
    const out = scrubErrorText('invalid date 2024-01-15 for column started_at');
    expect(out).toContain('2024-01-15');
  });

  it('never cuts a redaction marker in half at the length cap', () => {
    const out = scrubErrorText(`${'word '.repeat(90)}someone@example.com trailing`);
    expect(out.length).toBeLessThanOrEqual(SCRUB_MAX_LENGTH);
    expect(out).not.toMatch(/<redacted[a-z-]*$/);
  });
});

describe('scrubLogMeta — round 3', () => {
  it('keeps an Error usable instead of flattening it to {}', () => {
    const err = new Error('failed for someone@example.com');
    const out = scrubLogMeta({ error: err });
    expect(out.error.name).toBe('Error');
    expect(out.error.message).toContain('<redacted-email>');
    expect(out.error.message).not.toContain('someone@example.com');
    expect(typeof out.error.stack).toBe('string');
  });

  it('renders a Date rather than dropping it', () => {
    const out = scrubLogMeta({ when: new Date('2024-01-15T00:00:00Z') });
    expect(out.when).toBe('2024-01-15T00:00:00.000Z');
  });

  it('walks arrays and Maps', () => {
    const out = scrubLogMeta({
      list: ['a@b.co'],
      map: new Map([['k', 'c@d.co']]),
    });
    expect(out.list[0]).toContain('<redacted-email>');
    expect(out.map.k).toContain('<redacted-email>');
  });
});
