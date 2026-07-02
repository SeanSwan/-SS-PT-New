import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoachActionProposalCard } from './CoachActionProposalCard';
import { approveCoachProposal, getCoachProposal } from '../../../../services/coachProposalService';

vi.mock('../../../../services/coachProposalService', () => ({
  answerCoachProposalClarification: vi.fn(),
  approveCoachProposal: vi.fn(),
  getCoachProposal: vi.fn(),
  rejectCoachProposal: vi.fn(),
}));

const onboardingProposal = {
  id: '22222222-2222-2222-2222-222222222222',
  type: 'client_onboarding' as const,
  status: 'PENDING' as const,
  title: 'Review client onboarding draft',
  summary: { displayName: 'New client draft', sectionCount: 5 },
};

describe('CoachActionProposalCard claim-link copy handoff', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('copies the deterministic claim link after onboarding approval creates a client', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        ...onboardingProposal,
        reviewToken: 'review-token-1',
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
    vi.mocked(approveCoachProposal).mockResolvedValue({
      success: true,
      applied: true,
      client: { id: 88, firstName: 'Norma', lastName: 'Patton' },
      proposal: { ...onboardingProposal, status: 'APPLIED' },
      accessHandoff: {
        credentialMode: 'claim_link_ready',
        claimCode: 'SWAN-ABCD2345',
        claimUrl: 'https://sswanstudios.com/claim/SWAN-ABCD2345',
        claimExpiresAt: '2026-07-28T12:00:00.000Z',
      },
    });

    render(
      <MemoryRouter>
        <CoachActionProposalCard proposal={onboardingProposal} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));
    expect(await screen.findByText(/Draft details loaded for review/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /approve draft/i }));

    expect(await screen.findByText(/Claim link ready/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open claim link/i })).toHaveAttribute(
      'href',
      'https://sswanstudios.com/claim/SWAN-ABCD2345',
    );
    fireEvent.click(screen.getByRole('button', { name: /copy claim link/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://sswanstudios.com/claim/SWAN-ABCD2345');
    });
    expect(screen.getByRole('button', { name: /claim link copied/i })).toBeInTheDocument();
  });

  it('renders stored claim handoff after an applied onboarding proposal refreshes', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const appliedProposal = {
      ...onboardingProposal,
      status: 'APPLIED' as const,
      accessHandoff: {
        credentialMode: 'claim_link_ready',
        claimCode: 'SWAN-ABCD2345',
        claimUrl: 'https://sswanstudios.com/claim/SWAN-ABCD2345',
        claimExpiresAt: '2026-07-28T12:00:00.000Z',
      },
    };

    render(
      <MemoryRouter>
        <CoachActionProposalCard proposal={appliedProposal} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Claim link ready/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open claim link/i })).toHaveAttribute(
      'href',
      'https://sswanstudios.com/claim/SWAN-ABCD2345',
    );
    expect(screen.queryByRole('button', { name: /review details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve draft/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /copy claim link/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://sswanstudios.com/claim/SWAN-ABCD2345');
    });
  });

  it('copies the deterministic reset link after onboarding approval returns a reset handoff', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        ...onboardingProposal,
        reviewToken: 'review-token-1',
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
    vi.mocked(approveCoachProposal).mockResolvedValue({
      success: true,
      applied: true,
      client: { id: 88, firstName: 'Norma', lastName: 'Patton' },
      proposal: { ...onboardingProposal, status: 'APPLIED' },
      accessHandoff: {
        credentialMode: 'reset_link_ready',
        resetUrl: 'https://sswanstudios.com/reset-password/reset-token-77',
        resetExpiresAt: '2026-07-01T12:00:00.000Z',
      },
    });

    render(
      <MemoryRouter>
        <CoachActionProposalCard proposal={onboardingProposal} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));
    expect(await screen.findByText(/Draft details loaded for review/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /approve draft/i }));

    expect(await screen.findByText(/Reset link ready/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open reset link/i })).toHaveAttribute(
      'href',
      'https://sswanstudios.com/reset-password/reset-token-77',
    );
    fireEvent.click(screen.getByRole('button', { name: /copy reset link/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://sswanstudios.com/reset-password/reset-token-77');
    });
    expect(screen.getByRole('button', { name: /reset link copied/i })).toBeInTheDocument();
    expect(screen.queryByText(/temporary password/i)).not.toBeInTheDocument();
  });
});