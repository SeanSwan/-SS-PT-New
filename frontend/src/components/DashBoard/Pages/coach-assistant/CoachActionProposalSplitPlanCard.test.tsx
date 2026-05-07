import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoachActionProposalCard } from './CoachActionProposalCard';
import {
  approveCoachProposal,
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
  type: 'split_plan' as const,
  status: 'PENDING' as const,
  title: 'Review transcript split plan',
  summary: { splitCount: 2, actionRequired: 'Approve split before workout cards are prepared.' },
};

describe('CoachActionProposalCard split-plan flow', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders split-plan proposals as review drafts, not workout writes', () => {
    render(<CoachActionProposalCard proposal={proposal} />);

    expect(screen.getAllByText(/Split plan/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /approve split plan/i })).toBeInTheDocument();
  });

  it('requires detail review before split-plan approval', async () => {
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        ...proposal,
        detail: {
          splitPlan: {
            splitCount: 2,
            splits: [
              {
                title: 'Morning lower body',
                date: '2026-05-05',
                reason: 'Clip one mentions squats and lunges.',
                evidenceRefs: ['clip_1_meta'],
                redactedEvidenceRefCount: 1,
              },
              {
                title: 'Evening upper body',
                date: '2026-05-05',
                reason: 'Clip two starts a separate upper-body session.',
                evidenceRefs: ['clip_2_meta'],
              },
            ],
          },
        },
      },
    });

    render(<CoachActionProposalCard proposal={proposal} />);

    expect(screen.getByRole('button', { name: /approve split plan/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /review details/i }));

    expect(await screen.findByText(/Morning lower body/i)).toBeInTheDocument();
    expect(screen.getByText(/Clip two starts a separate upper-body session/i)).toBeInTheDocument();
    expect(screen.getByText(/1 evidence ref withheld/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve split plan/i })).not.toBeDisabled();
  });

  it('shows split-plan preparation count after approval', async () => {
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        ...proposal,
        detail: {
          splitPlan: {
            splitCount: 2,
            splits: [{ title: 'Morning lower body' }, { title: 'Evening upper body' }],
          },
        },
      },
    });
    vi.mocked(approveCoachProposal).mockResolvedValue({
      success: true,
      applied: false,
      splitPlan: {
        nextAction: 'prepare_workout_log_proposals',
        splitCount: 2,
        workoutProposalCount: 2,
        splits: [],
      },
      proposal: { ...proposal, status: 'APPROVED' },
    });

    render(<CoachActionProposalCard proposal={proposal} />);

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));
    expect(await screen.findByText(/Morning lower body/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /approve split plan/i }));

    expect(await screen.findByText(/2 workout log drafts prepared/i)).toBeInTheDocument();
  });
});
