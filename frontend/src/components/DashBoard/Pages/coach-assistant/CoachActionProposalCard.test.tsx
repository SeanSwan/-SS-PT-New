import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoachActionProposalCard } from './CoachActionProposalCard';
import { approveCoachProposal, getCoachProposal, rejectCoachProposal } from '../../../../services/coachProposalService';

vi.mock('../../../../services/coachProposalService', () => ({
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

describe('CoachActionProposalCard', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('approves pending workout proposals through the deterministic API', async () => {
    vi.mocked(approveCoachProposal).mockResolvedValue({
      success: true,
      applied: true,
      proposal: { ...proposal, status: 'APPLIED' },
    });

    render(<CoachActionProposalCard proposal={proposal} />);

    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

    await waitFor(() => {
      expect(approveCoachProposal).toHaveBeenCalledWith(proposal.id);
    });
    expect(await screen.findByText(/deterministic workout logger/i)).toBeInTheDocument();
  });

  it('rejects pending proposals without applying writes', async () => {
    vi.mocked(rejectCoachProposal).mockResolvedValue({
      success: true,
      proposal: { ...proposal, status: 'REJECTED' },
    });

    render(<CoachActionProposalCard proposal={proposal} />);

    fireEvent.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() => {
      expect(rejectCoachProposal).toHaveBeenCalledWith(proposal.id);
    });
    expect(await screen.findByText(/proposal rejected/i)).toBeInTheDocument();
  });

  it('loads proposal details before approving onboarding drafts', async () => {
    const onboardingProposal = {
      ...proposal,
      type: 'client_onboarding' as const,
      title: 'Review client onboarding draft',
      summary: { displayName: 'New client draft', sectionCount: 5 },
    };
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        ...onboardingProposal,
        detail: {
          client: {
            firstName: 'Norma',
            lastName: 'Patton',
            clientSource: 'swanstudios',
            fitnessGoal: 'Strength and balance',
          },
        },
      },
    });

    render(<CoachActionProposalCard proposal={onboardingProposal} />);

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));

    await waitFor(() => {
      expect(getCoachProposal).toHaveBeenCalledWith(onboardingProposal.id);
    });
    expect(await screen.findByText(/Strength and balance/i)).toBeInTheDocument();
  });

  it('keeps onboarding approval blocked when loaded details contain a validation error', async () => {
    const onboardingProposal = {
      ...proposal,
      type: 'client_onboarding' as const,
      title: 'Review client onboarding draft',
      summary: { displayName: 'New client draft', sectionCount: 5 },
    };
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        ...onboardingProposal,
        detail: {
          client: {},
          errorCode: 'ONBOARDING_REQUIRED_FIELDS_MISSING',
          error: 'Client first and last name are required before approval.',
        },
      },
    });

    render(<CoachActionProposalCard proposal={onboardingProposal} />);

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));

    expect(await screen.findAllByText(/first and last name are required/i)).toHaveLength(2);
    expect(screen.getByRole('button', { name: /approve draft/i })).toBeDisabled();
  });
});
