/**
 * CoachReviewNextResultCard.test.tsx
 * ==================================
 * Focused review-next result-card coverage for the Swan Coach intake lane.
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ExecutionResultCard } from './CoachCommandCards';

describe('Coach review-next result card', () => {
  it('renders review-next Coach intake as a workflow card instead of raw queue keys', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="review_next_coach_intake"
          client={null}
          result={{
            actionable: 4,
            readyReview: 2,
            needsClient: 1,
            failed: 0,
            nextKind: 'coach_intake',
            nextQueueStatus: 'ready_review',
            nextCanReview: true,
            nextBlockingGate: 'Audio order must be confirmed',
            nextActionLabel: 'Confirm audio order',
            queueRoute: '/dashboard/admin/coach-assistant',
            reviewRoute: '/dashboard/admin/coach-assistant?intake=abc',
            commandHint: 'Continue from the Swan Coach intake workspace.',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Next intake ready/i)).toBeInTheDocument();
    expect(screen.getByText(/4 actionable/i)).toBeInTheDocument();
    expect(screen.getByText(/2 ready/i)).toBeInTheDocument();
    expect(screen.getByText(/1 needs client/i)).toBeInTheDocument();
    expect(screen.getByText(/ready review/i)).toBeInTheDocument();
    expect(screen.getByText(/Blocking gate/i)).toBeInTheDocument();
    expect(screen.getByText(/Audio order must be confirmed/i)).toBeInTheDocument();
    expect(screen.getByText(/Next action/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirm audio order/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open coach intake/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=abc');
    expect(screen.queryByText('nextKind')).toBeNull();
    expect(screen.queryByText('nextQueueStatus')).toBeNull();
  });

  it('labels prepared-draft review-next links as prepared draft actions', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="review_next_coach_intake"
          client={null}
          result={{
            actionable: 1,
            readyReview: 1,
            needsClient: 0,
            failed: 0,
            nextKind: 'coach_intake',
            nextQueueStatus: 'ready_review',
            nextCanReview: true,
            nextLatestProposalStatus: 'PENDING',
            nextLatestProposalType: 'workout_log',
            queueRoute: '/dashboard/admin/coach-assistant',
            reviewRoute: '/dashboard/admin/coach-assistant?intake=abc&proposal=proposal-1',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /open prepared draft/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=abc&proposal=proposal-1');
    const draftStatus = screen.getByLabelText(/draft status/i);
    expect(within(draftStatus).getByText(/Prepared draft/i)).toBeInTheDocument();
    expect(within(draftStatus).getByText(/workout log/i)).toBeInTheDocument();
    expect(within(draftStatus).getByText(/pending/i)).toBeInTheDocument();
    expect(screen.queryByText('nextLatestProposalId')).toBeNull();
  });

  it('does not claim the Coach intake queue is clear when only actionable counts are returned', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="view_coach_intake_queue"
          client={null}
          result={{
            actionable: 3,
            readyReview: 1,
            needsClient: 2,
            queueRoute: '/dashboard/admin/coach-assistant',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Coach intake queue ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Open the Coach intake workspace to continue the next actionable item/i))
      .toBeInTheDocument();
    expect(screen.queryByText(/Your Coach intake queue is clear/i)).toBeNull();
    expect(screen.getByRole('link', { name: /open coach intake/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant');
  });

  it('labels a clear PLAUD queue with PLAUD-specific status copy', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard command="view_plaud_intake_queue" client={null} result={{ queueRoute: '/dashboard/admin/plaud' }} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No PLAUD intake needs action/i)).toBeInTheDocument();
    expect(screen.getByText(/Your PLAUD intake queue is clear/i)).toBeInTheDocument();
  });
});
