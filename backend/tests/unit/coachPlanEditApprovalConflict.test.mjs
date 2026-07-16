/**
 * ============================================================================
 * FILE: coachPlanEditApprovalConflict.test.mjs
 * PURPOSE: Preserve retryable proposal state on prescription revision conflict.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exercises the full plan_edit approval branch after its
 * proposal claim and distinguishes stale revision conflicts from hard failures.
 * HOW IT FITS IN THE APP: Trainer approval -> proposal claim -> plan mutation ->
 * retryable or failed proposal state.
 * KEY DECISIONS: A 409 releases the proposal to PENDING with currentRevision;
 * arbitrary exceptions remain FAILED and expose only a stable error code.
 * NASM PROTOCOL CONTEXT: A trainer must re-review changed prescriptions before
 * approving acute-variable edits against a newer plan revision.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  applyPlanEditProposal: vi.fn(),
  claimPendingProposal: vi.fn(),
  loadOwnedProposal: vi.fn(),
  updateProposalStatus: vi.fn(),
}));

vi.mock('../../database.mjs', () => ({ default: {} }));

vi.mock('../../services/ai/coachPlanEditApprovalService.mjs', () => ({
  applyPlanEditProposal: (...args) => fixtures.applyPlanEditProposal(...args),
}));

vi.mock('../../services/coachClientOnboardingApprovalService.mjs', () => ({
  createClientFromCoachOnboardingProposal: vi.fn(),
}));

vi.mock('../../utils/clientAccess.mjs', () => ({
  ensureClientAccess: vi.fn(),
}));

vi.mock('../../services/workout/aiWorkoutDailyFormService.mjs', () => ({
  submitAiWorkoutLogAsDailyForm: vi.fn(),
  AiWorkoutDailyFormError: class AiWorkoutDailyFormError extends Error {},
}));

vi.mock('../../services/ai/coachActionProposalService.mjs', () => ({
  COACH_PROPOSAL_STATUS: {
    PENDING: 'PENDING',
    APPLYING: 'APPLYING',
    APPLIED: 'APPLIED',
    FAILED: 'FAILED',
  },
  COACH_PROPOSAL_TYPE: {
    CLIENT_ONBOARDING: 'client_onboarding',
    CLIENT_PROFILE_COVERAGE_UPDATE: 'client_profile_coverage_update',
    CLIENT_DATA_UPDATE: 'client_data_update',
    NUTRITION_LOG: 'nutrition_log',
    PLAN_EDIT: 'plan_edit',
    WORKOUT_LOG: 'workout_log',
  },
}));

vi.mock('../../services/ai/coachActionProposalDetailService.mjs', () => ({
  decryptProposalPayload: vi.fn(() => ({
    payload: {
      planId: 71,
      clientId: 42,
      items: [{ id: 'sets-1' }],
    },
  })),
  sanitizeProposalDetail: vi.fn(),
}));

vi.mock('../../services/ai/coachSplitPlanApprovalService.mjs', () => ({
  approveNonWriteCoachProposal: vi.fn(),
}));

vi.mock('../../services/ai/coachActionProposalPersistenceService.mjs', () => ({
  claimPendingProposal: (...args) => fixtures.claimPendingProposal(...args),
  loadOwnedProposal: (...args) => fixtures.loadOwnedProposal(...args),
  mapProposalRow: vi.fn(),
  proposalNotPending: vi.fn(() => ({
    status: 409,
    body: { success: false, code: 'PROPOSAL_NOT_PENDING' },
  })),
  updateProposalStatus: (...args) => fixtures.updateProposalStatus(...args),
}));

vi.mock('../../services/ai/coachProposalReviewTokenService.mjs', () => ({
  createProposalReviewToken: vi.fn(),
  verifyProposalReviewToken: vi.fn(() => ({ ok: true })),
}));

vi.mock('../../services/ai/coachActionProposalErrorPresenter.mjs', () => ({
  buildCoachProposalApplyErrorBody: vi.fn(),
}));

vi.mock('../../services/ai/coachClientDataUpdateApprovalService.mjs', () => ({
  approveClientDataUpdateProposal: vi.fn(),
}));

vi.mock('../../services/ai/coachNutritionProposalApprovalService.mjs', () => ({
  approveNutritionLogProposal: vi.fn(),
}));

vi.mock('../../services/ai/coachClientProfileCoverageUpdateApprovalService.mjs', () => ({
  approveClientProfileCoverageUpdateProposal: vi.fn(),
}));

vi.mock('../../services/ai/coachActionProposalApprovalClientId.mjs', () => ({
  invalidProposalClientId: vi.fn(),
  parseProposalClientId: vi.fn(),
}));

const { approveCoachActionProposal } = await import(
  '../../services/ai/coachActionProposalApprovalService.mjs'
);

const proposalRow = {
  id: 'proposal-plan-edit',
  created_by_user_id: 3,
  proposal_type: 'plan_edit',
  status: 'PENDING',
};

const approve = () => approveCoachActionProposal({
  id: proposalRow.id,
  req: {
    user: { id: 3, role: 'trainer' },
    body: { reviewToken: 'review-token', approvedItemIds: ['sets-1'] },
  },
  sequelizeOverride: { models: { WorkoutPlan: {} } },
});

describe('coach plan edit approval conflicts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixtures.loadOwnedProposal.mockResolvedValue(proposalRow);
    fixtures.claimPendingProposal.mockResolvedValue(true);
    fixtures.updateProposalStatus.mockImplementation(async ({ status }) => ({ status }));
  });

  it('returns a stale proposal to PENDING with a reloadable conflict receipt', async () => {
    fixtures.applyPlanEditProposal.mockRejectedValue(Object.assign(
      new Error('reload before saving'),
      {
        code: 'WORKOUT_PLAN_REVISION_CONFLICT',
        statusCode: 409,
        currentRevision: 7,
      },
    ));

    const result = await approve();

    expect(result).toEqual({
      status: 409,
      body: {
        success: false,
        code: 'WORKOUT_PLAN_REVISION_CONFLICT',
        currentRevision: 7,
      },
    });
    expect(fixtures.updateProposalStatus).toHaveBeenCalledWith(expect.objectContaining({
      id: proposalRow.id,
      status: 'PENDING',
    }));
    expect(fixtures.updateProposalStatus).not.toHaveBeenCalledWith(expect.objectContaining({
      status: 'FAILED',
    }));
  });

  it('keeps arbitrary plan-edit failures fail-closed', async () => {
    fixtures.applyPlanEditProposal.mockRejectedValue(new Error('private detail'));

    const result = await approve();

    expect(result).toEqual({
      status: 500,
      body: { success: false, code: 'PLAN_EDIT_APPLY_FAILED' },
    });
    expect(fixtures.updateProposalStatus).toHaveBeenCalledWith(expect.objectContaining({
      id: proposalRow.id,
      status: 'FAILED',
      errorCode: 'PLAN_EDIT_APPLY_FAILED',
    }));
  });
});
