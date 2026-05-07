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
            reviewRoute: '/dashboard/admin/plaud?review=next',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /open plaud workspace/i });
    expect(link).toHaveAttribute('href', '/dashboard/admin/plaud?review=next');
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
});
