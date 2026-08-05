/**
 * Logger redaction tests (Phase 5 Slice 5.5+ + CLAUDE.md Rule 59)
 * =================================================================
 * Verifies that secret env values + key-shaped tokens are redacted from
 * any logger output. Closes Codex CR-IMPL-2 (logger redaction not wired).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { redactString, redactValue } from '../../utils/logger.mjs';

const joinFixture = (...parts) => parts.join('');
const plaudWebhookSecret = joinFixture('plaud_test_secret_value_', 'a'.repeat(36));
const jwtSecret = joinFixture('jwt_test_secret_value_', 'b'.repeat(36));
const stripeKey = (mode, suffix) => ['sk', mode, suffix].join('_');
const stripeWebhookSecret = (suffix) => ['whsec', suffix].join('_');
const googleApiKey = () => joinFixture('AI', 'za', 'Sy', 'Example1234567890_abcdefghij');

beforeEach(() => {
  // Set known secret values so the redactor's snapshotting works for the test.
  vi.stubEnv('PLAUD_APPLAUD_WEBHOOK_SECRET_V1', plaudWebhookSecret);
  vi.stubEnv('JWT_SECRET', jwtSecret);
  vi.stubEnv('STRIPE_SECRET_KEY', stripeKey('live', 'a'.repeat(36)));
});

afterEach(() => { vi.unstubAllEnvs(); });

describe('Logger redaction — env value scrubbing (Codex CR-IMPL-2)', () => {
  it('redacts PLAUD_APPLAUD_WEBHOOK_SECRET_V1 value when it appears in a string', () => {
    const out = redactString(`webhook key: ${plaudWebhookSecret} is set`);
    expect(out).not.toContain('plaud_test_secret_value');
    expect(out).toContain('<REDACTED>');
  });

  it('redacts JWT_SECRET value', () => {
    const out = redactString(`signing with ${jwtSecret}`);
    expect(out).not.toContain('jwt_test_secret_value');
    expect(out).toContain('<REDACTED>');
  });

  it('redacts multiple occurrences of the same secret in one string', () => {
    const s = `A: ${plaudWebhookSecret} B: ${plaudWebhookSecret}`;
    const out = redactString(s);
    expect(out).not.toContain('plaud_test_secret_value');
    expect((out.match(/<REDACTED>/g) || []).length).toBe(2);
  });

  it('does NOT redact short / non-secret values that happen to be set in env', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const out = redactString('NODE_ENV is production');
    expect(out).toContain('production');
  });

  it('redacts values inside nested objects (recursive walk)', () => {
    const obj = {
      level: 'error',
      meta: {
        config: {
          secret: plaudWebhookSecret,
        },
      },
      messages: [`contains ${plaudWebhookSecret}`, 'normal'],
    };
    const out = redactValue(obj);
    // Two mechanisms can now redact this field and either satisfies the security property: the
    // env-value scrubber matches the VALUE, and key-name redaction matches the KEY (`secret` is on
    // the credential allowlist) and wins by short-circuiting first. Asserting the exact placeholder
    // pinned which mechanism ran — an implementation detail — so assert the property instead:
    // the secret is gone and the field is redacted. The array case below is a non-credential key,
    // so it still proves the env-value path itself works.
    expect(out.meta.config.secret).not.toContain('plaud_test_secret_value');
    expect(String(out.meta.config.secret)).toContain('REDACTED');
    expect(out.messages[0]).not.toContain('plaud_test_secret_value');
    expect(out.messages[0]).toContain('<REDACTED>');
    expect(out.messages[1]).toBe('normal');
  });

  it('does not touch numbers, booleans, null, undefined', () => {
    expect(redactValue(42)).toBe(42);
    expect(redactValue(true)).toBe(true);
    expect(redactValue(null)).toBe(null);
    expect(redactValue(undefined)).toBe(undefined);
  });

  it('handles deeply nested objects without infinite recursion (depth cap)', () => {
    let nested = { secret: plaudWebhookSecret };
    for (let i = 0; i < 10; i += 1) {
      nested = { wrap: nested };
    }
    expect(() => redactValue(nested)).not.toThrow();
  });
});

describe('Logger redaction — pattern-based scrubbing (Rule 59)', () => {
  /**
   * These assertions used to demand the literal placeholder '<REDACTED-KEY>'.
   * SWA-71 replaced the single generic label with CLASS-SPECIFIC ones
   * (<REDACTED-STRIPE>, <REDACTED-GOOGLE>, <REDACTED-JWT>, ...), which is strictly
   * better for triage, and these five tests then failed on the label alone while
   * redaction was working perfectly. They were reported as security-suite failures
   * for a cosmetic reason.
   *
   * Re-anchored on what actually matters, in this order:
   *   1. the raw secret is GONE  <- the security property
   *   2. SOME <REDACTED-*> marker replaced it  <- proves substitution, not deletion
   * Three of these tests previously asserted only the label and never checked (1)
   * at all, so a partial redaction would have passed. They all check it now, and a
   * future re-labelling cannot break them.
   */
  // Underscores are real: the webhook-secret rule emits <REDACTED-STRIPE_WHSEC>.
  const REDACTION_MARKER = /<REDACTED-[A-Z0-9_-]+>/;

  it('redacts sk_live_... patterns even when not in env list', () => {
    const unknownKey = stripeKey('live', 'unknownkeyhere1234567890abcdefxyz');
    const out = redactString(`Stripe key: ${unknownKey}`);
    expect(out).not.toContain(unknownKey);
    expect(out).toMatch(REDACTION_MARKER);
  });

  it('redacts sk_test_... patterns', () => {
    const key = stripeKey('test', 'aaabbbcccdddeeefff111222333');
    const out = redactString(`test mode: ${key}`);
    expect(out).not.toContain(key);
    expect(out).toMatch(REDACTION_MARKER);
  });

  it('redacts whsec_... patterns', () => {
    const secret = stripeWebhookSecret('aabbccddeeff112233445566');
    const out = redactString(`webhook secret: ${secret}`);
    expect(out).not.toContain(secret);
    expect(out).toMatch(REDACTION_MARKER);
  });

  it('redacts AIza... (Google API key shape)', () => {
    const key = googleApiKey();
    const out = redactString(`Google key: ${key}`);
    expect(out).not.toContain(key);
    expect(out).toMatch(REDACTION_MARKER);
  });

  it('redacts JWT shape (eyJ...eyJ...sig)', () => {
    // Build the JWT-shaped fixture at runtime so the repo's pre-commit
    // secret scanner (which flags static `eyJ...` patterns) doesn't fire
    // on this test. The fixture itself is a fake non-functional token.
    const seg1 = 'eyJ' + 'hbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const seg2 = 'eyJ' + 'dXNlciI6InRlc3QtZml4dHVyZSJ9';
    const seg3 = 'signaturepart12345';
    const jwt = `${seg1}.${seg2}.${seg3}`;
    const out = redactString(`Bearer ${jwt}`);
    expect(out).not.toContain(jwt);
    expect(out).toMatch(REDACTION_MARKER);
  });

  it('does NOT over-redact legitimate text', () => {
    expect(redactString('this is a normal log line')).toBe('this is a normal log line');
    expect(redactString('user clicked Save Workout')).toBe('user clicked Save Workout');
  });
});

describe('Logger redaction — defense-in-depth', () => {
  it('handles non-string input gracefully (returns as-is)', () => {
    expect(redactString(undefined)).toBe(undefined);
    expect(redactString(null)).toBe(null);
    expect(redactString(123)).toBe(123);
  });

  it('does not crash on circular-reference-free arrays', () => {
    const arr = [plaudWebhookSecret, 'safe', { nested: jwtSecret }];
    const out = redactValue(arr);
    expect(out[0]).toBe('<REDACTED>');
    expect(out[1]).toBe('safe');
    expect(out[2].nested).toBe('<REDACTED>');
  });
});
