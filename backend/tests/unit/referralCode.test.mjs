import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signReferralCode, verifyReferralCode } from '../../utils/referralCode.mjs';

describe('referralCode — HMAC-signed, stateless, fail-closed', () => {
  const saved = { ...process.env };
  beforeEach(() => { process.env.REFERRAL_HMAC_SECRET = 'test-secret-1'; delete process.env.JWT_SECRET; });
  afterEach(() => { process.env = { ...saved }; });

  it('round-trips a user id', () => {
    const code = signReferralCode(42);
    expect(code).toMatch(/^42\.[A-Za-z0-9_-]{16}$/);
    expect(verifyReferralCode(code)).toBe(42);
  });

  it('is stable for the same id and secret', () => {
    expect(signReferralCode(7)).toBe(signReferralCode('7'));
  });

  it('rejects a tampered id with a valid-looking signature', () => {
    const [, sig] = signReferralCode(42).split('.');
    expect(verifyReferralCode(`43.${sig}`)).toBeNull();
  });

  it('rejects a code signed under a different secret', () => {
    const code = signReferralCode(42);
    process.env.REFERRAL_HMAC_SECRET = 'other';
    expect(verifyReferralCode(code)).toBeNull();
  });

  it('rejects garbage, empty, oversized and non-string input', () => {
    for (const bad of ['', 'abc', '42', '42.', '42.short', 'x'.repeat(50), null, undefined, 42, {}]) {
      expect(verifyReferralCode(bad)).toBeNull();
    }
  });

  it('refuses to sign non-positive or non-integer ids', () => {
    for (const bad of [0, -1, 1.5, 'abc', null, undefined]) expect(signReferralCode(bad)).toBeNull();
  });

  it('fails CLOSED with no secret configured: signs nothing, verifies nothing', () => {
    const code = signReferralCode(42);
    delete process.env.REFERRAL_HMAC_SECRET;
    expect(signReferralCode(42)).toBeNull();
    expect(verifyReferralCode(code)).toBeNull();
  });

  it('falls back to JWT_SECRET when no dedicated secret is set', () => {
    delete process.env.REFERRAL_HMAC_SECRET; process.env.JWT_SECRET = 'jwt';
    expect(verifyReferralCode(signReferralCode(5))).toBe(5);
  });
});
