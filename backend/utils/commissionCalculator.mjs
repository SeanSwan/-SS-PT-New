/**
 * ============================================================================
 * FILE: commissionCalculator.mjs
 * PURPOSE: Trainer/business revenue split calculator with two-tier trainer model
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Calculates revenue splits between SwanStudios and trainers
 * based on trainer type (independent vs hired) and lead source. Supports loyalty
 * bumps for high-volume clients.
 *
 * TWO-TIER TRAINER MODEL:
 * - Independent trainers: 10% platform fee (trainer keeps 90%)
 * - Hired trainers (Sean's clients via Move Fitness etc.): 40% to business (trainer keeps 60%)
 *
 * LEAD SOURCE MODIFIERS (applied on top of trainer type base):
 * - Platform lead: Base rates apply as-is
 * - Trainer-brought lead: -5% from business cut (trainer reward for sourcing)
 * - Resign/renewal: -2% from business cut (retention reward)
 *
 * LOYALTY BUMP: +5% to trainer for clients who completed >100 sessions
 */

/**
 * Calculate commission split for a purchase.
 * Uses the two-tier trainer model with lead source modifiers.
 *
 * @param {string} leadSource - 'platform', 'trainer_brought', or 'resign'
 * @param {number} grossAmount - Total package cost before tax
 * @param {number} sessionsGranted - Number of sessions in package
 * @param {boolean} applyLoyaltyBump - Whether to apply +5% loyalty bump
 * @param {Object} options - Additional options
 * @param {string} options.trainerType - 'independent' or 'hired' (default: 'hired')
 * @returns {Object} Commission split details
 */
export function calculateCommissionSplit(leadSource, grossAmount, sessionsGranted, applyLoyaltyBump = false, options = {}) {
  if (!leadSource || !['platform', 'trainer_brought', 'resign'].includes(leadSource)) {
    throw new Error(`Invalid lead source: ${leadSource}. Must be 'platform', 'trainer_brought', or 'resign'.`);
  }

  if (typeof grossAmount !== 'number' || grossAmount < 0) {
    throw new Error(`Invalid gross amount: ${grossAmount}. Must be a positive number.`);
  }

  if (typeof sessionsGranted !== 'number' || sessionsGranted <= 0) {
    throw new Error(`Invalid sessions granted: ${sessionsGranted}. Must be a positive number.`);
  }

  const trainerType = options.trainerType || 'hired';

  // ── Base rates from trainer type ──
  let businessRate = 0;
  let trainerRate = 0;

  if (trainerType === 'independent') {
    // Independent trainers: 15% platform fee, trainer keeps 85%
    businessRate = 15;
    trainerRate = 85;
  } else {
    // Hired trainers (default): 35% to business, trainer keeps 65%
    businessRate = 35;
    trainerRate = 65;
  }

  // ── Lead source modifiers ──
  switch (leadSource) {
    case 'platform':
      // No modifier — base rates apply
      break;
    case 'trainer_brought':
      // Reward trainer for sourcing the client: -5% from business
      businessRate = Math.max(5, businessRate - 5);
      trainerRate = 100 - businessRate;
      break;
    case 'resign':
      // Reward trainer for client retention: -3% from business
      businessRate = Math.max(5, businessRate - 3);
      trainerRate = 100 - businessRate;
      break;
  }

  // Apply loyalty bump if eligible
  let loyaltyBump = false;
  if (applyLoyaltyBump && sessionsGranted > 100) {
    businessRate = Math.max(5, businessRate - 5);
    trainerRate = 100 - businessRate;
    loyaltyBump = true;
  }

  // Calculate dollar amounts
  const businessCut = parseFloat(((grossAmount * businessRate) / 100).toFixed(2));
  const trainerCut = parseFloat(((grossAmount * trainerRate) / 100).toFixed(2));

  // Ensure totals match (handle rounding)
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
