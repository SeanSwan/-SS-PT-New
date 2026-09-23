/**
 * ============================================================================
 * FILE: userSerialization.mjs
 * PURPOSE: Single source of truth for which `User` columns must never leave the
 *          process in an HTTP response.
 * ============================================================================
 *
 * WHY THIS EXISTS
 * ---------------
 * `User` rows were sanitised per call site with a hard-coded *deny-list*:
 *
 *     attributes: { exclude: ['password', 'refreshTokenHash'] }
 *
 * A deny-list rots. `resetPasswordToken` and `resetPasswordExpires` were added
 * to the model later (models/User.mjs:540,544) and every existing exclude-list
 * silently kept shipping them — nothing failed, because nothing was checking.
 * Two shapes also coexisted (`exclude: [...]` vs an explicit `attributes: [...]`
 * allowlist), so no single grep could enforce the invariant.
 *
 * This module makes the credential set one exported constant, so the exclusion
 * cannot drift per call site again. `User` has no `defaultScope` and no
 * `toJSON()` override, so this constant is the only central control.
 *
 * USAGE
 * -----
 *   import { USER_CREDENTIAL_FIELDS } from '../utils/userSerialization.mjs';
 *
 *   const user = await User.findByPk(id, {
 *     attributes: { exclude: [...USER_CREDENTIAL_FIELDS] },
 *   });
 *
 * ADDING A CREDENTIAL COLUMN? Add it here, once. Every consumer inherits it.
 */

/**
 * Columns on `User` that must never be serialized to a client.
 *
 * - password            — bcrypt hash (models/User.mjs:55)
 * - refreshTokenHash    — refresh-token verifier (models/User.mjs:514)
 * - resetPasswordToken  — HMAC-SHA256 hash of a live reset token
 *                         (models/User.mjs:540; see utils/startupMigrations.mjs:245)
 * - resetPasswordExpires— reveals whether a reset is currently pending
 *                         (models/User.mjs:544)
 * - claimTokenHash      — SHA-256 of a SWAN-XXXXXXXX invite code
 *                         (models/User.mjs:430; see services/claimTokenService.mjs:39).
 *                         Unsalted, and the code is only 32^8 (~2^40) — a leaked hash is
 *                         offline-brute-forceable, so this is a live claim credential.
 * - claimTokenExpires    — reveals whether an invite is currently pending
 *                         (models/User.mjs:435)
 *
 * The reset-token value is stored hashed and the lookup re-hashes the submitted
 * raw token, so the stored value is not directly a bearer credential. It is
 * still excluded: it is credential-shaped, it discloses a pending-reset state,
 * and leaving it in place is how the deny-list rotted in the first place.
 */
export const USER_CREDENTIAL_FIELDS = Object.freeze([
  'password',
  'refreshTokenHash',
  'resetPasswordToken',
  'resetPasswordExpires',
  'claimTokenHash',
  'claimTokenExpires',
]);

/**
 * Non-credential columns that are nonetheless internal-only and should not be
 * handed to a client that merely happens to be allowed to read the row.
 * Kept separate from USER_CREDENTIAL_FIELDS so call sites can opt in.
 */
export const USER_INTERNAL_FIELDS = Object.freeze([
  'failedLoginAttempts',
  'lastLoginIP',
  'registrationIP',
]);

/**
 * Convenience wrapper: `attributes: withoutUserCredentials()`.
 * Spread extra names yourself if a site needs more, e.g.
 *   { exclude: [...USER_CREDENTIAL_FIELDS, ...USER_INTERNAL_FIELDS] }
 */
export const withoutUserCredentials = () => ({ exclude: [...USER_CREDENTIAL_FIELDS] });

/**
 * Remove credential columns from an already-serialized plain object.
 *
 * WHY THIS EXISTS — the shape an `exclude:` grep cannot see.
 * ---------------------------------------------------------
 * Not every call site can filter at the query. Some need the whole row for
 * their own logic and only strip credentials at the response boundary, and they
 * wrote it as a rest-destructure:
 *
 *     const { password: _, refreshTokenHash: __, ...clientData } = newClient.toJSON();
 *     return res.json({ data: { client: clientData } });
 *
 * That is a deny-list too — just spelled as destructuring. It is invisible to a
 * search for `exclude: [`, so when `resetPasswordToken` / `resetPasswordExpires`
 * were added to the model, the guard's ratchet skipped it and it kept shipping
 * them. It also cannot be fixed by adding to the destructure, because the next
 * added column rots it again.
 *
 * Use this instead, so the set still comes from one place:
 *
 *     const clientData = stripCredentialFields(newClient.toJSON());
 *
 * Note it strips credentials only. `USER_INTERNAL_FIELDS` (IP / lockout
 * metadata) is a separate, product-level decision — see §18 R-04 — so it is
 * deliberately not applied here.
 */
export const stripCredentialFields = (row) => {
  const out = { ...row };
  for (const field of USER_CREDENTIAL_FIELDS) delete out[field];
  return out;
};

/**
 * Fields safe to return for a *profile* view (the shape `authController`'s
 * private `sanitizeUser` allowlist already uses). Allowlists cannot rot, so
 * prefer this over an exclude-list when the full row is not genuinely needed.
 */
export const PUBLIC_USER_FIELDS = Object.freeze([
  'id',
  'firstName',
  'lastName',
  'email',
  'username',
  'role',
  'photo',
  'createdAt',
  'updatedAt',
]);
