/**
 * Swan Coach planning review enforcement.
 *
 * Cortex P0 (directive §5.3, 2026-07-12): the deterministic safety gate was
 * advisory-only on the deterministic generation path — review_required landed in
 * fingerprint metadata and nothing blocked. This helper makes the gate BLOCKING
 * with the same acknowledged-review contract the long-horizon approval gate uses
 * (409 SWAN_COACH_REVIEW_REQUIRED + planningReviewAcknowledged), plus the
 * directive's override-audit requirement: an acknowledgement without a written
 * reason is refused, and every acknowledged override is logged + attached to the
 * generated artifact's planning metadata.
 *
 * Only the BLOCKING tier forces acknowledgement (see
 * swanCoachPlanningSafetyGateService — advisory data-hygiene signals never 409).
 */

import logger from '../utils/logger.mjs';

export class SwanCoachPlanningReviewError extends Error {
  constructor(message, { status, code, reviewRequiredSignals = [], missingCriticalData = [] } = {}) {
    super(message);
    this.name = 'SwanCoachPlanningReviewError';
    this.status = status;
    this.code = code;
    this.reviewRequiredSignals = reviewRequiredSignals;
    this.missingCriticalData = missingCriticalData;
  }
}

/**
 * Enforce the deterministic review contract for one generation request.
 *
 * @returns {{ required: boolean, acknowledgement: object|null }}
 * @throws {SwanCoachPlanningReviewError} 409 when review is required and not
 *   acknowledged; 400 when acknowledged without a written reason.
 */
export function enforceSwanCoachPlanningReview({
  safetyGate,
  planningReviewAcknowledged,
  planningReviewReason,
  actorUserId = null,
  clientId = null,
  now = new Date(),
} = {}) {
  if (!safetyGate || safetyGate.status !== 'review_required') {
    return { required: false, acknowledgement: null };
  }

  const signals = Array.isArray(safetyGate.reviewRequiredSignals) ? safetyGate.reviewRequiredSignals : [];
  const missing = Array.isArray(safetyGate.missingCriticalData) ? safetyGate.missingCriticalData : [];

  if (planningReviewAcknowledged !== true) {
    throw new SwanCoachPlanningReviewError(
      'Swan Coach deterministic safety review is required before this workout can be generated.',
      {
        status: 409,
        code: 'SWAN_COACH_REVIEW_REQUIRED',
        reviewRequiredSignals: signals,
        missingCriticalData: missing,
      },
    );
  }

  const reason = typeof planningReviewReason === 'string' ? planningReviewReason.trim() : '';
  if (!reason) {
    throw new SwanCoachPlanningReviewError(
      'A written reason is required to acknowledge a Swan Coach safety review.',
      {
        status: 400,
        code: 'SWAN_COACH_REVIEW_REASON_REQUIRED',
        reviewRequiredSignals: signals,
        missingCriticalData: missing,
      },
    );
  }

  const acknowledgement = {
    acknowledged: true,
    reason,
    acknowledgedByUserId: actorUserId,
    acknowledgedAt: now.toISOString(),
    reviewRequiredSignals: signals,
  };

  // Override audit trail (directive §5.3 / eval test 9). De-identified: IDs only.
  logger.info('[SwanCoachSafetyGate] review_required override acknowledged', {
    clientId,
    acknowledgedByUserId: actorUserId,
    reviewRequiredSignals: signals,
    reasonLength: reason.length,
  });

  return { required: true, acknowledgement };
}
