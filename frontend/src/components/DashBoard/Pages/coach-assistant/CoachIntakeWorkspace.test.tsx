import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';
import { confirmCoachIntakeAudioOrder } from '../../../../services/coachIntakeService';
import { approveCoachProposal, getCoachProposal } from '../../../../services/coachProposalService';

vi.mock('../../../../services/coachIntakeService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../services/coachIntakeService')>();
  return {
    ...actual,
    confirmCoachIntakeAudioOrder: vi.fn(),
  };
});

vi.mock('../../../../services/coachProposalService', () => ({
  answerCoachProposalClarification: vi.fn(),
  approveCoachProposal: vi.fn(),
  getCoachProposal: vi.fn(),
  rejectCoachProposal: vi.fn(),
}));

function makeQueue() {
  return {
    items: [
      {
        id: 'item-1',
        entityId: 'item-1',
        kind: 'coach_intake',
        title: 'Morning lower body notes',
        sourceLabel: 'Manual Upload',
        queueStatus: 'ready_review',
        clientName: null,
        clipCount: 3,
        canReview: true,
        needsClient: true,
        timelineAt: '2026-05-06T16:30:00.000Z',
        audioPuzzle: {
          pieceCount: 3,
          bundleCount: 2,
          autoBundleCount: 1,
          needsOrderingReview: true,
          confidence: 'low',
        },
      },
    ],
    summary: {
      total: 3,
      actionable: 2,
      today: 1,
      unprocessed: 1,
      processing: 0,
      readyReview: 1,
      failed: 0,
      needsClient: 1,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };
}

describe('CoachIntakeWorkspace', () => {
  it('renders the PLAUD intake bridge for trainer/admin roles with one-click review and Coach command support', () => {
    const onCommandPrompt = vi.fn();

    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={onCommandPrompt}
        queue={makeQueue()}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Voice intake command center/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText(/Morning lower body notes/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Audio puzzle/i)).toBeInTheDocument();
    expect(screen.getByText(/3 pieces/i)).toBeInTheDocument();
    expect(screen.getByText(/order review/i)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /review next intake/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=item-1');
    expect(screen.getAllByText(/review target/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /^ask coach$/i }));
    expect(onCommandPrompt).toHaveBeenCalledWith('review next Coach intake');

    fireEvent.click(screen.getByRole('button', { name: /inspect audio pieces/i }));
    expect(onCommandPrompt).toHaveBeenCalledWith('inspect pending Coach audio pieces');
    expect(screen.getByRole('link', { name: /open full plaud workspace/i }))
      .toHaveAttribute('href', '/dashboard/admin/plaud');
  });

  it('keeps direct review-next routing into PLAUD when the next item is a reviewable merge', () => {
    const queue = makeQueue();
    queue.items[0] = {
      ...queue.items[0],
      id: 'merge-1',
      entityId: 'merge-1',
      kind: 'merge_request',
      sourceLabel: 'PLAUD merge',
    };

    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /review next intake/i }))
      .toHaveAttribute('href', '/dashboard/admin/plaud?review=next');
  });

  it('shows a dedicated active review target when an intake id is selected', () => {
    const onCommandPrompt = vi.fn();
    const queue = makeQueue();
    queue.items.push({
      ...queue.items[0],
      id: 'item-2',
      entityId: 'item-2',
      title: 'Later upper body note',
      queueStatus: 'needs_client',
      canReview: false,
      sourceLabel: 'Coach voice note',
      timelineAt: '2026-05-07T18:30:00.000Z',
      latestProposalId: 'proposal-1',
    });

    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={onCommandPrompt}
          queue={queue}
          activeIntakeId="item-2"
        />
      </MemoryRouter>,
    );

    const target = screen.getByLabelText(/Active review target/i);
    expect(within(target).getByText(/Active review target/i)).toBeInTheDocument();
    expect(within(target).getByText(/Later upper body note/i)).toBeInTheDocument();
    expect(within(target).getByText(/Needs Client/i)).toBeInTheDocument();
    expect(within(target).getByText(/Review dossier/i)).toBeInTheDocument();
    expect(within(target).getByText(/Client confirmation required/i)).toBeInTheDocument();
    expect(within(target).getByText(/Ordering review required/i)).toBeInTheDocument();
    expect(within(target).getByText(/Draft prepared for approval/i)).toBeInTheDocument();
    expect(within(target).getByText(/3 audio pieces/i)).toBeInTheDocument();

    fireEvent.click(within(target).getByRole('button', { name: /ask coach about this intake/i }));
    expect(onCommandPrompt).toHaveBeenCalledWith('review Coach intake item-2');

    fireEvent.click(within(target).getByRole('button', { name: /inspect intake audio/i }));
    expect(onCommandPrompt).toHaveBeenCalledWith('inspect Coach intake item-2 audio pieces');
  });

  it('opens and renders the linked prepared proposal from the active dossier', async () => {
    const queue = makeQueue();
    queue.refresh = vi.fn().mockResolvedValue(undefined);
    queue.items[0] = {
      ...queue.items[0],
      latestProposalId: 'proposal-1',
      audioPuzzle: {
        ...queue.items[0].audioPuzzle,
        needsOrderingReview: false,
      },
    };
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        id: 'proposal-1',
        type: 'workout_log',
        status: 'PENDING',
        title: 'Review lower body workout draft',
        summary: { clientId: 42, date: '2026-05-06', exerciseCount: 2 },
        detail: {
          workout: {
            clientId: 42,
            date: '2026-05-06',
            exercises: [{ name: 'Squat' }],
          },
        },
        reviewToken: 'review-v1.test',
      },
    });
    vi.mocked(approveCoachProposal).mockResolvedValue({
      success: true,
      applied: true,
      proposal: {
        id: 'proposal-1',
        type: 'workout_log',
        status: 'APPLIED',
        title: 'Review lower body workout draft',
        summary: { clientId: 42, date: '2026-05-06', exerciseCount: 2 },
      },
    });

    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    const target = screen.getByLabelText(/Active review target/i);
    fireEvent.click(within(target).getByRole('button', { name: /review prepared draft/i }));

    expect(await screen.findByLabelText(/Prepared draft review panel/i)).toBeInTheDocument();
    expect(getCoachProposal).toHaveBeenCalledWith('proposal-1');
    expect(await screen.findByText(/Review lower body workout draft/i)).toBeInTheDocument();
    const approveButton = screen.getByRole('button', { name: /approve and log/i });
    expect(approveButton).toBeEnabled();
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(approveCoachProposal).toHaveBeenCalledWith('proposal-1', 'review-v1.test');
      expect(queue.refresh).toHaveBeenCalled();
    });
  });

  it('shows applied proposal state in the active write gate when queue metadata is synced', () => {
    const queue = makeQueue();
    queue.items[0] = {
      ...queue.items[0],
      latestProposalId: 'proposal-1',
      latestProposal: {
        id: 'proposal-1',
        type: 'workout_log',
        status: 'APPLIED',
        title: 'Review lower body workout draft',
        createdAt: '2026-05-07T10:00:00.000Z',
      },
    };

    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    const target = screen.getByLabelText(/Active review target/i);
    expect(within(target).getByText(/Draft applied/i)).toBeInTheDocument();
  });

  it('confirms active intake audio order and refreshes the queue without final writes', async () => {
    const queue = makeQueue();
    queue.refresh = vi.fn().mockResolvedValue(undefined);
    vi.mocked(confirmCoachIntakeAudioOrder).mockResolvedValue({
      item: {
        ...queue.items[0],
        audioPuzzle: {
          ...queue.items[0].audioPuzzle,
          needsOrderingReview: false,
        },
      },
    });

    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    const target = screen.getByLabelText(/Active review target/i);
    fireEvent.click(within(target).getByRole('button', { name: /confirm audio order/i }));

    await waitFor(() => {
      expect(confirmCoachIntakeAudioOrder).toHaveBeenCalledWith({ intakeId: 'item-1' });
      expect(queue.refresh).toHaveBeenCalled();
    });
    expect(within(target).getByRole('status')).toHaveTextContent(/audio order confirmed/i);
    expect(within(target).getByText(/Final write locked/i)).toBeInTheDocument();
  });

  it('does not keep calling multi-piece audio order required after the gate is clear', () => {
    const queue = makeQueue();
    queue.items[0] = {
      ...queue.items[0],
      audioPuzzle: {
        ...queue.items[0].audioPuzzle,
        needsOrderingReview: false,
      },
    };

    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    const target = screen.getByLabelText(/Active review target/i);
    expect(within(target).getByText(/Audio order ready/i)).toBeInTheDocument();
    expect(within(target).queryByRole('button', { name: /confirm audio order/i })).toBeNull();
  });

  it('renders the highest-priority review-next item first even when API order is newer-first', () => {
    const queue = makeQueue();
    queue.items = [
      {
        ...queue.items[0],
        id: 'new-unprocessed',
        entityId: 'new-unprocessed',
        title: 'Newer unprocessed note',
        queueStatus: 'unprocessed',
        canReview: false,
        timelineAt: '2026-05-07T18:30:00.000Z',
      },
      {
        ...queue.items[0],
        id: 'old-ready',
        entityId: 'old-ready',
        title: 'Older ready workout draft',
        queueStatus: 'ready_review',
        canReview: true,
        timelineAt: '2026-05-06T16:30:00.000Z',
      },
    ];

    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
        />
      </MemoryRouter>,
    );

    const readyTitle = screen.getByText(/Older ready workout draft/i);
    const newerTitle = screen.getByText(/Newer unprocessed note/i);

    expect(screen.getByRole('link', { name: /review next intake/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=old-ready');
    expect(readyTitle.compareDocumentPosition(newerTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('does not expose trainer intake controls to client role', () => {
    const { container } = render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="client"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={makeQueue()}
        />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
