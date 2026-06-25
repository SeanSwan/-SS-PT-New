import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';
import { confirmCoachIntakeAudioOrder } from '../../../../services/coachIntakeService';

vi.mock('../../../../services/coachIntakeService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../services/coachIntakeService')>();
  return {
    ...actual,
    confirmCoachIntakeAudioOrder: vi.fn(),
  };
});

function makeQueue() {
  return {
    items: [
      {
        id: 'item-1',
        entityId: 'item-1',
        kind: 'coach_intake',
        source: 'audio_upload',
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

    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
        queue={makeQueue()}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Voice intake command center/i)).toBeInTheDocument();
    expect(within(screen.getByLabelText('Coach intake quick snapshot')).getByText('Actionable').closest('div'))
      .toHaveTextContent('2');
    expect(screen.getAllByText(/Audio upload/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Audio puzzle/i)).toBeInTheDocument();
    expect(screen.getByText(/3 pieces/i)).toBeInTheDocument();
    expect(screen.getByText(/order review/i)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /review ready draft/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=item-1');
    expect(screen.getAllByText(/review target/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /ask coach/i })).not.toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /inspect audio/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open plaud/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?workspace=plaud');
  });

  it('keeps direct review-next routing into PLAUD when the next item is a reviewable merge', () => {
    const queue = makeQueue();
    queue.items[0] = {
      ...queue.items[0],
      id: 'merge-1',
      entityId: '11111111-1111-4111-8111-111111111111',
      kind: 'merge_request',
      source: 'plaud_merge',
      sourceLabel: 'PLAUD merge',
    };

    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          queue={queue}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /review ready draft/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?workspace=plaud&mergeRequestId=11111111-1111-4111-8111-111111111111');
  });

  it('shows a dedicated active review target when an intake id is selected', () => {
    const queue = makeQueue();
    queue.items.push({
      ...queue.items[0],
      id: 'item-2',
      entityId: 'item-2',
      source: 'voice_note',
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
          queue={queue}
          activeIntakeId="item-2"
        />
      </MemoryRouter>,
    );

    const target = screen.getByLabelText(/Active review target/i);
    expect(within(target).getByText(/Active review target/i)).toBeInTheDocument();
    expect(within(target).getByRole('heading', { name: /Coach voice note/i })).toBeInTheDocument();
    expect(within(target).queryByText(/Later upper body note/i)).toBeNull();
    expect(within(target).getAllByText(/Needs Client/i).length).toBeGreaterThan(0);
    expect(within(target).getByText(/Review dossier/i)).toBeInTheDocument();
    expect(within(target).getByText(/Client confirmation required/i)).toBeInTheDocument();
    expect(within(target).getByText(/Ordering review required/i)).toBeInTheDocument();
    expect(within(target).getByText(/Draft prepared for approval/i)).toBeInTheDocument();
    expect(within(target).getByText(/3 audio pieces/i)).toBeInTheDocument();
    expect(within(target).queryByRole('button', { name: /ask coach/i })).not.toBeInTheDocument();
    expect(within(target).queryByRole('button', { name: /^inspect intake audio$/i })).not.toBeInTheDocument();
    expect(within(target).getByRole('link', { name: /^open target$/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=item-2');
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
          queue={queue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    const target = screen.getByLabelText(/Active review target/i);
    fireEvent.click(within(target).getByRole('button', { name: /^confirm audio order$/i }));

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
        source: 'typed_note',
        title: 'Newer unprocessed note',
        queueStatus: 'unprocessed',
        canReview: false,
        timelineAt: '2026-05-07T18:30:00.000Z',
      },
      {
        ...queue.items[0],
        id: 'old-ready',
        entityId: 'old-ready',
        source: 'voice_note',
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
          queue={queue}
        />
      </MemoryRouter>,
    );

    const readyTitle = screen.getByLabelText(/Queue item Coach voice note/i);
    const newerTitle = screen.getByLabelText(/Queue item Typed note/i);

    expect(screen.getByRole('link', { name: /review ready draft/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=old-ready');
    expect(screen.queryByText(/Older ready workout draft/i)).toBeNull();
    expect(screen.queryByText(/Newer unprocessed note/i)).toBeNull();
    expect(readyTitle.compareDocumentPosition(newerTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('does not expose trainer intake controls to client role', () => {
    const { container } = render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="client"
          selectedClientName={null}
          queue={makeQueue()}
        />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
