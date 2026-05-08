/**
 * CoachIntakeWorkspaceItemReviewLinks.test.tsx
 * ============================================
 * Locks the direct item-level review links in the Coach intake queue. Review
 * Next stays the fastest path, but operators can jump to a specific intake
 * when triaging mixed Coach and PLAUD work.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';

function makeQueue() {
  return {
    items: [
      {
        id: 'coach-1',
        entityId: 'coach-1',
        kind: 'coach_intake',
        title: 'Morning lower body notes',
        sourceLabel: 'Coach voice note',
        queueStatus: 'ready_review',
        clientName: null,
        clipCount: 1,
        canReview: true,
        needsClient: false,
        timelineAt: '2026-05-06T16:30:00.000Z',
      },
      {
        id: 'merge-1',
        entityId: '11111111-1111-4111-8111-111111111111',
        kind: 'merge_request',
        title: 'PLAUD merge awaiting review',
        sourceLabel: 'PLAUD merge',
        queueStatus: 'ready_review',
        clientName: null,
        clipCount: 2,
        canReview: true,
        needsClient: false,
        timelineAt: '2026-05-07T16:30:00.000Z',
      },
    ],
    summary: {
      total: 2,
      actionable: 2,
      today: 0,
      unprocessed: 0,
      processing: 0,
      readyReview: 2,
      failed: 0,
      needsClient: 0,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };
}

describe('CoachIntakeWorkspace item review links', () => {
  it('lets operators jump directly to a specific Coach or PLAUD intake item', () => {
    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={makeQueue()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /review intake morning lower body notes/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=coach-1');
    expect(screen.getByRole('link', { name: /review intake plaud merge awaiting review/i }))
      .toHaveAttribute('href', '/dashboard/admin/plaud?mergeRequestId=11111111-1111-4111-8111-111111111111');
  });

  it('marks the selected Coach intake row after a direct item link opens', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=coach-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={makeQueue()}
          activeIntakeId="coach-1"
        />
      </MemoryRouter>,
    );

    const selectedRow = screen.getByText(/selected intake/i).closest('[aria-current="true"]');
    expect(selectedRow).toBeTruthy();
    expect(selectedRow).toHaveTextContent(/Morning lower body notes/i);
  });
});
