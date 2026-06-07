import { describe, expect, it } from 'vitest';

import {
  buildSwanCoachPlanningApprovalGate,
} from '../services/swanCoachPlanningApprovalGateService.mjs';

const REVIEW_REQUIRED_PLANNING = {
  createdBy: 'swan_coach_planning',
  identityMode: 'client_id_only',
  safetyGate: {
    mode: 'deterministic_review_gate',
    status: 'review_required',
    reviewRequiredSignals: ['medical_clearance_required', 'special_population_review_required'],
    missingCriticalData: ['baseline/readiness context'],
    reviewMessage: 'Deterministic safety gate requires coach review before assignment.',
  },
};

describe('buildSwanCoachPlanningApprovalGate', () => {
  it('allows approval when no Swan Coach review gate is present', () => {
    const result = buildSwanCoachPlanningApprovalGate({
      swanCoachPlanning: null,
      planningReviewAcknowledged: false,
      reviewerUserId: 10,
    });

    expect(result.allowed).toBe(true);
    expect(result.requiresAcknowledgement).toBe(false);
    expect(result.auditRecord.required).toBe(false);
  });

  it('blocks review-required planning until trainer or admin acknowledges the gate', () => {
    const result = buildSwanCoachPlanningApprovalGate({
      swanCoachPlanning: REVIEW_REQUIRED_PLANNING,
      planningReviewAcknowledged: false,
      reviewerUserId: 10,
    });

    expect(result.allowed).toBe(false);
    expect(result.error).toEqual(expect.objectContaining({
      status: 409,
      code: 'SWAN_COACH_REVIEW_REQUIRED',
    }));
    expect(result.error.reviewRequiredSignals).toEqual([
      'medical_clearance_required',
      'special_population_review_required',
    ]);
  });

  it('records a generic acknowledgement without leaking raw health labels', () => {
    const result = buildSwanCoachPlanningApprovalGate({
      swanCoachPlanning: REVIEW_REQUIRED_PLANNING,
      planningReviewAcknowledged: true,
      reviewerUserId: 10,
    });

    expect(result.allowed).toBe(true);
    expect(result.auditRecord).toEqual(expect.objectContaining({
      required: true,
      acknowledged: true,
      acknowledgedByUserId: 10,
      reviewRequiredSignals: ['medical_clearance_required', 'special_population_review_required'],
      missingCriticalData: ['baseline/readiness context'],
    }));
    expect(JSON.stringify(result.auditRecord)).not.toContain('pregnancy');
    expect(JSON.stringify(result.auditRecord)).not.toContain('older_adult');
  });
});
