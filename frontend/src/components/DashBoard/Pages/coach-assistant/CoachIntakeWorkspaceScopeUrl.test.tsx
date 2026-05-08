/**
 * CoachIntakeWorkspaceScopeUrl.test.tsx
 * =====================================
 * Locks URL persistence for Coach intake queue scope filters.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';

function LocationProbe(): JSX.Element {
  const location = useLocation();
  return <output aria-label="current search">{location.search}</output>;
}

function makeQueue(scope = 'actionable') {
  return {
    items: [],
    summary: {
      total: 0,
      actionable: 0,
      today: 0,
      unprocessed: 0,
      processing: 0,
      readyReview: 0,
      failed: 0,
      needsClient: 0,
      preparedDrafts: 0,
      pendingDrafts: 0,
      applyingDrafts: 0,
      approvedDrafts: 0,
      appliedDrafts: 0,
      rejectedDrafts: 0,
      failedDrafts: 0,
    },
    isLoading: false,
    error: null,
    health: null,
    retention: null,
    retentionPurgePlan: null,
    scope,
    setScope: vi.fn(),
    refresh: vi.fn(),
  };
}

describe('CoachIntakeWorkspace scope URL sync', () => {
  it('adopts a valid scope from the URL on direct navigation', async () => {
    const queue = makeQueue('actionable');

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?scope=failed']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(queue.setScope).toHaveBeenCalledWith('failed');
    });
  });

  it('writes operator scope changes back to the URL', () => {
    const queue = makeQueue('actionable');

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=intake-1']}>
        <LocationProbe />
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /failed 0/i }));

    expect(queue.setScope).toHaveBeenCalledWith('failed');
    expect(screen.getByLabelText(/current search/i)).toHaveTextContent('intake=intake-1');
    expect(screen.getByLabelText(/current search/i)).toHaveTextContent('scope=failed');
  });

  it('shows the active queue scope in the workspace header', () => {
    const queue = makeQueue('failed');

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?scope=failed']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/active intake queue scope/i)).toHaveTextContent(/Viewing failed queue/i);
    expect(screen.getByLabelText(/active intake queue scope/i)).toHaveTextContent(/Recovery items only/i);
  });
});
