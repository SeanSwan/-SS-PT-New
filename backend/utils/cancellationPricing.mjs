/**
 * Cancellation Pricing Helper
 * ===========================
 * MindBody Parity: Unified pricing logic for cancellation fees
 *
 * NO HARDCODED FEES - All calculations derive from:
 * - Client's package pricing (pricePerSession)
 * - Session duration / session type
 * - Cancellation policy window (24-hour rule)
 */

import { Op } from 'sequelize';
import moment from 'moment';
import logger from './logger.mjs';

// Default fallback prices (only used if no package found)
const FALLBACK_PRICES = {
  STANDARD_60_MIN: 175,  // 60+ minute sessions
  EXPRESS_30_MIN: 110,   // 30 minute sessions
  LATE_FEE_PERCENTAGE: 0.5  // 50% of session price for late fee
};

// Special package detection thresholds
const SPECIAL_PACKAGE_THRESHOLDS = {
  // If price per session is below this, it's likely a promotional/discounted package
  PROMOTIONAL_PRICE_THRESHOLD: 100,
  // If package has bonus sessions, it's a special
  BONUS_SESSION_INDICATOR: ['bonus', 'promo', 'special', 'free', 'complimentary']
};

/**
 * Fetch client's package pricing from their most recent order
 * @param {number} clientId - User ID of the client
 * @param {object} models - Sequelize models { Order, StorefrontItem }
 * @returns {object} Package pricing info
 */
export async function getClientPackagePricing(clientId, models) {
  const { Order, StorefrontItem } = models;

  try {
    // Find the most recent completed order for this client
    const recentOrder = await Order.findOne({
      where: {
        userId: clientId,
        status: 'completed'
      },
      order: [['createdAt', 'DESC']],
      include: [{
        model: StorefrontItem,
        as: 'items',
        attributes: ['id', 'name', 'price', 'sessions', 'packageType', 'isActive']
      }]
    });

    if (!recentOrder || !recentOrder.items || recentOrder.items.length === 0) {
      logger.info(`No completed order found for client ${clientId}, using fallback pricing`);
      return {
        pricePerSession: FALLBACK_PRICES.STANDARD_60_MIN,
        packageName: 'Standard (Fallback)',
        isFallback: true,
        isSpecialPackage: false,
        requiresAdminReview: false
      };
    }

    // Find the session package item (not one-time purchases)
    const sessionPackage = recentOrder.items.find(item =>
      item.sessions > 0 && item.packageType !== 'one-time'
    ) || recentOrder.items[0];

    const pricePerSession = sessionPackage.sessions > 0
      ? parseFloat(sessionPackage.price) / sessionPackage.sessions
      : parseFloat(sessionPackage.price);

    // Detect if this is a special/promotional package
    const isSpecialPackage = detectSpecialPackage(sessionPackage, pricePerSession);

    return {
      pricePerSession: Math.round(pricePerSession * 100) / 100,
      packageName: sessionPackage.name,
      packageId: sessionPackage.id,
      totalSessions: sessionPackage.sessions,
      packagePrice: parseFloat(sessionPackage.price),
      isFallback: false,
      isSpecialPackage,
      requiresAdminReview: isSpecialPackage
    };

  } catch (error) {
    logger.error('Error fetching client package pricing:', error);
    return {
      pricePerSession: FALLBACK_PRICES.STANDARD_60_MIN,
      packageName: 'Standard (Error Fallback)',
      isFallback: true,
      isSpecialPackage: false,
      requiresAdminReview: false,
      error: error.message
    };
  }
}

/**
 * Detect if a package is a special/promotional package requiring admin review
 */
