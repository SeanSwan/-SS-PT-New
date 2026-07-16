/**
 * ClientMyWorkoutsPagination — unit tests
 * =======================================
 * Locks the pagination control contract for the canonical
 * /dashboard/client/workouts surface.
 *
 * Regression intent (canonical-surface-audit 2026-04-13):
 *   The backend controller accepts `{ limit, page }` but the prior canonical
 *   consumer (ClientMyWorkoutsPage) never passed `page`, so the page→offset
 *   translation was unreachable from real UI. This component makes page 2+
 *   reachable. These tests lock the component's rendering + callback contract
 *   so future regressions can't silently disable pagination again.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ClientMyWorkoutsPagination from './ClientMyWorkoutsPagination';

const LIMIT = 50;

describe('ClientMyWorkoutsPagination', () => {
  it('returns null (renders nothing) when page=1 and currentPageCount<limit (only one page)', () => {
    const { container } = render(
      <ClientMyWorkoutsPagination
        page={1}
        currentPageCount={12}
        limit={LIMIT}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders Previous + Next + page indicator when currentPageCount===limit (full page)', () => {
    render(
      <ClientMyWorkoutsPagination
        page={1}
        currentPageCount={LIMIT}
        limit={LIMIT}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
    expect(screen.getByText(/^Page 1$/)).toBeInTheDocument();
  });

  it('renders when page>1 even if currentPageCount<limit (user navigated to a partial last page)', () => {
    render(
      <ClientMyWorkoutsPagination
        page={3}
        currentPageCount={7}
        limit={LIMIT}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />
    );
    expect(screen.getByText(/^Page 3$/)).toBeInTheDocument();
  });

  it('Previous is disabled when page===1', () => {
    render(
      <ClientMyWorkoutsPagination
        page={1}
        currentPageCount={LIMIT}
        limit={LIMIT}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
  });

  it('Next is disabled when currentPageCount<limit (last page heuristic)', () => {
    render(
      <ClientMyWorkoutsPagination
        page={2}
        currentPageCount={30}
        limit={LIMIT}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });

  it('Next is enabled when currentPageCount===limit (likely more pages)', () => {
    render(
      <ClientMyWorkoutsPagination
        page={2}
        currentPageCount={LIMIT}
        limit={LIMIT}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /next page/i })).not.toBeDisabled();
  });

  it('Previous is enabled when page>1', () => {
    render(
      <ClientMyWorkoutsPagination
        page={2}
        currentPageCount={LIMIT}
        limit={LIMIT}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /previous page/i })).not.toBeDisabled();
  });

  it('invokes onNext when Next is clicked', async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();
    render(
      <ClientMyWorkoutsPagination
        page={1}
        currentPageCount={LIMIT}
        limit={LIMIT}
        onPrev={vi.fn()}
        onNext={onNext}
      />
    );
    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('invokes onPrev when Previous is clicked (when enabled)', async () => {
    const onPrev = vi.fn();
    const user = userEvent.setup();
    render(
      <ClientMyWorkoutsPagination
        page={3}
        currentPageCount={LIMIT}
        limit={LIMIT}
        onPrev={onPrev}
        onNext={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /previous page/i }));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onPrev when Previous is disabled and clicked', async () => {
    const onPrev = vi.fn();
    const user = userEvent.setup();
    render(
      <ClientMyWorkoutsPagination
        page={1}
        currentPageCount={LIMIT}
        limit={LIMIT}
        onPrev={onPrev}
        onNext={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /previous page/i }));
    expect(onPrev).not.toHaveBeenCalled();
  });
});
