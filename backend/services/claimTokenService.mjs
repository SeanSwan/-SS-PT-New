/**
 * ============================================================================
 * FILE: claimTokenService.mjs
 * PURPOSE: Generate and verify SWAN-XXXXXXXX invite codes for client account claiming
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28 (11-Brain Consensus: SHA-256 + 8-char entropy)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Generates human-readable tokens (SWAN-XXXXXXXX) for the Crystalline Link
 *   Protocol. Tokens are SHA-256 hashed before storage for O(1) lookup.
 *   Clients scan a QR code or enter the code on /claim to activate their account.
 *
 * HOW IT FITS IN THE APP:
 *   Admin creates client → generateClaimToken() → token displayed in admin UI
 *   Client enters code → hashToken() → direct DB lookup → account upgraded to ACTIVE
 *
 * AI VILLAGE FINDING 2: Increased entropy from 4→8 chars (30^8 = 656B combinations)
 * AI VILLAGE FINDING 3: Replaced bcrypt with SHA-256 for O(1) lookup vs O(n) bcrypt loop
 */
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────
// SECTION: Token Generation
// PURPOSE: Create human-readable SWAN-XXXXXXXX codes
// WHY SHA-256: Bcrypt requires comparing each candidate row (O(n) per verify).
//   SHA-256 allows direct WHERE claimTokenHash = hash (O(1) lookup).
//   Invite codes are short-lived (30 days) and low-value — SHA-256 is appropriate.
// ─────────────────────────────────────────────────────────────

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O/1/I to avoid confusion

/**
 * Hash a plain token with SHA-256 for storage/lookup.
 * @param {string} plainToken - e.g. "SWAN-A7X3B2K9"
 * @returns {string} hex-encoded SHA-256 hash
 */
export function hashToken(plainToken) {
  return crypto.createHash('sha256')
    .update(plainToken.toUpperCase().trim())
    .digest('hex');
}

/**
 * Generate a human-readable claim token like "SWAN-A7X3B2K9"
 * @returns {{ plainToken: string, hash: string, expires: Date }}
 */
export function generateClaimToken() {
  // 8 random chars from safe charset (AI Village Finding 2: increased from 4)
  const suffix = Array.from(crypto.randomBytes(8))
    .map(b => CHARSET[b % CHARSET.length])
    .join('');
  const plainToken = `SWAN-${suffix}`;

  // SHA-256 hash for O(1) database lookup (AI Village Finding 3: replaced bcrypt)
  const hash = hashToken(plainToken);

  // 30-day expiry
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);

  return { plainToken, hash, expires };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Token Verification
// PURPOSE: Validate a plaintext token against stored hash
// ─────────────────────────────────────────────────────────────

/**
 * Verify a plaintext claim token against a stored SHA-256 hash.
 * @param {string} plainToken - e.g. "SWAN-A7X3B2K9"
 * @param {string} storedHash - SHA-256 hex hash from database
 * @returns {boolean}
 */
export function verifyClaimToken(plainToken, storedHash) {
  if (!plainToken || !storedHash) return false;
  return hashToken(plainToken) === storedHash;
}

/**
 * Check if a claim token has expired
 * @param {Date|string} expiresAt
 * @returns {boolean}
 */
export function isTokenExpired(expiresAt) {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date();
}
