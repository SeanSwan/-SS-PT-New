/**
 * commissionRates.mjs — SINGLE SOURCE OF TRUTH for trainer commission rates.
 * ============================================================================
 * Canonical rate table keyed by the REAL `User.trainerType` enum values
 * (`'independent' | 'affiliated'`). No rate literal may live anywhere else —
 * `commissionCalculator.mjs` and `CommissionService.mjs` both import from here.
 *
 * ⚠ SCHEMA-DRIFT FIX (S0, 2026-07-23): the previous code compared against the
 * string `'hired'`, which CANNOT exist in the DB (`User.trainerType` enum is
 * `['affiliated','independent']`). `'affiliated'` silently fell into the else-branch
 * and computed at 35/65 — the intended affiliated rate, but by accident. This module
 * makes the mapping explicit and the unknown case throw instead of silently defaulting.
 *
 * These are MONEY numbers. Changing them changes trainer pay. Any change is
 * high-stakes and requires review. `businessRate + trainerRate` must always equal 100.
 *
 * @module utils/commissionRates
 */

/** Canonical trainer-type enum values (must match User.trainerType `isIn`). */
export const TRAINER_TYPES = Object.freeze(['independent', 'affiliated']);

/** The safe fallback type when a trainer's type is unset. 'affiliated' preserves the
 * historical (accidental-but-intended) 35/65 behavior. SINGLE source — never duplicate
 * this literal in callers (that would re-introduce the drift class this module fixes).
 * NOTE: callers should ALERT when the fallback engages on a NULL type — a NULL type on an
 * independent trainer would silently underpay them 20 points; loud-fallback, not silent. */
export const DEFAULT_TRAINER_TYPE = 'affiliated';

/**
 * Base split by trainer type. businessRate = SwanStudios' cut %, trainerRate = trainer's cut %.
 * - independent: brings own clients, runs own business → 15% platform fee (Sean's locked number)
 * - affiliated:  trains SwanStudios' clients / staff-type → 35% to business
 */
export const BASE_RATES = Object.freeze({
  independent: Object.freeze({ businessRate: 15, trainerRate: 85 }),
  affiliated: Object.freeze({ businessRate: 35, trainerRate: 65 }),
});

/** Lead-source business-rate reductions (subtracted from businessRate, floored by RATE_FLOOR). */
export const LEAD_SOURCE_MODIFIERS = Object.freeze({
  platform: 0,
  trainer_brought: 5, // reward for sourcing the client
  resign: 3, // reward for retention
});

export const VALID_LEAD_SOURCES = Object.freeze(Object.keys(LEAD_SOURCE_MODIFIERS));

/** Business rate can never fall below this floor after modifiers/bumps. */
export const RATE_FLOOR = 5;

/** Loyalty bump: reduce business rate by this much for eligible high-volume clients. */
export const LOYALTY_BUMP_REDUCTION = 5;

/** Loyalty eligibility threshold (completed sessions AND new-package sessions must exceed this). */
export const LOYALTY_SESSION_THRESHOLD = 100;

/**
 * Resolve the base rates for a trainer type. Throws on an unknown type rather than
 * silently defaulting — silent fallthrough on money code is exactly how the 'hired'
 * drift bug hid. Callers must pass a canonical type or handle the throw.
 * @param {string} trainerType
 * @returns {{businessRate:number, trainerRate:number}}
 */
export function baseRatesForType(trainerType) {
  const rates = BASE_RATES[trainerType];
  if (!rates) {
    throw new Error(
      `[commissionRates] Unknown trainerType "${trainerType}". Expected one of: ${TRAINER_TYPES.join(', ')}.`,
    );
  }
  return rates;
}
