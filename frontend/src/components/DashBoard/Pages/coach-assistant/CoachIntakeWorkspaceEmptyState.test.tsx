/**
 * CoachIntakeWorkspaceEmptyState.test.tsx
 * ======================================
 * Verifies that scoped Coach intake filters orient the operator when a queue
 * bucket is empty.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';

function makeEmptyQueue(scope: string) {
  return {
    items: [],
    summary: {
      total: 2,
      actionable: 0,
      today: 0,
      unprocessed: 0,
      needsClarification: 0,
      duplicateHold: 0,
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

describe('CoachIntakeWorkspace empty states', () => {
  it('uses selected scope copy when a filtered queue is empty', () => {
    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={makeEmptyQueue('failed')}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No failed intake items/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed transcription, media fetch, and proposal jobs will appear here/i)).toBeInTheDocument();
  });

  it('falls back to actionable copy for unknown scope strings', () => {
    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={makeEmptyQueue('toString')}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No active intake items/i)).toBeInTheDocument();
    expect(screen.getByText(/Attach audio, transcript, or PLAUD clips to start a review/i)).toBeInTheDocument();
  });

  it('uses explicit blocked-gate copy for clarification and duplicate-hold scopes', () => {
    const { rerender } = render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={makeEmptyQueue('needs_clarification')}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No clarification holds/i)).toBeInTheDocument();
    expect(screen.getByText(/Items waiting for a narrow Coach question/i)).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={makeEmptyQueue('duplicate_hold')}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No duplicate-risk holds/i)).toBeInTheDocument();
    expect(screen.getByText(/Potential duplicate logs will wait here/i)).toBeInTheDocument();
  });
});
