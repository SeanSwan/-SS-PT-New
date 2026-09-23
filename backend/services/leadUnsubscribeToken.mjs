/**
 * leadUnsubscribeToken.mjs — HMAC-SHA256 unsubscribe tokens.
 * =========================================================
 *
 * Stateless by design: no table, no expiry storage, nothing to migrate. A token is a
 * pure function of the lead id and a server secret, so verification needs only the
 * secret — which is what makes an unsubscribe link survive a database restore that
 * would invalidate a stored-token scheme.
 *
 * SECRET POLICY (from `03-contracts.md`, fail-closed on secrets / fail-open on sending):
 *
 *   LEAD_UNSUB_SECRET  →  falls back to  JWT_SECRET
 *
 * If BOTH are unset, `buildUnsubscribeUrl` returns **null** and the email renders its
 * footer WITHOUT a link. That asymmetry is deliberate and is the whole point of this
 * module's policy: an unsigned unsubscribe link would let anyone unsubscribe any lead,
 * so it must not be emitted; but refusing to SEND the mail would silently drop a lead's
 * reply to a real enquiry. The mail goes out, the link does not.
 *
 * Note the consequence, which is a real (accepted) trade-off: while the secrets are
 * unset, recipients have no one-click unsubscribe. That is why the acceptance criteria
 * assert the footer-minus-link behaviour explicitly rather than treating it as an edge
 * case — it is a compliance-relevant state and should be visible.
 *
 * CONSTANT-TIME COMPARE. `verifyUnsubscribeToken` uses `crypto.timingSafeEqual`, not
 * `===`. A byte-wise early-exit comparison leaks, through response timing, how many
 * leading bytes of a guessed token are correct — which turns forging a token from a
 * search over 2^256 into a byte-at-a-time search over 32 bytes. The lengths are
 * compared first because `timingSafeEqual` throws on a length mismatch, and a length is
 * not a secret worth constant-timing here (the token is always a hex SHA-256 digest).
 */
import crypto from 'node:crypto';

/** The digest length is fixed; used to reject malformed tokens before comparison. */
const TOKEN_HEX_LENGTH = 64; // SHA-256 → 32 bytes → 64 hex chars

/** The exact string that is signed. Kept in one place so sign and verify cannot drift. */
function signedPayload(leadId) {
  return `lead:${leadId}`;
}

/**
 * Resolve the signing secret, or null when none is configured.
 *
 * @returns {string|null}
 */
function resolveSecret() {
  const primary = process.env.LEAD_UNSUB_SECRET;
  if (typeof primary === 'string' && primary.length > 0) return primary;

  const fallback = process.env.JWT_SECRET;
  if (typeof fallback === 'string' && fallback.length > 0) return fallback;

  return null;
}

/**
 * Whether an unsubscribe link can be produced at all. Exposed so callers (and tests)
 * can assert the fail-closed state directly instead of inferring it from a null URL.
 *
 * @returns {boolean}
 */
export function isUnsubscribeSigningConfigured() {
  return resolveSecret() !== null;
}

/**
 * @param {string|number} leadId
 * @returns {string} hex hmac of `lead:${leadId}`
 * @throws {Error} when no secret is configured — a token signed with `undefined` would
 *   be forgeable by anyone who reads this source, so it must not be produced silently.
 */
export function makeUnsubscribeToken(leadId) {
  const secret = resolveSecret();
  if (secret === null) {
    throw new Error('Unsubscribe signing secret is not configured');
  }
  if (leadId === undefined || leadId === null || leadId === '') {
    throw new Error('leadId is required to make an unsubscribe token');
  }

  return crypto
    .createHmac('sha256', secret)
    .update(signedPayload(leadId))
    .digest('hex');
}

/**
 * Verify a token against a lead id. Constant-time on the digest comparison.
 *
 * Returns false rather than throwing for every malformed input (missing token,
 * non-hex, wrong length, no secret). A public endpoint must not distinguish "your
 * token is malformed" from "your token is wrong" — both are the same answer to the
 * caller, and the distinction is only useful to someone probing.
 *
 * @param {string|number} leadId
 * @param {string} token
 * @returns {boolean}
 */
export function verifyUnsubscribeToken(leadId, token) {
  if (leadId === undefined || leadId === null || leadId === '') return false;
  if (typeof token !== 'string' || token.length !== TOKEN_HEX_LENGTH) return false;

  let expected;
  try {
    expected = makeUnsubscribeToken(leadId);
  } catch {
    // No secret configured → nothing can verify, so nothing is valid.
    return false;
  }

  // Lengths are equal by construction (both 64 hex chars), so timingSafeEqual cannot
  // throw here; the guard above guarantees it.
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(token, 'utf8');
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

/**
 * Build the public unsubscribe URL for a lead.
 *
 * @param {string|number} leadId
 * @returns {string|null} null when no secret is configured (see the module header on
 *   why that is fail-closed rather than a reason to skip the email)
 */
export function buildUnsubscribeUrl(leadId) {
  if (!isUnsubscribeSigningConfigured()) return null;
  if (leadId === undefined || leadId === null || leadId === '') return null;

  const baseUrl = process.env.PUBLIC_BASE_URL || 'https://sswanstudios.com';
  // Trim a trailing slash so a configured `https://example.com/` does not yield `//api`.
  const root = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  const lid = encodeURIComponent(leadId);
  const tok = makeUnsubscribeToken(leadId);

  return `${root}/api/leads/unsubscribe?lid=${lid}&tok=${tok}`;
}
