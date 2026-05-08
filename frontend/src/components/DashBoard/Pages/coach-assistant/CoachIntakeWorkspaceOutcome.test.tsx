/**
 * CoachIntakeWorkspaceOutcome.test.tsx
 * ====================================
 * Locks post-action receipts for the Swan Coach intake review workspace.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';

vi.mock('./CoachIntakePreparedDraftPanel', () => ({
  default: ({ onProposalAction }: { onProposalAction?: (proposal: unknown) => void }) => (
    <section aria-label="Prepared draft review panel">
      <button
        type="button"
        onClick={() => onProposalAction?.({
          id: 'proposal-1',
          type: 'workout_log',
          status: 'APPLIED',
        })}
      >
        Mock apply proposal
      </button>
    </section>
  ),
}));

function makeQueue() {
  return {
    items: [{
      id: 'item-1',
      entityId: 'item-1',
      kind: 'coach_intake',
      title: 'Morning lower body notes',
      sourceLabel: 'Coach voice note',
      queueStatus: 'ready_review',
      clientName: 'Client 12',
      clipCount: 1,
      canReview: true,
      latestProposalId: 'proposal-1',
      timelineAt: '2026-05-06T16:30:00.000Z',
    }],
    summary: {
      total: 1,
      actionable: 1,
      today: 0,
      unprocessed: 0,
      processing: 0,
      readyReview: 1,
      failed: 0,
      needsClient: 0,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn().mockResolvedValue([]),
  };
}

describe('CoachIntakeWorkspace outcome receipt', () => {
  it('shows a post-action receipt after a prepared workout proposal is applied', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={makeQueue()}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /review prepared draft/i }));
    fireEvent.click(screen.getByRole('button', { name: /mock apply proposal/i }));

    await waitFor(() => {
      const receipt = screen.getByRole('status');
      expect(receipt).toHaveTextContent('Workout log applied');
      expect(receipt).toHaveFocus();
    });
    expect(screen.getByText('Queue refreshed; no next actionable intake was found.')).toBeInTheDocument();
  });
});
