import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ExecutionResultCard } from './CoachCommandCards';

describe('ExecutionResultCard route actions', () => {
  it('renders an actionable PLAUD workspace link when a command returns queueRoute', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="review_next_plaud_intake"
          client={null}
          result={{
            readyReview: 2,
            unprocessed: 1,
            queueRoute: '/dashboard/admin/plaud',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /open plaud workspace/i });
    expect(link).toHaveAttribute('href', '/dashboard/admin/plaud');
    expect(screen.getByText(/PLAUD intake queue ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Open the PLAUD workspace to continue the next actionable item/i)).toBeInTheDocument();
    expect(screen.queryByText('queueRoute')).toBeNull();
  });

  it('prefers reviewRoute over queueRoute for review-next commands', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="review_next_plaud_intake"
          client={null}
          result={{
            readyReview: 2,
            queueRoute: '/dashboard/admin/plaud',
            reviewRoute: '/dashboard/admin/plaud?mergeRequestId=merge-123',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /open plaud review/i });
    expect(link).toHaveAttribute('href', '/dashboard/admin/plaud?mergeRequestId=merge-123');
    expect(screen.getByText(/Next intake ready/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/PLAUD intake queue summary/i)).toBeInTheDocument();
    expect(screen.queryByText(/Command Executed/i)).toBeNull();
    expect(screen.queryByText('reviewRoute')).toBeNull();
  });

  it('prefers targetRoute over queueRoute for workspace-focused commands', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="inspect_plaud_audio_pieces"
          client={null}
          result={{
            pieceCount: 3,
            queueRoute: '/dashboard/trainer/plaud',
            targetRoute: '/dashboard/trainer/plaud?pieces=pending',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /open plaud workspace/i });
    expect(link).toHaveAttribute('href', '/dashboard/trainer/plaud?pieces=pending');
    expect(screen.queryByText('targetRoute')).toBeNull();
  });

  it('renders PLAUD timeline inspection counts instead of zero audio items', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="inspect_plaud_audio_pieces"
          client={null}
          result={{
            pieceCount: 3,
            suggestedGroupCount: 2,
            largeGapCount: 1,
            timelineConfidence: 'best_available',
            queueRoute: '/dashboard/trainer/plaud',
            targetRoute: '/dashboard/trainer/plaud?pieces=pending',
            commandHint: 'Open the PLAUD workspace and select the audio pieces in chronological order.',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/3 audio items/i)).toBeInTheDocument();
    expect(screen.getByText(/1 needs order review/i)).toBeInTheDocument();
    expect(screen.getByText(/1 low confidence/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 audio items/i)).toBeNull();
    expect(screen.getByRole('link', { name: /open plaud workspace/i }))
      .toHaveAttribute('href', '/dashboard/trainer/plaud?pieces=pending');
  });

  it('labels PLAUD audio inspection as Coach intake when the route returns to Coach', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="inspect_plaud_audio_pieces"
          client={null}
          result={{
            totalAudioItems: 1,
            needsOrderingReview: 1,
            queueRoute: '/dashboard/admin/coach-assistant',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /open coach intake/i });
    expect(link).toHaveAttribute('href', '/dashboard/admin/coach-assistant');
    expect(screen.queryByText('queueRoute')).toBeNull();
  });

  it('labels unified Coach intake routes as Coach intake actions', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="review_next_coach_intake"
          client={null}
          result={{
            nextKind: 'coach_intake',
            queueRoute: '/dashboard/admin/coach-assistant',
            reviewRoute: '/dashboard/admin/coach-assistant?intake=abc',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /open coach intake/i });
    expect(link).toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=abc');
    expect(screen.queryByText('reviewRoute')).toBeNull();
  });

  it('renders Coach audio inspection as a readable summary instead of raw command keys', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="inspect_coach_audio_pieces"
          client={null}
          result={{
            totalAudioItems: 2,
            needsOrderingReview: 1,
            lowConfidence: 1,
            queueRoute: '/dashboard/admin/coach-assistant',
            commandHint: 'Use the Coach workspace to review audio ordering before approving any generated workout draft.',
            items: [
              {
                id: 'coach:audio-1',
                kind: 'coach_intake',
                queueStatus: 'unprocessed',
                audioPieces: 3,
                audioBundles: 2,
                audioConfidence: 'low',
                needsOrderingReview: true,
                reviewRoute: '/dashboard/admin/coach-assistant?intake=audio-1',
              },
            ],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Audio pieces inspected/i)).toBeInTheDocument();
    expect(screen.getByText(/2 audio items/i)).toBeInTheDocument();
    expect(screen.getByText(/1 needs order review/i)).toBeInTheDocument();
    expect(screen.getByText(/1 low confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/3 pieces/i)).toBeInTheDocument();
    expect(screen.getByText(/2 bundles/i)).toBeInTheDocument();
    expect(screen.getAllByText(/low confidence/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/order review/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /open coach intake/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant');
    expect(screen.queryByText('totalAudioItems')).toBeNull();
    expect(screen.queryByText('needsOrderingReview')).toBeNull();
    expect(screen.queryByText('items')).toBeNull();
  });

  it('renders item-scoped Coach audio inspection with deterministic next action guidance', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="inspect_coach_audio_pieces"
          client={null}
          result={{
            totalAudioItems: 1,
            needsOrderingReview: 1,
            lowConfidence: 1,
            targetIntakeId: 'audio-1',
            targetMatched: true,
            queueRoute: '/dashboard/admin/coach-assistant',
            commandHint: 'Use the Coach workspace to review audio ordering before approving any generated workout draft.',
            reviewPlan: {
              mode: 'active_intake',
              primaryAction: 'confirm_audio_order',
              primaryLabel: 'Confirm this intake order',
              rationale: '3 pieces across 2 bundles need order review before Swan Coach drafts a workout log.',
              route: '/dashboard/admin/coach-assistant?intake=audio-1',
            },
            items: [
              {
                id: 'coach:audio-1',
                kind: 'coach_intake',
                queueStatus: 'unprocessed',
                audioPieces: 3,
                audioBundles: 2,
                audioConfidence: 'low',
                needsOrderingReview: true,
                reviewRoute: '/dashboard/admin/coach-assistant?intake=audio-1',
              },
            ],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Next action/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirm this intake order/i)).toBeInTheDocument();
    expect(screen.getByText(/3 pieces across 2 bundles/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open coach intake/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=audio-1');
    expect(screen.queryByText('reviewPlan')).toBeNull();
  });

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
    expect(screen.getByRole('link', { name: /open coach intake/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=abc');
    expect(screen.queryByText('nextKind')).toBeNull();
    expect(screen.queryByText('nextQueueStatus')).toBeNull();
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
