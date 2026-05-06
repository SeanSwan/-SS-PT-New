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
});
