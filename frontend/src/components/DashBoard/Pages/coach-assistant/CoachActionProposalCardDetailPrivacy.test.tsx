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
  type: 'client_onboarding' as const,
  status: 'PENDING' as const,
  title: 'Review client onboarding draft',
  summary: { displayName: 'New client draft', sectionCount: 5 },
};

describe('CoachActionProposalCard detail privacy', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not expose arbitrary onboarding draft free text in compact detail rows', async () => {
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        ...proposal,
        detail: {
          client: {
            firstName: 'Norma',
            lastName: 'Patton',
            email: 'private@example.com',
            clientSource: 'swanstudios',
            fitnessGoal: 'Strength and balance with private notes',
            healthConcerns: 'Do not render health detail',
            trainerNotes: 'Do not render trainer note',
          },
        },
      },
    });

    render(<CoachActionProposalCard proposal={proposal} />);

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));

    expect(await screen.findByText(/Client draft ready for trainer review/i)).toBeInTheDocument();
    expect(screen.getByText(/Fitness goal ready for review/i)).toBeInTheDocument();
    expect(screen.getByText(/Health context requires trainer review/i)).toBeInTheDocument();
    expect(screen.queryByText(/Norma/i)).toBeNull();
    expect(screen.queryByText(/Patton/i)).toBeNull();
    expect(screen.queryByText(/private@example\.com/i)).toBeNull();
    expect(screen.queryByText(/Strength and balance with private notes/i)).toBeNull();
    expect(screen.queryByText(/Do not render health detail/i)).toBeNull();
    expect(screen.queryByText(/Do not render trainer note/i)).toBeNull();
  });

  it('does not expose arbitrary workout title or note text in compact detail rows', async () => {
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        ...proposal,
        type: 'workout_log',
        title: 'Review workout log draft',
        summary: { clientId: 42, date: '2026-05-05', exerciseCount: 1 },
        detail: {
          workout: {
            title: 'Do not render workout title',
            date: '2026-05-05',
            clientId: 42,
            exercises: [{ name: 'Squat' }],
            notes: 'Do not render workout notes',
          },
        },
      },
    });

    render(<CoachActionProposalCard proposal={{ ...proposal, type: 'workout_log' }} />);

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));

    expect(await screen.findByText(/Workout draft ready for trainer review/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-05-05/i)).toBeInTheDocument();
    expect(screen.getByText(/1 exercise available/i)).toBeInTheDocument();
    expect(screen.getByText(/Workout notes ready for review/i)).toBeInTheDocument();
    expect(screen.queryByText(/Do not render workout title/i)).toBeNull();
    expect(screen.queryByText(/Do not render workout notes/i)).toBeNull();
  });
});
