/**
 * CoachIntakeWorkspaceTriageFlow.test.tsx
 * =======================================
 * Locks the default Hive Mind intake screen to one obvious review flow.
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';

function makeQueue() {
  return {
    items: [{
      id: 'item-1',
      entityId: 'item-1',
      kind: 'coach_intake',
      source: 'audio_upload',
      title: 'Morning lower body notes',
      sourceLabel: 'Manual upload',
      queueStatus: 'ready_review',
      clientName: null,
      clientId: 42,
      clipCount: 3,
      canReview: true,
      needsClient: false,
      timelineAt: '2026-05-06T16:30:00.000Z',
      audioPuzzle: {
        pieceCount: 3,
        bundleCount: 2,
        autoBundleCount: 1,
        needsOrderingReview: true,
        confidence: 'low',
      },
      latestProposalId: 'proposal-1',
      nextActionKey: 'confirm_audio_order',
      nextActionLabel: 'Confirm audio order',
    }],
    summary: {
      total: 3,
      actionable: 2,
      today: 1,
      unprocessed: 1,
      processing: 0,
      readyReview: 1,
      needsClarification: 0,
      duplicateHold: 0,
      failed: 0,
      needsClient: 0,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };
}

describe('CoachIntakeWorkspace triage flow', () => {
  it('puts the active target recommended action first and keeps helper clutter collapsed', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          queue={makeQueue()}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    const activeTarget = screen.getByLabelText(/Active review target/i);
    const activeActions = Array.from(activeTarget.querySelectorAll('[data-coach-active-action]'));
    expect(activeActions.map((node) => node.getAttribute('data-coach-active-action')).slice(0, 3))
      .toEqual(['confirm-audio', 'review-draft', 'open-target']);

    expect(screen.getByLabelText('Coach intake quick snapshot')).toBeInTheDocument();
    expect(screen.queryByLabelText('Coach intake summary')).toBeNull();
    expect(screen.queryByText(/First click: Review next intake/i)).toBeNull();

    const queue = screen.getByLabelText('Coach intake work queue');
    expect(within(queue).getByRole('button', { name: /actionable 2/i })).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Coach intake work queue"]')).toBeTruthy();
  });
});
