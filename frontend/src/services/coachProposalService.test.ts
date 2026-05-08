import { describe, expect, it, vi } from 'vitest';
import apiService from './api.service';
import { approveCoachProposal } from './coachProposalService';

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
});
