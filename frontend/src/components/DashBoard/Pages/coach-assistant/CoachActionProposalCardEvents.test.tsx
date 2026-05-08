import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { approveCoachProposal, getCoachProposal } from '../../../../services/coachProposalService';
import { COACH_PROPOSAL_ACTION_EVENT } from '../../../../services/coachProposalActionEvents';
import { CoachActionProposalCard } from './CoachActionProposalCard';

vi.mock('../../../../services/coachProposalService', () => ({
  answerCoachProposalClarification: vi.fn(),
  approveCoachProposal: vi.fn(),
  getCoachProposal: vi.fn(),
  rejectCoachProposal: vi.fn(),
}));

const proposal = {
  id: 'event-proposal-1',
  type: 'workout_log' as const,
  status: 'PENDING' as const,
  title: 'Review workout log draft',
  summary: { clientId: 42, date: '2026-05-05', exerciseCount: 3 },
};

describe('CoachActionProposalCard workspace event bridge', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('emits a proposal action event when a chat-embedded card has no local action handler', async () => {
    const listener = vi.fn();
    window.addEventListener(COACH_PROPOSAL_ACTION_EVENT, listener);
    try {
      vi.mocked(getCoachProposal).mockResolvedValue({
        success: true,
        proposal: {
          ...proposal,
          reviewToken: 'review-token-1',
          detail: {
            workout: {
              clientId: 42,
              date: '2026-05-05',
              exercises: [{ name: 'Squat' }],
            },
          },
        },
      });
      vi.mocked(approveCoachProposal).mockResolvedValue({
        success: true,
        applied: true,
        proposal: { ...proposal, status: 'APPLIED' },
      });

      render(<CoachActionProposalCard proposal={proposal} />);

      fireEvent.click(screen.getByRole('button', { name: /review details/i }));
      expect(await screen.findByText(/Draft details loaded for review/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

      await waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
      expect((listener.mock.calls[0][0] as CustomEvent).detail.proposal).toMatchObject({
        id: proposal.id,
        status: 'APPLIED',
      });
    } finally {
      window.removeEventListener(COACH_PROPOSAL_ACTION_EVENT, listener);
    }
  });
});
