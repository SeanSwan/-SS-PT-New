import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CoachActionProposalCard } from './CoachActionProposalCard';

vi.mock('../../../../services/coachProposalService', () => ({
  answerCoachProposalClarification: vi.fn(),
  approveCoachProposal: vi.fn(),
  getCoachProposal: vi.fn(),
  rejectCoachProposal: vi.fn(),
}));

describe('CoachActionProposalCard summary safety', () => {
  it('does not expose arbitrary proposal title or summary free text', () => {
    render(
      <CoachActionProposalCard
        proposal={{
          id: '11111111-1111-1111-1111-111111111111',
          type: 'workout_log',
          status: 'PENDING',
          title: 'private@example.com should not render as a proposal title',
          summary: {
            displayName: 'Norma Private',
            date: 'private@example.com',
            exerciseCount: 'private@example.com',
          },
        }}
      />,
    );

    expect(screen.getByText(/Workout log proposal/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Needs review/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/private@example\.com/i)).toBeNull();
    expect(screen.queryByText(/Norma Private/i)).toBeNull();
  });
});
