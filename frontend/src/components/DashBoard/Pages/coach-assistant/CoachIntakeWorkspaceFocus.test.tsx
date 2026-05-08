/**
 * CoachIntakeWorkspaceFocus.test.tsx
 * ==================================
 * Locks direct-link orientation for the active Swan Coach intake dossier.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';

function makeQueue() {
  return {
    items: [
      {
        id: 'item-1',
        entityId: 'item-1',
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
    ],
    summary: {
      total: 1,
      actionable: 1,
      today: 0,
      unprocessed: 0,
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

describe('CoachIntakeWorkspace focus handoff', () => {
  it('scrolls and focuses the active dossier after a direct intake link opens', async () => {
    const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
    const originalFocus = window.HTMLElement.prototype.focus;
    const scrollIntoView = vi.fn();
    const focus = vi.fn();

    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    Object.defineProperty(window.HTMLElement.prototype, 'focus', {
      configurable: true,
      value: focus,
    });

    try {
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

      await waitFor(() => {
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
        expect(focus).toHaveBeenCalledWith({ preventScroll: true });
      });

      expect(screen.getByTestId('coach-active-intake-dossier')).toHaveAttribute('tabindex', '-1');
    } finally {
      Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: originalScrollIntoView,
      });
      Object.defineProperty(window.HTMLElement.prototype, 'focus', {
        configurable: true,
        value: originalFocus,
      });
    }
  });

  it('shows active intake status, blocking gate, and next action in the focused dossier', async () => {
    const queue = makeQueue();
    queue.items[0] = {
      ...queue.items[0],
      sourceLabel: 'Typed note',
      needsClient: true,
      audioPuzzle: {
        groupingConfidence: 'medium',
        needsOrderingReview: true,
        reason: 'Recording timestamps overlap.',
        suggestedAction: 'Confirm clip order before draft prep.',
      },
    };

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('coach-active-intake-dossier')).toBeInTheDocument();
    });

    const ribbon = screen.getByLabelText('Active item status');
    expect(ribbon).toBeInTheDocument();
    expect(within(ribbon).getByText('Why this is active')).toBeInTheDocument();
    expect(within(ribbon).getByText('Typed note is selected from the intake queue in ready review state.')).toBeInTheDocument();
    expect(within(ribbon).getByText('Blocking gate')).toBeInTheDocument();
    expect(within(ribbon).getByText('Audio order must be confirmed')).toBeInTheDocument();
    expect(within(ribbon).getByText('Next action')).toBeInTheDocument();
    expect(within(ribbon).getByText('Confirm audio order')).toBeInTheDocument();
  });

  it('shows the active intake time anchor in the focused dossier', async () => {
    const queue = makeQueue();
    queue.items[0] = {
      ...queue.items[0],
      recordedAt: '2026-05-06T16:30:00.000Z',
      timelineAt: '2026-05-06T16:30:00.000Z',
      timelineAtSource: 'recorded_at',
    };

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    const ribbon = await screen.findByLabelText('Active item status');
    expect(within(ribbon).getByText('Time anchor')).toBeInTheDocument();
    expect(within(ribbon).getByText(/^Recorded /)).toBeInTheDocument();
    expect(within(ribbon).queryByText('Time pending')).toBeNull();
  });

  it('shows a pending time anchor when the active intake lacks usable timing', async () => {
    const queue = makeQueue();
    queue.items[0] = {
      ...queue.items[0],
      createdAt: null,
      recordedAt: null,
      timelineAt: null,
    };

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    const ribbon = await screen.findByLabelText('Active item status');
    expect(within(ribbon).getByText('Time anchor')).toBeInTheDocument();
    expect(within(ribbon).getByText('Time pending')).toBeInTheDocument();
  });

  it('uses a neutral time-anchor label when the timeline source is not supplied', async () => {
    const queue = makeQueue();
    queue.items[0] = {
      ...queue.items[0],
      createdAt: null,
      recordedAt: null,
      timelineAt: '2026-05-06T16:30:00.000Z',
      timelineAtSource: undefined,
    };

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    const ribbon = await screen.findByLabelText('Active item status');
    expect(within(ribbon).getByText(/^Anchored /)).toBeInTheDocument();
    expect(within(ribbon).queryByText(/^Created /)).toBeNull();
  });

  it('does not route failed intake with stale proposal metadata to draft review', async () => {
    const queue = makeQueue();
    queue.items[0] = {
      ...queue.items[0],
      queueStatus: 'failed',
      canReview: false,
      latestProposalId: 'proposal-stale',
      latestProposal: {
        id: 'proposal-stale',
        type: 'workout_log',
        status: 'PENDING',
        title: 'Stale draft metadata',
        createdAt: '2026-05-07T12:00:00.000Z',
      },
    };

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    const target = await screen.findByLabelText(/Active review target/i);
    const ribbon = within(target).getByLabelText('Active item status');
    expect(within(ribbon).getByText('Intake failed')).toBeInTheDocument();
    expect(within(ribbon).getByText('Review failed intake')).toBeInTheDocument();
    expect(within(target).queryByRole('button', { name: /review prepared draft/i })).toBeNull();
  });

  it('shows terminal proposals as write history instead of active draft review actions', async () => {
    const queue = makeQueue();
    queue.items[0] = {
      ...queue.items[0],
      latestProposalId: 'proposal-applied',
      latestProposal: {
        id: 'proposal-applied',
        type: 'workout_log',
        status: 'APPLIED',
        title: 'Applied draft metadata',
        createdAt: '2026-05-07T12:00:00.000Z',
      },
    };

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    const target = await screen.findByLabelText(/Active review target/i);
    const ribbon = within(target).getByLabelText('Active item status');
    expect(within(ribbon).getByText('Final write requires a prepared draft')).toBeInTheDocument();
    expect(within(ribbon).getByText('Prepare draft review')).toBeInTheDocument();
    expect(within(target).getByText('Draft applied')).toBeInTheDocument();
    expect(within(target).queryByRole('button', { name: /review prepared draft/i })).toBeNull();
  });

  it('does not expose draft preparation before client confirmation clears', async () => {
    const queue = makeQueue();
    queue.items[0] = {
      ...queue.items[0],
      needsClient: true,
      audioPuzzle: {
        groupingConfidence: 'single',
        needsOrderingReview: false,
      },
    };

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    const target = await screen.findByLabelText(/Active review target/i);
    const ribbon = within(target).getByLabelText('Active item status');
    expect(within(ribbon).getByText('Client confirmation required')).toBeInTheDocument();
    expect(within(ribbon).getByText('Ask Coach to resolve client')).toBeInTheDocument();
    expect(within(target).queryByRole('button', { name: /prepare draft review/i })).toBeNull();
  });

  it('prefers backend gate metadata when the queue item provides it', async () => {
    const queue = makeQueue();
    queue.items[0] = {
      ...queue.items[0],
      needsClient: true,
      nextBlockingGate: 'Backend canonical gate',
      nextActionKey: 'resolve_client',
      nextActionLabel: 'Backend canonical action',
    };

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    const target = await screen.findByLabelText(/Active review target/i);
    const ribbon = within(target).getByLabelText('Active item status');
    expect(within(ribbon).getByText('Backend canonical gate')).toBeInTheDocument();
    expect(within(ribbon).getByText('Backend canonical action')).toBeInTheDocument();
  });

  it('does not expose draft preparation for clarification or duplicate-hold fallbacks', async () => {
    const clarificationQueue = makeQueue();
    clarificationQueue.items[0] = {
      ...clarificationQueue.items[0],
      queueStatus: 'needs_clarification',
      latestProposalId: 'proposal-pending',
      latestProposal: {
        id: 'proposal-pending',
        type: 'workout_log',
        status: 'PENDING',
        title: 'Pending draft metadata',
        createdAt: '2026-05-07T12:00:00.000Z',
      },
    };

    const { rerender } = render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={clarificationQueue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    let target = await screen.findByLabelText(/Active review target/i);
    let ribbon = within(target).getByLabelText('Active item status');
    expect(within(ribbon).getByText('Clarification required')).toBeInTheDocument();
    expect(within(ribbon).getByText('Answer Coach clarification')).toBeInTheDocument();
    expect(within(target).queryByRole('button', { name: /prepare draft review/i })).toBeNull();
    expect(within(target).queryByRole('button', { name: /review prepared draft/i })).toBeNull();

    const duplicateQueue = makeQueue();
    duplicateQueue.items[0] = {
      ...duplicateQueue.items[0],
      queueStatus: 'duplicate_hold',
      latestProposalId: 'proposal-pending',
      latestProposal: {
        id: 'proposal-pending',
        type: 'workout_log',
        status: 'PENDING',
        title: 'Pending draft metadata',
        createdAt: '2026-05-07T12:00:00.000Z',
      },
    };

    rerender(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={duplicateQueue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    target = await screen.findByLabelText(/Active review target/i);
    ribbon = within(target).getByLabelText('Active item status');
    expect(within(ribbon).getByText('Duplicate risk requires review')).toBeInTheDocument();
    expect(within(ribbon).getByText('Review duplicate risk')).toBeInTheDocument();
    expect(within(target).queryByRole('button', { name: /prepare draft review/i })).toBeNull();
    expect(within(target).queryByRole('button', { name: /review prepared draft/i })).toBeNull();
  });

  it('shows a PII-safe hold reason for clarification and duplicate hold items', async () => {
    const clarificationQueue = makeQueue();
    clarificationQueue.items[0] = {
      ...clarificationQueue.items[0],
      queueStatus: 'needs_clarification',
      holdReason: {
        label: 'Client confirmation needed',
        detail: 'Choose from the shortlisted client candidates before preparing a draft.',
        candidateCount: 2,
        confidenceBand: 'medium',
      },
    };

    const { rerender } = render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={clarificationQueue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    let target = await screen.findByLabelText(/Active review target/i);
    expect(within(target).getByLabelText('Hold reason')).toHaveTextContent('Client confirmation needed');
    expect(within(target).getByText('2 candidates')).toBeInTheDocument();
    expect(within(target).getByText('Medium confidence')).toBeInTheDocument();

    const duplicateQueue = makeQueue();
    duplicateQueue.items[0] = {
      ...duplicateQueue.items[0],
      queueStatus: 'duplicate_hold',
      holdReason: {
        label: 'Possible duplicate workout',
        detail: 'Same client/date fingerprint matched existing workout logs.',
        duplicateCount: 3,
        confidenceBand: 'high',
      },
    };

    rerender(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={duplicateQueue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    target = await screen.findByLabelText(/Active review target/i);
    expect(within(target).getByLabelText('Hold reason')).toHaveTextContent('Possible duplicate workout');
    expect(within(target).getByText('3 possible matches')).toBeInTheDocument();
    expect(within(target).getByText('High confidence')).toBeInTheDocument();
    expect(within(target).queryByText(/Marcus|private|example\.com/i)).toBeNull();
  });

  it('focuses the matching Coach action from the active status ribbon', async () => {
    const queue = makeQueue();
    queue.items[0] = {
      ...queue.items[0],
      audioPuzzle: {
        groupingConfidence: 'medium',
        needsOrderingReview: true,
        reason: 'Recording timestamps overlap.',
        suggestedAction: 'Confirm clip order before draft prep.',
      },
    };

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={queue}
          activeIntakeId="item-1"
        />
      </MemoryRouter>,
    );

    const ribbon = await screen.findByLabelText('Active item status');
    fireEvent.click(within(ribbon).getByRole('button', { name: /focus next action: confirm audio order/i }));

    expect(screen.getByRole('button', { name: /^confirm audio order$/i })).toHaveFocus();
  });
});
