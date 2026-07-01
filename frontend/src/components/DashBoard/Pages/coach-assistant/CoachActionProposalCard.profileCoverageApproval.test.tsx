import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

const coverageProposal = {
  id: 'coverage-proposal-1',
  type: 'client_profile_coverage_update' as const,
  status: 'PENDING' as const,
  title: 'Review profile coverage update',
  summary: { clientId: 42, coverageUpdateCount: 1 },
};

describe('CoachActionProposalCard profile coverage approval', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not describe existing-client coverage approval as a workout logger write', async () => {
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        ...coverageProposal,
        reviewToken: 'coverage-review-token',
        detail: {
          profileCoverageUpdate: {
            clientId: 42,
            coverageUpdates: [{ coverageKey: 'health_concerns', status: 'known' }],
          },
        },
      },
    });
    vi.mocked(approveCoachProposal).mockResolvedValue({
      success: true,
      applied: true,
      proposal: { ...coverageProposal, status: 'APPLIED' },
      profileCoverageUpdate: { clientId: 42, coverageUpdated: 1 },
    });

    render(
      <MemoryRouter>
        <CoachActionProposalCard proposal={coverageProposal} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /review details/i }));
    expect(await screen.findByText(/Draft details loaded for review/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /approve draft/i }));

    await waitFor(() => {
      expect(approveCoachProposal).toHaveBeenCalledWith(coverageProposal.id, 'coverage-review-token');
    });
    expect(await screen.findByText(/Client profile coverage update applied through deterministic approval/i)).toBeInTheDocument();
    expect(screen.queryByText(/deterministic workout logger/i)).toBeNull();
  });
});