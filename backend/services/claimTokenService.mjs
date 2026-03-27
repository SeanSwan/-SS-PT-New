/**
 * ============================================================================
 * FILE: claimTokenService.mjs
 * PURPOSE: Generate and verify SWAN-XXXX invite codes for client account claiming
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-27
 * AI VILLAGE VALIDATED: 2026-03-27
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Generates human-readable 8-char tokens (SWAN-XXXX) for the Crystalline Link
 *   Protocol. Tokens are bcrypt-hashed before storage. Clients scan a QR code or
 *   enter the code on /claim to activate their STUB account.
 *
 * HOW IT FITS IN THE APP:
 *   Admin creates client → generateClaimToken() → token displayed in admin UI
 *   Client enters code → verifyClaimToken() → account upgraded to ACTIVE
 */
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────
// SECTION: Token Generation
// PURPOSE: Create human-readable SWAN-XXXX codes
// ─────────────────────────────────────────────────────────────

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O/1/I to avoid confusion

/**
 * Generate a human-readable claim token like "SWAN-A7X3"
 * @returns {{ plainToken: string, hash: string, expires: Date }}
 */
export async function generateClaimToken() {
  // Generate 4 random chars from the safe charset
  const suffix = Array.from(crypto.randomBytes(4))
    .map(b => CHARSET[b % CHARSET.length])
    .join('');
  const plainToken = `SWAN-${suffix}`;

  // Bcrypt hash for secure storage (cost factor 10)
  const hash = await bcrypt.hash(plainToken, 10);

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
 * Verify a plaintext claim token against a bcrypt hash
 * @param {string} plainToken - e.g. "SWAN-A7X3"
 * @param {string} storedHash - bcrypt hash from database
 * @returns {boolean}
 */
export async function verifyClaimToken(plainToken, storedHash) {
  if (!plainToken || !storedHash) return false;
  return bcrypt.compare(plainToken.toUpperCase().trim(), storedHash);
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
