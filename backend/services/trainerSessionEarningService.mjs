/**
 * ============================================================================
 * FILE: trainerSessionEarningService.mjs
 * PURPOSE: Employed-trainer flat per-session pay accrual (mode b)
 * AUTHOR: Claude Fable 5 | CREATED: 2026-07-14
 * ============================================================================
 *
 * WHAT THIS FILE DOES: When a session completes, if the client↔trainer
 * assignment is compensation_mode='per_session_flat', create ONE
 * TrainerCommission row (earning_type='session_flat', trainerCut =
 * flat_session_rate) so the earning surfaces in the existing trainer
 * "My Earnings" page and admin "Trainer Payouts" console with zero new
 * payout plumbing.
 *
 * INVARIANTS:
 * - revenue_share assignments (the default) accrue NOTHING here — their
 *   pay is created at purchase by CommissionService. Zero behavior delta.
 * - Idempotent per session: pre-check + DB unique index on session_id
 *   (migration 20260714000001). A unique-violation race = already accrued.
 * - NEVER throws into the completion path; call it AFTER the completion
 *   transaction commits (a failed accrual inside the caller's transaction
 *   would poison it — Postgres aborts the whole tx on any error).
 *
 * HOW IT FITS IN THE APP:
 *   session.service.completeSession / sessionDeductionService auto-batch
 *   → (post-commit) accrueFlatSessionEarning → trainer_commissions row
 *   → /api/commissions/trainer/:id + admin payouts aggregation
 */

import { getModel } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

export const FLAT_EARNING_TYPE = 'session_flat';
export const FLAT_COMPENSATION_MODE = 'per_session_flat';

/**
 * Accrue a flat per-session earning for a completed session.
 * Safe to call for every completed session — it self-filters.
 *
 * @param {Object} params
 * @param {Object} params.session - { id, userId (client), trainerId }
 * @param {Object} [params.transaction] - optional; omit at completion call
 *   sites (post-commit accrual keeps the money tx clean)
 * @returns {Object|null} Created earning row, or null (skipped/failed)
 */
export async function accrueFlatSessionEarning({ session, transaction = null } = {}) {
  try {
    const sessionId = Number(session?.id);
    const clientId = Number(session?.userId);
    const trainerId = Number(session?.trainerId);
    if (!Number.isInteger(sessionId) || sessionId <= 0
      || !Number.isInteger(clientId) || clientId <= 0
      || !Number.isInteger(trainerId) || trainerId <= 0) {
      return null;
    }

    const TrainerCommission = getModel('TrainerCommission');
    const ClientTrainerAssignment = getModel('ClientTrainerAssignment');
    if (!TrainerCommission || !ClientTrainerAssignment) {
      logger.warn('[TrainerSessionEarning] models unavailable — accrual skipped', { sessionId });
      return null;
    }

    // The assignment must match the trainer who ran the session, not just
    // any trainer of the client — prevents paying trainer B for trainer
    // A's session after a reassignment.
    const assignment = await ClientTrainerAssignment.findOne({
      where: { clientId, trainerId, status: 'active' },
      order: [['createdAt', 'DESC']],
      transaction,
    });

    if (!assignment || assignment.compensationMode !== FLAT_COMPENSATION_MODE) {
      return null; // revenue_share (default) or unassigned: not this lane
    }

    const rate = Math.round(Number(assignment.flatSessionRate) * 100) / 100;
    if (!Number.isFinite(rate) || rate <= 0) {
      logger.error('[TrainerSessionEarning] per_session_flat assignment has invalid flatSessionRate — accrual refused', {
        assignmentId: assignment.id,
        trainerId,
        clientId,
        sessionId,
        flatSessionRate: assignment.flatSessionRate ?? null,
      });
      return null;
    }

    const existing = await TrainerCommission.findOne({
      where: { sessionId },
      attributes: ['id'],
      transaction,
    });
    if (existing) {
      logger.debug('[TrainerSessionEarning] session already accrued — skipped', { sessionId });
      return null;
    }

    const record = await TrainerCommission.create(
      {
        orderId: null,
        sessionId,
        earningType: FLAT_EARNING_TYPE,
        trainerId,
        clientId,
        // null, not a 0-sentinel: package_id has an FK to storefront_items
        // and no id-0 row exists (hostile-review R3 finding 1).
        packageId: null,
        leadSource: 'platform',
        isLoyaltyBump: false,
        sessionsGranted: 1,
        sessionsConsumed: 1,
        grossAmount: rate,
        taxAmount: 0,
        netAfterTax: rate,
        commissionRateBusiness: 0,
        commissionRateTrainer: 100,
        businessCut: 0,
        trainerCut: rate,
      },
      { transaction }
    );

    logger.info('[TrainerSessionEarning] flat session earning accrued', {
      commissionId: record.id,
      sessionId,
      trainerId,
      clientId,
      trainerCut: rate,
    });

    return record;
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      // Concurrent completion race: the unique session_id index already
      // holds the earning. Treat as accrued.
      return null;
    }
    // Non-fatal by contract: pay accrual must never block or poison the
    // session-completion flow. The unique index + this log make missed
    // accruals detectable and backfillable.
    logger.error('[TrainerSessionEarning] accrual failed (non-fatal)', {
      error: error.message,
      sessionId: session?.id ?? null,
      trainerId: session?.trainerId ?? null,
    });
    return null;
  }
}

export default { accrueFlatSessionEarning };
