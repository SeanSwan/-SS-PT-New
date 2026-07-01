/**
 * coachClientDataUpdateApprovalService.test.mjs
 * =================================================
 * Focused boundary tests for review-gated client data update proposals.
 */
import { describe, expect, it, vi } from 'vitest';

async function loadApprovalAdapter() {
  vi.resetModules();
  const ensureClientAccess = vi.fn(async () => ({ allowed: true, clientId: 42 }));
  const processAIDataUpdates = vi.fn(async () => ({ successful: 1, errors: [] }));

  vi.doMock('../../utils/clientAccess.mjs', () => ({ ensureClientAccess }));
  vi.doMock('../../services/aiDataWriteService.mjs', () => ({ processAIDataUpdates }));
  vi.doMock('../../services/ai/coachActionProposalService.mjs', () => ({
    COACH_PROPOSAL_STATUS: { FAILED: 'FAILED', APPLIED: 'APPLIED' },
  }));

  const service = await import('../../services/ai/coachClientDataUpdateApprovalService.mjs');
  return { ...service, ensureClientAccess, processAIDataUpdates };
}

describe('coachClientDataUpdateApprovalService', () => {
  it('blocks workout-plan saves from generic client data update proposals', async () => {
    const { approveClientDataUpdateProposal, ensureClientAccess, processAIDataUpdates } = await loadApprovalAdapter();
    const claimPendingProposal = vi.fn(async () => true);
    const proposalNotPending = vi.fn(() => ({ status: 409, body: { code: 'PROPOSAL_NOT_PENDING' } }));
    const updateProposalStatus = vi.fn(async ({ status, result, errorCode }) => ({ status, result, errorCode }));

    const result = await approveClientDataUpdateProposal({
      id: 'proposal-1',
      req: { user: { id: 7, role: 'trainer' } },
      proposal: {
        targetUserId: 42,
        payload: {
          targetUserId: 42,
          updates: [{ type: 'save_workout_plan', data: { title: 'AI generated plan' } }],
        },
      },
      db: {},
      parseProposalClientId: vi.fn(() => 42),
      invalidProposalClientId: vi.fn(),
      claimPendingProposal,
      proposalNotPending,
      updateProposalStatus,
    });

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('CLIENT_DATA_UPDATE_UNSUPPORTED_TYPE');
    expect(result.body.error).toContain('Workout plan saves must use the workout planner approval flow');
    expect(ensureClientAccess).toHaveBeenCalled();
    expect(claimPendingProposal).toHaveBeenCalledWith({ id: 'proposal-1', userId: 7, db: {} });
    expect(proposalNotPending).not.toHaveBeenCalled();
    expect(processAIDataUpdates).not.toHaveBeenCalled();
    expect(updateProposalStatus).toHaveBeenCalledWith(expect.objectContaining({
      id: 'proposal-1',
      status: 'FAILED',
      errorCode: 'CLIENT_DATA_UPDATE_UNSUPPORTED_TYPE',
      result: expect.objectContaining({ updates: expect.objectContaining({ successful: 0 }) }),
      db: {},
    }));
  });
});