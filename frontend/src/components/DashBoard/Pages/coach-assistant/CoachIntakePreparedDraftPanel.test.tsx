import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoachIntakePreparedDraftPanel } from './CoachIntakePreparedDraftPanel';
import { getCoachProposal } from '../../../../services/coachProposalService';

vi.mock('../../../../services/coachProposalService', () => ({
  getCoachProposal: vi.fn(),
}));

describe('CoachIntakePreparedDraftPanel', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not expose arbitrary linked proposal load errors', async () => {
    vi.mocked(getCoachProposal).mockRejectedValue(new Error('do-not-render-private-detail'));

    render(
      <CoachIntakePreparedDraftPanel
        proposalId="proposal-1"
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Prepared draft could not be loaded.');
    expect(screen.queryByText(/do-not-render-private-detail/i)).not.toBeInTheDocument();
  });
});
