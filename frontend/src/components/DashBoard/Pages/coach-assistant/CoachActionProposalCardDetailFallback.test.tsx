/**
 * CoachActionProposalCardDetailFallback.test.tsx
 * ==============================================
 * Regression coverage for fail-closed unknown proposal detail rendering.
 */
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

describe('CoachActionProposalCard unknown detail fallback', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not expose arbitrary unknown proposal detail fields', async () => {
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        ...proposal,
        reviewToken: 'review-token-unknown-detail',
        detail: {
          unsafePrivateNote: 'do-not-render-private-fallback-detail',
          metadata: { hidden: 'private@example.com' },
        },
      },
    });

    render(<CoachActionProposalCard proposal={proposal} />);

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));

    expect(await screen.findByText(/Structured proposal detail available for review/i)).toBeInTheDocument();
    expect(screen.queryByText(/unsafePrivateNote/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/do-not-render-private-fallback-detail/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/private@example\.com/i)).not.toBeInTheDocument();
  });
});
