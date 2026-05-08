import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoachActionProposalCard } from './CoachActionProposalCard';
import {
  answerCoachProposalClarification,
  getCoachProposal,
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

describe('CoachActionProposalCard approval gates', () => {
  afterEach(() => {
    vi.clearAllMocks();
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
            redactedEvidenceRefCount: 1,
            safetyFlags: ['duplicate_check_required'],
            redactedSafetyFlagCount: 1,
            writer: 'deterministic',
          },
        },
      },
    });

    render(<CoachActionProposalCard proposal={proposal} />);

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));

    expect(await screen.findByText(/Evidence refs/i)).toBeInTheDocument();
    expect(screen.getByText(/seg_04, clip_2_meta/i)).toBeInTheDocument();
    expect(screen.getByText(/1 evidence ref withheld/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Safety flags/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/duplicate_check_required/i)).toBeInTheDocument();
    expect(screen.getByText(/1 safety flag withheld/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Writer/i).length).toBeGreaterThan(0);
  });

  it('records a one-tap clarification answer from loaded proposal details', async () => {
    const onProposalAction = vi.fn();
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

    render(<CoachActionProposalCard proposal={clarificationProposal} onProposalAction={onProposalAction} />);

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));
    fireEvent.click(await screen.findByRole('button', { name: /client_candidate:C1/i }));

    await waitFor(() => {
      expect(answerCoachProposalClarification).toHaveBeenCalledWith(clarificationProposal.id, 'client_candidate:C1');
    });
    expect(onProposalAction).toHaveBeenCalledWith(expect.objectContaining({ id: clarificationProposal.id, status: 'APPROVED' }));
    expect(await screen.findByText(/clarification answer recorded/i)).toBeInTheDocument();
  });
});
