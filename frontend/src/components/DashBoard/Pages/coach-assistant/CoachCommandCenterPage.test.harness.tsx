import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CoachCommandCenterPage from './CoachCommandCenterPage';

const coachCommandCenterMocks = vi.hoisted(() => ({
  useCoachIntakeQueueMock: vi.fn(),
  useAIChatMock: vi.fn(),
  listConversationsMock: vi.fn(),
  loadConversationMock: vi.fn(),
  sendMessageWithConversationMock: vi.fn(),
  newChatMock: vi.fn(),
  deleteConversationMock: vi.fn(),
  renameConversationMock: vi.fn(),
  createQuickCoachCommandClientMock: vi.fn(),
  executeCommandMock: vi.fn(),
  confirmCommandMock: vi.fn(),
  cancelCommandMock: vi.fn(),
}));

export const {
  useCoachIntakeQueueMock,
  useAIChatMock,
  listConversationsMock,
  loadConversationMock,
  sendMessageWithConversationMock,
  newChatMock,
  deleteConversationMock,
  renameConversationMock,
  createQuickCoachCommandClientMock,
  executeCommandMock,
  confirmCommandMock,
  cancelCommandMock,
} = coachCommandCenterMocks;

vi.mock('../../../../hooks/useCoachIntakeQueue', () => ({
  default: coachCommandCenterMocks.useCoachIntakeQueueMock,
  useCoachIntakeQueue: coachCommandCenterMocks.useCoachIntakeQueueMock,
}));

vi.mock('../../../../hooks/useAIChat', () => ({
  useAIChat: coachCommandCenterMocks.useAIChatMock,
}));

vi.mock('../../../../hooks/useCoachCommand', () => ({
  useCoachCommand: () => ({
    executeCommand: coachCommandCenterMocks.executeCommandMock,
    confirmCommand: coachCommandCenterMocks.confirmCommandMock,
    cancelCommand: coachCommandCenterMocks.cancelCommandMock,
    executingCommand: false,
  }),
}));

vi.mock('./CoachIntakeWorkspace', () => ({
  default: ({
    activeIntakeId,
    queue,
    onCommandPrompt,
  }: {
    activeIntakeId?: string | null;
    queue: { summary: { actionable: number } };
    onCommandPrompt: (prompt: string) => void;
  }) => (
    <section data-testid="mock-coach-intake-workspace">
      <span>Unified actionable {queue.summary.actionable}</span>
      <span>Active intake {activeIntakeId || 'none'}</span>
      <button type="button" onClick={() => onCommandPrompt('Review next unified intake')}>
        Mock queue command
      </button>
    </section>
  ),
}));

vi.mock('../../../../services/coachCommandClientService', () => ({
  createQuickCoachCommandClient: coachCommandCenterMocks.createQuickCoachCommandClientMock,
}));

vi.mock('../../../PlaudClipMerge/PlaudMergeWorkspace', () => ({
  PlaudMergeWorkspace: ({ embedded, initialReviewMergeRequestId }: { embedded?: boolean; initialReviewMergeRequestId?: string }) => (
    <section data-testid="mock-plaud-merge-workspace" data-embedded={String(Boolean(embedded))}>
      {initialReviewMergeRequestId || 'review-next'}
      <input type="file" data-plaud-uploader-input="true" data-testid="plaud-uploader-input" />
    </section>
  ),
}));

export const unifiedSummary = {
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

export function renderPage(route = '/dashboard/admin/coach-assistant') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <CoachCommandCenterPage />
    </MemoryRouter>,
  );
}

export function resetCoachCommandCenterMocks() {
  listConversationsMock.mockReset();
  loadConversationMock.mockReset();
  sendMessageWithConversationMock.mockReset();
  newChatMock.mockReset();
  deleteConversationMock.mockReset();
  renameConversationMock.mockReset();
  executeCommandMock.mockReset();
  confirmCommandMock.mockReset();
  cancelCommandMock.mockReset();
  createQuickCoachCommandClientMock.mockReset();

  listConversationsMock.mockResolvedValue([]);
  loadConversationMock.mockResolvedValue(null);
  sendMessageWithConversationMock.mockResolvedValue({
    role: 'assistant',
    content: 'Prepared the review package. No final writes have been made.',
    timestamp: '2026-05-14T12:00:00.000Z',
  });
  deleteConversationMock.mockResolvedValue(undefined);
  renameConversationMock.mockResolvedValue(undefined);
  executeCommandMock.mockResolvedValue({ type: 'fallback_to_chat' });
  confirmCommandMock.mockResolvedValue({ success: true, type: 'executed', message: '', result: null });
  cancelCommandMock.mockResolvedValue(undefined);
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
}
