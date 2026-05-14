import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CoachCommandCenterPage from './CoachCommandCenterPage';

const useCoachIntakeQueueMock = vi.hoisted(() => vi.fn());
const useAIChatMock = vi.hoisted(() => vi.fn());
const listConversationsMock = vi.hoisted(() => vi.fn());
const loadConversationMock = vi.hoisted(() => vi.fn());
const sendMessageWithConversationMock = vi.hoisted(() => vi.fn());
const newChatMock = vi.hoisted(() => vi.fn());
const deleteConversationMock = vi.hoisted(() => vi.fn());
const renameConversationMock = vi.hoisted(() => vi.fn());
const createQuickCoachCommandClientMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../hooks/useCoachIntakeQueue', () => ({
  default: useCoachIntakeQueueMock,
  useCoachIntakeQueue: useCoachIntakeQueueMock,
}));

vi.mock('../../../../hooks/useAIChat', () => ({
  useAIChat: useAIChatMock,
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

vi.mock('../../../../services/coachCommandClientService', () => ({
  createQuickCoachCommandClient: createQuickCoachCommandClientMock,
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
    listConversationsMock.mockResolvedValue([]);
    loadConversationMock.mockResolvedValue(null);
    sendMessageWithConversationMock.mockResolvedValue({
      role: 'assistant',
      content: 'Prepared the review package. No final writes have been made.',
      timestamp: '2026-05-14T12:00:00.000Z',
    });
    newChatMock.mockReset();
    deleteConversationMock.mockResolvedValue(undefined);
    renameConversationMock.mockResolvedValue(undefined);
    createQuickCoachCommandClientMock.mockResolvedValue({
      client: {
        id: 77,
        firstName: 'Ava',
        lastName: 'Stone',
        clientSource: 'move_fitness',
      },
      claimCode: 'claim-77',
      claimUrl: 'https://sswanstudios.com/claim/claim-77',
      isMoveFitness: true,
    });
    useAIChatMock.mockReturnValue({
      conversations: [
        {
          id: 101,
          title: 'Friday intake cleanup',
          context: 'coach_assistant',
          status: 'active',
          messageCount: 4,
          lastMessageAt: '2026-05-14T11:30:00.000Z',
          createdAt: '2026-05-14T10:00:00.000Z',
        },
        {
          id: 102,
          title: 'Client confirmation holds',
          context: 'coach_assistant',
          status: 'active',
          messageCount: 2,
          lastMessageAt: '2026-05-13T19:30:00.000Z',
          createdAt: '2026-05-13T18:00:00.000Z',
        },
      ],
      activeConversation: null,
      messages: [],
      loading: false,
      sending: false,
      error: null,
      lastErrorCode: null,
      lastErrorRetryable: true,
      createConversation: vi.fn(),
      listConversations: listConversationsMock,
      loadConversation: loadConversationMock,
      sendMessage: vi.fn(),
      sendMessageWithConversation: sendMessageWithConversationMock,
      deleteConversation: deleteConversationMock,
      renameConversation: renameConversationMock,
      archiveConversation: vi.fn(),
      newChat: newChatMock,
      clearError: vi.fn(),
    });
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

    expect(listConversationsMock).toHaveBeenCalledWith('active', true);
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

  it('uses real conversation thread buttons that update the composer and selected status', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Friday intake cleanup/i }));

    expect(screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...')).toHaveValue(
      'Continue Friday intake cleanup with review-gated context.',
    );
    expect(loadConversationMock).toHaveBeenCalledWith(101);
    expect(screen.getAllByText(/Friday intake cleanup - thread loaded/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Friday intake cleanup/i })).toHaveAttribute('aria-current', 'true');
  });

  it('submits the command dock through the real coach conversation API', async () => {
    renderPage();

    const composer = screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...');
    fireEvent.change(composer, { target: { value: 'Prepare today intake review.' } });
    fireEvent.click(screen.getByRole('button', { name: /^Prepare$/i }));

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        'Prepare today intake review.',
        'coach_assistant',
        'Friday intake cleanup',
        null,
        'both',
      );
    });
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

  it('shows real queue counts in the operations rail instead of static prototype values', () => {
    renderPage();

    const operationsRail = screen.getByLabelText('Coach operations rail');

    expect(within(operationsRail).getByText('Ready drafts').closest('li')).toHaveTextContent('3');
    expect(within(operationsRail).getByText('Client confirmation holds').closest('li')).toHaveTextContent('1');
    expect(within(operationsRail).getByText('Clarification holds').closest('li')).toHaveTextContent('5');
    expect(within(operationsRail).getByText('Duplicate-risk holds').closest('li')).toHaveTextContent('2');
  });

  it('creates a minimal client stub from the command rail and stages the composer for approved follow-up', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Client name'), { target: { value: 'Ava Stone' } });
    fireEvent.change(screen.getByLabelText('Client source'), { target: { value: 'move_fitness' } });
    fireEvent.click(screen.getByRole('button', { name: /Create stub client/i }));

    await waitFor(() => {
      expect(createQuickCoachCommandClientMock).toHaveBeenCalledWith({
        fullName: 'Ava Stone',
        clientSource: 'move_fitness',
      });
    });

    expect(screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...')).toHaveValue(
      'Continue Ava Stone with review-gated context.',
    );
    expect(screen.getAllByText(/Ava Stone - client stub ready/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No workout log was written/i).length).toBeGreaterThan(0);
  });
});
