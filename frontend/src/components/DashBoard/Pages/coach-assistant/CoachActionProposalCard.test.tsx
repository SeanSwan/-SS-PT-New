import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoachActionProposalCard } from './CoachActionProposalCard';
import {
  answerCoachProposalClarification,
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

  it('renders proposal approval gates and evidence metadata', () => {
    render(
      <CoachActionProposalCard
        proposal={{
          ...proposal,
          summary: {
            ...proposal.summary,
            confirmationMode: 'trainer_approval_required',
            evidenceCount: 2,
            safetyFlagCount: 1,
          },
        }}
      />,
    );

    expect(screen.getByText(/Approval gates/i)).toBeInTheDocument();
    expect(screen.getByText(/Trainer approval required/i)).toBeInTheDocument();
    expect(screen.getByText(/2 evidence refs/i)).toBeInTheDocument();
    expect(screen.getByText(/1 safety flag/i)).toBeInTheDocument();
    expect(screen.getByText(/Deterministic writer/i)).toBeInTheDocument();
  });

  it('shows sanitized evidence details after detail review loads', async () => {
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
          approvalGate: {
            confirmationMode: 'trainer_approval_required',
            evidenceRefs: ['seg_04', 'clip_2_meta'],
            safetyFlags: ['duplicate_check_required'],
            writer: 'deterministic',
          },
        },
      },
    });

    render(<CoachActionProposalCard proposal={proposal} />);

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));

    expect(await screen.findByText(/Evidence refs/i)).toBeInTheDocument();
    expect(screen.getByText(/seg_04, clip_2_meta/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Safety flags/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/duplicate_check_required/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Writer/i).length).toBeGreaterThan(0);
  });

  it('renders split-plan proposals as review drafts, not workout writes', () => {
    render(
      <CoachActionProposalCard
        proposal={{
          ...proposal,
          type: 'split_plan',
          title: 'Review transcript split plan',
          summary: { splitCount: 2, actionRequired: 'Approve split before workout cards are prepared.' },
        }}
      />,
    );

    expect(screen.getAllByText(/Split plan/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /approve draft/i })).toBeInTheDocument();
  });

  it('records a one-tap clarification answer from loaded proposal details', async () => {
    const clarificationProposal = {
      ...proposal,
      type: 'clarification' as const,
      title: 'Answer Coach clarification',
      summary: { actionRequired: 'Answer clarification before deterministic approval can continue.' },
    };
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        ...clarificationProposal,
        detail: {
          clarification: {
            question: 'Which client should this workout be logged under?',
            options: ['client_candidate:C1', 'client_candidate:C2'],
          },
        },
      },
    });
    vi.mocked(answerCoachProposalClarification).mockResolvedValue({
      success: true,
      applied: false,
      clarificationAnswer: 'client_candidate:C1',
      proposal: { ...clarificationProposal, status: 'APPROVED' },
    });

    render(<CoachActionProposalCard proposal={clarificationProposal} />);

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));
    fireEvent.click(await screen.findByRole('button', { name: /client_candidate:C1/i }));

    await waitFor(() => {
      expect(answerCoachProposalClarification).toHaveBeenCalledWith(clarificationProposal.id, 'client_candidate:C1');
    });
    expect(await screen.findByText(/clarification answer recorded/i)).toBeInTheDocument();
  });
});
