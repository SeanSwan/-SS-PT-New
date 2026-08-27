/**
 * referralCode.mjs — HMAC-signed, stateless referral codes.
 *
 * `<userId>.<16-char sig>`. No schema change: the code is derived from the user id and a
 * server secret, so it is stable, unguessable, and verifiable without a lookup. Fails CLOSED:
 * with no secret configured nothing signs and nothing verifies — attribution is simply absent,
 * never wrong. Domain-prefixed HMAC input keeps this key-separated from JWT signing even when
 * the JWT secret is reused as the fallback.
 */
import crypto from 'crypto';

const CODE_RE = /^(\d{1,12})\.([A-Za-z0-9_-]{16})$/;

const secret = () => process.env.REFERRAL_HMAC_SECRET || process.env.JWT_SECRET || '';

const signatureFor = (id) =>
  crypto.createHmac('sha256', secret()).update(`swan-ref:${id}`).digest('base64url').slice(0, 16);

/** @returns {string|null} code for a positive integer user id, or null (no secret / bad id). */
export function signReferralCode(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0 || !secret()) return null;
  return `${id}.${signatureFor(id)}`;
}

/** @returns {number|null} the referring user id when the code verifies, else null. */
export function verifyReferralCode(code) {
  if (typeof code !== 'string' || code.length > 40 || !secret()) return null;
  const m = CODE_RE.exec(code.trim());
  if (!m) return null;
  const id = Number(m[1]);
  const given = Buffer.from(m[2]);
  const expected = Buffer.from(signatureFor(id));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  return id;
}
