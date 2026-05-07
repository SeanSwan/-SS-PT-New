import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';

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
    expect(screen.getByText(/Morning lower body notes/i)).toBeInTheDocument();
    expect(screen.getByText(/Audio puzzle/i)).toBeInTheDocument();
    expect(screen.getByText(/3 pieces/i)).toBeInTheDocument();
    expect(screen.getByText(/order review/i)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /review next intake/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=item-1');
    expect(screen.getByText(/review target/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ask coach/i }));
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