function detectSpecialPackage(packageItem, pricePerSession) {
  // Check if price is suspiciously low (promotional)
  if (pricePerSession < SPECIAL_PACKAGE_THRESHOLDS.PROMOTIONAL_PRICE_THRESHOLD) {
    return true;
  }

  // Check if package name contains promotional indicators
  const nameLower = (packageItem.name || '').toLowerCase();
  for (const indicator of SPECIAL_PACKAGE_THRESHOLDS.BONUS_SESSION_INDICATOR) {
    if (nameLower.includes(indicator)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate cancellation charge based on session and policy
 * @param {object} session - Session being cancelled
 * @param {object} packageInfo - Package pricing info from getClientPackagePricing
 * @param {object} options - Additional options
 * @returns {object} Charge calculation result
 */
export function computeCancellationCharge(session, packageInfo, options = {}) {
  const { chargeType = 'auto', customAmount = null } = options;

  // Calculate hours until session
  const sessionTime = new Date(session.sessionDate).getTime();
  const now = Date.now();
  const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60);
  const isLateCancellation = hoursUntilSession < 24;

  // Get base prices
  const sessionPrice = packageInfo.pricePerSession || FALLBACK_PRICES.STANDARD_60_MIN;
  const lateFeeAmount = Math.round(sessionPrice * FALLBACK_PRICES.LATE_FEE_PERCENTAGE * 100) / 100;

  // Determine if admin review is required
  const requiresAdminReview = packageInfo.isSpecialPackage ||
                               packageInfo.requiresAdminReview ||
                               isLateCancellation;

  // Calculate recommended charge based on policy
  let recommendedAmount = 0;
  let recommendedChargeType = 'none';
  let basis = '';

  if (isLateCancellation) {
    recommendedAmount = lateFeeAmount;
    recommendedChargeType = 'late_fee';
    basis = `Late cancellation (${Math.round(hoursUntilSession * 10) / 10}h notice). Late fee = 50% of $${sessionPrice}/session.`;
  } else {
    recommendedAmount = 0;
    recommendedChargeType = 'none';
    basis = `Early cancellation (${Math.round(hoursUntilSession * 10) / 10}h notice). No charge per policy.`;
  }

  // Override based on chargeType if specified
  let finalAmount = recommendedAmount;
  let finalChargeType = recommendedChargeType;

  switch (chargeType) {
    case 'none':
      finalAmount = 0;
      finalChargeType = 'none';
      basis = 'Waived by admin - no charge applied.';
      break;
    case 'late_fee':
      finalAmount = lateFeeAmount;
      finalChargeType = 'late_fee';
      basis = `Late fee: 50% of $${sessionPrice}/session = $${lateFeeAmount}`;
      break;
    case 'full':
      finalAmount = sessionPrice;
      finalChargeType = 'full';
      basis = `Full session charge: $${sessionPrice}/session`;
      break;
    case 'partial':
      finalAmount = customAmount || (sessionPrice * 0.5);
      finalChargeType = 'partial';
      basis = `Partial charge: $${finalAmount}`;
      break;
    case 'custom':
      finalAmount = customAmount || 0;
      finalChargeType = 'partial';
      basis = `Custom amount: $${finalAmount}`;
      break;
    case 'auto':
    default:
      // Use recommended values
      break;
  }

  return {
    // Calculated amounts
    chargeAmount: Math.round(finalAmount * 100) / 100,
    chargeType: finalChargeType,

    // Pricing details
    sessionPrice,
    lateFeeAmount,

    // Policy context
    hoursUntilSession: Math.max(0, Math.round(hoursUntilSession * 10) / 10),
    isLateCancellation,

    // Admin review flags
    requiresAdminReview,
    isSpecialPackage: packageInfo.isSpecialPackage,

    // Explanation
    basis,
    recommendation: isLateCancellation
      ? `Late cancellation - recommend $${lateFeeAmount} late fee (50% of session price)`
      : 'Early cancellation - recommend no charge',

    // Package context
    packageName: packageInfo.packageName,
    isFallbackPricing: packageInfo.isFallback
  };
}

/**
 * Get cancellation policy for a session
 * @param {object} session - Session to check
 * @returns {object} Policy details
 */
export function getCancellationPolicy(session) {
  const sessionTime = new Date(session.sessionDate).getTime();
  const now = Date.now();
  const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60);

  return {
    requiredNoticeHours: 24,
    isLateCancellation: hoursUntilSession < 24,
    hoursUntilSession: Math.max(0, Math.round(hoursUntilSession * 10) / 10),
    lateFeePercentage: FALLBACK_PRICES.LATE_FEE_PERCENTAGE * 100,
    policyDescription: 'Sessions cancelled less than 24 hours in advance may be subject to a late cancellation fee of 50% of the session price.'
  };
}

export default {
  getClientPackagePricing,
  computeCancellationCharge,
  getCancellationPolicy,
  FALLBACK_PRICES
};
