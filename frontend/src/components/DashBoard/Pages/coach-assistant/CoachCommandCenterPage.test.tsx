import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CoachCommandCenterPage from './CoachCommandCenterPage';

const useCoachIntakeQueueMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../hooks/useCoachIntakeQueue', () => ({
  default: useCoachIntakeQueueMock,
  useCoachIntakeQueue: useCoachIntakeQueueMock,
}));

vi.mock('./CoachIntakeWorkspace', () => ({
  default: ({ queue, onCommandPrompt }: { queue: { summary: { actionable: number } }; onCommandPrompt: (prompt: string) => void }) => (
    <section data-testid="mock-coach-intake-workspace">
      <span>Unified actionable {queue.summary.actionable}</span>
      <button type="button" onClick={() => onCommandPrompt('Review next unified intake')}>
        Mock queue command
      </button>
    </section>
  ),
}));

vi.mock('../../../PlaudClipMerge/PlaudMergeWorkspace', () => ({
  PlaudMergeWorkspace: ({ embedded, initialReviewMergeRequestId }: { embedded?: boolean; initialReviewMergeRequestId?: string }) => (
    <section data-testid="mock-plaud-merge-workspace" data-embedded={String(Boolean(embedded))}>
      {initialReviewMergeRequestId || 'review-next'}
    </section>
  ),
}));

const unifiedSummary = {
  total: 22,
  actionable: 9,
  today: 4,
  unprocessed: 2,
  processing: 3,
  readyReview: 6,
  needsClarification: 5,
  duplicateHold: 2,
  failed: 1,
  needsClient: 1,
  preparedDrafts: 3,
  pendingDrafts: 1,
  applyingDrafts: 0,
  approvedDrafts: 0,
  appliedDrafts: 0,
  rejectedDrafts: 0,
  failedDrafts: 0,
};

function renderPage(route = '/dashboard/admin/coach-assistant') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <CoachCommandCenterPage />
    </MemoryRouter>,
  );
}

describe('CoachCommandCenterPage', () => {
  beforeEach(() => {
    useCoachIntakeQueueMock.mockReturnValue({
      items: [
        {
          id: 'queue-1',
          entityId: '11111111-2222-3333-4444-555555555555',
          kind: 'merge_request',
          source: 'plaud_merge',
          queueStatus: 'ready_review',
          canReview: true,
          recordedAt: '2026-05-13T09:00:00.000Z',
          timelineAt: '2026-05-13T09:00:00.000Z',
          createdAt: '2026-05-13T09:05:00.000Z',
          needsClient: false,
        },
      ],
      summary: unifiedSummary,
      isLoading: false,
      error: null,
      health: {
        schemaReady: true,
        status: 'attention',
        counts: { ...unifiedSummary, stuckProcessing: 1 },
        nextOperatorAction: { key: 'review_ready', label: 'Review next ready intake' },
      },
      retention: null,
      retentionPurgePlan: null,
      scope: 'actionable',
      setScope: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it('renders the command center labels, dock actions, and approval-gated copy', () => {
    renderPage();

    expect(screen.getAllByText(/Swan Coach Command Center/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Coach Command Modes/i)).toBeInTheDocument();
    expect(screen.getByText(/Start with a workflow/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Coach Thread/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Attach$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Mic$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Readback$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Prepare$/i })).toBeInTheDocument();
    expect(screen.getByText(/the operator approves the final write/i)).toBeInTheDocument();
  });

  it('uses accessible thread buttons that update the composer and selected status', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Duplicate risk check/i }));

    expect(screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...')).toHaveValue(
      'Review duplicate-risk logs for Client B-217 before any draft approval.',
    );
    expect(screen.getAllByText(/Client B-217 - duplicate-risk hold/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Duplicate risk check/i })).toHaveAttribute('aria-current', 'true');
  });

  it('opens and closes mobile drawers with aria-expanded and Escape handling', () => {
    renderPage();

    const drawerTrigger = screen.getByRole('button', { name: /^Threads$/i, hidden: true });
    expect(drawerTrigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(drawerTrigger);
    expect(drawerTrigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(drawerTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('uses the unified Coach intake queue and embeds the PLAUD merge workflow in the admin console', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=plaud&mergeRequestId=11111111-2222-3333-4444-555555555555');

    expect(useCoachIntakeQueueMock).toHaveBeenCalledWith({ scope: 'actionable', limit: 12 });
    expect(screen.getByText(/Unified PLAUD and Coach intake queue/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Review next ready intake/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('mock-coach-intake-workspace')).toHaveTextContent('Unified actionable 9');
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toHaveAttribute('data-embedded', 'true');
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toHaveTextContent('11111111-2222-3333-4444-555555555555');
  });
});
