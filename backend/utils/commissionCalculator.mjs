/**
 * ============================================================================
 * FILE: commissionCalculator.mjs
 * PURPOSE: Trainer/business revenue split calculator with two-tier trainer model
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-07-23 (S0 drift fix)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Calculates revenue splits between SwanStudios and trainers
 * based on trainer type and lead source. Supports loyalty bumps for high-volume clients.
 * All rate literals live in `commissionRates.mjs` (single source of truth) — DO NOT
 * hardcode rates here.
 *
 * TWO-TIER TRAINER MODEL (canonical, matches `User.trainerType` enum):
 * - independent: 15% platform fee (trainer keeps 85%)
 * - affiliated:  35% to business (trainer keeps 65%)
 *
 * LEAD SOURCE MODIFIERS (applied on top of trainer type base):
 * - platform:        base rates apply as-is
 * - trainer_brought: -5% from business cut (reward for sourcing)
 * - resign/renewal:  -3% from business cut (retention reward)
 *
 * LOYALTY BUMP: -5% business (→ +5% trainer) for eligible clients >100 sessions.
 */
import {
  baseRatesForType,
  LEAD_SOURCE_MODIFIERS,
  VALID_LEAD_SOURCES,
  RATE_FLOOR,
  LOYALTY_BUMP_REDUCTION,
  LOYALTY_SESSION_THRESHOLD,
  DEFAULT_TRAINER_TYPE,
} from './commissionRates.mjs';

/**
 * Calculate commission split for a purchase.
 *
 * @param {string} leadSource - 'platform', 'trainer_brought', or 'resign'
 * @param {number} grossAmount - Total package cost before tax
 * @param {number} sessionsGranted - Number of sessions in package
 * @param {boolean} applyLoyaltyBump - Whether to apply the loyalty bump
 * @param {Object} options
 * @param {string} options.trainerType - 'independent' or 'affiliated' (default: 'affiliated')
 * @returns {Object} Commission split details
 */
export function calculateCommissionSplit(leadSource, grossAmount, sessionsGranted, applyLoyaltyBump = false, options = {}) {
  if (!leadSource || !VALID_LEAD_SOURCES.includes(leadSource)) {
    throw new Error(`Invalid lead source: ${leadSource}. Must be one of: ${VALID_LEAD_SOURCES.join(', ')}.`);
  }

  if (typeof grossAmount !== 'number' || grossAmount < 0) {
    throw new Error(`Invalid gross amount: ${grossAmount}. Must be a positive number.`);
  }

  if (typeof sessionsGranted !== 'number' || sessionsGranted <= 0) {
    throw new Error(`Invalid sessions granted: ${sessionsGranted}. Must be a positive number.`);
  }

  // ── Base rates from trainer type (throws on unknown type — no silent fallthrough on money) ──
  const trainerType = options.trainerType || DEFAULT_TRAINER_TYPE;
  const base = baseRatesForType(trainerType);
  let businessRate = base.businessRate;
  let trainerRate = base.trainerRate;

  // ── Lead source modifier (data-driven from commissionRates) ──
  const reduction = LEAD_SOURCE_MODIFIERS[leadSource] || 0;
  if (reduction > 0) {
    businessRate = Math.max(RATE_FLOOR, businessRate - reduction);
    trainerRate = 100 - businessRate;
  }

  // Apply loyalty bump if eligible (uses the shared threshold constant, not a magic number)
  let loyaltyBump = false;
  if (applyLoyaltyBump && sessionsGranted > LOYALTY_SESSION_THRESHOLD) {
    businessRate = Math.max(RATE_FLOOR, businessRate - LOYALTY_BUMP_REDUCTION);
    trainerRate = 100 - businessRate;
    loyaltyBump = true;
  }

  // Calculate dollar amounts
  const businessCut = parseFloat(((grossAmount * businessRate) / 100).toFixed(2));
  const trainerCut = parseFloat(((grossAmount * trainerRate) / 100).toFixed(2));

  // Ensure totals match. The sub-cent rounding remainder (≤ $0.01/txn) is assigned to the
  // BUSINESS cut by design — a documented, accepted directional choice (reversing it would
  // change every historical commission). Not random; business absorbs the remainder.
  const total = businessCut + trainerCut;
  const diff = parseFloat((grossAmount - total).toFixed(2));

  return {
    businessRate: parseFloat(businessRate.toFixed(2)),
    trainerRate: parseFloat(trainerRate.toFixed(2)),
    businessCut: diff !== 0 ? parseFloat((businessCut + diff).toFixed(2)) : businessCut,
    trainerCut,
    loyaltyBump,
    grossAmount: parseFloat(grossAmount.toFixed(2))
  };
}

/**
 * Check if client is eligible for loyalty bump
 * @param {number} completedSessions - Number of sessions client has completed
 * @param {number} newPackageSessions - Number of sessions in new package
 * @returns {boolean} Whether loyalty bump should be applied
 */
export function isEligibleForLoyaltyBump(completedSessions, newPackageSessions) {
  // Client must have completed more than 100 sessions
  // AND new package must be >100 sessions
  return completedSessions > 100 && newPackageSessions > 100;
}

/**
 * Calculate commission for multiple packages/orders.
 * Supports trainerType per-order for mixed portfolios.
 * @param {Array} orders - Array of order objects with leadSource, grossAmount, sessionsGranted, trainerType?
 * @returns {Object} Aggregated commission data
 */
export function calculateBulkCommissions(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    throw new Error('Orders must be a non-empty array');
  }

  let totalBusinessCut = 0;
  let totalTrainerCut = 0;
  let totalGrossAmount = 0;
  const commissionDetails = [];

  for (const order of orders) {
    const {leadSource, grossAmount, sessionsGranted, applyLoyaltyBump = false, trainerType} = order;

    const commission = calculateCommissionSplit(leadSource, grossAmount, sessionsGranted, applyLoyaltyBump, { trainerType });

    totalBusinessCut += commission.businessCut;
    totalTrainerCut += commission.trainerCut;
    totalGrossAmount += commission.grossAmount;

    commissionDetails.push({
      orderId: order.id || null,
      ...commission
    });
  }

  return {
    totalBusinessCut: parseFloat(totalBusinessCut.toFixed(2)),
    totalTrainerCut: parseFloat(totalTrainerCut.toFixed(2)),
    totalGrossAmount: parseFloat(totalGrossAmount.toFixed(2)),
    averageBusinessRate: parseFloat(((totalBusinessCut / totalGrossAmount) * 100).toFixed(2)),
    averageTrainerRate: parseFloat(((totalTrainerCut / totalGrossAmount) * 100).toFixed(2)),
    orders: commissionDetails
  };
}

export default {
  calculateCommissionSplit,
  isEligibleForLoyaltyBump,
  calculateBulkCommissions
};
