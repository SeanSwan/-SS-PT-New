/**
 * ============================================================================
 * FILE: CommissionService.mjs
 * PURPOSE: Auto-create trainer commission records on purchase completion
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: When a purchase completes (via Stripe webhook or admin
 * grant), this service looks up the client's assigned trainer and creates a
 * TrainerCommission record with the correct revenue split.
 *
 * COMMISSION TIERS:
 * - Independent trainers: 15% platform fee (trainer keeps 85%)
 * - Hired trainers: 35% to business (trainer keeps 65%)
 * - Lead source modifiers: trainer_brought -5%, resign -3%
 * - Loyalty bump: +5% after 100 completed sessions
 *
 * HOW IT FITS IN THE APP: Stripe Webhook → processCompletedOrder → CommissionService
 */

import { getModel, getUser } from '../models/index.mjs';
import { calculateCommissionSplit, isEligibleForLoyaltyBump } from '../utils/commissionCalculator.mjs';
import { countCompletedPaidTrainingSessions } from './creditGrantLoyaltyService.mjs';
import { raiseMoneyWriteAlert } from './adminAlertService.mjs';
import logger from '../utils/logger.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Commission Service
// PURPOSE: Create commission records automatically on purchase
// ─────────────────────────────────────────────────────────────

/**
 * Create a commission record for a completed purchase.
 * Finds the client's assigned trainer and calculates the revenue split.
 *
 * @param {Object} params
 * @param {number} params.userId - Client user ID
 * @param {number} params.orderId - Order ID (nullable for webhook-only flow)
 * @param {number} params.grossAmount - Pre-tax purchase amount
 * @param {number} params.taxAmount - Tax amount
 * @param {number} params.sessionsGranted - Number of sessions purchased
 * @param {number} params.storefrontItemId - Package ID
 * @param {string} params.leadSource - 'platform' (default), 'trainer_brought', or 'resign'
 * @returns {Object|null} Created commission record or null if no trainer assigned
 */
export async function createCommissionForPurchase({
  userId,
  orderId = null,
  grossAmount,
  taxAmount = 0,
  sessionsGranted,
  storefrontItemId,
  leadSource = 'platform',
}) {
  try {
    const User = getUser();
    const TrainerCommission = getModel('TrainerCommission');
    const ClientTrainerAssignment = getModel('ClientTrainerAssignment');
    const Session = getModel('Session');
    const DailyWorkoutForm = getModel('DailyWorkoutForm');

    if (!TrainerCommission || !ClientTrainerAssignment) {
      logger.warn('[CommissionService] TrainerCommission or ClientTrainerAssignment model not available');
      return null;
    }

    // Find active trainer assignment for this client
    const assignment = await ClientTrainerAssignment.findOne({
      where: {
        clientId: userId,
        status: 'active',
      },
      order: [['createdAt', 'DESC']], // Most recent assignment
    });

    if (!assignment) {
      logger.info(`[CommissionService] No active trainer assignment for client ${userId} — no commission created`);
      return null;
    }

    const trainerId = assignment.trainerId;

    // Get trainer to determine their type (independent vs hired)
    const trainer = await User.findByPk(trainerId, {
      attributes: ['id', 'trainerType', 'firstName', 'lastName'],
    });

    if (!trainer) {
      logger.warn(`[CommissionService] Trainer ${trainerId} not found`);
      return null;
    }

    // 'affiliated' is the real User.trainerType enum member (isIn
    // [['affiliated','independent']]); 'hired' was never a storable value.
    const trainerType = trainer.trainerType || 'affiliated';

    // Check loyalty eligibility from actual deducted/completed training evidence.
    const completedPaidSessions = await countCompletedPaidTrainingSessions(
      userId,
      { Session, DailyWorkoutForm }
    );
    const applyLoyaltyBump = isEligibleForLoyaltyBump(
      completedPaidSessions,
      sessionsGranted
    );

    // Calculate commission split
    const commission = calculateCommissionSplit(
      leadSource,
      grossAmount,
      sessionsGranted,
      applyLoyaltyBump,
      { trainerType }
    );

    const netAfterTax = grossAmount + taxAmount;

    // Create commission record
    const record = await TrainerCommission.create({
      orderId,
      trainerId,
      clientId: userId,
      // null, not a 0-sentinel: package_id has an FK to storefront_items
      // and no id-0 row exists (a 0 insert violates the FK and the error
      // is swallowed by the catch below — silent non-payment).
      packageId: storefrontItemId || null,
      leadSource,
      isLoyaltyBump: commission.loyaltyBump,
      sessionsGranted,
      sessionsConsumed: 0,
      grossAmount: commission.grossAmount,
      taxAmount: taxAmount || 0,
      netAfterTax,
      commissionRateBusiness: commission.businessRate,
      commissionRateTrainer: commission.trainerRate,
      businessCut: commission.businessCut,
      trainerCut: commission.trainerCut,
    });

    logger.info(`[CommissionService] Commission created for trainer ${trainer.firstName} ${trainer.lastName}`, {
      commissionId: record.id,
      trainerId,
      clientId: userId,
      trainerType,
      trainerRate: commission.trainerRate,
      trainerCut: commission.trainerCut,
      businessCut: commission.businessCut,
      loyaltyBump: commission.loyaltyBump,
    });

    return record;
  } catch (error) {
    // Non-fatal: don't let commission creation block the purchase flow —
    // but raise a CRITICAL admin alert so silent non-payment (the
    // 2026-07-14 zero-rows incident class) can never recur unnoticed.
    logger.error('[CommissionService] Failed to create commission record', {
      error: error.message,
      userId,
      orderId,
      grossAmount,
    });
    await raiseMoneyWriteAlert({
      lane: 'purchase_commission',
      error,
      context: { orderId, clientId: userId },
    });
    return null;
  }
}

export default { createCommissionForPurchase };
