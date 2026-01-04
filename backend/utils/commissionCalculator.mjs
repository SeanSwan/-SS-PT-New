/**
 * Commission Calculator Utility
 * Calculates trainer/business commission splits based on lead source and package details
 *
 * Commission Rules:
 * - Platform leads: 55% business / 45% trainer
 * - Resign leads (renewals): 50% business / 50% trainer
 * - Trainer-brought leads: 20% business / 80% trainer
 * - Loyalty bump: +5% to trainer for packages >100 sessions (after client completes 100 sessions)
 */

/**
 * Calculate commission split for a purchase
 * @param {string} leadSource - 'platform', 'trainer_brought', or 'resign'
 * @param {number} grossAmount - Total package cost before tax
 * @param {number} sessionsGranted - Number of sessions in package
 * @param {boolean} applyLoyaltyBump - Whether to apply +5% loyalty bump
 * @returns {Object} Commission split details
 */
export function calculateCommissionSplit(leadSource, grossAmount, sessionsGranted, applyLoyaltyBump = false) {
  if (!leadSource || !['platform', 'trainer_brought', 'resign'].includes(leadSource)) {
    throw new Error(`Invalid lead source: ${leadSource}. Must be 'platform', 'trainer_brought', or 'resign'.`);
  }

  if (typeof grossAmount !== 'number' || grossAmount < 0) {
    throw new Error(`Invalid gross amount: ${grossAmount}. Must be a positive number.`);
  }

  if (typeof sessionsGranted !== 'number' || sessionsGranted <= 0) {
    throw new Error(`Invalid sessions granted: ${sessionsGranted}. Must be a positive number.`);
  }

  // Base commission rates
  let businessRate = 0;
  let trainerRate = 0;

  switch (leadSource) {
    case 'platform':
      businessRate = 55;
      trainerRate = 45;
      break;
    case 'resign':
      businessRate = 50;
      trainerRate = 50;
      break;
    case 'trainer_brought':
      businessRate = 20;
      trainerRate = 80;
      break;
  }

  // Apply loyalty bump if eligible
  let loyaltyBump = false;
  if (applyLoyaltyBump && sessionsGranted > 100) {
    trainerRate += 5;
    businessRate -= 5;
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
 * Calculate commission for multiple packages/orders
 * @param {Array} orders - Array of order objects with leadSource, grossAmount, sessionsGranted
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
    const {leadSource, grossAmount, sessionsGranted, applyLoyaltyBump = false} = order;

    const commission = calculateCommissionSplit(leadSource, grossAmount, sessionsGranted, applyLoyaltyBump);

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
