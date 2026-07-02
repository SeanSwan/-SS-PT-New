import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { FormEvent } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoachActionProposalCard } from './CoachActionProposalCard';
import { PlaudApiError } from '../../../../services/plaudClipService';
import {
  approveCoachProposal,
  getCoachProposal,
  rejectCoachProposal,
} from '../../../../services/coachProposalService';

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

describe('CoachActionProposalCard', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('approves pending workout proposals through the deterministic API', async () => {
    const onProposalAction = vi.fn();
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

    render(<CoachActionProposalCard proposal={proposal} onProposalAction={onProposalAction} />);

    expect(screen.getByRole('button', { name: /approve and log/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /review details/i }));
    expect(await screen.findByText(/Draft details loaded for review/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

    await waitFor(() => {
      expect(approveCoachProposal).toHaveBeenCalledWith(proposal.id, 'review-token-1');
    });
    expect(onProposalAction).toHaveBeenCalledWith(expect.objectContaining({ id: proposal.id, status: 'APPLIED' }));
    expect(await screen.findByText(/deterministic workout logger/i)).toBeInTheDocument();
  });


  it('shows safe duplicate-date approval copy without exposing generic failure only', async () => {
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
    vi.mocked(approveCoachProposal).mockRejectedValue(new PlaudApiError(
      'DUPLICATE_DATE',
      'A workout session already exists for this client on this date.',
      400,
    ));

    render(<CoachActionProposalCard proposal={proposal} />);

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));
    expect(await screen.findByText(/Draft details loaded for review/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

    expect(await screen.findByText(/A workout session already exists for this client on this date\./i)).toBeInTheDocument();
    expect(screen.queryByText(/^Approval failed$/i)).toBeNull();
  });

  it('shows safe detail-load copy without exposing generic failure only', async () => {
    vi.mocked(getCoachProposal).mockRejectedValue(new PlaudApiError(
      'PROPOSAL_NOT_FOUND',
      'Prepared draft was not found or is no longer available. Prepare an updated draft review.',
      404,
    ));

    render(<CoachActionProposalCard proposal={proposal} />);

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));

    expect(await screen.findByText(/Prepared draft was not found or is no longer available/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Detail load failed$/i)).toBeNull();
  });
  it('fails closed when loaded draft details do not include a review token', async () => {
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        ...proposal,
        detail: {
          workout: {
            clientId: 42,
            date: '2026-05-05',
            exercises: [{ name: 'Squat' }],
          },
        },
      },
    });

    render(<CoachActionProposalCard proposal={proposal} />);

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));

    expect(await screen.findByText(/review token is missing/i)).toBeInTheDocument();
    expect(screen.queryByText(/Draft details loaded for review/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve and log/i })).toBeDisabled();
  });

  it('rejects pending proposals without applying writes', async () => {
    const onProposalAction = vi.fn();
    vi.mocked(rejectCoachProposal).mockResolvedValue({
      success: true,
      proposal: { ...proposal, status: 'REJECTED' },
    });

    render(<CoachActionProposalCard proposal={proposal} onProposalAction={onProposalAction} />);

    fireEvent.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() => {
      expect(rejectCoachProposal).toHaveBeenCalledWith(proposal.id);
    });
    expect(onProposalAction).toHaveBeenCalledWith(expect.objectContaining({ id: proposal.id, status: 'REJECTED' }));
    expect(await screen.findByText(/proposal rejected/i)).toBeInTheDocument();
  });

  it('does not submit a parent form when proposal action buttons are clicked', async () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
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

    render(
      <form onSubmit={onSubmit}>
        <CoachActionProposalCard proposal={proposal} />
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));

    expect(await screen.findByText(/Draft details loaded for review/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders applied proposals as completed receipts without stale actions', () => {
    render(
      <CoachActionProposalCard
        proposal={{
          ...proposal,
          status: 'APPLIED',
        }}
      />,
    );

    expect(screen.getByText(/already been applied through deterministic approval/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /review details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve and log/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
  });

  it('renders rejected proposals as completed receipts without stale actions', () => {
    render(
      <CoachActionProposalCard
        proposal={{
          ...proposal,
          status: 'REJECTED',
        }}
      />,
    );

    expect(screen.getByText(/already been rejected/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /review details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve and log/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
  });

  it('renders approved clarification proposals with next-step receipt copy', () => {
    render(
      <CoachActionProposalCard
        proposal={{
          ...proposal,
          type: 'clarification',
          status: 'APPROVED',
          title: 'Answer Coach clarification',
          summary: { actionRequired: 'Client confirmed.' },
        }}
      />,
    );

    expect(screen.getByText(/clarification recorded/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /review details/i })).not.toBeInTheDocument();
  });

  it('renders approved split-plan proposals with child-draft guidance', () => {
    render(
      <CoachActionProposalCard
        proposal={{
          ...proposal,
          type: 'split_plan',
          status: 'APPROVED',
          title: 'Review split plan',
          summary: { splitCount: 2 },
        }}
      />,
    );

    expect(screen.getByText(/review the generated workout drafts/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve split plan/i })).not.toBeInTheDocument();
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
    expect(await screen.findByText(/Fitness goal ready for review/i)).toBeInTheDocument();
  });

  it('offers a direct Client Hub handoff after onboarding approval creates a client', async () => {
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

    const hubLink = await screen.findByRole('link', { name: /open client hub/i });
    expect(hubLink).toHaveAttribute('href', '/dashboard/admin/client-management?clientId=88');
    expect(await screen.findByText(/Claim link ready/i)).toBeInTheDocument();
    expect(screen.getByText(/SWAN-ABCD2345/i)).toBeInTheDocument();
    expect(screen.queryByText(/temporary password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/claimTokenHash/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open claim link/i })).toHaveAttribute(
      'href',
      'https://sswanstudios.com/claim/SWAN-ABCD2345',
    );
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

  it('does not expose arbitrary backend detail errors in proposal review', async () => {
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        ...proposal,
        detail: {
          errorCode: 'UNSAFE_BACKEND_DETAIL',
          error: 'do-not-render-private-detail',
        },
      },
    });

    render(<CoachActionProposalCard proposal={proposal} />);

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));

    expect(await screen.findAllByText(/Draft details need correction before approval/i)).toHaveLength(2);
    expect(screen.queryByText(/UNSAFE_BACKEND_DETAIL/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/do-not-render-private-detail/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve and log/i })).toBeDisabled();
  });

});
