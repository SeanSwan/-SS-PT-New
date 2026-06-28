/**
 * coachClientProfileCoverageUpdateApprovalService.test.mjs
 * =======================================================
 * Locks the existing-client profile coverage approval adapter so committed
 * writes are not misreported when only proposal status sync degrades.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadService({ accessAllowed = true, applyFails = false } = {}) {
  vi.resetModules();
  const ensureClientAccess = vi.fn(async () => (
    accessAllowed
      ? { allowed: true, clientId: 42 }
      : { allowed: false, status: 403, message: 'Client access denied' }
  ));
  const applyClientProfileCoverageUpdate = vi.fn(async () => {
    if (applyFails) {
      const err = new Error('Client not found');
      err.code = 'PROFILE_COVERAGE_CLIENT_NOT_FOUND';
      throw err;
    }
    return {
      clientId: 42,
      profileUpdated: false,
      questionnaireUpdated: true,
      coverageUpdated: 1,
      onboardingComplete: false,
    };
  });
  vi.doMock('../../utils/clientAccess.mjs', () => ({ ensureClientAccess }));
  vi.doMock('../../services/clientProfileCoverageUpdateService.mjs', () => ({
    applyClientProfileCoverageUpdate,
  }));
  const service = await import('../../services/ai/coachClientProfileCoverageUpdateApprovalService.mjs');
  return { ...service, ensureClientAccess, applyClientProfileCoverageUpdate };
}

const baseArgs = ({ updateProposalStatus, claimPendingProposal = vi.fn(async () => true) } = {}) => ({
  id: 'profile-proposal-1',
  req: { user: { id: 7, role: 'trainer' } },
  proposal: {
    payload: {
      clientId: 42,
      questionnaireResponses: { primaryGoal: 'Strength' },
      coverageUpdates: [{ key: 'health_concerns', status: 'known' }],
    },
    targetUserId: 42,
  },
  db: { id: 'db' },
  parseProposalClientId: vi.fn((value) => Number(value) || null),
  invalidProposalClientId: vi.fn(() => ({ status: 400, body: { success: false, code: 'PROPOSAL_INVALID_CLIENT_ID' } })),
  claimPendingProposal,
  proposalNotPending: vi.fn(() => ({ status: 409, body: { success: false, code: 'PROPOSAL_NOT_PENDING' } })),
  updateProposalStatus,
});

afterEach(() => {
  vi.doUnmock('../../utils/clientAccess.mjs');
  vi.doUnmock('../../services/clientProfileCoverageUpdateService.mjs');
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('coachClientProfileCoverageUpdateApprovalService', () => {
  it('reports committed profile coverage writes as applied when proposal status sync degrades', async () => {
    const { approveClientProfileCoverageUpdateProposal, applyClientProfileCoverageUpdate } = await loadService();
    const updateProposalStatus = vi.fn()
      .mockRejectedValueOnce(new Error('status sync failed'))
      .mockResolvedValueOnce({ id: 'profile-proposal-1', status: 'FAILED' });

    const result = await approveClientProfileCoverageUpdateProposal(baseArgs({ updateProposalStatus }));

    expect(result.status).toBe(200);
    expect(result.body).toEqual(expect.objectContaining({
      success: true,
      applied: true,
      statusSync: 'degraded',
    }));
    expect(applyClientProfileCoverageUpdate).toHaveBeenCalledTimes(1);
    expect(updateProposalStatus).toHaveBeenCalledTimes(1);
    expect(updateProposalStatus).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILED' }));
  });

  it('marks the proposal failed only when the deterministic profile coverage write fails', async () => {
    const { approveClientProfileCoverageUpdateProposal } = await loadService({ applyFails: true });
    const updateProposalStatus = vi.fn(async () => ({ id: 'profile-proposal-1', status: 'FAILED' }));

    const result = await approveClientProfileCoverageUpdateProposal(baseArgs({ updateProposalStatus }));

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('PROFILE_COVERAGE_CLIENT_NOT_FOUND');
    expect(updateProposalStatus).toHaveBeenCalledWith(expect.objectContaining({
      status: 'FAILED',
      errorCode: 'PROFILE_COVERAGE_CLIENT_NOT_FOUND',
    }));
  });
});