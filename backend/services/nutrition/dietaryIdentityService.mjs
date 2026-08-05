/**
 * ============================================================================
 * FILE: dietaryIdentityService.mjs
 * PURPOSE: Read/declare the user-scoped dietary identity (SWA-71 P0)
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 *
 * FAIL-CLOSED CONTRACT: getDietaryIdentity NEVER conflates unknown with safe.
 * status is one of:
 *   'never_asked'  — no row (or lookup failure: unknown must stay unknown)
 *   'incomplete'   — row exists but allergiesDeclared=false
 *   'declared'     — explicit human declaration; allergies may be [] = none
 * Consumers gate on status === 'declared' before treating allergies as truth.
 */
import UserDietaryIdentity from '../../models/UserDietaryIdentity.mjs';
import { normalizeAllergenList } from './allergenTaxonomy.mjs';
import logger from '../../utils/logger.mjs';

const RESTRICTION_MAX = 30;

export async function getDietaryIdentity(userId) {
  const unknown = { status: 'never_asked', allergies: [], dietaryRestrictions: [], confirmedAt: null };
  if (!Number.isSafeInteger(Number(userId))) return unknown;
  try {
    const row = await UserDietaryIdentity.findOne({ where: { userId } });
    if (!row) return unknown;
    return {
      status: row.allergiesDeclared ? 'declared' : 'incomplete',
      allergies: Array.isArray(row.allergies) ? row.allergies : [],
      dietaryRestrictions: Array.isArray(row.dietaryRestrictions) ? row.dietaryRestrictions : [],
      confirmedAt: row.confirmedAt,
    };
  } catch (err) {
    // Unknown must stay unknown — a DB failure can never read as "no allergies".
    logger.warn(`[DietaryIdentity] lookup failed for user ${userId}: ${err.message}`);
    return unknown;
  }
}

/**
 * Record an explicit declaration. allergies: array of free-text strings or
 * {allergen} objects — normalized through the taxonomy. Empty array IS a valid
 * declaration ("no allergies") because a human is asserting it here.
 */
export async function declareDietaryIdentity({ userId, allergies = [], dietaryRestrictions = [], capturedBy, captureSource = 'client_settings' }) {
  if (!Number.isSafeInteger(Number(userId))) {
    return { ok: false, errors: ['userId is required'] };
  }
  if (!Array.isArray(allergies) || !Array.isArray(dietaryRestrictions)) {
    return { ok: false, errors: ['allergies and dietaryRestrictions must be arrays'] };
  }

  const normalizedAllergies = normalizeAllergenList(
    allergies.map((a) => (typeof a === 'string' ? a : a?.rawText || a?.allergen || ''))
  );
  const restrictions = dietaryRestrictions
    .filter((r) => typeof r === 'string' && r.trim())
    .map((r) => r.trim().slice(0, 60))
    .slice(0, RESTRICTION_MAX);

  const now = new Date();
  const [row] = await UserDietaryIdentity.upsert({
    userId: Number(userId),
    allergiesDeclared: true,
    allergies: normalizedAllergies,
    dietaryRestrictions: restrictions,
    captureSource,
    capturedBy: Number.isSafeInteger(Number(capturedBy)) ? Number(capturedBy) : null,
    confirmedAt: now,
  }, { returning: true });

  logger.info(`[DietaryIdentity] declared for user ${userId} (${normalizedAllergies.length} allergens, ${restrictions.length} restrictions, via ${captureSource})`);
  return { ok: true, identity: row };
}

export default { getDietaryIdentity, declareDietaryIdentity };
