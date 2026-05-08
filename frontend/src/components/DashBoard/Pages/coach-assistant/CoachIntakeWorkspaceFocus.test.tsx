/**
 * CoachIntakeWorkspaceFocus.test.tsx
 * ==================================
 * Locks direct-link orientation for the active Swan Coach intake dossier.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
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
});
