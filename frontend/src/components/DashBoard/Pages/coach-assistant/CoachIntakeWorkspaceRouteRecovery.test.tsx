/**
 * CoachIntakeWorkspaceRouteRecovery.test.tsx
 * ==========================================
 * Regression coverage for stale active-intake URL recovery in the live Coach
 * intake workspace. These tests keep the operator flow from parking on a
 * dead review target after another action has already moved or cleared it.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';

function makeQueue(items = [{
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
}]) {
  return {
    items,
    summary: {
      total: items.length,
      actionable: items.length,
      today: 0,
      unprocessed: 0,
      processing: 0,
      readyReview: items.length,
      failed: 0,
      needsClient: 0,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="current-route">{location.pathname}{location.search}</span>;
}

describe('CoachIntakeWorkspace route recovery', () => {
  it('replaces a stale active intake URL with the next actionable intake', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=missing-intake']}>
        <LocationProbe />
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          queue={makeQueue()}
          activeIntakeId="missing-intake"
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-route')).toHaveTextContent('/dashboard/admin/coach-assistant?intake=item-1');
    });
  });

  it('clears a stale active intake URL when no actionable intake remains', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=missing-intake']}>
        <LocationProbe />
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          queue={makeQueue([])}
          activeIntakeId="missing-intake"
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-route')).toHaveTextContent('/dashboard/admin/coach-assistant');
    });
    expect(screen.getByTestId('current-route')).not.toHaveTextContent('intake=');
  });
});
