import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';
import { getCoachProposal } from '../../../../services/coachProposalService';

vi.mock('../../../../services/coachProposalService', () => ({
  answerCoachProposalClarification: vi.fn(),
  approveCoachProposal: vi.fn(),
  getCoachProposal: vi.fn(),
  rejectCoachProposal: vi.fn(),
}));

function makeQueue() {
  return {
    items: [{
      id: 'item-1',
      entityId: 'item-1',
      kind: 'coach_intake',
      title: 'Morning lower body notes',
      sourceLabel: 'Manual Upload',
      queueStatus: 'ready_review',
      clientName: null,
      clipCount: 1,
      canReview: true,
      needsClient: false,
      timelineAt: '2026-05-06T16:30:00.000Z',
      latestProposalId: 'proposal-1',
      latestProposal: {
        id: 'proposal-1',
        type: 'workout_log',
        status: 'PENDING',
        title: 'Review lower body workout draft',
        createdAt: '2026-05-07T12:00:00.000Z',
      },
    }],
    summary: { total: 1, actionable: 1, today: 1, unprocessed: 0, processing: 0, readyReview: 1, failed: 0, needsClient: 0 },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="current-route">{location.pathname}{location.search}</span>;
}

describe('CoachIntakeWorkspace direct proposal links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the linked prepared draft panel from the URL proposal parameter', async () => {
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        id: 'proposal-1',
        type: 'workout_log',
        status: 'PENDING',
        title: 'Review lower body workout draft',
        summary: { clientId: 42, date: '2026-05-06', exerciseCount: 2 },
        detail: { workout: { clientId: 42, date: '2026-05-06', exercises: [{ name: 'Squat' }] } },
        reviewToken: 'review-v1.test',
      },
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1&proposal=proposal-1']}>
        <CoachIntakeWorkspace userRole="admin" selectedClientName={null} onCommandPrompt={vi.fn()} queue={makeQueue()} activeIntakeId="item-1" />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText(/Prepared draft review panel/i)).toBeInTheDocument();
    expect(getCoachProposal).toHaveBeenCalledWith('proposal-1');
    expect(await screen.findByText(/Review lower body workout draft/i)).toBeInTheDocument();
  });

  it('shows a stale-link warning instead of fetching a mismatched proposal id', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1&proposal=stale-proposal']}>
        <CoachIntakeWorkspace userRole="admin" selectedClientName={null} onCommandPrompt={vi.fn()} queue={makeQueue()} activeIntakeId="item-1" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/prepared draft link is stale/i);
    expect(getCoachProposal).not.toHaveBeenCalled();
  });

  it('replaces a stale proposal URL when the active latest draft is opened', async () => {
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        id: 'proposal-1',
        type: 'workout_log',
        status: 'PENDING',
        title: 'Review lower body workout draft',
        summary: { clientId: 42, date: '2026-05-06', exerciseCount: 2 },
        detail: { workout: { clientId: 42, date: '2026-05-06', exercises: [{ name: 'Squat' }] } },
        reviewToken: 'review-v1.test',
      },
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1&proposal=stale-proposal']}>
        <LocationProbe />
        <CoachIntakeWorkspace userRole="admin" selectedClientName={null} onCommandPrompt={vi.fn()} queue={makeQueue()} activeIntakeId="item-1" />
      </MemoryRouter>,
    );

    fireEvent.click(within(screen.getByLabelText(/Active review target/i)).getByRole('button', { name: /review prepared draft/i }));

    expect(await screen.findByLabelText(/Prepared draft review panel/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('current-route')).toHaveTextContent('/dashboard/admin/coach-assistant?intake=item-1&proposal=proposal-1');
  });
});
