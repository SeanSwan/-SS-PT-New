import { describe, expect, it, vi } from 'vitest';
import apiService from './api.service';
import { approveCoachProposal, getCoachProposal } from './coachProposalService';

vi.mock('./api.service', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('coachProposalService', () => {
  it('maps stale proposal review tokens to actionable reload copy', async () => {
    vi.mocked(apiService.post).mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed with status code 428',
      response: {
        status: 428,
        data: {
          success: false,
          code: 'PROPOSAL_DETAIL_REVIEW_REQUIRED',
          error: 'Review proposal details before approving this action.',
        },
      },
    });

    await expect(approveCoachProposal('proposal-1', 'stale-token')).rejects.toMatchObject({
      code: 'PROPOSAL_DETAIL_REVIEW_REQUIRED',
      status: 428,
      message: 'Review details again before approving. The previous review window expired or changed.',
    });
  });

  it('maps missing prepared drafts to actionable updated-draft copy', async () => {
    vi.mocked(apiService.get).mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed with status code 404',
      response: {
        status: 404,
        data: {
          success: false,
          code: 'PROPOSAL_NOT_FOUND',
        },
      },
    });

    await expect(getCoachProposal('proposal-1')).rejects.toMatchObject({
      code: 'PROPOSAL_NOT_FOUND',
      status: 404,
      message: 'Prepared draft was not found or is no longer available. Prepare an updated draft review.',
    });
  });

  it('does not expose arbitrary backend proposal error detail', async () => {
    vi.mocked(apiService.get).mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed with status code 500',
      response: {
        status: 500,
        data: {
          success: false,
          code: 'UNSAFE_BACKEND_DETAIL',
          error: 'do-not-render-private-detail',
        },
      },
    });

    await expect(getCoachProposal('proposal-1')).rejects.toMatchObject({
      code: 'COACH_PROPOSAL_ERROR',
      status: 500,
      message: 'Failed to load Coach proposal',
    });
  });
});
