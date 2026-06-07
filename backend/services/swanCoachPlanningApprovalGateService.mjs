/**
 * Swan Coach planning approval gate service.
 *
 * Enforces trainer/admin acknowledgement for deterministic review-required
 * planning metadata without storing raw health labels or PII.
 */

const APPROVAL_GATE_MODE = 'deterministic_approval_gate';

const cleanList = (value) => (
  Array.isArray(value)
    ? value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim())
    : []
);

export function buildSwanCoachPlanningApprovalGate({
  swanCoachPlanning,
  planningReviewAcknowledged,
  reviewerUserId,
  now = new Date(),
} = {}) {
  const safetyGate = swanCoachPlanning?.safetyGate || null;
  const reviewRequiredSignals = cleanList(safetyGate?.reviewRequiredSignals);
  const missingCriticalData = cleanList(safetyGate?.missingCriticalData);
  const required = safetyGate?.status === 'review_required';
  const acknowledged = planningReviewAcknowledged === true;
  const hasSwanCoachPlanning = Boolean(swanCoachPlanning?.createdBy === 'swan_coach_planning');

  const auditRecord = {
    mode: APPROVAL_GATE_MODE,
    required,
    acknowledged: required ? acknowledged : false,
    status: safetyGate?.status || 'not_present',
    reviewRequiredSignals,
    missingCriticalData,
  };

  if (!required) {
    return {
      allowed: true,
      requiresAcknowledgement: false,
      hasSwanCoachPlanning,
      auditRecord,
    };
  }

  if (!acknowledged) {
    return {
      allowed: false,
      requiresAcknowledgement: true,
      hasSwanCoachPlanning,
      auditRecord,
      error: {
        status: 409,
        code: 'SWAN_COACH_REVIEW_REQUIRED',
        message: 'Swan Coach planning review is required before this AI-generated plan can be approved.',
        reviewRequiredSignals,
        missingCriticalData,
      },
    };
  }

  return {
    allowed: true,
    requiresAcknowledgement: true,
    hasSwanCoachPlanning,
    auditRecord: {
      ...auditRecord,
      acknowledged: true,
      acknowledgedAt: now.toISOString(),
      acknowledgedByUserId: reviewerUserId || null,
    },
  };
}
