import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoachActionProposalCard } from './CoachActionProposalCard';
import { getCoachProposal } from '../../../../services/coachProposalService';

vi.mock('../../../../services/coachProposalService', () => ({
  answerCoachProposalClarification: vi.fn(),
  approveCoachProposal: vi.fn(),
  getCoachProposal: vi.fn(),
  rejectCoachProposal: vi.fn(),
}));

const proposal = {
  id: '11111111-1111-1111-1111-111111111111',
  type: 'workout_log' as const,
  status: 'PENDING' as const,
  title: 'Review workout log draft',
  summary: { clientId: 42, date: '2026-05-05', exerciseCount: 3 },
};

describe('CoachActionProposalCard error safety', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not expose arbitrary detail-load rejection messages', async () => {
    vi.mocked(getCoachProposal).mockRejectedValue(new Error('do-not-render-private-detail'));

    render(<CoachActionProposalCard proposal={proposal} />);

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));

    expect(await screen.findByText(/Detail load failed/i)).toBeInTheDocument();
    expect(screen.queryByText(/do-not-render-private-detail/i)).not.toBeInTheDocument();
  });
});
